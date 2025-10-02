<?php
/**
 * PFMailer.php
 *
 * Main class for sending emails securely in production or development environments.
 * ✅ UPDATED: Now supports multiple SMTP accounts based on user plant (3330=Querétaro, 3310=Tetla)
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
require_once __DIR__ . '/PFWeeklyReporter.php';

// =========================================================================
// CONFIGURACIÓN DE ENTORNO Y CARGA DE CONFIGURACIÓN SMTP
// =========================================================================

if (APP_ENVIRONMENT === 'development') {
    // -- MODO DESARROLLO --
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    define('TEST_MODE', true);
    define('TEST_EMAIL', 'extern.jesus.perez@grammer.com');

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

    // URLs de PRODUCCIÓN
    define('URLM', 'https://grammermx.com/Mailer/PFMailer/');
    define('URLPF', 'https://grammermx.com/Logistica/PremiumFreight/');

    // Nivel de depuración SMTP (0 = Desactivado para producción)
    define('SMTP_DEBUG_LEVEL', 0);
}

// ✅ NUEVO: Cargar configuración SMTP desde archivo externo
require_once __DIR__ . '/smtp_config.php';

// Función de Log (si no existe una global)
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
    private $currentPlantConfig; // ✅ NUEVO: Para tracking de configuración actual

    /**
     * Constructor - inicializa PHPMailer y las dependencias.
     * ✅ MODIFICADO: Configuración SMTP dinámica según planta
     */
    public function __construct() {
        $this->services = new PFEmailServices();
        $this->templates = new PFEmailTemplates(URLM, URLPF);
        
        $con = new LocalConector();
        $this->db = $con->conectar();
        
        $this->mail = new PHPMailer(true);

        // ✅ NUEVO: Configuración básica sin SMTP específico
        // La configuración SMTP se hará dinámicamente antes de cada envío
        $this->mail->isSMTP();
        $this->mail->SMTPAuth = true;
        
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
        
        logAction("PFMailer initialized in mode: " . APP_ENVIRONMENT, 'INIT');
    }

    // =========================================================================
    // ✅ NUEVOS MÉTODOS PARA MANEJO MULTI-PLANTA
    // =========================================================================

    /**
     * ✅ SIMPLIFICADO: Determina configuración SMTP basado SOLO en email del destinatario
     * 
     * Lógica simple:
     * 1. Buscar email en tabla User  
     * 2. Si User.plant = '3330' → Querétaro
     * 3. Si User.plant = '3310' → Tetla
     * 4. Si no existe usuario o plant = NULL → default
     * 
     * @param string $recipientEmail Email del destinatario
     * @param array $orderData Datos de la orden (opcional, para compatibilidad)
     * @return string Código de planta ('3330', '3310', 'default')
     */
    public function determinePlantConfig($recipientEmail, $orderData = null) {
        logAction("Determinando planta para email: {$recipientEmail}", 'PLANT_DETECTION');
        
        // ✅ MÉTODO ÚNICO: Buscar email en tabla User
        try {
            $user = $this->getUserByEmail($recipientEmail);
            
            if ($user && !empty($user['plant'])) {
                $userPlant = (string)$user['plant'];
                logAction("Usuario encontrado - plant: {$userPlant} para email: {$recipientEmail}", 'PLANT_DETECTION');
                
                // Validar que sea una planta conocida (3330 o 3310)
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
     * ✅ SIMPLIFICADO: Obtiene datos de usuario por email
     * 
     * @param string $email Email del usuario
     * @return array|null Datos del usuario o null si no existe
     */
    public function getUserByEmail($email) {
        try {
            if (!$this->db) {
                logAction("Conexión a DB no disponible para getUserByEmail", 'USER_LOOKUP_ERROR');
                return null;
            }
            
            // Query simple y directa
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
     * Configura PHPMailer con la configuración SMTP de la planta especificada
     * 
     * @param string $plantCode Código de planta ('3330', '3310', 'default')
     */
    private function configureSMTPForPlant($plantCode) {
        logAction("Configurando SMTP para planta: {$plantCode}", 'SMTP_CONFIG');
        
        $configs = SMTP_CONFIGS;
        
        // Verificar que la configuración exista
        if (!array_key_exists($plantCode, $configs)) {
            logAction("Configuración no encontrada para planta: {$plantCode}, usando default", 'SMTP_CONFIG_WARNING');
            $plantCode = 'default';
        }
        
        $config = $configs[$plantCode];
        $this->currentPlantConfig = $config; // ✅ NUEVO: Guardar configuración actual
        
        try {
            // Reconfigurar PHPMailer con la nueva configuración
            $this->mail->Host = $config['host'];
            $this->mail->Port = $config['port'];
            $this->mail->Username = $config['username'];
            $this->mail->Password = $config['password'];
            $this->mail->SMTPSecure = $config['secure'];
            
            // Actualizar el remitente
            $this->mail->setFrom($config['username'], $config['from_name']);
            
            // Limpiar y reconfigurar BCC con la nueva cuenta
            $this->mail->clearBCCs();
            $this->mail->addBCC($config['username'], 'Backup Copy - ' . $config['plant_name']);
            
            logAction("SMTP configurado exitosamente para {$config['plant_name']} con usuario: {$config['username']}", 'SMTP_CONFIG_SUCCESS');
            
        } catch (Exception $e) {
            logAction("Error configurando SMTP para planta {$plantCode}: " . $e->getMessage(), 'SMTP_CONFIG_ERROR');
            throw $e;
        }
    }

    /**
     * ✅ SIMPLIFICADO: Establece destinatarios y configura SMTP según planta del usuario
     * 
     * Flujo simplificado:
     * 1. Buscar email destinatario en tabla User
     * 2. Usar User.plant para determinar configuración SMTP
     * 3. Si no existe usuario o plant=NULL → usar default
     * 4. Configurar PHPMailer con la cuenta SMTP correcta
     * 
     * @param string $originalEmail Email original del destinatario
     * @param string $originalName Nombre del destinatario
     * @param array $orderData Datos de la orden (opcional, para compatibilidad)
     */
    public function setEmailRecipients($originalEmail, $originalName = '', $orderData = null) {
        $this->mail->clearAddresses();

        // ✅ NUEVO: Redirecciones específicas para PRODUCCIÓN
        $productionRedirections = [
            'Margarita.Gomez2@grammer.com' => 'Margarita.Gomez@grammer.com',
            // Agregar más redirecciones aquí si necesitas:
            // 'otro.email@grammer.com' => 'nuevo.destino@grammer.com',
        ];

        // ✅ APLICAR REDIRECCIÓN ESPECÍFICA (solo en producción)
        $finalEmail = $originalEmail;
        $finalName = $originalName;
        $wasRedirected = false;

        if (APP_ENVIRONMENT === 'production' && isset($productionRedirections[$originalEmail])) {
            $finalEmail = $productionRedirections[$originalEmail];
            $finalName = $originalName; // Mantener nombre original
            $wasRedirected = true;
            logAction("PRODUCTION REDIRECT: {$originalEmail} -> {$finalEmail}", 'EMAIL_REDIRECT_PROD');
        }

        // ✅ PASO 1: Determinar planta basándose en email ORIGINAL (no el redirigido)
        $plantCode = $this->determinePlantConfig($originalEmail, $orderData);
        
        // ✅ PASO 2: Configurar SMTP según la planta
        $this->configureSMTPForPlant($plantCode);

        // ✅ PASO 3: Establecer destinatario según el modo
        if (TEST_MODE) {
            $this->mail->addAddress(TEST_EMAIL, 'Premium Freight Test');
            $plantName = $this->currentPlantConfig['plant_name'] ?? $plantCode;
            logAction("Email redirected: Original={$originalEmail} (Plant: {$plantName}) -> Test=" . TEST_EMAIL, 'TEST_MODE');
        } else {
            // Usar el email final (original o redirigido)
            $this->mail->addAddress($finalEmail, $finalName);
            $plantName = $this->currentPlantConfig['plant_name'] ?? $plantCode;
            
            if ($wasRedirected) {
                logAction("Email sent to REDIRECTED address: {$finalName} <{$finalEmail}> using plant: {$plantName} (Original: {$originalEmail})", 'MAIL_RECIPIENT_REDIRECTED');
            } else {
                logAction("Email sent to: {$finalName} <{$finalEmail}> using plant: {$plantName}", 'MAIL_RECIPIENT');
            }
        }
    }

    /**
     * ✅ NUEVO: Método para configurar múltiples destinatarios de la misma planta
     * 
     * @param array $recipients Array de destinatarios [['email' => '', 'name' => ''], ...]
     * @param string $forcePlantCode Forzar código de planta específico (opcional)
     */
    public function setMultipleEmailRecipients($recipients, $forcePlantCode = null) {
        $this->mail->clearAddresses();
        
        if (empty($recipients)) {
            logAction("No recipients provided for setMultipleEmailRecipients", 'EMAIL_RECIPIENTS_ERROR');
            return;
        }
        
        // Determinar planta basada en el primer destinatario o usar la forzada
        $plantCode = $forcePlantCode ?: $this->determinePlantConfig($recipients[0]['email']);
        
        // Configurar SMTP una sola vez para todos los destinatarios
        $this->configureSMTPForPlant($plantCode);
        
        // Agregar todos los destinatarios
        foreach ($recipients as $recipient) {
            if (TEST_MODE) {
                $this->mail->addAddress(TEST_EMAIL, 'Premium Freight Test');
                logAction("Multiple emails redirected to test: {$recipient['email']} -> " . TEST_EMAIL, 'TEST_MODE');
                break; // En modo test, solo agregar una vez
            } else {
                $this->mail->addAddress($recipient['email'], $recipient['name'] ?? '');
                $plantName = $this->currentPlantConfig['plant_name'] ?? $plantCode;
                logAction("Added recipient: {$recipient['name']} <{$recipient['email']}> using plant: {$plantName}", 'MAIL_RECIPIENT');
            }
        }
    }

    // =========================================================================
    // MÉTODOS DE LA APLICACIÓN (✅ MODIFICADOS para usar nueva lógica)
    // =========================================================================

    public function clearOrderCache($orderId) {
        if (method_exists($this->services, 'clearOrderCache')) {
            $this->services->clearOrderCache($orderId);
        }
    }

    /**
     * ✅ MODIFICADO: Envía notificación de recovery con configuración SMTP dinámica
     */
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

            $recipientEmail = $order['creator_email'];
            if (empty($recipientEmail)) {
                logAction("No creator email found for orderId: {$orderId}", 'SEND_RECOVERY_ERROR');
                return [
                    'success' => false,
                    'message' => "No email address found for order creator."
                ];
            }
            
            logAction("Setting recipient email: {$recipientEmail}", 'SEND_RECOVERY');
            
            // ✅ MODIFICADO: Usar el nuevo método que configura SMTP dinámicamente
            // Pasar los datos de la orden para ayudar en la detección de planta
            $this->setEmailRecipients($recipientEmail, $order['creator_name'] ?? 'User', $order);
            
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

    /**
     * ✅ MODIFICADO: Envía notificaciones de aprobación con configuración SMTP dinámica
     */
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
                    
                    // ✅ MODIFICADO: Pasar datos de orden para detección de planta
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
     * ✅ MODIFICADO: Envía resúmenes semanales con configuración SMTP dinámica
     */
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
                
                    // ✅ MODIFICADO: Usar nuevo método con detección de planta por usuario
                    $this->setEmailRecipients($approver['email'], $approver['name'], ['user_id' => $approverId]);
                    
                    $this->mail->Subject = "Premium Freight Weekly Summary - " . count($groupData['orders']) . " Pending Orders";
                    $this->mail->Body = $emailBody;
                    
                    if ($this->mail->send()) {
                        $result['success']++;
                        $plantName = $this->currentPlantConfig['plant_name'] ?? 'Unknown';
                        logAction("Weekly summary sent to {$approver['name']} via {$plantName}", 'WEEKLY_SUMMARY');
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
     * ✅ MODIFICADO: Genera y envía el reporte de estadísticas semanales
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

            // 3. Definir destinatarios por planta
            $recipients = [
                '3330' => [ // Querétaro
                    ['email' => 'extern.jesus.perez@grammer.com', 'name' => 'Jesus Perez'],
                    ['email' => 'dulce.mata@grammer.com', 'name' => 'Dulce Mata'],
                ],
                '3310' => [ // Tetla
                    ['email' => 'carlos.plazola@grammer.com', 'name' => 'Carlos Plazola'],
                    ['email' => 'margarita.ortega@grammer.com', 'name' => 'Margarita Ortega'],
                ]
            ];

            $emailsSent = 0;
            $errors = [];

            // 4. Enviar por cada planta
            foreach ($recipients as $plantCode => $plantRecipients) {
                try {
                    // ✅ MODIFICADO: Usar nuevo método para múltiples destinatarios de la misma planta
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
     * ✅ MODIFICADO: Envía notificaciones de estado con configuración SMTP dinámica
     * y CC automático para órdenes rechazadas
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
            
            // ✅ MODIFICADO: Pasar datos de orden para detección de planta
            $this->setEmailRecipients($creator['email'], $creator['name'], $orderData);
            
            // ✅ NUEVO: Agregar CC específico para órdenes RECHAZADAS
            if ($status === 'rejected') {
                // Cambiar esta dirección por la que necesites
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
                
                // Log adicional para rechazos con CC
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

    /**
     * ✅ MODIFICADO: Envía correos de verificación de recovery
     */
    public function sendRecoveryCheckEmails() {
        $result = ['totalSent' => 0, 'success' => 0, 'errors' => []];
        
        // Correos fijos que siempre deben recibir el email
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
                    'plant' => $order['plant'] // ✅ NUEVO: Incluir planta
                ];
                $ordersByUser[$order['user_id']]['orders'][] = $order;
            }

            foreach ($ordersByUser as $userInfo) {
                try {
                    $emailBody = $this->templates->getRecoveryCheckTemplate($userInfo['user'], $userInfo['orders']);
                    
                    // ✅ MODIFICADO: Usar nueva lógica con datos de usuario
                    $userData = ['user_id' => $userInfo['user']['id'], 'order_plant' => $userInfo['user']['plant']];
                    $this->setEmailRecipients($userInfo['user']['email'], $userInfo['user']['name'], $userData);
                    
                    // Agregar destinatarios fijos (CC)
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
                // Limpiar CC para el siguiente ciclo
                $this->mail->clearCCs();
            }
        } catch (Exception $e) {
            $result['errors'][] = "Error en sendRecoveryCheckEmails: " . $e->getMessage();
        }
        return $result;
    }

    /**
     * ✅ MODIFICADO: Envía correos de reset de contraseña
     */
    public function sendPasswordResetEmail($user, $token) {
        try {
            // ✅ MODIFICADO: Usar nueva lógica con datos de usuario
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

    /**
     * ✅ MODIFICADO: Envía correos de verificación
     */
    public function sendVerificationEmail($userId) {
        try {
            $user = $this->services->getUser($userId);
            if (!$user || !empty($user['verified'])) return false;
            
            $token = $this->generateVerificationToken($userId);
            if (!$token) return false;

            // ✅ MODIFICADO: Usar nueva lógica con datos de usuario
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

    /**
     * Genera token de verificación (sin modificaciones)
     */
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
    // MÉTODOS AUXILIARES Y COMPATIBILIDAD
    // =========================================================================

    /**
     * ✅ NUEVO: Obtiene información de la configuración actual
     */
    public function getCurrentPlantInfo() {
        return $this->currentPlantConfig;
    }

    /**
     * ✅ NUEVO: Obtiene estadísticas de configuraciones disponibles
     */
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

    /**
     * Método para obtener conexión DB (para compatibilidad)
     */
    public function getDatabase() {
        return $this->db;
    }

    /**
     * ✅ NUEVOS MÉTODOS PÚBLICOS PARA TESTING
     */

    /**
     * Establece el asunto del email
     */
    public function setSubject($subject) {
        $this->mail->Subject = $subject;
    }

    /**
     * Establece el cuerpo del email
     */
    public function setBody($body) {
        $this->mail->Body = $body;
    }

    /**
     * Envía el email configurado
     */
    public function send() {
        return $this->mail->send();
    }

    /**
     * Obtiene el último error de PHPMailer
     */
    public function getLastError() {
        return $this->mail->ErrorInfo;
    }

    /**
     * Hace públicos los métodos que necesitas para testing
     */
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