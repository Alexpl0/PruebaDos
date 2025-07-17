<?php
// 1. Load configuration to access constants
require_once __DIR__ . '/config.php';

// 2. Load necessary dependencies for sending emails
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// 3. Import PHPMailer library files
require '../Phpmailer/PHPMailer.php';
require '../Phpmailer/SMTP.php';

// 4. Import new modular classes
require_once 'PFEmailServices.php';
require_once 'PFEmailTemplates.php';

// 5. Define URL constants if they are not defined
if (!defined('URLM')) {
    define('URLM', 'https://grammermx.com/Mailer/PFMailer/');
}

if(!defined('URLPF')) {
    define('URLPF', 'https://grammermx.com/Jesus/PruebaDos/');
}

// 6. TEST MODE CONFIGURATION
define('TEST_MODE', true);
define('TEST_EMAIL', 'extern.jesus.perez@grammer.com');

class PFMailer {
    private $mail;
    private $services;
    private $templates;
    private $baseUrl;
    private $db;

    /**
     * Constructor - initializes PHPMailer and dependencies
     */
    public function __construct() {
        $this->baseUrl = URLM;
        $this->baseUrlPF = URLPF;
        
        $this->services = new PFEmailServices();
        $this->templates = new PFEmailTemplates($this->baseUrl, $this->baseUrlPF);
        
        require_once 'PFDB.php';
        $con = new LocalConector();
        $this->db = $con->conectar();
        
        $this->mail = new PHPMailer(true);

        // --- ENABLING DETAILED SMTP DEBUGGING ---
        // This will show us the full conversation with the mail server in the log.
        $this->mail->SMTPDebug = 2; 
        $this->mail->Debugoutput = function($str, $level) {
            logAction("PHPMailer Debug: {$str}", "SMTP");
        };

        // SMTP Configuration
        $this->mail->isSMTP();
        $this->mail->Host = 'smtp.hostinger.com'; 
        $this->mail->Port = 465;
        $this->mail->SMTPAuth = true;
        $this->mail->Username = 'jesuspruebas@grammermx.com';
        $this->mail->Password = 'PremiumFreight2025';
        $this->mail->SMTPSecure = 'ssl';
        
        $this->mail->isHTML(true);
        $this->mail->CharSet = 'UTF-8';
        
        $this->mail->setFrom('jesuspruebas@grammermx.com', 'Premium Freight System');
        $this->mail->addBCC('jesuspruebas@grammermx.com', 'Jesús Pérez');
        
        if (TEST_MODE) {
            $this->mail->addBCC(TEST_EMAIL, 'Premium Freight Test');
            logAction("TEST MODE ENABLED: All emails will be redirected to " . TEST_EMAIL, 'TEST_MODE');
        }
    }

    /**
     * Helper method to set recipients according to the mode
     */
    private function setEmailRecipients($originalEmail, $originalName = '') {
        $this->mail->clearAddresses();
        
        if (TEST_MODE) {
            $this->mail->addAddress(TEST_EMAIL, 'Premium Freight Test');
            logAction("Email redirected: Original={$originalEmail} -> Test=" . TEST_EMAIL, 'TEST_MODE');
        } else {
            $this->mail->addAddress($originalEmail, $originalName);
        }
    }

    /**
     * NEW FUNCTION
     * Calls the service to clear the cache for a specific order.
     * @param int $orderId The ID of the order to clear.
     */
    public function clearOrderCache($orderId) {
        if (method_exists($this->services, 'clearOrderCache')) {
            $this->services->clearOrderCache($orderId);
        }
    }

    /**
     * NEW FUNCTION
     * Sends an individual notification for an order that requires 'recovery_evidence'.
     * @param int $orderId - The ID of the order to check.
     * @return array - An array with the status ['success' => bool, 'message' => string].
     */
    public function sendSingleRecoveryNotification($orderId) {
        try {
            logAction("RECOVERY_SINGLE: Starting for order #{$orderId}", 'RECOVERY_SINGLE');

            $order = $this->services->getOrderDetails($orderId);
            if (!$order) {
                return ['success' => false, 'message' => "Order #{$orderId} was not found."];
            }
            logAction("RECOVERY_SINGLE: Order details obtained.", 'RECOVERY_SINGLE');

            if (empty($order['recovery_file'])) {
                $message = "Order #{$orderId} does not require a recovery file, so no notification can be sent.";
                return ['success' => false, 'message' => $message];
            }
            logAction("RECOVERY_SINGLE: 'recovery_file' check passed.", 'RECOVERY_SINGLE');
            
            if (!empty($order['recovery_evidence'])) {
                $message = "Order #{$orderId} already has a recovery evidence file.";
                return ['success' => false, 'message' => $message];
            }
            logAction("RECOVERY_SINGLE: 'recovery_evidence' check passed.", 'RECOVERY_SINGLE');

            $user = $this->services->getUser($order['user_id']);
            if (!$user) {
                return ['success' => false, 'message' => "The creator user for the order was not found."];
            }
            logAction("RECOVERY_SINGLE: Creator user obtained.", 'RECOVERY_SINGLE');

            logAction("RECOVERY_SINGLE: Generating email template...", 'RECOVERY_SINGLE');
            $emailBody = $this->templates->getRecoveryCheckTemplate($user, [$order]);
            logAction("RECOVERY_SINGLE: Email template generated.", 'RECOVERY_SINGLE');
            
            logAction("RECOVERY_SINGLE: Setting recipients...", 'RECOVERY_SINGLE');
            $this->setEmailRecipients($user['email'], $user['name']);
            logAction("RECOVERY_SINGLE: Recipients set.", 'RECOVERY_SINGLE');
            
            logAction("RECOVERY_SINGLE: Setting subject and body...", 'RECOVERY_SINGLE');
            $this->mail->Subject = "Reminder: Recovery Evidence Required for Order #{$orderId}";
            $this->mail->Body = $emailBody;
            logAction("RECOVERY_SINGLE: Subject and body set.", 'RECOVERY_SINGLE');
            
            logAction("RECOVERY_SINGLE: Attempting to send email (mail->send())...", 'RECOVERY_SINGLE');
            if ($this->mail->send()) {
                logAction("RECOVERY_SINGLE: Email sent successfully.", 'RECOVERY_SINGLE');
                $this->services->logNotification($orderId, $user['id'], 'recovery_reminder');
                return ['success' => true, 'message' => "A reminder email has been sent to {$user['email']} for order #{$orderId}."];
            } else {
                logAction("RECOVERY_SINGLE: PHPMailer failed. Error: " . $this->mail->ErrorInfo, 'RECOVERY_SINGLE');
                return ['success' => false, 'message' => "The mail server could not send the notification. Error: " . $this->mail->ErrorInfo];
            }

        } catch (Exception $e) {
            logAction("RECOVERY_SINGLE: Exception caught: " . $e->getMessage(), 'RECOVERY_SINGLE');
            return ['success' => false, 'message' => 'A server exception occurred: ' . $e->getMessage()];
        }
    }

    // --- ORIGINAL FUNCTIONS RESTORED ---

    public function sendApprovalNotification($orderId) {
        try {
            logAction("Starting sendApprovalNotification for order #{$orderId}", 'SENDAPPROVAL');
            
            $orderDetails = $this->services->getOrderDetails($orderId);
            if (!$orderDetails) {
                logAction("ERROR: Details not found for order #{$orderId}", 'SENDAPPROVAL');
                return false;
            }
            
            $nextApprovers = $this->services->getNextApprovers($orderId);
            if (empty($nextApprovers)) {
                logAction("No next approvers for order #{$orderId} - it may be fully approved or rejected", 'SENDAPPROVAL');
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
                        logAction("Email sent successfully to {$approver['name']} ({$approver['email']})", 'SENDAPPROVAL');
                        $this->services->logNotification($orderId, $approver['id'], 'approval_request');
                    } else {
                        logAction("Error sending email to {$approver['email']}: " . $this->mail->ErrorInfo, 'SENDAPPROVAL');
                    }
                    
                } catch (Exception $e) {
                    logAction("Exception sending email to {$approver['email']}: " . $e->getMessage(), 'SENDAPPROVAL');
                }
            }
            
            logAction("Approval notifications completed: {$emailsSent} of " . count($nextApprovers) . " sent", 'SENDAPPROVAL');
            return $emailsSent > 0;
            
        } catch (Exception $e) {
            logAction("Error in sendApprovalNotification: " . $e->getMessage(), 'SENDAPPROVAL');
            return false;
        }
    }

    public function sendWeeklySummaryEmails() {
        $result = [
            'totalSent' => 0,
            'success' => 0,
            'errors' => []
        ];

        try {
            $pendingOrders = $this->services->getPendingOrdersForWeeklySummary();
            if (empty($pendingOrders)) {
                return $result;
            }
            
            $ordersByApprover = $this->services->groupOrdersByApprover($pendingOrders);
            
            foreach ($ordersByApprover as $approverId => $groupData) {
                try {
                    $approver = $this->services->getUser($approverId);
                    if (!$approver) {
                        $result['errors'][] = "User not found for ID: $approverId";
                        continue;
                    }
                    
                    $userOrders = $groupData['orders'];
                    $bulkTokens = $groupData['bulk_tokens'];
                    $approveAllToken = $bulkTokens['approve'];
                    $rejectAllToken = $bulkTokens['reject'];
                    
                    $emailBody = $this->templates->getWeeklySummaryTemplate($userOrders, $approver, $approveAllToken, $rejectAllToken);
                
                    $this->setEmailRecipients($approver['email'], $approver['name']);
                    
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

    public function sendStatusNotification($orderId, $status, $rejectorInfo = null) {
        try {
            $orderData = $this->services->getOrderDetails($orderId);
            if (!$orderData) {
                error_log("Data not found for order #$orderId");
                return false;
            }

            $creator = $this->services->getUser($orderData['user_id']);
            if (!$creator) {
                error_log("Creator not found for order #$orderId");
                return false;
            }

            $emailBody = $this->templates->getStatusNotificationTemplate($orderData, $status, $rejectorInfo);
            
            $subject = ($status === 'approved') ? 
                "Premium Freight Order #{$orderId} - Approved" : 
                "Premium Freight Order #{$orderId} - Rejected";
            
            $this->setEmailRecipients($creator['email'], $creator['name']);
            
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
            error_log("Error in sendStatusNotification: " . $e->getMessage());
            return false;
        }
    }

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

    public function sendRecoveryCheckEmails() {
        $result = [
            'totalSent' => 0,
            'success' => 0,
            'errors' => []
        ];

        try {
            if (!$this->db) {
                throw new Exception("Database connection not established");
            }

            $sql = "SELECT PF.id, PF.user_id, PF.description, PF.cost_euros, 
                           PF.date, PF.recovery_file, PF.area, U.name, U.email
                    FROM PremiumFreight PF
                    INNER JOIN User U ON PF.user_id = U.id
                    WHERE PF.recovery_file IS NOT NULL 
                    AND PF.recovery_file != ''
                    AND (PF.recovery_evidence IS NULL OR PF.recovery_evidence = '')";
        
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

            foreach ($ordersByUser as $userInfo) {
                try {
                    $emailBody = $this->templates->getRecoveryCheckTemplate($userInfo['user'], $userInfo['orders']);
                    $this->setEmailRecipients($userInfo['user']['email'], $userInfo['user']['name']);
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

    public function getDatabase() {
        return $this->services->getDatabase();
    }

    public function getOrderDetails($orderId) {
        return $this->services->getOrderDetails($orderId);
    }

    public function getUser($userId) {
        return $this->services->getUser($userId);
    }

    public function setTestMode($enable = true) {
        if ($enable) {
            logAction("Switching to TEST MODE: All emails will be redirected to " . TEST_EMAIL, 'TEST_MODE');
        } else {
            logAction("Switching to PRODUCTION MODE: Emails will be sent to real addresses", 'PRODUCTION_MODE');
        }
    }
    
    public function testConnection() {
        try {
            return $this->mail->smtpConnect();
        } catch (Exception $e) {
            throw new Exception("SMTP connection failed: " . $e->getMessage());
        }
    }

    public function sendPasswordResetEmail($user, $token) {
        try {
            logAction("Starting password reset email dispatch for user: " . $user['email'], 'PASSWORD_RESET');
            $this->mail->clearAddresses();
            $this->setEmailRecipients($user['email'], $user['name']);
            $emailContent = $this->templates->getPasswordResetTemplate($user, $token);
            $this->mail->Subject = 'Password Reset Request - Premium Freight System';
            $this->mail->Body = $emailContent;
            $result = $this->mail->send();
            
            if ($result) {
                logAction("Password reset email sent successfully to: " . $user['email'], 'PASSWORD_RESET');
            } else {
                logAction("Error sending password reset email to: " . $user['email'], 'PASSWORD_RESET');
            }
            return $result;
        } catch (Exception $e) {
            logAction("Exception in sendPasswordResetEmail: " . $e->getMessage(), 'PASSWORD_RESET');
            return false;
        } finally {
            $this->mail->clearAddresses();
            $this->mail->clearAttachments();
        }
    }

    public function sendVerificationEmail($userId) {
        try {
            logAction("Starting account verification email dispatch for user: " . $userId, 'VERIFICATION');
            $user = $this->services->getUser($userId);
            if (!$user) {
                logAction("User not found: " . $userId, 'VERIFICATION');
                return false;
            }
            if ($user['verified'] == 1) {
                logAction("User already verified: " . $userId, 'VERIFICATION');
                return true;
            }
            $token = $this->generateVerificationToken($userId);
            if (!$token) {
                logAction("Error generating token for user: " . $userId, 'VERIFICATION');
                return false;
            }
            $this->setEmailRecipients($user['email'], $user['name']);
            $emailContent = $this->templates->getVerificationTemplate($user, $token);
            $this->mail->Subject = 'Account Verification - Premium Freight System';
            $this->mail->Body = $emailContent;
            $result = $this->mail->send();
            
            if ($result) {
                logAction("Verification email sent successfully to: " . $user['email'], 'VERIFICATION');
            } else {
                logAction("Error sending verification email: " . $this->mail->ErrorInfo, 'VERIFICATION');
            }
            return $result;
        } catch (Exception $e) {
            logAction("Exception in sendVerificationEmail: " . $e->getMessage(), 'VERIFICATION');
            return false;
        } finally {
            $this->mail->clearAddresses();
        }
    }

    private function generateVerificationToken($userId) {
        try {
            $token = bin2hex(random_bytes(32));
            $createTableSql = "CREATE TABLE IF NOT EXISTS EmailVerificationTokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                token VARCHAR(64) NOT NULL UNIQUE,
                user_id INT NOT NULL,
                is_used TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP NULL,
                INDEX idx_token (token),
                INDEX idx_user_id (user_id),
                FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            
            $this->db->query($createTableSql);
            
            $sql = "INSERT INTO EmailVerificationTokens (token, user_id) VALUES (?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("si", $token, $userId);
            
            if ($stmt->execute()) {
                return $token;
            }
            return null;
        } catch (Exception $e) {
            logAction("Error generating verification token: " . $e->getMessage(), 'VERIFICATION');
            return null;
        }
    }
}

// Debug: Check if TEST_MODE is enabled
if (TEST_MODE) {
    logAction("TEST_MODE is enabled. Redirecting emails to " . TEST_EMAIL, 'DEBUG');
}
?>
