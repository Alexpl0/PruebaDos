<?php
/**
 * PFMailer.php
 *
 * Main class for sending emails securely in production or development environments.
 * ✅ UPDATED v2.5: Sistema multi-planta con configuración SMTP dinámica
 * ✅ FIXED: FROM ahora siempre coincide con USERNAME para evitar rechazo SMTP
 */

// =========================================================================
// MAIN CONFIGURATION - EDIT THIS SECTION!
// =========================================================================
// Change this line to 'production' for the real environment.
define('APP_ENVIRONMENT', 'production');
// =========================================================================

// --- Load dependencies ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../Phpmailer/PHPMailer.php';
require_once __DIR__ . '/../Phpmailer/SMTP.php';
require_once __DIR__ . '/../Phpmailer/Exception.php';

require_once __DIR__ . '/PFEmailServices.php';
require_once __DIR__ . '/PFEmailTemplates.php';
require_once __DIR__ . '/PFDB.php';
require_once __DIR__ . '/PFWeeklyReporter.php';

// =========================================================================
// CONFIGURACIÓN DE ENTORNO
// =========================================================================

if (APP_ENVIRONMENT === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    define('TEST_MODE', true);
    define('TEST_EMAIL', 'extern.jesus.perez@grammer.com');
    define('URLM', 'https://grammermx.com/Mailer/PFMailer/');
    define('URLPF', 'https://grammermx.com/Jesus/PruebaDos/');
    define('SMTP_DEBUG_LEVEL', 2);

} else {
    error_reporting(0);
    ini_set('display_errors', 0);

    define('TEST_MODE', false);
    define('TEST_EMAIL', '');
    define('URLM', 'https://grammermx.com/Mailer/PFMailer/');
    define('URLPF', 'https://grammermx.com/Logistica/PremiumFreight/');
    define('SMTP_DEBUG_LEVEL', 0);
}

// ✅ Cargar configuración SMTP
require_once __DIR__ . '/smtp_config.php';

if (!function_exists('logAction')) {
    function logAction($message, $category) {
        $logFile = __DIR__ . '/app.log';
        $formattedMessage = sprintf("[%s] [%s]: %s\n", date('Y-m-d H:i:s'), strtoupper($category), $message);
        file_put_contents($logFile, $formattedMessage, FILE_APPEND);
    }
}

/**
 * =========================================================================
 * CLASE PRINCIPAL PFMAILER CON SOPORTE MULTI-PLANTA
 * =========================================================================
 */
class PFMailer {
    private $mail;
    private $services;
    private $templates;
    private $db;
    private $currentPlantConfig;

    /**
     * Constructor - inicializa PHPMailer y las dependencias.
     */
    public function __construct() {
        $this->services = new PFEmailServices();
        $this->templates = new PFEmailTemplates(URLM, URLPF);
        
        $con = new LocalConector();
        $this->db = $con->conectar();
        
        $this->mail = new PHPMailer(true);
        $this->mail->isSMTP();
        $this->mail->SMTPAuth = true;
        $this->mail->SMTPDebug = SMTP_DEBUG_LEVEL;
        
        if (SMTP_DEBUG_LEVEL > 0) {
            $this->mail->Debugoutput = function($str, $level) {
                logAction("PHPMailer Debug: {$str}", "SMTP");
            };
        }

        $this->mail->isHTML(true);
        $this->mail->CharSet = 'UTF-8';
        
        logAction("PFMailer initialized in mode: " . APP_ENVIRONMENT, 'INIT');
    }

    // =========================================================================
    // MÉTODOS MULTI-PLANTA
    // =========================================================================

    /**
     * ✅ Determina configuración SMTP basado en email del destinatario
     * 
     * @param string $recipientEmail Email del destinatario
     * @param array $orderData Datos de la orden (opcional)
     * @return string Código de planta ('3330', '3310', 'default')
     */
    public function determinePlantConfig($recipientEmail, $orderData = null) {
        logAction("Determinando planta para email: {$recipientEmail}", 'PLANT_DETECTION');
        
        try {
            $user = $this->getUserByEmail($recipientEmail);
            
            if ($user && !empty($user['plant'])) {
                $userPlant = (string)$user['plant'];
                logAction("Usuario encontrado - plant: {$userPlant} para email: {$recipientEmail}", 'PLANT_DETECTION');
                
                if (in_array($userPlant, ['3330', '3310'])) {
                    logAction("Planta válida detectada: {$userPlant}", 'PLANT_DETECTION');
                    return $userPlant;
                } else {
                    logAction("Planta desconocida '{$userPlant}', usando default", 'PLANT_DETECTION');
                    return 'default';
                }
            } else {
                logAction("Usuario no encontrado o sin planta asignada para: {$recipientEmail}", 'PLANT_DETECTION');
                return 'default';
            }
            
        } catch (Exception $e) {
            logAction("Error buscando usuario por email {$recipientEmail}: " . $e->getMessage(), 'PLANT_DETECTION_ERROR');
            return 'default';
        }
    }

    /**
     * ✅ Obtiene datos de usuario por email
     */
    public function getUserByEmail($email) {
        try {
            if (!$this->db) {
                logAction("Conexión a DB no disponible para getUserByEmail", 'USER_LOOKUP_ERROR');
                return null;
            }
            
            $sql = "SELECT id, name, email, plant, authorization_level 
                    FROM User 
                    WHERE email = ? 
                    LIMIT 1";
            
            $stmt = $this->db->prepare($sql);
            if (!$stmt) {
                logAction("Error preparando query getUserByEmail: " . $this->db->error, 'USER_LOOKUP_ERROR');
                return null;
            }
            
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $userData = $result->num_rows > 0 ? $result->fetch_assoc() : null;
            
            if ($userData) {
                logAction("Usuario encontrado: {$userData['name']} (plant: {$userData['plant']})", 'USER_LOOKUP');
            } else {
                logAction("Usuario NO encontrado para email: {$email}", 'USER_LOOKUP');
            }
            
            return $userData;
            
        } catch (Exception $e) {
            logAction("Error en getUserByEmail: " . $e->getMessage(), 'USER_LOOKUP_ERROR');
            return null;
        }
    }

    /**
     * ✅ CRÍTICO: Configura PHPMailer con la configuración SMTP de la planta
     * ASEGURA que FROM = USERNAME para evitar rechazo
     */
    private function configureSMTPForPlant($plantCode) {
        logAction("Configurando SMTP para planta: {$plantCode}", 'SMTP_CONFIG');
        
        $configs = SMTP_CONFIGS;
        
        if (!array_key_exists($plantCode, $configs)) {
            logAction("Configuración no encontrada para planta: {$plantCode}, usando default", 'SMTP_CONFIG_WARNING');
            $plantCode = 'default';
        }
        
        $config = $configs[$plantCode];
        $this->currentPlantConfig = $config;
        
        try {
            // ✅ Limpiar completamente el objeto mail
            $this->mail->clearAddresses();
            $this->mail->clearCCs();
            $this->mail->clearBCCs();
            $this->mail->clearReplyTos();
            $this->mail->clearAllRecipients();
            $this->mail->clearAttachments();
            
            // Configurar parámetros SMTP
            $this->mail->Host = $config['host'];
            $this->mail->Port = $config['port'];
            $this->mail->Username = $config['username'];
            $this->mail->Password = $config['password'];
            $this->mail->SMTPSecure = $config['secure'];
            
            // ✅ CRÍTICO: FROM debe ser EXACTAMENTE el USERNAME
            $this->mail->setFrom($config['username'], $config['from_name']);
            
            // ✅ Agregar BCC con la misma cuenta
            $this->mail->addBCC($config['username'], 'Backup - ' . $config['plant_name']);
            
            logAction("✅ SMTP configurado para {$config['plant_name']}", 'SMTP_CONFIG_SUCCESS');
            logAction("  Host: {$config['host']}:{$config['port']}", 'SMTP_CONFIG_SUCCESS');
            logAction("  Username/FROM: {$config['username']}", 'SMTP_CONFIG_SUCCESS');
            logAction("  FROM Name: {$config['from_name']}", 'SMTP_CONFIG_SUCCESS');
            
        } catch (Exception $e) {
            logAction("Error configurando SMTP para planta {$plantCode}: " . $e->getMessage(), 'SMTP_CONFIG_ERROR');
            throw $e;
        }
    }

    /**
     * ✅ Establece destinatarios y configura SMTP según planta del usuario
     */
    public function setEmailRecipients($originalEmail, $originalName = '', $orderData = null) {
        $this->mail->clearAddresses();

        // ✅ Redirecciones específicas para PRODUCCIÓN
        $productionRedirections = [
            'Margarita.Gomez2@grammer.com' => 'Margarita.Gomez@grammer.com',
        ];

        $finalEmail = $originalEmail;
        $finalName = $originalName;
        $wasRedirected = false;

        if (APP_ENVIRONMENT === 'production' && isset($productionRedirections[$originalEmail])) {
            $finalEmail = $productionRedirections[$originalEmail];
            $wasRedirected = true;
            logAction("PRODUCTION REDIRECT: {$originalEmail} -> {$finalEmail}", 'EMAIL_REDIRECT_PROD');
        }

        // ✅ Determinar planta basándose en email ORIGINAL
        $plantCode = $this->determinePlantConfig($originalEmail, $orderData);
        
        // ✅ Configurar SMTP según la planta
        $this->configureSMTPForPlant($plantCode);

        // ✅ Establecer destinatario según el modo
        if (TEST_MODE) {
            $this->mail->addAddress(TEST_EMAIL, 'Premium Freight Test');
            $plantName = $this->currentPlantConfig['plant_name'] ?? $plantCode;
            logAction("Email redirected: Original={$originalEmail} (Plant: {$plantName}) -> Test=" . TEST_EMAIL, 'TEST_MODE');
        } else {
            $this->mail->addAddress($finalEmail, $finalName);
            $plantName = $this->currentPlantConfig['plant_name'] ?? $plantCode;
            
            if ($wasRedirected) {
                logAction("Email sent to REDIRECTED: {$finalName} <{$finalEmail}> via {$plantName} (Original: {$originalEmail})", 'MAIL_RECIPIENT_REDIRECTED');
            } else {
                logAction("Email sent to: {$finalName} <{$finalEmail}> via {$plantName}", 'MAIL_RECIPIENT');
            }
        }
    }

    /**
     * ✅ Configura múltiples destinatarios de la misma planta
     */
    public function setMultipleEmailRecipients($recipients, $forcePlantCode = null) {
        $this->mail->clearAddresses();
        
        if (empty($recipients)) {
            logAction("No recipients provided for setMultipleEmailRecipients", 'EMAIL_RECIPIENTS_ERROR');
            return;
        }
        
        $plantCode = $forcePlantCode ?: $this->determinePlantConfig($recipients[0]['email']);
        $this->configureSMTPForPlant($plantCode);
        
        foreach ($recipients as $recipient) {
            if (TEST_MODE) {
                $this->mail->addAddress(TEST_EMAIL, 'Premium Freight Test');
                logAction("Multiple emails redirected to test: {$recipient['email']} -> " . TEST_EMAIL, 'TEST_MODE');
                break;
            } else {
                $this->mail->addAddress($recipient['email'], $recipient['name'] ?? '');
                $plantName = $this->currentPlantConfig['plant_name'] ?? $plantCode;
                logAction("Added recipient: {$recipient['name']} <{$recipient['email']}> using plant: {$plantName}", 'MAIL_RECIPIENT');
            }
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
            $order = $this->services->getOrderDetails($orderId);
            
            if (!$order) {
                logAction("Order not found for orderId: {$orderId}", 'SEND_RECOVERY_ERROR');
                return ['success' => false, 'message' => "Order #{$orderId} not found."];
            }

            if (empty($order['recovery_file'])) {
                logAction("Order #{$orderId} does not require a recovery file.", 'SEND_RECOVERY_INFO');
                return ['success' => false, 'message' => "Order #{$orderId} does not require a recovery file."];
            }

            if (!empty($order['recovery_evidence'])) {
                logAction("Order #{$orderId} already has recovery evidence registered.", 'SEND_RECOVERY_INFO');
                return ['success' => false, 'message' => "Order #{$orderId} already has recovery evidence registered."];
            }

            $emailBody = $this->templates->generateRecoveryNotification($order);
            $recipientEmail = $order['creator_email'];
            
            if (empty($recipientEmail)) {
                logAction("No creator email found for orderId: {$orderId}", 'SEND_RECOVERY_ERROR');
                return ['success' => false, 'message' => "No email address found for order creator."];
            }
            
            $this->setEmailRecipients($recipientEmail, $order['creator_name'] ?? 'User', $order);
            
            $this->mail->Subject = "Recovery Evidence Required for Order #{$orderId}";
            $this->mail->Body = $emailBody;

            $this->mail->send();
            logAction("Notification sent successfully for orderId: {$orderId}", 'SEND_RECOVERY_SUCCESS');

            return ['success' => true, 'message' => "Notification successfully sent for order #{$orderId}."];
        } catch (Exception $e) {
            logAction("Error sending notification for orderId: {$orderId} - " . $e->getMessage(), 'SEND_RECOVERY_ERROR');
            return ['success' => false, 'message' => "Error sending the notification: " . $e->getMessage()];
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
                    
                    $this->setEmailRecipients($approver['email'], $approver['name'], $orderDetails);
                    
                    $this->mail->Subject = "Premium Freight - Approval Required #$orderId";
                    $htmlContent = $this->templates->getApprovalEmailTemplate($orderDetails, $approvalToken, $rejectToken);
                    $this->mail->Body = $htmlContent;
                    
                    if ($this->mail->send()) {
                        $emailsSent++;
                        $plantName = $this->currentPlantConfig['plant_name'] ?? 'Unknown';
                        logAction("Approval email sent to {$approver['name']} ({$approver['email']}) via {$plantName}", 'SENDAPPROVAL');
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

    /**
     * ✅ CORREGIDO: Envía resúmenes semanales con validación estricta
     */
    public function sendWeeklySummaryEmails() {
        $result = ['totalSent' => 0, 'success' => 0, 'errors' => []];
        
        try {
            logAction("Iniciando sendWeeklySummaryEmails", 'WEEKLY_SUMMARY');
            
            $pendingOrders = $this->services->getPendingOrdersForWeeklySummary();
            
            if (empty($pendingOrders)) {
                logAction("No hay órdenes pendientes para resumen semanal", 'WEEKLY_SUMMARY');
                return $result;
            }
            
            logAction("Encontradas " . count($pendingOrders) . " órdenes pendientes", 'WEEKLY_SUMMARY');
            
            // ✅ CORREGIDO: Ahora genera los bulk_tokens
            $ordersByApprover = $this->services->groupOrdersByApprover($pendingOrders);
            
            logAction("Órdenes agrupadas para " . count($ordersByApprover) . " aprobadores", 'WEEKLY_SUMMARY');
            
            foreach ($ordersByApprover as $approverId => $groupData) {
                try {
                    $approver = $this->services->getUser($approverId);
                    
                    if (!$approver) {
                        $result['errors'][] = "User not found for ID: $approverId";
                        logAction("Aprobador no encontrado: $approverId", 'WEEKLY_SUMMARY_ERROR');
                        continue;
                    }
                    
                    logAction("Procesando aprobador: {$approver['name']} ({$approver['email']}) - " . count($groupData['orders']) . " órdenes", 'WEEKLY_SUMMARY');
                    
                    // ✅ VALIDAR que existan los bulk_tokens
                    if (!isset($groupData['bulk_tokens']) || 
                        !isset($groupData['bulk_tokens']['approve']) || 
                        !isset($groupData['bulk_tokens']['reject'])) {
                        $result['errors'][] = "Bulk tokens missing for approver $approverId";
                        logAction("ERROR: Bulk tokens faltantes para aprobador $approverId", 'WEEKLY_SUMMARY_ERROR');
                        continue;
                    }
                    
                    $emailBody = $this->templates->getWeeklySummaryTemplate(
                        $groupData['orders'], 
                        $approver, 
                        $groupData['bulk_tokens']['approve'], 
                        $groupData['bulk_tokens']['reject']
                    );
                    
                    // ✅ Configurar SMTP y destinatario
                    $this->setEmailRecipients($approver['email'], $approver['name'], ['user_id' => $approverId]);
                    
                    // ✅ VERIFICACIÓN: Asegurar que FROM coincida con Username
                    $currentFrom = $this->mail->From;
                    $currentUsername = $this->mail->Username;
                    
                    if ($currentFrom !== $currentUsername) {
                        $errorMsg = "CRITICAL: FROM mismatch! FROM={$currentFrom} but USERNAME={$currentUsername}";
                        logAction($errorMsg, 'WEEKLY_SUMMARY_CRITICAL');
                        $result['errors'][] = "Error processing approver $approverId: FROM/USERNAME mismatch";
                        continue;
                    }
                    
                    logAction("✓ FROM verificado: {$currentFrom} coincide con Username", 'WEEKLY_SUMMARY');
                    
                    $this->mail->Subject = "Premium Freight Weekly Summary - " . count($groupData['orders']) . " Pending Orders";
                    $this->mail->Body = $emailBody;
                    
                    if ($this->mail->send()) {
                        $result['success']++;
                        $plantName = $this->currentPlantConfig['plant_name'] ?? 'Unknown';
                        logAction("✓ Weekly summary enviado a {$approver['name']} vía {$plantName}", 'WEEKLY_SUMMARY_SUCCESS');
                        
                        foreach ($groupData['orders'] as $order) {
                            $this->services->logNotification($order['id'], $approverId, 'weekly_summary');
                        }
                    } else {
                        $errorMsg = "Failed to send to {$approver['email']}: " . $this->mail->ErrorInfo;
                        $result['errors'][] = $errorMsg;
                        logAction($errorMsg, 'WEEKLY_SUMMARY_ERROR');
                    }
                    
                    $result['totalSent']++;
                    
                } catch (Exception $e) {
                    $errorMsg = "Error processing approver $approverId: " . $e->getMessage();
                    $result['errors'][] = $errorMsg;
                    logAction($errorMsg, 'WEEKLY_SUMMARY_EXCEPTION');
                }
            }
            
            logAction("Resumen semanal completado: {$result['success']}/{$result['totalSent']} exitosos", 'WEEKLY_SUMMARY');
            
        } catch (Exception $e) {
            $errorMsg = "Error in sendWeeklySummaryEmails: " . $e->getMessage();
            $result['errors'][] = $errorMsg;
            logAction($errorMsg, 'WEEKLY_SUMMARY_FATAL');
        }
        
        return $result;
    }

    public function sendWeeklyStatisticsReport() {
        try {
            logAction("Iniciando sendWeeklyStatisticsReport", 'WEEKLY_STATS');
            
            $reporter = new PFWeeklyReporter();
            $stats = $reporter->generateWeeklyStats();

            if (empty($stats)) {
                logAction("No se generaron estadísticas para el reporte semanal.", 'WEEKLY_STATS');
                return ['success' => false, 'message' => 'No statistics were generated for the weekly report.'];
            }

            $emailBody = $this->templates->getWeeklyStatisticsTemplate($stats);

            $recipients = [
                '3330' => [
                    ['email' => 'extern.jesus.perez@grammer.com', 'name' => 'Jesus Perez'],
                    ['email' => 'dulce.mata@grammer.com', 'name' => 'Dulce Mata'],
                ],
                '3310' => [
                    ['email' => 'carlos.plazola@grammer.com', 'name' => 'Carlos Plazola'],
                    ['email' => 'margarita.ortega@grammer.com', 'name' => 'Margarita Ortega'],
                ]
            ];

            $emailsSent = 0;
            $errors = [];

            foreach ($recipients as $plantCode => $plantRecipients) {
                try {
                    if (TEST_MODE) {
                        $this->setEmailRecipients(TEST_EMAIL, 'Test Recipient');
                    } else {
                        $this->setMultipleEmailRecipients($plantRecipients, $plantCode);
                    }

                    $plantName = SMTP_CONFIGS[$plantCode]['plant_name'];
                    $this->mail->Subject = "Premium Freight Weekly Report: " . date('M d, Y') . " - {$plantName}";
                    $this->mail->Body = $emailBody;

                    if ($this->mail->send()) {
                        $emailsSent++;
                        logAction("Reporte semanal enviado exitosamente a planta: {$plantName}", 'WEEKLY_STATS');
                    } else {
                        $errors[] = "Error enviando a planta {$plantName}: " . $this->mail->ErrorInfo;
                    }
                } catch (Exception $e) {
                    $errors[] = "Excepción enviando a planta {$plantCode}: " . $e->getMessage();
                }
            }

            if ($emailsSent > 0) {
                return ['success' => true, 'message' => "Weekly statistics report sent to {$emailsSent} plants."];
            } else {
                return ['success' => false, 'message' => 'Failed to send to any plant: ' . implode(', ', $errors)];
            }

        } catch (Exception $e) {
            logAction("Excepción en sendWeeklyStatisticsReport: " . $e->getMessage(), 'WEEKLY_STATS_FATAL');
            return ['success' => false, 'message' => 'A server exception occurred: ' . $e->getMessage()];
        }
    }

    /**
     * ✅ MODIFICADO: Envía notificaciones de estado con CC automático para rechazos
     */
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
            
            $this->setEmailRecipients($creator['email'], $creator['name'], $orderData);
            
            // ✅ Agregar CC para rechazos
            if ($status === 'rejected') {
                $rejectionNotificationEmail = 'dulce.mata@grammer.com';
                $rejectionNotificationName = 'Dulce Mata - Transport Specialist';
                $this->mail->addCC($rejectionNotificationEmail, $rejectionNotificationName);
                logAction("Added CC for rejection notification: {$rejectionNotificationEmail}", 'STATUS_NOTIFICATION');
            }
            
            $this->mail->Subject = $subject;
            $this->mail->Body = $emailBody;
            
            if ($this->mail->send()) {
                $notificationType = ($status === 'approved') ? 'status_approved' : 'status_rejected';
                $this->services->logNotification($orderId, $creator['id'], $notificationType);
                $plantName = $this->currentPlantConfig['plant_name'] ?? 'Unknown';
                logAction("Status notification sent to {$creator['name']} via {$plantName}", 'STATUS_NOTIFICATION');
                
                if ($status === 'rejected') {
                    logAction("Rejection notification also sent to: {$rejectionNotificationEmail}", 'STATUS_NOTIFICATION');
                }
                
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
        
        $alwaysRecipients = [
            ['email' => 'dulce.mata@grammer.com', 'name' => 'Dulce Mata'],
            ['email' => 'carlos.plazola@grammer.com', 'name' => 'Carlos Plazola'],
            ['email' => 'margarita.ortega@grammer.com', 'name' => 'Margarita Ortega'],
            ['email' => 'extern.jesus.perez@grammer.com', 'name' => 'Jesús Pérez']
        ];
        
        try {
            if (!$this->db) throw new Exception("Conexión a DB no establecida");

            $sql = "SELECT PF.id, PF.user_id, PF.description, PF.cost_euros, PF.date, PF.recovery_file, PF.area, U.name, U.email, U.plant
                    FROM PremiumFreight PF INNER JOIN User U ON PF.user_id = U.id
                    WHERE PF.recovery_file IS NOT NULL AND PF.recovery_file != ''
                    AND (PF.recovery_evidence IS NULL OR PF.recovery_evidence = '')
                    AND PF.status_id != 4";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $ordersNeedingRecovery = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            
            if (empty($ordersNeedingRecovery)) return $result;

            $ordersByUser = [];
            foreach ($ordersNeedingRecovery as $order) {
                $ordersByUser[$order['user_id']]['user'] = [
                    'id' => $order['user_id'], 
                    'name' => $order['name'], 
                    'email' => $order['email'],
                    'plant' => $order['plant']
                ];
                $ordersByUser[$order['user_id']]['orders'][] = $order;
            }

            foreach ($ordersByUser as $userInfo) {
                try {
                    $emailBody = $this->templates->getRecoveryCheckTemplate($userInfo['user'], $userInfo['orders']);
                    
                    $userData = ['user_id' => $userInfo['user']['id'], 'order_plant' => $userInfo['user']['plant']];
                    $this->setEmailRecipients($userInfo['user']['email'], $userInfo['user']['name'], $userData);
                    
                    foreach ($alwaysRecipients as $recipient) {
                        $this->mail->addCC($recipient['email'], $recipient['name']);
                    }
                    
                    $this->mail->Subject = "Premium Freight - Evidencia de Recuperación Requerida";
                    $this->mail->Body = $emailBody;
                    
                    if ($this->mail->send()) {
                        $result['success']++;
                        $plantName = $this->currentPlantConfig['plant_name'] ?? 'Unknown';
                        logAction("Recovery check sent to {$userInfo['user']['name']} via {$plantName}", 'RECOVERY_CHECK');
                    } else {
                        $result['errors'][] = "Fallo al enviar a {$userInfo['user']['email']}: {$this->mail->ErrorInfo}";
                    }
                    $result['totalSent']++;
                } catch (Exception $e) {
                    $result['errors'][] = "Error enviando a {$userInfo['user']['email']}: " . $e->getMessage();
                }
                $this->mail->clearCCs();
            }
        } catch (Exception $e) {
            $result['errors'][] = "Error en sendRecoveryCheckEmails: " . $e->getMessage();
        }
        return $result;
    }

    public function sendPasswordResetEmail($user, $token) {
        try {
            $userData = ['user_id' => $user['id']];
            $this->setEmailRecipients($user['email'], $user['name'], $userData);
            
            $emailContent = $this->templates->getPasswordResetTemplate($user, $token);
            $this->mail->Subject = 'Solicitud de Reestablecimiento de Contraseña - Premium Freight System';
            $this->mail->Body = $emailContent;
            
            $sent = $this->mail->send();
            if ($sent) {
                $plantName = $this->currentPlantConfig['plant_name'] ?? 'Unknown';
                logAction("Password reset sent to {$user['name']} via {$plantName}", 'PASSWORD_RESET');
            }
            return $sent;
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

            $userData = ['user_id' => $userId];
            $this->setEmailRecipients($user['email'], $user['name'], $userData);
            
            $emailContent = $this->templates->getVerificationTemplate($user, $token);
            $this->mail->Subject = 'Verificación de Cuenta - Premium Freight System';
            $this->mail->Body = $emailContent;
            
            $sent = $this->mail->send();
            if ($sent) {
                $plantName = $this->currentPlantConfig['plant_name'] ?? 'Unknown';
                logAction("Verification email sent to {$user['name']} via {$plantName}", 'VERIFICATION');
            }
            return $sent;
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

    // =========================================================================
    // MÉTODOS AUXILIARES
    // =========================================================================

    public function getCurrentPlantInfo() {
        return $this->currentPlantConfig;
    }

    public function getAvailablePlantConfigs() {
        $configs = SMTP_CONFIGS;
        $summary = [];
        
        foreach ($configs as $code => $config) {
            $summary[$code] = [
                'plant_name' => $config['plant_name'],
                'username' => $config['username'],
                'from_name' => $config['from_name']
            ];
        }
        
        return $summary;
    }

    public function getDatabase() {
        return $this->db;
    }

    // ✅ Métodos públicos para testing
    public function setSubject($subject) {
        $this->mail->Subject = $subject;
    }

    public function setBody($body) {
        $this->mail->Body = $body;
    }

    public function send() {
        return $this->mail->send();
    }

    public function getLastError() {
        return $this->mail->ErrorInfo;
    }

    public function testDeterminePlantConfig($email, $orderData = null) {
        return $this->determinePlantConfig($email, $orderData);
    }

    public function testGetUserByEmail($email) {
        return $this->getUserByEmail($email);
    }

    public function testSetEmailRecipients($email, $name = '', $orderData = null) {
        return $this->setEmailRecipients($email, $name, $orderData);
    }
}
?>