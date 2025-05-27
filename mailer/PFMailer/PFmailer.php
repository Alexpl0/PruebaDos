<?php
// filepath: c:\Users\Ex-Perez-J\OneDrive - GRAMMER AG\Desktop\PruebaDos\mailer\PFMailer\PFmailer.php
/**
 * PFmailer.php - Clase para manejo de notificaciones por correo del sistema Premium Freight
 * 
 * Esta clase gestiona el envío de correos electrónicos para diferentes procesos:
 * - Notificaciones de aprobación
 * - Notificaciones de rechazo
 * - Resúmenes semanales
 * - Recordatorios de evidencia
 */

// 1. Cargar la configuración para tener acceso a las constantes
require_once __DIR__ . '/config.php';

// 2. Cargar las dependencias necesarias para el envío de correos
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// 3. Importar los archivos de la librería PHPMailer
require '../Phpmailer/Exception.php';
require '../Phpmailer/PHPMailer.php';
require '../Phpmailer/SMTP.php';
require_once 'PFDB.php';

// 4. Definir constantes de URL si no están definidas
if (!defined('URLM')) {
    define('URLM', 'https://grammermx.com/Mailer/PFMailer/');
}

if(!defined('URLPF')) {
    define('URLPF', 'https://grammermx.com/Jesus/PruebaDos/');
}

/**
 * Clase PFMailer - Maneja todas las operaciones de correo del sistema Premium Freight
 */
class PFMailer {
    private $mail;
    private $db;
    private $baseUrl;

    /**
     * Constructor - inicializa PHPMailer y la conexión a la base de datos
     */
    public function __construct() {
        // 1. Inicializar la URL base desde la constante global
        $this->baseUrl = URLM;
        
        // 2. Inicializar la instancia de PHPMailer
        $this->mail = new PHPMailer(true);

        // 3. Configurar los parámetros SMTP para el envío de correos
        $this->mail->SMTPDebug = 0;
        $this->mail->isSMTP();
        $this->mail->Host = 'smtp.hostinger.com'; 
        $this->mail->Port = 465;
        $this->mail->SMTPAuth = true;
        $this->mail->Username = 'premium_freight@grammermx.com';
        $this->mail->Password = 'FreightSystem2025.';
        $this->mail->SMTPSecure = 'ssl';
        
        // 4. Configurar formato HTML y codificación de caracteres
        $this->mail->isHTML(true);
        $this->mail->CharSet = 'UTF-8';
        
        // 5. Configurar el remitente y destinatarios en copia oculta
        $this->mail->setFrom('premium_freight@grammermx.com', 'Premium Freight System');
        $this->mail->addBCC('extern.jesus.perez@grammer.com', 'Jesús Pérez');
        $this->mail->addBCC('premium_freight@grammermx.com', 'Premium Freight System');
        
        // 6. Inicializar conexión a la base de datos
        $con = new LocalConector();
        $this->db = $con->conectar();
    }

    /**
     * Envía notificación individual a un aprobador cuando tiene una orden pendiente
     * 
     * @param int $orderId - ID de la orden de Premium Freight
     * @return bool - true si el correo se envió correctamente, false en caso contrario
     */
    public function sendApprovalNotification($orderId) {
        try {
            // 1. Obtener los datos de la orden desde la base de datos
            $orderData = $this->getOrderDetails($orderId);
            if (!$orderData) {
                throw new Exception("No se encontró la orden con ID $orderId");
            }

            // 2. Determinar el siguiente nivel de aprobación requerido
            $currentApprovalStatus = intval($orderData['approval_status']);
            $nextApprovalLevel = $currentApprovalStatus + 1;

            // 3. Buscar un usuario con el nivel de aprobación requerido
            $sql = "SELECT id, name, email FROM User WHERE authorization_level = ? LIMIT 1";
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("i", $nextApprovalLevel);
            $stmt->execute();
            $result = $stmt->get_result();

            // 4. Si no hay usuario con ese nivel, probar con niveles superiores
            if ($result->num_rows === 0) {
                $attempts = 1;
                $maxAttempts = 3; // Límite para evitar bucles infinitos
                
                while ($result->num_rows === 0 && $attempts < $maxAttempts) {
                    $nextApprovalLevel++;
                    $stmt = $this->db->prepare($sql);
                    $stmt->bind_param("i", $nextApprovalLevel);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $attempts++;
                }
                
                // 5. Si después de los intentos no encontramos aprobador, finalizar
                if ($result->num_rows === 0) {
                    error_log("No se encontró ningún aprobador para la orden $orderId después de $attempts intentos");
                    return false;
                }
            }

            // 6. Obtener los datos del aprobador encontrado
            $approver = $result->fetch_assoc();

            // 7. Generar tokens únicos para las acciones de aprobar/rechazar
            $approvalToken = $this->generateActionToken($orderId, $approver['id'], 'approve');
            $rejectToken = $this->generateActionToken($orderId, $approver['id'], 'reject');

            // 8. Crear el cuerpo HTML del correo con los tokens generados
            $emailBody = $this->createApprovalEmailBody($orderData, $approvalToken, $rejectToken);

            // 9. Configurar los parámetros del correo (destinatario y asunto)
            $this->mail->clearAddresses();
            $this->mail->addAddress($approver['email'], $approver['name']);
            $this->mail->Subject = "Premium Freight - Orden #{$orderId} necesita tu aprobación";
            $this->mail->Body = $emailBody;

            // 10. Enviar el correo electrónico
            $result = $this->mail->send();

            // 11. Registrar la notificación en la base de datos si se envió correctamente
            if ($result) {
                $this->logNotification($orderId, $approver['id'], 'approval_request');
            }

            // 12. Retornar el resultado del envío
            return $result;
        } catch (Exception $e) {
            // 13. Registrar cualquier error que ocurra durante el proceso
            error_log("Error en sendApprovalNotification: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Envía un correo resumen semanal a usuarios con órdenes pendientes de aprobación
     * Se envía los viernes al mediodía
     * 
     * @return array - Resultado del envío: [totalSent, success, errors]
     */
    public function sendWeeklySummaryEmails() {
        // 1. Inicializar estructura para resultados
        $result = [
            'totalSent' => 0,
            'success' => 0,
            'errors' => []
        ];

        try {
            // 2. Obtener todos los usuarios con nivel de aprobación
            $sql = "SELECT id, name, email, authorization_level FROM User 
                    WHERE authorization_level > 0 
                    ORDER BY authorization_level";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            // 3. Procesar cada usuario para enviar su resumen personalizado
            foreach ($users as $user) {
                try {
                    // 4. Buscar órdenes pendientes para el nivel de aprobación de este usuario
                    $level = $user['authorization_level'];
                    $sql = "SELECT pf.*, 
                                u.name AS creator_name, 
                                u.email AS creator_email,
                                lo_from.company_name AS origin_company_name,
                                lo_to.company_name AS destiny_company_name,
                                c.name AS carrier,
                                st.name AS status_name,
                                pfa.act_approv AS approval_status
                            FROM PremiumFreight pf
                            LEFT JOIN User u ON pf.user_id = u.id
                            LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
                            LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
                            LEFT JOIN Carriers c ON pf.carrier_id = c.id
                            LEFT JOIN Status st ON pf.status_id = st.id
                            LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
                            WHERE pfa.act_approv = ? 
                            AND pf.status_id != 4
                            ORDER BY pf.date DESC";
                    $stmt = $this->db->prepare($sql);
                    $prevLevel = $level - 1;
                    $stmt->bind_param("i", $prevLevel);
                    $stmt->execute();
                    $pendingOrders = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

                    // 5. Si no hay órdenes pendientes para este usuario, continuar con el siguiente
                    if (empty($pendingOrders)) {
                        continue;
                    }

                    // 6. Incrementar contador de correos a enviar
                    $result['totalSent']++;

                    // 7. Generar tokens para acciones en bloque (aprobar/rechazar todas)
                    $orderIds = array_column($pendingOrders, 'id');
                    $approveAllToken = $this->generateBulkActionToken($user['id'], 'approve', $orderIds);
                    $rejectAllToken = $this->generateBulkActionToken($user['id'], 'reject', $orderIds);

                    // 8. Generar URLs para acciones en bloque
                    $approveAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=approve&token=$approveAllToken";
                    $rejectAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=reject&token=$rejectAllToken";

                    // 9. Crear filas de tabla HTML para cada orden pendiente
                    $tableRows = '';
                    foreach ($pendingOrders as $order) {
                        // 10. Generar tokens individuales para cada orden
                        $approveToken = $this->generateActionToken($order['id'], $user['id'], 'approve');
                        $rejectToken = $this->generateActionToken($order['id'], $user['id'], 'reject');
                        $approveUrl = $this->baseUrl . "PFmailAction.php?action=approve&token=$approveToken";
                        $rejectUrl = $this->baseUrl . "PFmailAction.php?action=reject&token=$rejectToken";
                        $costEuros = number_format($order['cost_euros'], 2);

                        // 11. Agregar fila a la tabla HTML
                        $tableRows .= "
                        <tr>
                            <td>{$order['id']}</td>
                            <td>{$order['planta']} ({$order['code_planta']})</td>
                            <td>{$order['description']}</td>
                            <td>€{$costEuros}</td>
                            <td>{$order['transport']}</td>
                            <td>
                                <a href='{$approveUrl}' style='color: #28a745; margin-right: 10px;'>Aprobar</a>
                                <a href='{$rejectUrl}' style='color: #dc3545;'>Rechazar</a>
                            </td>
                        </tr>";
                    }

                    // 12. Crear el cuerpo completo del correo con HTML y estilos
                    $emailBody = "
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                            .header { text-align: center; padding: 10px; background-color: #f5f5f5; }
                            .content { padding: 20px; background-color: #fff; }
                            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                            th { background-color: #f2f2f2; }
                            .actions { text-align: center; margin: 30px 0; }
                            .btn { display: inline-block; padding: 10px 20px; margin: 10px 5px; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; }
                            .btn-approve { background-color: #28a745; }
                            .btn-reject { background-color: #dc3545; }
                            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
                        </style>
                    </head>
                    <body>
                        <div class='container'>
                            <div class='header'>
                                <h2>Resumen Semanal de Premium Freight</h2>
                            </div>
                            <div class='content'>
                                <p>Hola {$user['name']},</p>
                                <p>Tienes " . count($pendingOrders) . " órdenes de Premium Freight pendientes de tu aprobación. Por favor, revisa los detalles a continuación:</p>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Planta</th>
                                            <th>Descripción</th>
                                            <th>Costo (€)</th>
                                            <th>Transporte</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        $tableRows
                                    </tbody>
                                </table>
                                <div class='actions'>
                                    <p>¿Quieres procesar todas las órdenes a la vez?</p>
                                    <a href='$approveAllUrl' class='btn btn-approve'>Aprobar Todas</a>
                                    <a href='$rejectAllUrl' class='btn btn-reject'>Rechazar Todas</a>
                                </div>
                                <p>También puedes ver todas tus órdenes pendientes <a href='{$this->baseUrl}orders.php'>en el sistema</a>.</p>
                            </div>
                            <div class='footer'>
                                <p>Este es un mensaje automático del Sistema de Premium Freight. Por favor, no respondas a este correo.</p>
                            </div>
                        </div>
                    </body>
                    </html>";

                    // 13. Configurar el destinatario y asunto del correo
                    $this->mail->clearAddresses();
                    $this->mail->addAddress($user['email'], $user['name']);
                    $this->mail->Subject = "Premium Freight - Resumen Semanal de Órdenes Pendientes";
                    $this->mail->Body = $emailBody;

                    // 14. Enviar el correo y registrar el resultado
                    if ($this->mail->send()) {
                        $result['success']++;
                        // 15. Registrar cada notificación en la base de datos
                        foreach ($pendingOrders as $order) {
                            $this->logNotification($order['id'], $user['id'], 'weekly_summary');
                        }
                    } else {
                        $result['errors'][] = "No se pudo enviar el correo a {$user['email']}";
                    }
                } catch (Exception $e) {
                    // 16. Registrar errores específicos para cada usuario
                    $result['errors'][] = "Error al procesar el usuario {$user['id']}: " . $e->getMessage();
                }
            }
            // 17. Retornar resultado completo del proceso
            return $result;
        } catch (Exception $e) {
            // 18. Registrar errores generales del proceso
            $result['errors'][] = "Error general: " . $e->getMessage();
            return $result;
        }
    }

    /**
     * Envía notificación al creador de la orden cuando ésta ha sido completamente aprobada o rechazada
     * 
     * @param int $orderId - ID de la orden de Premium Freight
     * @param string $status - Estado final: 'approved' o 'rejected'
     * @param array $rejectorInfo - Información del usuario que rechazó la orden (solo para rechazos)
     * @return bool - true si el correo se envió correctamente, false en caso contrario
     */
    public function sendStatusNotification($orderId, $status, $rejectorInfo = null) {
        try {
            // 1. Validar que el estado sea válido (approved o rejected)
            if ($status !== 'approved' && $status !== 'rejected') {
                throw new Exception("Estado no válido: $status. Solo se permite 'approved' o 'rejected'");
            }
            
            // 2. Obtener los datos completos de la orden desde la base de datos
            $orderData = $this->getOrderDetails($orderId);
            if (!$orderData) {
                throw new Exception("No se encontró la orden con ID $orderId");
            }

            // 3. Verificar que la orden tenga un creador válido con correo
            if (empty($orderData['user_id']) || empty($orderData['creator_email'])) {
                throw new Exception("La orden no tiene un creador válido");
            }

            // 4. Crear el cuerpo del correo según el estado (aprobado/rechazado)
            $emailBody = $this->createStatusNotificationEmailBody($orderData, $status, $rejectorInfo);

            // 5. Configurar el destinatario principal (creador de la orden)
            $this->mail->clearAddresses();
            $this->mail->addAddress($orderData['creator_email'], $orderData['creator_name']);

            // 6. Añadir en copia al gerente de planta si está disponible
            if (!empty($orderData['plant_manager_email'])) {
                $this->mail->addCC($orderData['plant_manager_email'], $orderData['plant_manager_name']);
            }

            // 7. Establecer el asunto según el estado de la orden
            $statusText = ($status === 'approved') ? 'Aprobada' : 'Rechazada';
            $this->mail->Subject = "Premium Freight - Orden #{$orderId} {$statusText}";
            $this->mail->Body = $emailBody;

            // 8. Enviar el correo electrónico
            $result = $this->mail->send();

            // 9. Registrar la notificación en la base de datos si se envió correctamente
            if ($result) {
                $notificationType = ($status === 'approved') ? 'status_approved' : 'status_rejected';
                $this->logNotification($orderId, $orderData['user_id'], $notificationType);
            }

            // 10. Retornar el resultado del envío
            return $result;
        } catch (Exception $e) {
            // 11. Registrar cualquier error que ocurra durante el proceso
            error_log("Error en sendStatusNotification: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Crea el cuerpo del correo de notificación de estado final
     * 
     * @param array $orderData - Datos de la orden
     * @param string $status - Estado final: 'approved' o 'rejected'
     * @param array $rejectorInfo - Información del usuario que rechazó la orden (solo para rechazos)
     * @return string - HTML del cuerpo del correo
     */
    private function createStatusNotificationEmailBody($orderData, $status, $rejectorInfo = null) {
        // 1. Preparar la URL para ver la orden en el sistema
        $viewOrderUrl = $this->baseUrl . "orders.php?highlight=" . $orderData['id'];
        
        // 2. Formatear el costo para mostrarlo con dos decimales
        $costEuros = number_format($orderData['cost_euros'], 2);
        
        // 3. Generar contenido SVG para visualización de la orden
        $svgContent = $this->generateOrderSVG($orderData);

        // 4. Definir mensaje y estilos según el estado (aprobado/rechazado)
        if ($status === 'approved') {
            // 4.1. Configuración para órdenes aprobadas
            $statusMessage = "Tu orden de Premium Freight ha sido completamente <strong>aprobada</strong>.";
            $statusColor = "#28a745";
            $statusIcon = "✓";
        } else {
            // 4.2. Configuración para órdenes rechazadas
            $statusMessage = "Tu orden de Premium Freight ha sido <strong>rechazada</strong>.";
            if ($rejectorInfo) {
                $statusMessage .= " El rechazo fue realizado por {$rejectorInfo['name']}. ";
            }
            $statusColor = "#dc3545";
            $statusIcon = "✗";
        }

        // 5. Construir el HTML completo del correo con estilos integrados
        $html = "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 650px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 10px; }
                .content { padding: 20px; background-color: #fff; }
                .status-badge { 
                    display: inline-block;
                    padding: 10px 20px;
                    background-color: $statusColor;
                    color: #fff;
                    border-radius: 20px;
                    font-size: 18px;
                    margin: 20px 0;
                }
                .order-details { margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <img src='{$this->baseUrl}assets\logo\logo.png' alt='Premium Freight Logo' style='max-width: 200px;'>
                    <h2>Notificación de Estado de Orden</h2>
                </div>
                <div class='content'>
                    <p>Hola {$orderData['creator_name']},</p>
                    <p>{$statusMessage}</p>
                    <div class='status-badge'>
                        {$statusIcon} " . strtoupper($status) . "
                    </div>
                    <div class='order-details'>
                        <p><strong>ID de la Orden:</strong> {$orderData['id']}</p>
                        <p><strong>Planta:</strong> {$orderData['planta']} ({$orderData['code_planta']})</p>
                        <p><strong>Descripción:</strong> {$orderData['description']}</p>
                        <p><strong>Costo:</strong> €{$costEuros}</p>
                        <p><strong>Transporte:</strong> {$orderData['transport']}</p>
                    </div>
                    <div>
                        <a href='{$viewOrderUrl}' style='display:inline-block;padding:10px 20px;background-color:#034C8C;color:white;text-decoration:none;border-radius:4px;'>Ver Orden</a>
                    </div>
                    <div style='margin-top:30px;'>$svgContent</div>
                </div>
                <div class='footer'>
                    <p>Este es un mensaje automático del Sistema de Premium Freight. Por favor, no respondas a este correo.</p>
                </div>
            </div>
        </body>
        </html>
        ";
        
        // 6. Retornar el HTML completo
        return $html;
    }

    /**
     * Genera un token para acciones en bloque (ej. aprobar todas las órdenes)
     *
     * @param int $userId - ID del usuario
     * @param string $action - Acción: 'approve' o 'reject'
     * @param array $orderIds - IDs de órdenes a procesar
     * @return string - Token generado
     */
    private function generateBulkActionToken($userId, $action, $orderIds) {
        // 1. Generar un token aleatorio seguro
        $token = bin2hex(random_bytes(16));
        
        // 2. Convertir el array de IDs a formato JSON para almacenamiento
        $serializedOrderIds = json_encode($orderIds);
        
        // 3. Preparar la consulta SQL para insertar el token
        $sql = "INSERT INTO EmailBulkActionTokens (token, order_ids, user_id, action, created_at) VALUES (?, ?, ?, ?, NOW())";
        
        // 4. Preparar y ejecutar la consulta con parámetros
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("ssis", $token, $serializedOrderIds, $userId, $action);
        $stmt->execute();
        
        // 5. Retornar el token generado
        return $token;
    }

    /**
     * Genera un token único para acciones de aprobación/rechazo por correo
     * 
     * @param int $orderId - ID de la orden
     * @param int $userId - ID del usuario
     * @param string $action - Acción: 'approve' o 'reject'
     * @return string - Token generado
     */
    private function generateActionToken($orderId, $userId, $action) {
        // 1. Generar un token aleatorio seguro de 32 caracteres
        $token = bin2hex(random_bytes(16));
        
        // 2. Preparar la consulta SQL para insertar el token en la base de datos
        $sql = "INSERT INTO EmailActionTokens (token, order_id, user_id, action, created_at) VALUES (?, ?, ?, ?, NOW())";
        
        // 3. Preparar y ejecutar la consulta con parámetros
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("siis", $token, $orderId, $userId, $action);
        $stmt->execute();
        
        // 4. Retornar el token generado
        return $token;
    }

    /**
     * Crea el cuerpo HTML del correo de solicitud de aprobación
     * 
     * @param array $orderData - Datos de la orden
     * @param string $approvalToken - Token para aprobar
     * @param string $rejectToken - Token para rechazar
     * @return string - HTML del cuerpo del correo
     */
    private function createApprovalEmailBody($orderData, $approvalToken, $rejectToken) {
        // 1. Generar URLs para las acciones de aprobación/rechazo con los tokens
        $approveUrl = $this->baseUrl . "PFmailAction.php?action=approve&token=$approvalToken";
        $rejectUrl = $this->baseUrl . "PFmailAction.php?action=reject&token=$rejectToken";
        
        // 2. Generar URL para ver la orden en el sistema
        $viewOrderUrl = $this->baseUrl . "orders.php?highlight=" . $orderData['id'];
        
        // 3. Formatear el costo para mostrarlo con dos decimales
        $costEuros = number_format($orderData['cost_euros'], 2);
        
        // 4. Generar contenido SVG para visualización de la orden
        $svgContent = $this->generateOrderSVG($orderData);

        // 5. Construir el HTML completo del correo con estilos integrados
        $html = "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 650px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 10px; }
                .content { padding: 20px; background-color: #fff; }
                .actions { margin: 30px 0; text-align: center; }
                .btn { display: inline-block; padding: 10px 20px; margin: 10px 5px; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; }
                .btn-approve { background-color: #28a745; }
                .btn-reject { background-color: #dc3545; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <img src='{$this->baseUrl}PremiumFreight.svg' alt='Premium Freight Logo' style='max-width: 200px;'>
                    <h2>Solicitud de Aprobación de Orden</h2>
                </div>
                <div class='content'>
                    <p>Hola, tienes una orden pendiente de aprobación:</p>
                    <div>
                        <p><strong>ID de la Orden:</strong> {$orderData['id']}</p>
                        <p><strong>Planta:</strong> {$orderData['planta']} ({$orderData['code_planta']})</p>
                        <p><strong>Descripción:</strong> {$orderData['description']}</p>
                        <p><strong>Costo:</strong> €{$costEuros}</p>
                        <p><strong>Transporte:</strong> {$orderData['transport']}</p>
                    </div>
                    <div class='actions'>
                        <a href='{$approveUrl}' class='btn btn-approve'>Aprobar</a>
                        <a href='{$rejectUrl}' class='btn btn-reject'>Rechazar</a>
                        <a href='{$viewOrderUrl}' class='btn' style='background-color:#034C8C;'>Ver Orden</a>
                    </div>
                    <div style='margin-top:30px;'>$svgContent</div>
                </div>
                <div class='footer'>
                    <p>Este es un mensaje automático del Sistema de Premium Freight. Por favor, no respondas a este correo.</p>
                </div>
            </div>
        </body>
        </html>
        ";
        
        // 6. Retornar el HTML completo
        return $html;
    }

    /**
     * Genera una representación SVG de la orden
     * 
     * @param array $orderData - Datos de la orden
     * @return string - Código SVG
     */
    private function generateOrderSVG($orderData) {
        // 1. Por ahora simplemente devolvemos una imagen genérica
        // Este método podría expandirse para generar un SVG personalizado según los datos
        return "<div style='text-align:center;'><img src='{$this->baseUrl}PremiumFreight.svg' alt='Order Diagram' style='max-width:100%;'></div>";
    }

    /**
     * Registra una notificación enviada en la base de datos
     * 
     * @param int $orderId - ID de la orden
     * @param int $userId - ID del usuario destinatario
     * @param string $type - Tipo de notificación
     * @return bool - true si se registró correctamente
     */
    private function logNotification($orderId, $userId, $type) {
        // 1. Preparar la consulta SQL para registrar la notificación
        $sql = "INSERT INTO EmailNotifications (order_id, user_id, type, sent_at) VALUES (?, ?, ?, NOW())";
        
        // 2. Preparar y ejecutar la consulta con parámetros
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("iis", $orderId, $userId, $type);
        
        // 3. Retornar el resultado de la ejecución
        return $stmt->execute();
    }

    /**
     * Obtiene un usuario por su ID (Método público)
     * 
     * @param int $userId - ID del usuario
     * @return array|null - Datos del usuario o null si no se encuentra
     */
    public function getUser($userId) {
        // 1. Preparar la consulta SQL para obtener datos del usuario
        $sql = "SELECT id, name, email FROM User WHERE id = ? LIMIT 1";
        
        // 2. Preparar y ejecutar la consulta con parámetros
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        
        // 3. Obtener el resultado de la consulta
        $result = $stmt->get_result();
        
        // 4. Retornar los datos del usuario o null si no se encontró
        return ($result->num_rows > 0) ? $result->fetch_assoc() : null;
    }

    /**
     * Obtiene las órdenes pendientes de recovery evidence para un usuario específico
     * 
     * @param int $userId - ID del usuario
     * @return array - Lista de órdenes pendientes
     */
    public function getPendingRecoveryOrdersByUser($userId) {
        // 1. Preparar la consulta SQL para obtener órdenes pendientes de evidence
        $sql = "SELECT * FROM PremiumFreight WHERE user_id = ? AND recovery_file IS NOT NULL AND (recovery_evidence IS NULL OR recovery_evidence = '')";
        
        // 2. Preparar y ejecutar la consulta con parámetros
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        
        // 3. Retornar todas las órdenes encontradas
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    /**
     * Obtiene los detalles de una orden (Método público)
     * 
     * @param int $orderId - ID de la orden
     * @return array|null - Datos de la orden o null si no se encuentra
     */
    public function getOrder($orderId) {
        // 1. Delegar la llamada al método privado que obtiene los detalles
        return $this->getOrderDetails($orderId);
    }

    /**
     * Obtiene los detalles completos de una orden
     * 
     * @param int $orderId - ID de la orden
     * @return array|null - Datos de la orden o null si no se encuentra
     */
    private function getOrderDetails($orderId) {
        // 1. Preparar la consulta SQL con múltiples JOIN para obtener todos los detalles
        $sql = "SELECT pf.*, 
                    u.name AS creator_name, 
                    u.email AS creator_email,
                    u.id AS user_id,
                    lo_from.company_name AS origin_company_name,
                    lo_to.company_name AS destiny_company_name,
                    c.name AS carrier,
                    st.name AS status_name,
                    pfa.act_approv AS approval_status
                FROM PremiumFreight pf
                LEFT JOIN User u ON pf.user_id = u.id
                LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
                LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
                LEFT JOIN Carriers c ON pf.carrier_id = c.id
                LEFT JOIN Status st ON pf.status_id = st.id
                LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
                WHERE pf.id = ? LIMIT 1";
        
        // 2. Preparar y ejecutar la consulta con parámetros
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        
        // 3. Obtener el resultado de la consulta
        $result = $stmt->get_result();
        
        // 4. Retornar los datos de la orden o null si no se encontró
        return ($result->num_rows > 0) ? $result->fetch_assoc() : null;
    }

    /**
     * Envía un correo de recordatorio de recovery evidence a un usuario
     * 
     * @param array $user - Datos del usuario
     * @param array $orders - Lista de órdenes pendientes
     * @return bool - true si el correo se envió correctamente
     */
    public function sendRecoveryCheckEmail($user, $orders) {
        try {
            // 1. Crear el cuerpo del correo con la información de órdenes pendientes
            $emailBody = $this->createRecoveryCheckEmailBody($orders, $user);
            
            // 2. Configurar destinatario y asunto del correo
            $this->mail->clearAddresses();
            $this->mail->addAddress($user['email'], $user['name']);
            $this->mail->Subject = "Premium Freight - Recordatorio de Evidencia de Recovery";
            $this->mail->Body = $emailBody;
            
            // 3. Enviar el correo y retornar el resultado
            return $this->mail->send();
        } catch (Exception $e) {
            // 4. Registrar cualquier error que ocurra durante el proceso
            error_log("Error en sendRecoveryCheckEmail: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Crea el cuerpo del correo de recordatorio de recovery evidence
     * 
     * @param array $orders - Lista de órdenes pendientes
     * @param array $user - Datos del usuario destinatario
     * @return string - HTML del cuerpo del correo
     */
    private function createRecoveryCheckEmailBody($orders, $user) {
        // 1. Preparar la URL base para subir evidencias
        $evidenceUrlBase = $this->baseUrl . "evidence.php?order=";
        
        // 2. Inicializar la variable para las filas de la tabla
        $tableRows = '';
        
        // 3. Generar una fila de tabla para cada orden pendiente
        foreach ($orders as $order) {
            $evidenceUrl = $evidenceUrlBase . $order['id'];
            $tableRows .= "
                <tr>
                    <td>{$order['id']}</td>
                    <td>{$order['planta']}</td>
                    <td>{$order['description']}</td>
                    <td><a href='{$evidenceUrl}'>Subir Evidencia</a></td>
                </tr>";
        }
        
        // 4. Preparar la URL para ver todas las órdenes pendientes
        $allOrdersUrl = $this->baseUrl . "orders.php?filter=recovery";
        
        // 5. Construir el HTML completo del correo con estilos integrados
        $html = "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 650px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 10px; }
                .content { padding: 20px; background-color: #fff; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h2>Recordatorio de Evidencia de Recovery</h2>
                </div>
                <div class='content'>
                    <p>Hola {$user['name']},</p>
                    <p>Tienes las siguientes órdenes de Premium Freight que requieren subir evidencia de recovery:</p>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Planta</th>
                                <th>Descripción</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            $tableRows
                        </tbody>
                    </table>
                    <p>Puedes ver todas tus órdenes pendientes <a href='$allOrdersUrl'>aquí</a>.</p>
                </div>
                <div class='footer'>
                    <p>Este es un mensaje automático del Sistema de Premium Freight. Por favor, no respondas a este correo.</p>
                </div>
            </div>
        </body>
        </html>
        ";
        
        // 6. Retornar el HTML completo
        return $html;
    }

    /**
     * Devuelve la conexión a la base de datos
     * 
     * @return mysqli - Objeto de conexión a la base de datos
     */
    public function getDatabase() {
        // 1. Retornar la conexión a la base de datos
        return $this->db;
    }
}
?>
<?php
if ($isFullyApproved) {
    // 9.2. Si está completamente aprobada, notificar al creador
    $mailer->sendStatusNotification($orderId, 'approved');
    file_put_contents($logFile, "Notificación de aprobación completa enviada al creador de la orden #$orderId\n", FILE_APPEND);
} else {
    // 9.3. Si aún necesita más aprobaciones, notificar al siguiente aprobador
    $mailer->sendApprovalNotification($orderId);
    file_put_contents($logFile, "Notificación enviada al siguiente aprobador para la orden #$orderId\n", FILE_APPEND);
}