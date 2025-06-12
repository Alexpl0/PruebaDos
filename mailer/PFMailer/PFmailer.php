<?php
// 1. Cargar la configuración para tener acceso a las constantes
require_once __DIR__ . '/config.php';

// 2. Cargar las dependencias necesarias para el envío de correos
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// 3. Importar los archivos de la librería PHPMailer

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

// 6. CONFIGURACIÓN DE MODO DE PRUEBA
// Cambiar a false para producción
define('TEST_MODE', true);
define('TEST_EMAIL', 'premium_freight@grammermx.com');

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
        $this->baseUrlPF = URLPF;
        
        // 2. Inicializar servicios y plantillas
        $this->services = new PFEmailServices();
        // ✅ CORREGIDO: Pasar ambas URLs al constructor
        $this->templates = new PFEmailTemplates($this->baseUrl, $this->baseUrlPF);
        
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
        $this->mail->Username = 'pruebasjesus@grammermx.com';
        $this->mail->Password = 'FreightSystem.2025';
        $this->mail->SMTPSecure = 'ssl';
        
        // 6. Configurar formato HTML y codificación de caracteres
        $this->mail->isHTML(true);
        $this->mail->CharSet = 'UTF-8';
        
        // 7. Configurar el remitente
        $this->mail->setFrom('pruebasjesus@grammermx.com', 'Premium Freight System');
        $this->mail->addBCC('pruebasjesus@grammermx.com', 'Jesús Pérez');
        
        // 8. Configurar destinatarios en copia oculta según el modo
        if (TEST_MODE) {
            // MODO PRUEBA: Solo enviar a la dirección de prueba
            $this->mail->addBCC(TEST_EMAIL, 'Premium Freight Test');
            logAction("MODO PRUEBA ACTIVADO: Todos los correos se enviarán a " . TEST_EMAIL, 'TEST_MODE');
        } else {
            // MODO PRODUCCIÓN: Usar las direcciones reales (comentado para pruebas)
            // $this->mail->addBCC('extern.jesus.perez@grammer.com', 'Jesús Pérez');
            // $this->mail->addBCC('premium_freight@grammermx.com', 'Premium Freight System');
        }
    }

    /**
     * Método helper para configurar destinatarios según el modo
     */
    private function setEmailRecipients($originalEmail, $originalName = '') {
        $this->mail->clearAddresses();
        
        if (TEST_MODE) {
            // MODO PRUEBA: Enviar solo a la dirección de prueba
            $this->mail->addAddress(TEST_EMAIL, 'Premium Freight Test');
            logAction("Email redirigido: Original={$originalEmail} -> Test=" . TEST_EMAIL, 'TEST_MODE');
        } else {
            // MODO PRODUCCIÓN: Usar la dirección real (comentado para pruebas)
            // $this->mail->addAddress($originalEmail, $originalName);
        }
    }

    /**
     * Envía notificación individual a un aprobador cuando tiene una orden pendiente
     */
    public function sendApprovalNotification($orderId) {
        try {
            logAction("Iniciando sendApprovalNotification para orden #{$orderId}", 'SENDAPPROVAL');
            
            // Obtener detalles de la orden
            $orderDetails = $this->services->getOrderDetails($orderId);
            if (!$orderDetails) {
                logAction("ERROR: No se encontraron detalles para la orden #{$orderId}", 'SENDAPPROVAL');
                return false;
            }
            
            // Obtener próximos aprobadores
            $nextApprovers = $this->services->getNextApprovers($orderId);
            if (empty($nextApprovers)) {
                logAction("No hay próximos aprobadores para la orden #{$orderId} - puede estar completamente aprobada o rechazada", 'SENDAPPROVAL');
                return false;
            }
            
            logAction("Enviando notificación a " . count($nextApprovers) . " aprobadores", 'SENDAPPROVAL');
            
            $emailsSent = 0;
            
            foreach ($nextApprovers as $approver) {
                try {
                    // Generar tokens únicos para cada aprobador
                    $approvalToken = $this->services->generateActionToken($orderId, $approver['id'], 'approve');
                    $rejectToken = $this->services->generateActionToken($orderId, $approver['id'], 'reject');
                    
                    // Configurar destinatarios según el modo
                    $this->setEmailRecipients($approver['email'], $approver['name']);
                    
                    // PRODUCCIÓN (comentado para pruebas):
                    // $this->mail->clearAddresses();
                    // $this->mail->addAddress($approver['email'], $approver['name']);
                    
                    $this->mail->Subject = "Premium Freight - Approval Required #$orderId";
                    
                    // Generar contenido HTML
                    $htmlContent = $this->templates->getApprovalEmailTemplate($orderDetails, $approvalToken, $rejectToken);
                    $this->mail->Body = $htmlContent;
                    
                    // Enviar el correo
                    if ($this->mail->send()) {
                        $emailsSent++;
                        logAction("Correo enviado exitosamente a {$approver['name']} ({$approver['email']})", 'SENDAPPROVAL');
                        
                        // Registrar la notificación
                        $this->services->logNotification($orderId, $approver['id'], 'approval_request');
                    } else {
                        logAction("Error enviando correo a {$approver['email']}: " . $this->mail->ErrorInfo, 'SENDAPPROVAL');
                    }
                    
                } catch (Exception $e) {
                    logAction("Excepción enviando correo a {$approver['email']}: " . $e->getMessage(), 'SENDAPPROVAL');
                }
            }
            
            logAction("Notificaciones de aprobación completadas: {$emailsSent} de " . count($nextApprovers) . " enviados", 'SENDAPPROVAL');
            return $emailsSent > 0;
            
        } catch (Exception $e) {
            logAction("Error en sendApprovalNotification: " . $e->getMessage(), 'SENDAPPROVAL');
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
            foreach ($ordersByApprover as $approverId => $groupData) { // CAMBIO: $userOrders -> $groupData
                try {
                    $approver = $this->services->getUser($approverId);
                    
                    if (!$approver) {
                        $result['errors'][] = "User not found for ID: $approverId";
                        continue;
                    }
                    
                    // CORREGIR: Extraer las órdenes y tokens correctamente
                    $userOrders = $groupData['orders'];        // ✅ Solo las órdenes
                    $orderIds = $groupData['order_ids'];       // ✅ Solo los IDs
                    $bulkTokens = $groupData['bulk_tokens'];   // ✅ Solo los tokens
                    
                    $approveAllToken = $bulkTokens['approve'];
                    $rejectAllToken = $bulkTokens['reject'];
                    
                    // CORREGIR: Pasar solo las órdenes al template
                    $emailBody = $this->templates->getWeeklySummaryTemplate($userOrders, $approver, $approveAllToken, $rejectAllToken);
                    //                                                      ^^^^^^^^^^
                    //                                                      AHORA SÍ son las órdenes
                
                    // Configurar destinatarios según el modo
                    $this->setEmailRecipients($approver['email'], $approver['name']);
                    
                    // PRODUCCIÓN (comentado para pruebas):
                    // $this->mail->clearAddresses();
                    // $this->mail->addAddress($approver['email'], $approver['name']);
                    
                    $this->mail->Subject = "Weekly Premium Freight Summary - " . count($userOrders) . " Orders Pending Approval";
                    $this->mail->Body = $emailBody;
                    
                    if ($this->mail->send()) {
                        $result['success']++;
                        
                        // CORREGIR: Usar las órdenes reales para el logging
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
            
            // 5. Configurar destinatarios según el modo
            $this->setEmailRecipients($creator['email'], $creator['name']);
            
            // PRODUCCIÓN (comentado para pruebas):
            // $this->mail->clearAddresses();
            // $this->mail->addAddress($creator['email'], $creator['name']);
            
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
                           PF.date, PF.recovery_file, PF.area, U.name, U.email
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
                    $emailBody = $this->templates->getRecoveryCheckTemplate($userInfo['user'], $userInfo['orders']);
                    
                    // Configurar destinatarios según el modo
                    $this->setEmailRecipients($userInfo['user']['email'], $userInfo['user']['name']);
                    
                    // PRODUCCIÓN (comentado para pruebas):
                    // $this->mail->clearAddresses();
                    // $this->mail->addAddress($userInfo['user']['email'], $userInfo['user']['name']);
                    
                    $this->mail->Subject = "Premium Freight - Recovery Evidence Required";
                    $this->mail->Body = $emailBody;
                    
                    if ($this->mail->send()) {
                        $result['success']++;
                        error_log("Recovery check email sent to {$userInfo['user']['email']}");
                    } else {
                        $result['errors'][] = "Failed to send recovery check email to {$userInfo['user']['email']}: {$this->mail->ErrorInfo}";
                    }
                    
                    $result['totalSent']++;
                    
                } catch (Exception $e) {
                    $result['errors'][] = "Error sending recovery check email to {$userInfo['user']['email']}: " . $e->getMessage();
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

    /**
     * Método para cambiar entre modo prueba y producción
     */
    public function setTestMode($enable = true) {
        if ($enable) {
            logAction("Cambiando a MODO PRUEBA: Todos los correos se enviarán a " . TEST_EMAIL, 'TEST_MODE');
        } else {
            logAction("Cambiando a MODO PRODUCCIÓN: Los correos se enviarán a las direcciones reales", 'PRODUCTION_MODE');
        }
        
        // Esto requeriría redefinir la constante, lo cual no es posible en PHP
        // Por ahora, usar la constante TEST_MODE definida al inicio del archivo
    }
    
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

    /**
     * Envía correo de recuperación de contraseña
     * 
     * @param array $user Datos del usuario
     * @param string $token Token de recuperación
     * @return bool True si se envió correctamente
     */
    public function sendPasswordResetEmail($user, $token) {
        try {
            logAction("Iniciando envío de email de recuperación para usuario: " . $user['email'], 'PASSWORD_RESET');
            
            // Limpiar destinatarios previos
            $this->mail->clearAddresses();
            
            // Configurar destinatarios según el modo
            $this->setEmailRecipients($user['email'], $user['name']);
            
            // Generar el contenido del correo usando la plantilla
            $emailContent = $this->templates->getPasswordResetTemplate($user, $token);
            
            // Configurar el correo
            $this->mail->Subject = 'Password Reset Request - Premium Freight System';
            $this->mail->Body = $emailContent;
            
            // Enviar el correo
            $result = $this->mail->send();
            
            if ($result) {
                logAction("Email de recuperación enviado exitosamente a: " . $user['email'], 'PASSWORD_RESET');
            } else {
                logAction("Error enviando email de recuperación a: " . $user['email'], 'PASSWORD_RESET');
            }
            
            return $result;
            
        } catch (Exception $e) {
            logAction("Excepción en sendPasswordResetEmail: " . $e->getMessage(), 'PASSWORD_RESET');
            return false;
        } finally {
            // Limpiar el estado del mailer para próximos envíos
            $this->mail->clearAddresses();
            $this->mail->clearAttachments();
        }
    }
}
?>