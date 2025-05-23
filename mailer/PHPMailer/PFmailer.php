<?php
/**
 * PFmailer.php - Sistema de notificaciones por email para Premium Freight
 * 
 * Este archivo contiene las funciones necesarias para enviar distintos tipos de 
 * notificaciones por correo electrónico relacionadas con las órdenes de Premium Freight.
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Importar la configuración global para acceder a la constante URL
require_once __DIR__ . 'config.php';

require '../Phpmailer/Exception.php';
require '../Phpmailer/PHPMailer.php';
require '../Phpmailer/SMTP.php';
require_once 'PFDB.php';

class PFMailer {
    private $mail;
    private $db;
    private $baseUrl;

    /**
     * Constructor - inicializa PHPMailer y la conexión a la base de datos
     */
    public function __construct() {
        // Inicializar la URL base desde la constante global
        $this->baseUrl = URL;
        
        // Inicializar PHPMailer
        $this->mail = new PHPMailer(true);
        $this->mail->isSMTP();
        $this->mail->Host = 'smtp.hostinger.com'; // Ajustar según el servidor SMTP utilizado
        $this->mail->SMTPAuth = true;
        $this->mail->Username = 'premium_freight@grammermx.com'; // Cambiar por el correo real
        $this->mail->Password = 'FreightSystem2025..'; // Cambiar por la contraseña real
        $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $this->mail->Port = 465;
        $this->mail->setFrom('premium_freight@grammermx.com', 'Premium Freight System');
        $this->mail->isHTML(true);
        $this->mail->CharSet = 'UTF-8';
        
        // Añadir BCC para todas las comunicaciones del sistema
        $this->mail->addBCC('extern.jesus.perez@grammer.com', 'Jesús Pérez');
        
        // Inicializar conexión a la base de datos
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
            // Obtener los datos de la orden
            $orderData = $this->getOrderDetails($orderId);
            if (!$orderData) {
                throw new Exception("No se encontró la orden con ID $orderId");
            }

            // Determinar el siguiente nivel de aprobación requerido
            $currentApprovalStatus = intval($orderData['approval_status']);
            $nextApprovalLevel = $currentApprovalStatus + 1;

            // Buscar un usuario con el nivel de aprobación requerido
            $sql = "SELECT id, name, email FROM User WHERE authorization_level = ? LIMIT 1";
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("i", $nextApprovalLevel);
            $stmt->execute();
            $result = $stmt->get_result();

            // Si no hay usuario con ese nivel, finalizamos
            if ($result->num_rows === 0) {
                return false;
            }

            // Obtenemos los datos del aprobador
            $approver = $result->fetch_assoc();

            // Generamos tokens para las acciones de aprobar/rechazar
            $approvalToken = $this->generateActionToken($orderId, $approver['id'], 'approve');
            $rejectToken = $this->generateActionToken($orderId, $approver['id'], 'reject');

            // Creamos el cuerpo del correo
            $emailBody = $this->createApprovalEmailBody($orderData, $approvalToken, $rejectToken);

            // Configurar destinatario y asunto
            $this->mail->clearAddresses();
            $this->mail->addAddress($approver['email'], $approver['name']);
            $this->mail->Subject = "Premium Freight - Orden #{$orderId} necesita tu aprobación";
            $this->mail->Body = $emailBody;

            // Enviar el correo
            $result = $this->mail->send();

            if ($result) {
                // Registrar la notificación
                $this->logNotification($orderId, $approver['id'], 'approval_request');
            }

            return $result;
        } catch (Exception $e) {
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
        $result = [
            'totalSent' => 0,
            'success' => 0,
            'errors' => []
        ];

        try {
            // Obtener usuarios con nivel de aprobación
            $sql = "SELECT id, name, email, authorization_level FROM User 
                    WHERE authorization_level > 0 
                    ORDER BY authorization_level";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            foreach ($users as $user) {
                try {
                    // Buscar órdenes pendientes para este nivel de aprobación
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

                    if (empty($pendingOrders)) {
                        continue;
                    }

                    $result['totalSent']++;

                    // Generar tokens para acciones en bloque
                    $orderIds = array_column($pendingOrders, 'id');
                    $approveAllToken = $this->generateBulkActionToken($user['id'], 'approve', $orderIds);
                    $rejectAllToken = $this->generateBulkActionToken($user['id'], 'reject', $orderIds);

                    // Generar URL para acciones en bloque
                    $approveAllUrl = $this->baseUrl . "mailer/PFmailBulkAction.php?action=approve&token=$approveAllToken";
                    $rejectAllUrl = $this->baseUrl . "mailer/PFmailBulkAction.php?action=reject&token=$rejectAllToken";

                    // Crear el contenido del correo
                    $tableRows = '';
                    foreach ($pendingOrders as $order) {
                        $approveToken = $this->generateActionToken($order['id'], $user['id'], 'approve');
                        $rejectToken = $this->generateActionToken($order['id'], $user['id'], 'reject');
                        $approveUrl = $this->baseUrl . "mailer/PFmailAction.php?action=approve&token=$approveToken";
                        $rejectUrl = $this->baseUrl . "mailer/PFmailAction.php?action=reject&token=$rejectToken";
                        $costEuros = number_format($order['cost_euros'], 2);

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

                    $this->mail->clearAddresses();
                    $this->mail->addAddress($user['email'], $user['name']);
                    $this->mail->Subject = "Premium Freight - Resumen Semanal de Órdenes Pendientes";
                    $this->mail->Body = $emailBody;

                    if ($this->mail->send()) {
                        $result['success']++;
                        foreach ($pendingOrders as $order) {
                            $this->logNotification($order['id'], $user['id'], 'weekly_summary');
                        }
                    } else {
                        $result['errors'][] = "No se pudo enviar el correo a {$user['email']}";
                    }
                } catch (Exception $e) {
                    $result['errors'][] = "Error al procesar el usuario {$user['id']}: " . $e->getMessage();
                }
            }
            return $result;
        } catch (Exception $e) {
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
            // Obtener los datos de la orden
            $orderData = $this->getOrderDetails($orderId);
            if (!$orderData) {
                throw new Exception("No se encontró la orden con ID $orderId");
            }

            // Verificar que la orden tenga un creador válido
            if (empty($orderData['user_id']) || empty($orderData['creator_email'])) {
                throw new Exception("La orden no tiene un creador válido");
            }

            // Crear el cuerpo del correo
            $emailBody = $this->createStatusNotificationEmailBody($orderData, $status, $rejectorInfo);

            // Configurar el correo
            $this->mail->clearAddresses();
            $this->mail->addAddress($orderData['creator_email'], $orderData['creator_name']);

            // Si hay un gerente de planta asociado, añadirlo en copia
            if (!empty($orderData['plant_manager_email'])) {
                $this->mail->addCC($orderData['plant_manager_email'], $orderData['plant_manager_name']);
            }

            // Establecer el asunto según el estado
            $statusText = ($status === 'approved') ? 'Aprobada' : 'Rechazada';
            $this->mail->Subject = "Premium Freight - Orden #{$orderId} {$statusText}";
            $this->mail->Body = $emailBody;

            $result = $this->mail->send();

            if ($result) {
                $notificationType = ($status === 'approved') ? 'status_approved' : 'status_rejected';
                $this->logNotification($orderId, $orderData['user_id'], $notificationType);
            }

            return $result;
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
        $viewOrderUrl = $this->baseUrl . "orders.php?highlight=" . $orderData['id'];
        $costEuros = number_format($orderData['cost_euros'], 2);
        $svgContent = $this->generateOrderSVG($orderData);

        // Mensaje y estilos según el estado
        if ($status === 'approved') {
            $statusMessage = "Tu orden de Premium Freight ha sido completamente <strong>aprobada</strong>.";
            $statusColor = "#28a745";
            $statusIcon = "✓";
        } else {
            $statusMessage = "Tu orden de Premium Freight ha sido <strong>rechazada</strong>.";
            if ($rejectorInfo) {
                $statusMessage .= " El rechazo fue realizado por {$rejectorInfo['name']}. ";
            }
            $statusColor = "#dc3545";
            $statusIcon = "✗";
        }

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
                    <img src='{$this->baseUrl}PremiumFreight.svg' alt='Premium Freight Logo' style='max-width: 200px;'>
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
        $token = bin2hex(random_bytes(16));
        $serializedOrderIds = json_encode($orderIds);
        $sql = "INSERT INTO EmailBulkActionTokens (token, order_ids, user_id, action, created_at) VALUES (?, ?, ?, ?, NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("ssis", $token, $serializedOrderIds, $userId, $action);
        $stmt->execute();
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
        $token = bin2hex(random_bytes(16));
        $sql = "INSERT INTO EmailActionTokens (token, order_id, user_id, action, created_at) VALUES (?, ?, ?, ?, NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("siis", $token, $orderId, $userId, $action);
        $stmt->execute();
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
        $approveUrl = $this->baseUrl . "mailer/PFmailAction.php?action=approve&token=$approvalToken";
        $rejectUrl = $this->baseUrl . "mailer/PFmailAction.php?action=reject&token=$rejectToken";
        $viewOrderUrl = $this->baseUrl . "orders.php?highlight=" . $orderData['id'];
        $costEuros = number_format($orderData['cost_euros'], 2);
        $svgContent = $this->generateOrderSVG($orderData);

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
        return $html;
    }

    /**
     * Genera una representación SVG de la orden
     * 
     * @param array $orderData - Datos de la orden
     * @return string - Código SVG
     */
    private function generateOrderSVG($orderData) {
        // Aquí puedes generar un SVG personalizado según los datos de la orden
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
        $sql = "INSERT INTO EmailNotifications (order_id, user_id, type, sent_at) VALUES (?, ?, ?, NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("iis", $orderId, $userId, $type);
        return $stmt->execute();
    }

    /**
     * Obtiene un usuario por su ID (Método público)
     * 
     * @param int $userId - ID del usuario
     * @return array|null - Datos del usuario o null si no se encuentra
     */
    public function getUser($userId) {
        $sql = "SELECT id, name, email FROM User WHERE id = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        return ($result->num_rows > 0) ? $result->fetch_assoc() : null;
    }

    /**
     * Obtiene las órdenes pendientes de recovery evidence para un usuario específico
     * 
     * @param int $userId - ID del usuario
     * @return array - Lista de órdenes pendientes
     */
    public function getPendingRecoveryOrdersByUser($userId) {
        $sql = "SELECT * FROM PremiumFreight WHERE user_id = ? AND recovery_file IS NOT NULL AND (recovery_evidence IS NULL OR recovery_evidence = '')";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    /**
     * Obtiene los detalles de una orden (Método público)
     * 
     * @param int $orderId - ID de la orden
     * @return array|null - Datos de la orden o null si no se encuentra
     */
    public function getOrder($orderId) {
        return $this->getOrderDetails($orderId);
    }

    /**
     * Obtiene los detalles completos de una orden
     * 
     * @param int $orderId - ID de la orden
     * @return array|null - Datos de la orden o null si no se encuentra
     */
    private function getOrderDetails($orderId) {
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
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $result = $stmt->get_result();
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
            $emailBody = $this->createRecoveryCheckEmailBody($orders, $user);
            $this->mail->clearAddresses();
            $this->mail->addAddress($user['email'], $user['name']);
            $this->mail->Subject = "Premium Freight - Recordatorio de Evidencia de Recovery";
            $this->mail->Body = $emailBody;
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
        $evidenceUrlBase = $this->baseUrl . "evidence.php?order=";
        $tableRows = '';
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
        $allOrdersUrl = $this->baseUrl . "orders.php?filter=recovery";
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
        return $html;
    }
}
?>