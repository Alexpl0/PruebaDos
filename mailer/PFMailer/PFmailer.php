<?php
/**
 * PFMailer.php
 *
 * Main class for sending emails securely in production or development environments.
 */

// =========================================================================
// MAIN CONFIGURATION - EDIT THIS SECTION!
// =========================================================================
// Change this line to 'production' for the real environment.
// 'development': Uses test credentials, redirects emails, and enables logs.
// 'production':  Uses real credentials and disables detailed logs.
define('APP_ENVIRONMENT', 'production');
// =========================================================================


// --- Load dependencies ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Asegúrate de que las rutas a PHPMailer sean correctas
require_once __DIR__ . '/../Phpmailer/PHPMailer.php';
require_once __DIR__ . '/../Phpmailer/SMTP.php';
require_once __DIR__ . '/../Phpmailer/Exception.php';

// Carga de clases de la aplicación
require_once __DIR__ . '/PFEmailServices.php';
require_once __DIR__ . '/PFEmailTemplates.php';
require_once __DIR__ . '/PFDB.php';
require_once __DIR__ . '/PFWeeklyReporter.php'; // <-- LÍNEA CORREGIDA Y AÑADIDA

// --- Environment-based constants ---
if (APP_ENVIRONMENT === 'development') {
    // -- MODO DESARROLLO --
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    define('TEST_MODE', true);
    define('TEST_EMAIL', 'extern.jesus.perez@grammer.com');

    // Credenciales de SMTP para PRUEBAS
    define('SMTP_HOST', 'smtp.hostinger.com');
    define('SMTP_PORT', 465);
    define('SMTP_USER', 'jesuspruebas@grammermx.com');
    define('SMTP_PASS', 'PremiumFreight2025');
    define('SMTP_SECURE', 'ssl');
    define('SMTP_FROM_NAME', 'Premium Freight (Test)');

    // URLs de PRUEBAS
    define('URLM', 'https://grammermx.com/Mailer/PFMailer/');
    define('URLPF', 'https://grammermx.com/Jesus/PruebaDos/');

    // Nivel de depuración SMTP (2 = Muestra toda la conversación con el servidor)
    define('SMTP_DEBUG_LEVEL', 2);

} else {
    // -- MODO PRODUCCIÓN --
    error_reporting(0);
    ini_set('display_errors', 0);

    define('TEST_MODE', false);
    define('TEST_EMAIL', '');

    // ¡¡¡IMPORTANTE!!! Coloca aquí tus credenciales de PRODUCCIÓN
    define('SMTP_HOST', 'smtp.hostinger.com');
    define('SMTP_PORT', 465);
    define('SMTP_USER', 'specialfreight@grammermx.com');
    define('SMTP_PASS', 'FreightSystem***2025');
    define('SMTP_SECURE', 'ssl');
    define('SMTP_FROM_NAME', 'Premium Freight System');

    // ¡¡¡IMPORTANTE!!! Coloca aquí tus URLs de PRODUCCIÓN
    define('URLM', 'https://grammermx.com/Mailer/PFMailer/'); // Revisar si es la correcta
    define('URLPF', 'https://grammermx.com/Logistica/PremiumFreight/');

    // Nivel de depuración SMTP (0 = Desactivado para producción)
    define('SMTP_DEBUG_LEVEL', 0);
}

// Función de Log (si no existe una global)
if (!function_exists('logAction')) {
    function logAction($message, $category) {
        $logFile = __DIR__ . '/app.log';
        $formattedMessage = sprintf("[%s] [%s]: %s\n", date('Y-m-d H:i:s'), strtoupper($category), $message);
        file_put_contents($logFile, $formattedMessage, FILE_APPEND);
    }
}

class PFMailer {
    private $mail;
    private $services;
    private $templates;
    private $db;

    /**
     * Constructor - inicializa PHPMailer y las dependencias.
     * La configuración se obtiene de las constantes definidas arriba.
     */
    public function __construct() {
        $this->services = new PFEmailServices();
        $this->templates = new PFEmailTemplates(URLM, URLPF);
        
        $con = new LocalConector();
        $this->db = $con->conectar();
        
        $this->mail = new PHPMailer(true);

        // Configuración del servidor SMTP
        $this->mail->isSMTP();
        $this->mail->Host = SMTP_HOST;
        $this->mail->Port = SMTP_PORT;
        $this->mail->SMTPAuth = true;
        $this->mail->Username = SMTP_USER;
        $this->mail->Password = SMTP_PASS;
        $this->mail->SMTPSecure = SMTP_SECURE;
        
        // Nivel de depuración SMTP controlado por el entorno
        $this->mail->SMTPDebug = SMTP_DEBUG_LEVEL;
        if (SMTP_DEBUG_LEVEL > 0) {
            $this->mail->Debugoutput = function($str, $level) {
                logAction("PHPMailer Debug: {$str}", "SMTP");
            };
        }

        // Configuración del formato del correo
        $this->mail->isHTML(true);
        $this->mail->CharSet = 'UTF-8';
        
        // Remitente y Copia Oculta (BCC)
        $this->mail->setFrom(SMTP_USER, SMTP_FROM_NAME);
        $this->mail->addBCC(SMTP_USER, 'Backup Copy');
        
        logAction("PFMailer initialized in mode: " . APP_ENVIRONMENT, 'INIT');
    }

    /**
     * Método auxiliar para establecer los destinatarios según el modo de operación.
     */
    private function setEmailRecipients($originalEmail, $originalName = '') {
        $this->mail->clearAddresses();

        if (TEST_MODE) {
            $this->mail->addAddress(TEST_EMAIL, 'Premium Freight Test');
            logAction("Email redirected: Original={$originalEmail} -> Test=" . TEST_EMAIL, 'TEST_MODE');
        } else {
            $this->mail->addAddress($originalEmail, $originalName);
            logAction("Email sent to: {$originalName} <{$originalEmail}>", 'MAIL_RECIPIENT');
        }
    }

    // =========================================================================
    // MÉTODOS DE LA APLICACIÓN
    // =========================================================================

    public function clearOrderCache($orderId) {
        if (method_exists($this->services, 'clearOrderCache')) {
            $this->services->clearOrderCache($orderId);
        }
    }

    public function sendSingleRecoveryNotification($orderId) {
        logAction("sendSingleRecoveryNotification started for orderId: {$orderId}", 'SEND_RECOVERY');

        try {
            // Usar los services en lugar de acceso directo a BD
            logAction("Attempting to fetch order details for orderId: {$orderId}", 'SEND_RECOVERY');
            $order = $this->services->getOrderDetails($orderId);
            
            if (!$order) {
                logAction("Order not found for orderId: {$orderId}", 'SEND_RECOVERY_ERROR');
                return [
                    'success' => false,
                    'message' => "Order #{$orderId} not found."
                ];
            }
            logAction("Order details retrieved successfully: " . json_encode($order), 'SEND_RECOVERY');

            // Verificar si la orden tiene un RecoveryFile.
            logAction("Checking if order #{$orderId} has a recovery file...", 'SEND_RECOVERY');
            if (empty($order['recovery_file'])) {
                logAction("Order #{$orderId} does not require a recovery file.", 'SEND_RECOVERY_INFO');
                return [
                    'success' => false,
                    'message' => "Order #{$orderId} does not require a recovery file."
                ];
            }
            logAction("Order #{$orderId} has a recovery file: {$order['recovery_file']}", 'SEND_RECOVERY');

            // Verificar si la orden tiene RecoveryEvidence.
            logAction("Checking if order #{$orderId} already has recovery evidence...", 'SEND_RECOVERY');
            if (!empty($order['recovery_evidence'])) {
                logAction("Order #{$orderId} already has recovery evidence registered.", 'SEND_RECOVERY_INFO');
                return [
                    'success' => false,
                    'message' => "Order #{$orderId} already has recovery evidence registered."
                ];
            }
            logAction("Order #{$orderId} does not have recovery evidence yet.", 'SEND_RECOVERY');

            // Si tiene RecoveryFile pero no RecoveryEvidence, proceder con el envío.
            logAction("Generating email body for orderId: {$orderId}", 'SEND_RECOVERY');
            $emailBody = $this->templates->generateRecoveryNotification($order);
            logAction("Email body generated successfully for orderId: {$orderId}", 'SEND_RECOVERY');

            // Limpiar direcciones antes de agregar nueva
            $this->mail->clearAddresses();
            
            $recipientEmail = $order['creator_email'];
            if (empty($recipientEmail)) {
                logAction("No creator email found for orderId: {$orderId}", 'SEND_RECOVERY_ERROR');
                return [
                    'success' => false,
                    'message' => "No email address found for order creator."
                ];
            }
            
            logAction("Setting recipient email: {$recipientEmail}", 'SEND_RECOVERY');
            
            // Usar el método helper para manejar TEST_MODE
            $this->setEmailRecipients($recipientEmail, $order['creator_name'] ?? 'User');
            
            $this->mail->Subject = "Recovery Evidence Required for Order #{$orderId}";
            $this->mail->Body = $emailBody;

            logAction("Attempting to send email to {$recipientEmail} for orderId: {$orderId}", 'SEND_RECOVERY');
            $this->mail->send();
            logAction("Notification sent successfully for orderId: {$orderId}", 'SEND_RECOVERY_SUCCESS');

            return [
                'success' => true,
                'message' => "Notification successfully sent for order #{$orderId}."
            ];
        } catch (Exception $e) {
            logAction("Error sending notification for orderId: {$orderId} - " . $e->getMessage(), 'SEND_RECOVERY_ERROR');
            return [
                'success' => false,
                'message' => "Error sending the notification: " . $e->getMessage()
            ];
        }
    }

    public function sendApprovalNotification($orderId) {
        try {
            logAction("Starting sendApprovalNotification for order #{$orderId}", 'SENDAPPROVAL');
            
            $orderDetails = $this->services->getOrderDetails($orderId);
            if (!$orderDetails) {
                logAction("ERROR: No details found for order #{$orderId}", 'SENDAPPROVAL');
                return false;
            }
            
            $nextApprovers = $this->services->getNextApprovers($orderId);
            if (empty($nextApprovers)) {
                logAction("No next approvers for order #{$orderId}", 'SENDAPPROVAL');
                return false;
            }
            
            $emailsSent = 0;
            foreach ($nextApprovers as $approver) {
                try {
                    $approvalToken = $this->services->generateActionToken($orderId, $approver['id'], 'approve');
                    $rejectToken = $this->services->generateActionToken($orderId, $approver['id'], 'reject');
                    
                    $this->setEmailRecipients($approver['email'], $approver['name']);
                    
                    $this->mail->Subject = "Premium Freight - Approval Required #$orderId";
                    $htmlContent = $this->templates->getApprovalEmailTemplate($orderDetails, $approvalToken, $rejectToken);
                    $this->mail->Body = $htmlContent;
                    
                    if ($this->mail->send()) {
                        $emailsSent++;
                        logAction("Approval email sent to {$approver['name']} ({$approver['email']})", 'SENDAPPROVAL');
                        $this->services->logNotification($orderId, $approver['id'], 'approval_request');
                    } else {
                        logAction("Error sending email to {$approver['email']}: " . $this->mail->ErrorInfo, 'SENDAPPROVAL_ERROR');
                    }
                } catch (Exception $e) {
                    logAction("Exception sending email to {$approver['email']}: " . $e->getMessage(), 'SENDAPPROVAL_EXCEPTION');
                }
            }
            return $emailsSent > 0;
        } catch (Exception $e) {
            logAction("Error in sendApprovalNotification: " . $e->getMessage(), 'SENDAPPROVAL_FATAL');
            return false;
        }
    }

    public function sendWeeklySummaryEmails() {
        $result = ['totalSent' => 0, 'success' => 0, 'errors' => []];
        try {
            $pendingOrders = $this->services->getPendingOrdersForWeeklySummary();
            if (empty($pendingOrders)) return $result;
            
            $ordersByApprover = $this->services->groupOrdersByApprover($pendingOrders);
            
            foreach ($ordersByApprover as $approverId => $groupData) {
                try {
                    $approver = $this->services->getUser($approverId);
                    if (!$approver) {
                        $result['errors'][] = "User not found for ID: $approverId";
                        continue;
                    }
                    
                    $emailBody = $this->templates->getWeeklySummaryTemplate($groupData['orders'], $approver, $groupData['bulk_tokens']['approve'], $groupData['bulk_tokens']['reject']);
                
                    $this->setEmailRecipients($approver['email'], $approver['name']);
                    $this->mail->Subject = "Premium Freight Weekly Summary - " . count($groupData['orders']) . " Pending Orders";
                    $this->mail->Body = $emailBody;
                    
                    if ($this->mail->send()) {
                        $result['success']++;
                        foreach ($groupData['orders'] as $order) {
                            $this->services->logNotification($order['id'], $approverId, 'weekly_summary');
                        }
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
     * Generates and sends the weekly statistics report to a predefined list of recipients.
     * @return array A result array with success status and message.
     */
    public function sendWeeklyStatisticsReport() {
        try {
            logAction("Iniciando sendWeeklyStatisticsReport", 'WEEKLY_STATS');
            
            // 1. Get statistics data
            $reporter = new PFWeeklyReporter();
            $stats = $reporter->generateWeeklyStats();

            if (empty($stats)) {
                logAction("No se generaron estadísticas para el reporte semanal.", 'WEEKLY_STATS');
                return ['success' => false, 'message' => 'No statistics were generated for the weekly report.'];
            }

            // 2. Get the HTML content from the template
            $emailBody = $this->templates->getWeeklyStatisticsTemplate($stats);

            // 3. Define recipients for the report (ej. gerentes, directores)
            // IMPORTANTE: Definir aquí la lista de correos que recibirán el reporte.
            $recipients = [
                ['email' => 'extern.jesus.perez@grammer.com', 'name' => 'Jesus Perez'],
                ['email' => 'dulce.mata@grammer.com', 'name' => 'Dulce Mata'],
                ['email' => 'carlos.plazola@grammer.com', 'name' => 'Carlos Plazola'],
                ['email' => 'margarita.ortega@grammer.com', 'name' => 'Margarita Ortega'],
            ];

            // En modo de desarrollo, todos se redirigen a TEST_EMAIL
            if (TEST_MODE) {
                $this->setEmailRecipients(TEST_EMAIL, 'Test Recipient');
            } else {
                 $this->mail->clearAddresses();
                 foreach ($recipients as $recipient) {
                    $this->mail->addAddress($recipient['email'], $recipient['name']);
                 }
            }

            // 4. Configure and send the email
            $this->mail->Subject = "Premium Freight Weekly Report: " . date('M d, Y');
            $this->mail->Body = $emailBody;

            if ($this->mail->send()) {
                logAction("Reporte semanal de estadísticas enviado exitosamente.", 'WEEKLY_STATS');
                return ['success' => true, 'message' => 'Weekly statistics report sent successfully.'];
            } else {
                logAction("Error enviando el reporte semanal: " . $this->mail->ErrorInfo, 'WEEKLY_STATS_ERROR');
                return ['success' => false, 'message' => 'Failed to send weekly report: ' . $this->mail->ErrorInfo];
            }

        } catch (Exception $e) {
            logAction("Excepción en sendWeeklyStatisticsReport: " . $e->getMessage(), 'WEEKLY_STATS_FATAL');
            return ['success' => false, 'message' => 'A server exception occurred: ' . $e->getMessage()];
        }
    }

    public function sendStatusNotification($orderId, $status, $rejectorInfo = null) {
        try {
            $orderData = $this->services->getOrderDetails($orderId);
            if (!$orderData) return false;

            $creator = $this->services->getUser($orderData['user_id']);
            if (!$creator) return false;

            $emailBody = $this->templates->getStatusNotificationTemplate($orderData, $status, $rejectorInfo);
            
            $subject = ($status === 'approved') ? 
                "Orden Premium Freight #{$orderId} - Aprobada" : 
                "Orden Premium Freight #{$orderId} - Rechazada";
            
            $this->setEmailRecipients($creator['email'], $creator['name']);
            
            $this->mail->Subject = $subject;
            $this->mail->Body = $emailBody;
            
            if ($this->mail->send()) {
                $notificationType = ($status === 'approved') ? 'status_approved' : 'status_rejected';
                $this->services->logNotification($orderId, $creator['id'], $notificationType);
                return true;
            }
            return false;
        } catch (Exception $e) {
            logAction("Error en sendStatusNotification: " . $e->getMessage(), 'STATUS_NOTIFICATION_EXCEPTION');
            return false;
        }
    }

    public function sendRecoveryCheckEmails() {
        $result = ['totalSent' => 0, 'success' => 0, 'errors' => []];
        try {
            if (!$this->db) throw new Exception("Conexión a DB no establecida");

            $sql = "SELECT PF.id, PF.user_id, PF.description, PF.cost_euros, PF.date, PF.recovery_file, PF.area, U.name, U.email
                    FROM PremiumFreight PF INNER JOIN User U ON PF.user_id = U.id
                    WHERE PF.recovery_file IS NOT NULL AND PF.recovery_file != ''
                    AND (PF.recovery_evidence IS NULL OR PF.recovery_evidence = '')";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $ordersNeedingRecovery = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            
            if (empty($ordersNeedingRecovery)) return $result;

            $ordersByUser = [];
            foreach ($ordersNeedingRecovery as $order) {
                $ordersByUser[$order['user_id']]['user'] = ['id' => $order['user_id'], 'name' => $order['name'], 'email' => $order['email']];
                $ordersByUser[$order['user_id']]['orders'][] = $order;
            }

            foreach ($ordersByUser as $userInfo) {
                try {
                    $emailBody = $this->templates->getRecoveryCheckTemplate($userInfo['user'], $userInfo['orders']);
                    $this->setEmailRecipients($userInfo['user']['email'], $userInfo['user']['name']);
                    $this->mail->Subject = "Premium Freight - Evidencia de Recuperación Requerida";
                    $this->mail->Body = $emailBody;
                    
                    if ($this->mail->send()) {
                        $result['success']++;
                    } else {
                        $result['errors'][] = "Fallo al enviar a {$userInfo['user']['email']}: {$this->mail->ErrorInfo}";
                    }
                    $result['totalSent']++;
                } catch (Exception $e) {
                    $result['errors'][] = "Error enviando a {$userInfo['user']['email']}: " . $e->getMessage();
                }
            }
        } catch (Exception $e) {
            $result['errors'][] = "Error en sendRecoveryCheckEmails: " . $e->getMessage();
        }
        return $result;
    }

    public function sendPasswordResetEmail($user, $token) {
        try {
            $this->setEmailRecipients($user['email'], $user['name']);
            $emailContent = $this->templates->getPasswordResetTemplate($user, $token);
            $this->mail->Subject = 'Solicitud de Reestablecimiento de Contraseña - Premium Freight System';
            $this->mail->Body = $emailContent;
            return $this->mail->send();
        } catch (Exception $e) {
            logAction("Excepción en sendPasswordResetEmail: " . $e->getMessage(), 'PASSWORD_RESET');
            return false;
        }
    }

    public function sendVerificationEmail($userId) {
        try {
            $user = $this->services->getUser($userId);
            if (!$user || !empty($user['verified'])) return false;
            
            $token = $this->generateVerificationToken($userId);
            if (!$token) return false;

            $this->setEmailRecipients($user['email'], $user['name']);
            $emailContent = $this->templates->getVerificationTemplate($user, $token);
            $this->mail->Subject = 'Verificación de Cuenta - Premium Freight System';
            $this->mail->Body = $emailContent;
            return $this->mail->send();
        } catch (Exception $e) {
            logAction("Excepción en sendVerificationEmail: " . $e->getMessage(), 'VERIFICATION');
            return false;
        }
    }

    private function generateVerificationToken($userId) {
        try {
            $token = bin2hex(random_bytes(32));
            $this->db->query("CREATE TABLE IF NOT EXISTS EmailVerificationTokens (
                id INT AUTO_INCREMENT PRIMARY KEY, token VARCHAR(64) NOT NULL UNIQUE, user_id INT NOT NULL,
                is_used TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, used_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
            )");
            
            $sql = "INSERT INTO EmailVerificationTokens (token, user_id) VALUES (?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("si", $token, $userId);
            return $stmt->execute() ? $token : null;
        } catch (Exception $e) {
            logAction("Error generando token de verificación: " . $e->getMessage(), 'VERIFICATION');
            return null;
        }
    }

    /*
    public function getOrderDetails($orderId) {
        logAction("Fetching order details for orderId: {$orderId}", 'DB_QUERY');
        try {
            // Usar la clase PFDB en lugar de acceso directo
            $pfdb = new PFDB();
            $result = $pfdb->getOrderDetails($orderId);

            if (!$result) {
                logAction("No order found for orderId: {$orderId}", 'DB_QUERY_ERROR');
            } else {
                logAction("Order details fetched successfully for orderId: {$orderId}", 'DB_QUERY_SUCCESS');
            }

            return $result;
        } catch (Exception $e) {
            logAction("Exception fetching order details for orderId: {$orderId} - " . $e->getMessage(), 'DB_QUERY_EXCEPTION');
            return null;
        }
    }
    */
}
