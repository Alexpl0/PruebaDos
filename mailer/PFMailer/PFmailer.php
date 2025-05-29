<?php
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
            // 1. Obtener los detalles completos de la orden desde la base de datos
            $orderData = $this->getOrderDetails($orderId);
            
            // 2. Validar si se encontraron datos de la orden
            if (!$orderData) {
                error_log("No se encontraron datos para la orden #$orderId");
                return false;
            }

            // 3. Determinar quién debe recibir la notificación según el nivel de aprobación actual
            $nextApprovers = $this->getNextApprovers($orderId);
            
            // 4. Si no hay aprobadores disponibles, no enviar correo
            if (empty($nextApprovers)) {
                error_log("No se encontraron aprobadores para la orden #$orderId");
                return false;
            }

            // 5. Variable para rastrear si al menos un correo se envió exitosamente
            $emailsSent = false;

            // 6. Enviar correo a cada aprobador identificado
            foreach ($nextApprovers as $approver) {
                // 6.1. Generar tokens únicos para las acciones de aprobar/rechazar
                $approvalToken = $this->generateActionToken($orderId, $approver['id'], 'approve');
                $rejectToken = $this->generateActionToken($orderId, $approver['id'], 'reject');
                
                // 6.2. Crear el contenido HTML del correo
                $emailBody = $this->createApprovalEmailBody($orderData, $approvalToken, $rejectToken);
                
                // 6.3. Configurar destinatario y asunto del correo
                $this->mail->clearAddresses();
                $this->mail->addAddress($approver['email'], $approver['name']);
                $this->mail->Subject = "Premium Freight Approval Required - Order #{$orderId}";
                $this->mail->Body = $emailBody;
                
                // 6.4. Intentar enviar el correo
                if ($this->mail->send()) {
                    // 6.5. Registrar la notificación en la base de datos
                    $this->logNotification($orderId, $approver['id'], 'approval_request');
                    $emailsSent = true;
                    error_log("Correo de aprobación enviado a {$approver['email']} para orden #$orderId");
                } else {
                    error_log("Error enviando correo a {$approver['email']}: " . $this->mail->ErrorInfo);
                }
            }

            // 7. Retornar true si al menos un correo se envió
            return $emailsSent;
            
        } catch (Exception $e) {
            // 8. Registrar cualquier error que ocurra durante el proceso
            error_log("Error en sendApprovalNotification: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Obtiene los usuarios que deben aprobar el siguiente nivel de una orden
     * 
     * @param int $orderId - ID de la orden
     * @return array - Lista de usuarios que pueden aprobar el siguiente nivel
     */
    private function getNextApprovers($orderId) {
        try {
            // 1. Obtener el estado actual de aprobación y los datos de la orden
            $sql = "SELECT PF.user_id, PF.required_auth_level, 
                           COALESCE(PFA.act_approv, 0) as current_approval_level,
                           U.plant as order_plant
                    FROM PremiumFreight PF
                    LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id
                    INNER JOIN User U ON PF.user_id = U.id
                    WHERE PF.id = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("i", $orderId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            // 2. Verificar si se encontró la orden
            if ($result->num_rows === 0) {
                return [];
            }
            
            $orderInfo = $result->fetch_assoc();
            $currentApprovalLevel = $orderInfo['current_approval_level'];
            $requiredAuthLevel = $orderInfo['required_auth_level'];
            $orderPlant = $orderInfo['order_plant'];
            
            // 3. Verificar si la orden ya está completamente aprobada o rechazada
            if ($currentApprovalLevel >= $requiredAuthLevel || $currentApprovalLevel == 99) {
                return [];
            }
            
            // 4. Calcular el siguiente nivel de autorización requerido
            $nextAuthLevel = $currentApprovalLevel + 1;
            
            // 5. Obtener usuarios con el nivel de autorización exacto y la misma planta
            $approversSql = "SELECT id, name, email, authorization_level, plant 
                            FROM User 
                            WHERE authorization_level = ? 
                            AND plant = ? 
                            AND active = 1";
            
            $approversStmt = $this->db->prepare($approversSql);
            $approversStmt->bind_param("is", $nextAuthLevel, $orderPlant);
            $approversStmt->execute();
            $approversResult = $approversStmt->get_result();
            
            // 6. Retornar la lista de aprobadores encontrados
            return $approversResult->fetch_all(MYSQLI_ASSOC);
            
        } catch (Exception $e) {
            error_log("Error en getNextApprovers: " . $e->getMessage());
            return [];
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
            // 2. Obtener todas las órdenes que necesitan aprobación semanal
            $pendingOrders = $this->getPendingOrdersForWeeklySummary();
            
            // 3. Si no hay órdenes pendientes, retornar resultado vacío
            if (empty($pendingOrders)) {
                return $result;
            }
            
            // 4. Agrupar órdenes por usuario aprobador
            $ordersByApprover = $this->groupOrdersByApprover($pendingOrders);
            
            // 5. Enviar correo a cada aprobador con sus órdenes pendientes
            foreach ($ordersByApprover as $approverId => $userOrders) {
                try {
                    // 5.1. Obtener datos del usuario aprobador
                    $approver = $this->getUser($approverId);
                    
                    if (!$approver) {
                        $result['errors'][] = "User not found for ID: $approverId";
                        continue;
                    }
                    
                    // 5.2. Generar token para acciones en bloque
                    $orderIds = array_column($userOrders, 'id');
                    $approveAllToken = $this->generateBulkActionToken($approverId, 'approve', $orderIds);
                    $rejectAllToken = $this->generateBulkActionToken($approverId, 'reject', $orderIds);
                    
                    // 5.3. Crear el contenido del correo semanal
                    $emailBody = $this->createWeeklySummaryEmailBody($userOrders, $approver, $approveAllToken, $rejectAllToken);
                    
                    // 5.4. Configurar y enviar el correo
                    $this->mail->clearAddresses();
                    $this->mail->addAddress($approver['email'], $approver['name']);
                    $this->mail->Subject = "Weekly Premium Freight Summary - " . count($userOrders) . " Orders Pending Approval";
                    $this->mail->Body = $emailBody;
                    
                    // 5.5. Intentar enviar el correo
                    if ($this->mail->send()) {
                        $result['success']++;
                        
                        // 5.6. Registrar notificaciones para cada orden
                        foreach ($userOrders as $order) {
                            $this->logNotification($order['id'], $approverId, 'weekly_summary');
                        }
                        
                        error_log("Weekly summary sent to {$approver['email']} for " . count($userOrders) . " orders");
                    } else {
                        $result['errors'][] = "Failed to send to {$approver['email']}: " . $this->mail->ErrorInfo;
                    }
                    
                    $result['totalSent']++;
                    
                } catch (Exception $e) {
                    $result['errors'][] = "Error processing approver $approverId: " . $e->getMessage();
                }
            }
            
            return $result;
            
        } catch (Exception $e) {
            $result['errors'][] = "Error in sendWeeklySummaryEmails: " . $e->getMessage();
            return $result;
        }
    }

    /**
     * Obtiene todas las órdenes que requieren notificación semanal
     * 
     * @return array - Lista de órdenes pendientes de aprobación
     */
    private function getPendingOrdersForWeeklySummary() {
        try {
            // 1. Consulta para obtener órdenes que necesitan aprobación
            // Excluye órdenes completamente aprobadas (act_approv = required_auth_level) 
            // y órdenes rechazadas (act_approv = 99)
            $sql = "SELECT PF.id, PF.user_id, PF.required_auth_level, PF.cost_euros,
                           PF.created_at, PF.description, PF.supplier_name,
                           COALESCE(PFA.act_approv, 0) as current_approval_level,
                           U.name as creator_name, U.plant as order_plant
                    FROM PremiumFreight PF
                    LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id
                    INNER JOIN User U ON PF.user_id = U.id
                    WHERE PF.status_id IN (1, 2) 
                    AND (PFA.act_approv IS NULL OR 
                         (PFA.act_approv < PF.required_auth_level AND PFA.act_approv != 99))
                    ORDER BY PF.created_at DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $result = $stmt->get_result();
            
            // 2. Retornar todas las órdenes encontradas
            return $result->fetch_all(MYSQLI_ASSOC);
            
        } catch (Exception $e) {
            error_log("Error en getPendingOrdersForWeeklySummary: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Agrupa las órdenes pendientes por usuario aprobador según el nivel requerido
     * 
     * @param array $orders - Lista de órdenes pendientes
     * @return array - Órdenes agrupadas por ID de usuario aprobador
     */
    private function groupOrdersByApprover($orders) {
        $groupedOrders = [];
        
        try {
            foreach ($orders as $order) {
                // 1. Calcular el siguiente nivel de autorización requerido
                $nextAuthLevel = $order['current_approval_level'] + 1;
                $orderPlant = $order['order_plant'];
                
                // 2. Obtener usuarios con el nivel exacto de autorización y misma planta
                $approversSql = "SELECT id, name, email, authorization_level 
                                FROM User 
                                WHERE authorization_level = ? 
                                AND plant = ? 
                                AND active = 1";
                
                $stmt = $this->db->prepare($approversSql);
                $stmt->bind_param("is", $nextAuthLevel, $orderPlant);
                $stmt->execute();
                $approversResult = $stmt->get_result();
                
                // 3. Agregar la orden a cada aprobador correspondiente
                while ($approver = $approversResult->fetch_assoc()) {
                    if (!isset($groupedOrders[$approver['id']])) {
                        $groupedOrders[$approver['id']] = [];
                    }
                    
                    // 3.1. Agregar información adicional a la orden
                    $order['next_auth_level'] = $nextAuthLevel;
                    $order['approver_info'] = $approver;
                    
                    $groupedOrders[$approver['id']][] = $order;
                }
            }
            
            return $groupedOrders;
            
        } catch (Exception $e) {
            error_log("Error en groupOrdersByApprover: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Crea el contenido HTML del correo resumen semanal
     * 
     * @param array $orders - Lista de órdenes pendientes del usuario
     * @param array $approver - Datos del usuario aprobador
     * @param string $approveAllToken - Token para aprobar todas las órdenes
     * @param string $rejectAllToken - Token para rechazar todas las órdenes
     * @return string - HTML del cuerpo del correo
     */
    private function createWeeklySummaryEmailBody($orders, $approver, $approveAllToken, $rejectAllToken) {
        // 1. Generar URLs para acciones en bloque
        $approveAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=approve&token=$approveAllToken";
        $rejectAllUrl = $this->baseUrl . "PFmailBulkAction.php?action=reject&token=$rejectAllToken";
        
        // 2. Generar URL para ver todas las órdenes
        $viewAllOrdersUrl = $this->baseUrl . "orders.php";
        
        // 3. Calcular estadísticas
        $totalOrders = count($orders);
        $totalCost = array_sum(array_column($orders, 'cost_euros'));
        
        // 4. Generar filas de la tabla para cada orden
        $orderRows = '';
        foreach ($orders as $order) {
            $costFormatted = number_format($order['cost_euros'], 2);
            $createdDate = date('M d, Y', strtotime($order['created_at']));
            
            // 4.1. Generar tokens individuales para cada orden
            $approveToken = $this->generateActionToken($order['id'], $approver['id'], 'approve');
            $rejectToken = $this->generateActionToken($order['id'], $approver['id'], 'reject');
            
            $approveUrl = $this->baseUrl . "PFmailAction.php?action=approve&token=$approveToken";
            $rejectUrl = $this->baseUrl . "PFmailAction.php?action=reject&token=$rejectToken";
            $viewUrl = $this->baseUrl . "orders.php?highlight=" . $order['id'];
            
            $orderRows .= "
            <tr style='border-bottom: 1px solid #e9ecef;'>
                <td style='padding: 12px; text-align: center; font-weight: bold;'>#{$order['id']}</td>
                <td style='padding: 12px;'>" . htmlspecialchars($order['description'] ?? 'N/A') . "</td>
                <td style='padding: 12px;'>" . htmlspecialchars($order['supplier_name'] ?? 'N/A') . "</td>
                <td style='padding: 12px; text-align: center;'>€{$costFormatted}</td>
                <td style='padding: 12px; text-align: center;'>{$createdDate}</td>
                <td style='padding: 12px; text-align: center;'>
                    <a href='{$approveUrl}' 
                       style='background-color: #28a745; color: white; padding: 6px 12px; 
                              text-decoration: none; border-radius: 4px; margin-right: 5px; 
                              font-size: 12px; display: inline-block;'>✓ Approve</a>
                    <a href='{$rejectUrl}' 
                       style='background-color: #dc3545; color: white; padding: 6px 12px; 
                              text-decoration: none; border-radius: 4px; margin-right: 5px; 
                              font-size: 12px; display: inline-block;'>✗ Reject</a>
                    <a href='{$viewUrl}' 
                       style='background-color: #034C8C; color: white; padding: 6px 12px; 
                              text-decoration: none; border-radius: 4px; 
                              font-size: 12px; display: inline-block;'>👁 View</a>
                </td>
            </tr>";
        }
        
        // 5. Construir el HTML completo del correo
        $html = "
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
                .container { max-width: 800px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background-color: #034C8C; color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .stats { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .stats-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                .bulk-actions { text-align: center; margin: 20px 0; }
                .btn { display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 0 10px; }
                .btn-success { background-color: #28a745; color: white; }
                .btn-danger { background-color: #dc3545; color: white; }
                .btn-primary { background-color: #034C8C; color: white; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background-color: #034C8C; color: white; padding: 12px; text-align: left; }
                .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Weekly Premium Freight Summary</h1>
                    <p>Hello " . htmlspecialchars($approver['name']) . ", you have {$totalOrders} orders pending your approval</p>
                </div>
                
                <div class='content'>
                    <div class='stats'>
                        <h3>Summary Statistics</h3>
                        <div class='stats-row'>
                            <span><strong>Total Orders:</strong></span>
                            <span>{$totalOrders}</span>
                        </div>
                        <div class='stats-row'>
                            <span><strong>Total Value:</strong></span>
                            <span>€" . number_format($totalCost, 2) . "</span>
                        </div>
                        <div class='stats-row'>
                            <span><strong>Required Authorization Level:</strong></span>
                            <span>Level {$orders[0]['next_auth_level']}</span>
                        </div>
                    </div>
                    
                    <div class='bulk-actions'>
                        <h3>Quick Actions</h3>
                        <a href='{$approveAllUrl}' class='btn btn-success'>✓ Approve All Orders</a>
                        <a href='{$rejectAllUrl}' class='btn btn-danger'>✗ Reject All Orders</a>
                        <a href='{$viewAllOrdersUrl}' class='btn btn-primary'>👁 View All Orders</a>
                    </div>
                    
                    <h3>Orders Requiring Your Approval</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Description</th>
                                <th>Supplier</th>
                                <th>Cost</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {$orderRows}
                        </tbody>
                    </table>
                </div>
                
                <div class='footer'>
                    <p>This is an automated notification from the Premium Freight System.</p>
                    <p>Please do not reply to this email. For support, contact the system administrator.</p>
                </div>
            </div>
        </body>
        </html>";
        
        return $html;
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
            // 1. Obtener los detalles completos de la orden
            $orderData = $this->getOrderDetails($orderId);
            
            if (!$orderData) {
                error_log("No se encontraron datos para la orden #$orderId");
                return false;
            }
            
            // 2. Obtener datos del creador de la orden
            $creator = $this->getUser($orderData['user_id']);
            
            if (!$creator) {
                error_log("No se encontró el usuario creador para la orden #$orderId");
                return false;
            }
            
            // 3. Crear el contenido del correo según el estado
            $emailBody = $this->createStatusNotificationEmailBody($orderData, $status, $rejectorInfo);
            
            // 4. Configurar el asunto según el estado
            $subject = ($status === 'approved') ? 
                "Premium Freight Order #{$orderId} - Approved" : 
                "Premium Freight Order #{$orderId} - Rejected";
            
            // 5. Configurar y enviar el correo
            $this->mail->clearAddresses();
            $this->mail->addAddress($creator['email'], $creator['name']);
            $this->mail->Subject = $subject;
            $this->mail->Body = $emailBody;
            
            // 6. Intentar enviar el correo
            if ($this->mail->send()) {
                // 7. Registrar la notificación
                $notificationType = ($status === 'approved') ? 'status_approved' : 'status_rejected';
                $this->logNotification($orderId, $creator['id'], $notificationType);
                
                error_log("Status notification sent to {$creator['email']} for order #$orderId (status: $status)");
                return true;
            } else {
                error_log("Error sending status notification: " . $this->mail->ErrorInfo);
                return false;
            }
            
        } catch (Exception $e) {
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
     * Genera una representación SVG de la orden
     * 
     * @param array $orderData - Datos de la orden
     * @return string - Código SVG
     */
    private function generateOrderSVG($orderData) {
        // 1. Por ahora simplemente devolvemos una imagen genérica
        // Este método podría expandirse para generar un SVG personalizado según los datos
        return "<div style='text-align:center; margin: 20px 0;'><img src='{$this->baseUrl}PremiumFreight.svg' alt='Premium Freight Logo' style='max-width: 200px;'></div>";
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
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background-color: #034C8C; color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .order-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e9ecef; }
                .actions { text-align: center; margin: 30px 0; }
                .btn { display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 0 10px; }
                .btn-success { background-color: #28a745; color: white; }
                .btn-danger { background-color: #dc3545; color: white; }
                .btn-primary { background-color: #034C8C; color: white; }
                .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Premium Freight Approval Required</h1>
                    <h2>Order #{$orderData['id']}</h2>
                </div>
                
                <div class='content'>
                    <h2>A new Premium Freight order requires your approval</h2>
                    <p>Please review the following order details and take appropriate action:</p>
                    
                    <div class='order-details'>
                        <h3>Order Details</h3>
                        <div class='detail-row'>
                            <span><strong>Order ID:</strong></span>
                            <span>#{$orderData['id']}</span>
                        </div>
                        <div class='detail-row'>
                            <span><strong>Description:</strong></span>
                            <span>" . htmlspecialchars($orderData['description'] ?? 'N/A') . "</span>
                        </div>
                        <div class='detail-row'>
                            <span><strong>Supplier:</strong></span>
                            <span>" . htmlspecialchars($orderData['supplier_name'] ?? 'N/A') . "</span>
                        </div>
                        <div class='detail-row'>
                            <span><strong>Cost:</strong></span>
                            <span>€{$costEuros}</span>
                        </div>
                        <div class='detail-row'>
                            <span><strong>Created by:</strong></span>
                            <span>" . htmlspecialchars($orderData['creator_name'] ?? 'N/A') . "</span>
                        </div>
                        <div class='detail-row'>
                            <span><strong>Created:</strong></span>
                            <span>" . date('M d, Y H:i', strtotime($orderData['created_at'])) . "</span>
                        </div>
                    </div>
                    
                    {$svgContent}
                    
                    <div class='actions'>
                        <h3>Take Action</h3>
                        <a href='{$approveUrl}' class='btn btn-success'>✓ Approve Order</a>
                        <a href='{$rejectUrl}' class='btn btn-danger'>✗ Reject Order</a>
                        <a href='{$viewOrderUrl}' class='btn btn-primary'>👁 View Details</a>
                    </div>
                </div>
                
                <div class='footer'>
                    <p>This is an automated notification from the Premium Freight System.</p>
                    <p>Please do not reply to this email. For support, contact the system administrator.</p>
                </div>
            </div>
        </body>
        </html>";
        
        // 6. Retornar el HTML completo
        return $html;
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
        $sql = "SELECT id, name, email, authorization_level, plant FROM User WHERE id = ? LIMIT 1";
        
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
                       u.name as creator_name, u.email as creator_email, u.plant as creator_plant,
                       COALESCE(pfa.act_approv, 0) as current_approval_level
                FROM PremiumFreight pf
                LEFT JOIN User u ON pf.user_id = u.id
                LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
                WHERE pf.id = ?";
        
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
     * Envía correos de recordatorio de recovery evidence a todos los usuarios con órdenes pendientes
     * 
     * @return array - Resultado del envío con estadísticas
     */
    public function sendRecoveryCheckEmails() {
        $result = [
            'totalSent' => 0,
            'success' => 0,
            'errors' => []
        ];

        try {
            // 1. Obtener usuarios con órdenes pendientes de recovery evidence
            $sql = "SELECT DISTINCT pf.user_id, u.name, u.email 
                    FROM PremiumFreight pf
                    INNER JOIN User u ON pf.user_id = u.id
                    WHERE pf.recovery_file IS NOT NULL 
                    AND (pf.recovery_evidence IS NULL OR pf.recovery_evidence = '')
                    AND u.active = 1";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            
            // 2. Enviar correo a cada usuario con órdenes pendientes
            foreach ($users as $user) {
                try {
                    // 2.1. Obtener órdenes pendientes del usuario
                    $pendingOrders = $this->getPendingRecoveryOrdersByUser($user['user_id']);
                    
                    if (!empty($pendingOrders)) {
                        // 2.2. Enviar correo de recordatorio
                        if ($this->sendRecoveryCheckEmail($user, $pendingOrders)) {
                            $result['success']++;
                        } else {
                            $result['errors'][] = "Failed to send recovery check email to {$user['email']}";
                        }
                        
                        $result['totalSent']++;
                    }
                } catch (Exception $e) {
                    $result['errors'][] = "Error processing user {$user['user_id']}: " . $e->getMessage();
                }
            }
            
            return $result;
            
        } catch (Exception $e) {
            $result['errors'][] = "Error in sendRecoveryCheckEmails: " . $e->getMessage();
            return $result;
        }
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
            // 1. Crear el contenido del correo
            $emailBody = $this->createRecoveryCheckEmailBody($orders, $user);
            
            // 2. Configurar el correo
            $this->mail->clearAddresses();
            $this->mail->addAddress($user['email'], $user['name']);
            $this->mail->Subject = "Premium Freight - Recovery Evidence Required for " . count($orders) . " Orders";
            $this->mail->Body = $emailBody;
            
            // 3. Enviar el correo
            return $this->mail->send();
            
        } catch (Exception $e) {
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
            $costFormatted = number_format($order['cost_euros'], 2);
            $evidenceUrl = $evidenceUrlBase . $order['id'];
            $viewUrl = $this->baseUrl . "orders.php?highlight=" . $order['id'];
            
            $tableRows .= "
            <tr style='border-bottom: 1px solid #e9ecef;'>
                <td style='padding: 12px; text-align: center; font-weight: bold;'>#{$order['id']}</td>
                <td style='padding: 12px;'>" . htmlspecialchars($order['description'] ?? 'N/A') . "</td>
                <td style='padding: 12px; text-align: center;'>€{$costFormatted}</td>
                <td style='padding: 12px; text-align: center;'>" . date('M d, Y', strtotime($order['created_at'])) . "</td>
                <td style='padding: 12px; text-align: center;'>
                    <a href='{$evidenceUrl}' 
                       style='background-color: #28a745; color: white; padding: 6px 12px; 
                              text-decoration: none; border-radius: 4px; margin-right: 5px; 
                              font-size: 12px; display: inline-block;'>📎 Upload Evidence</a>
                    <a href='{$viewUrl}' 
                       style='background-color: #034C8C; color: white; padding: 6px 12px; 
                              text-decoration: none; border-radius: 4px; 
                              font-size: 12px; display: inline-block;'>👁 View</a>
                </td>
            </tr>";
        }
        
        // 4. Preparar la URL para ver todas las órdenes pendientes
        $allOrdersUrl = $this->baseUrl . "orders.php?filter=recovery";
        
        // 5. Construir el HTML completo del correo con estilos integrados
        $html = "
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
                .container { max-width: 800px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background-color: #ffc107; color: #212529; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background-color: #034C8C; color: white; padding: 12px; text-align: left; }
                .btn { display: inline-block; padding: 12px 24px; background-color: #034C8C; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; }
                .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>⚠️ Recovery Evidence Required</h1>
                    <p>Hello " . htmlspecialchars($user['name']) . ", you have " . count($orders) . " orders requiring recovery evidence</p>
                </div>
                
                <div class='content'>
                    <div class='warning'>
                        <h3>Action Required</h3>
                        <p>The following Premium Freight orders require you to upload recovery evidence. Please review each order and upload the necessary documentation to complete the process.</p>
                    </div>
                    
                    <h3>Orders Requiring Recovery Evidence</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Description</th>
                                <th>Cost</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {$tableRows}
                        </tbody>
                    </table>
                    
                    <div style='text-align: center; margin-top: 30px;'>
                        <a href='{$allOrdersUrl}' class='btn'>View All Pending Orders</a>
                    </div>
                </div>
                
                <div class='footer'>
                    <p>This is an automated notification from the Premium Freight System.</p>
                    <p>Please do not reply to this email. For support, contact the system administrator.</p>
                </div>
            </div>
        </body>
        </html>";
        
        // 6. Retornar el HTML completo
        return $html;
    }

    /**
     * Obtiene la conexión a la base de datos (Método público para testing)
     * 
     * @return mysqli - Objeto de conexión a la base de datos
     */
    public function getDatabase() {
        return $this->db;
    }
}
?>

