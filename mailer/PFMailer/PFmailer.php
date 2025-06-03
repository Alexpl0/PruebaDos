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

// 4. Importar las nuevas clases modulares
require_once 'PFEmailServices.php';
require_once 'PFEmailTemplates.php';

// 5. Definir constantes de URL si no están definidas
if (!defined('URLM')) {
    define('URLM', 'https://grammermx.com/Mailer/PFMailer/');
}

if(!defined('URLPF')) {
    define('URLPF', 'https://grammermx.com/Jesus/PruebaDos/');
}

class PFMailer {
    private $mail;
    private $services;
    private $templates;
    private $baseUrl;
    private $db; // Agregar esta propiedad

    /**
     * Constructor - inicializa PHPMailer y las dependencias
     */
    public function __construct() {
        // 1. Inicializar la URL base desde la constante global
        $this->baseUrl = URLM;
        
        // 2. Inicializar servicios y plantillas
        $this->services = new PFEmailServices();
        $this->templates = new PFEmailTemplates($this->baseUrl);
        
        // 3. Inicializar la conexión a la base de datos
        require_once 'PFDB.php';
        $con = new LocalConector();
        $this->db = $con->conectar();
        
        // 4. Inicializar la instancia de PHPMailer
        $this->mail = new PHPMailer(true);

        // 5. Configurar los parámetros SMTP para el envío de correos
        $this->mail->SMTPDebug = 0;
        $this->mail->isSMTP();
        $this->mail->Host = 'smtp.hostinger.com'; 
        $this->mail->Port = 465;
        $this->mail->SMTPAuth = true;
        $this->mail->Username = 'premium_freight@grammermx.com';
        $this->mail->Password = 'FreightSystem2025.';
        $this->mail->SMTPSecure = 'ssl';
        
        // 6. Configurar formato HTML y codificación de caracteres
        $this->mail->isHTML(true);
        $this->mail->CharSet = 'UTF-8';
        
        // 7. Configurar el remitente y destinatarios en copia oculta
        $this->mail->setFrom('premium_freight@grammermx.com', 'Premium Freight System');
        $this->mail->addBCC('extern.jesus.perez@grammer.com', 'Jesús Pérez');
        $this->mail->addBCC('premium_freight@grammermx.com', 'Premium Freight System');
    }

    /**
     * Envía notificación individual a un aprobador cuando tiene una orden pendiente
     */
    public function sendApprovalNotification($orderId) {
        try {
            // 1. Obtener los detalles completos de la orden
            $orderData = $this->services->getOrderDetails($orderId);
            
            if (!$orderData) {
                error_log("No se encontraron datos para la orden #$orderId");
                return false;
            }

            // 2. Determinar quién debe recibir la notificación
            $nextApprovers = $this->services->getNextApprovers($orderId);
            
            if (empty($nextApprovers)) {
                error_log("No se encontraron aprobadores para la orden #$orderId");
                return false;
            }

            $emailsSent = false;

            // 3. Enviar correo a cada aprobador
            foreach ($nextApprovers as $approver) {
                $approvalToken = $this->services->generateActionToken($orderId, $approver['id'], 'approve');
                $rejectToken = $this->services->generateActionToken($orderId, $approver['id'], 'reject');
                
                $emailBody = $this->templates->getApprovalEmailTemplate($orderData, $approvalToken, $rejectToken);
                
                $this->mail->clearAddresses();
                $this->mail->addAddress($approver['email'], $approver['name']);
                $this->mail->Subject = "Premium Freight Approval Required - Order #{$orderId}";
                $this->mail->Body = $emailBody;
                
                if ($this->mail->send()) {
                    $this->services->logNotification($orderId, $approver['id'], 'approval_request');
                    $emailsSent = true;
                    error_log("Correo de aprobación enviado a {$approver['email']} para orden #$orderId");
                } else {
                    error_log("Error enviando correo a {$approver['email']}: " . $this->mail->ErrorInfo);
                }
            }

            return $emailsSent;
            
        } catch (Exception $e) {
            error_log("Error en sendApprovalNotification: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Envía un correo resumen semanal a usuarios con órdenes pendientes de aprobación
     */
    public function sendWeeklySummaryEmails() {
        $result = [
            'totalSent' => 0,
            'success' => 0,
            'errors' => []
        ];

        try {
            // 1. Obtener todas las órdenes que necesitan aprobación semanal
            $pendingOrders = $this->services->getPendingOrdersForWeeklySummary();
            
            if (empty($pendingOrders)) {
                return $result;
            }
            
            // 2. Agrupar órdenes por usuario aprobador
            $ordersByApprover = $this->services->groupOrdersByApprover($pendingOrders);
            
            // 3. Enviar correo a cada aprobador con sus órdenes pendientes
            foreach ($ordersByApprover as $approverId => $userOrders) {
                try {
                    $approver = $this->services->getUser($approverId);
                    
                    if (!$approver) {
                        $result['errors'][] = "User not found for ID: $approverId";
                        continue;
                    }
                    
                    $orderIds = array_column($userOrders, 'id');
                    $approveAllToken = $this->services->generateBulkActionToken($approverId, 'approve', $orderIds);
                    $rejectAllToken = $this->services->generateBulkActionToken($approverId, 'reject', $orderIds);
                    
                    $emailBody = $this->templates->getWeeklySummaryTemplate($userOrders, $approver, $approveAllToken, $rejectAllToken);
                    
                    $this->mail->clearAddresses();
                    $this->mail->addAddress($approver['email'], $approver['name']);
                    $this->mail->Subject = "Weekly Premium Freight Summary - " . count($userOrders) . " Orders Pending Approval";
                    $this->mail->Body = $emailBody;
                    
                    if ($this->mail->send()) {
                        $result['success']++;
                        
                        foreach ($userOrders as $order) {
                            $this->services->logNotification($order['id'], $approverId, 'weekly_summary');
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
            
        } catch (Exception $e) {
            $result['errors'][] = "Error in sendWeeklySummaryEmails: " . $e->getMessage();
        }
        
        return $result;
    }

    /**
     * Envía notificación al creador de la orden cuando ésta ha sido completamente aprobada o rechazada
     */
    public function sendStatusNotification($orderId, $status, $rejectorInfo = null) {
        try {
            // 1. Obtener datos de la orden
            $orderData = $this->services->getOrderDetails($orderId);
            
            if (!$orderData) {
                error_log("No se encontraron datos para la orden #$orderId");
                return false;
            }

            // 2. Obtener datos del creador
            $creator = $this->services->getUser($orderData['user_id']);
            if (!$creator) {
                error_log("No se encontró el creador para la orden #$orderId");
                return false;
            }

            // 3. Crear el contenido del correo
            $emailBody = $this->templates->getStatusNotificationTemplate($orderData, $status, $rejectorInfo);
            
            // 4. Configurar el asunto según el estado
            $subject = ($status === 'approved') ? 
                "Premium Freight Order #{$orderId} - Approved" : 
                "Premium Freight Order #{$orderId} - Rejected";
            
            // 5. Configurar y enviar el correo
            $this->mail->clearAddresses();
            $this->mail->addAddress($creator['email'], $creator['name']);
            $this->mail->Subject = $subject;
            $this->mail->Body = $emailBody;
            
            if ($this->mail->send()) {
                $notificationType = ($status === 'approved') ? 'status_approved' : 'status_rejected';
                $this->services->logNotification($orderId, $creator['id'], $notificationType);
                
                error_log("Status notification sent to {$creator['email']} for order #$orderId");
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
     * Envía resumen semanal - método wrapper para compatibilidad
     */
    public function sendWeeklySummary() {
        try {
            $result = $this->sendWeeklySummaryEmails();
            
            return [
                'success' => true,
                'message' => "Weekly summary processed: {$result['success']} emails sent, " . count($result['errors']) . " errors",
                'data' => $result
            ];
        } catch (Exception $e) {
            error_log("Error in sendWeeklySummary: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error sending weekly summary: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Envía notificaciones de recovery - método para órdenes que necesitan evidencia de recovery
     */
    public function sendRecoveryNotifications() {
        try {
            $result = $this->sendRecoveryCheckEmails();
            
            return [
                'success' => true,
                'message' => "Recovery notifications processed: {$result['success']} emails sent, " . count($result['errors']) . " errors",
                'data' => $result
            ];
        } catch (Exception $e) {
            error_log("Error in sendRecoveryNotifications: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error sending recovery notifications: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Envía correos de verificación de recovery evidence a usuarios con órdenes pendientes
     */
    public function sendRecoveryCheckEmails() {
        $result = [
            'totalSent' => 0,
            'success' => 0,
            'errors' => []
        ];

        try {
            // Verificar que la conexión a la base de datos existe
            if (!$this->db) {
                throw new Exception("Database connection not established");
            }

            // Obtener órdenes que tienen recovery_file pero no recovery_evidence
            $sql = "SELECT PF.id, PF.user_id, PF.description, PF.cost_euros, 
                           PF.date, PF.recovery_file, U.name, U.email
                    FROM PremiumFreight PF
                    INNER JOIN User U ON PF.user_id = U.id
                    WHERE PF.recovery_file IS NOT NULL 
                    AND PF.recovery_file != ''
                    AND (PF.recovery_evidence IS NULL OR PF.recovery_evidence = '')";
        
            // Usar MySQLi (igual que las otras funciones)
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                throw new Exception("Failed to prepare SQL statement: " . $this->db->error);
            }
            
            $stmt->execute();
            $ordersResult = $stmt->get_result();
            
            $ordersNeedingRecovery = $ordersResult->fetch_all(MYSQLI_ASSOC);
            
            if (empty($ordersNeedingRecovery)) {
                return $result;
            }

            // Agrupar órdenes por usuario
            $ordersByUser = [];
            foreach ($ordersNeedingRecovery as $order) {
                $userId = $order['user_id'];
                if (!isset($ordersByUser[$userId])) {
                    $ordersByUser[$userId] = [
                        'user' => [
                            'id' => $userId,
                            'name' => $order['name'],
                            'email' => $order['email']
                        ],
                        'orders' => []
                    ];
                }
                $ordersByUser[$userId]['orders'][] = $order;
            }

            // Enviar correo a cada usuario con sus órdenes pendientes
            foreach ($ordersByUser as $userInfo) {
                try {
                    $user = $userInfo['user'];
                    $orders = $userInfo['orders'];
                    
                    // Usar el template de la clase PFEmailTemplates
                    $emailBody = $this->templates->getRecoveryCheckTemplate($user, $orders);
                    
                    $this->mail->clearAddresses();
                    $this->mail->addAddress($user['email'], $user['name']);
                    $this->mail->Subject = "Premium Freight - Recovery Evidence Required";
                    $this->mail->Body = $emailBody;
                    
                    if ($this->mail->send()) {
                        $result['success']++;
                        $result['totalSent']++;
                        
                        // Registrar la notificación para cada orden
                        foreach ($orders as $order) {
                            $this->services->logNotification($order['id'], $user['id'], 'recovery_check');
                        }
                        
                        error_log("Recovery check email sent to {$user['email']} for " . count($orders) . " orders");
                    } else {
                        $result['errors'][] = "Error sending to {$user['email']}: " . $this->mail->ErrorInfo;
                        $result['totalSent']++;
                    }
                    
                } catch (Exception $e) {
                    $result['errors'][] = "Exception sending to {$user['email']}: " . $e->getMessage();
                    $result['totalSent']++;
                }
            }

        } catch (Exception $e) {
            $result['errors'][] = "Error in sendRecoveryCheckEmails: " . $e->getMessage();
            error_log("Error in sendRecoveryCheckEmails: " . $e->getMessage());
        }
        
        return $result;
    }

    /**
     * Métodos de acceso para compatibilidad hacia atrás
     */
    public function getDatabase() {
        return $this->services->getDatabase();
    }

    public function getOrderDetails($orderId) {
        return $this->services->getOrderDetails($orderId);
    }

    public function getUser($userId) {
        return $this->services->getUser($userId);
    }

    // Métodos adicionales que necesites mantener para compatibilidad...
    
    /**
     * Método de prueba de conexión (si lo necesitas)
     */
    public function testConnection() {
        try {
            return $this->mail->smtpConnect();
        } catch (Exception $e) {
            throw new Exception("SMTP connection failed: " . $e->getMessage());
        }
    }
}
?>