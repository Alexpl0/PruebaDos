<?php
/**
 * Premium Freight Email Notification System
 * 
 * This script handles sending email notifications when a new premium freight order
 * requires approval. It uses PHPMailer to send HTML-formatted emails to approvers.
 * 
 * @author GitHub Copilot
 * @version 1.0
 * @date May 9, 2025
 */

// Start session to access session variables if needed
session_start();

// Include database connection
include_once(__DIR__ . "/../dao/db/db.php");

// Include PHPMailer library components
require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

// Import required PHPMailer classes
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Set content type header to JSON for API-like response
header('Content-Type: application/json; charset=UTF-8');

/**
 * Main execution block
 * Process the freight order ID and send notification emails to approvers
 */
if (isset($_POST['freight_id']) && isset($_POST['email1'])) {
    // Get the premium freight ID and primary approver email
    $freightId = $_POST['freight_id'];
    $email1 = $_POST['email1'];
    
    // Get optional secondary and tertiary approver emails if provided
    $email2 = $_POST['email2'] ?? '';
    $email3 = $_POST['email3'] ?? '';
    
    // Create database connection
    $con = new LocalConector();
    $conex = $con->conectar();
    
    // Retrieve the freight order reference number from the database
    $stmt = $conex->prepare("SELECT reference_number FROM PremiumFreight WHERE id = ?");
    $stmt->bind_param("i", $freightId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    // Check if the freight order exists
    if ($resultado->num_rows === 0) {
        echo json_encode([
            "status" => "error", 
            "message" => "Premium freight order not found."
        ]);
        exit;
    }
    
    // Get the reference number
    $row = $resultado->fetch_assoc();
    $referenceNumber = $row['reference_number'];
    $stmt->close();
    
    // Generate approval link with reference number
    $approvalLink = "https://grammermx.com/Jesus/PruebaDos/approve_freight.php?ref={$referenceNumber}";
    
    // Email content preparation
    $subject = "Premium Freight Approval Request";
    $message = "
    <p>Dear Approver,</p>
    <p>A new premium freight order with reference number <strong>{$referenceNumber}</strong> requires your approval.</p>
    <p>Please review and approve or reject this request by clicking the link below:</p>
    <p>
        <a href='{$approvalLink}' target='_blank' style='background: #E6F4F9; color: #005195; 
        padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;
        display: inline-block;'>
            Review Premium Freight
        </a>
    </p>
    <p>Best regards,<br>
    Premium Freight Management System - Grammer</p>";
    
    // Send the notification email
    $emailResponse = sendNotificationEmail($email1, $email2, $email3, $subject, $message);
    
    // Return response based on email sending status
    if ($emailResponse['status'] === 'success') {
        echo json_encode([
            "status" => "success", 
            "message" => "Notification email sent successfully."
        ]);
    } else {
        echo json_encode([
            "status" => "error", 
            "message" => "Error sending notification email: " . $emailResponse['message']
        ]);
    }
} else {
    // Return error if required parameters are missing
    echo json_encode([
        "status" => "error", 
        "message" => "Freight ID and primary approver email are required."
    ]);
}

/**
 * Send notification email to approvers
 * 
 * This function prepares and sends HTML-formatted email notifications
 * to the designated approvers using PHPMailer.
 * 
 * @param string $email1 Primary approver email (required)
 * @param string $email2 Secondary approver email (optional)
 * @param string $email3 Tertiary approver email (optional)
 * @param string $subject Email subject line
 * @param string $message Email body content (HTML format)
 * @return array Status and message of the email sending attempt
 */
function sendNotificationEmail($email1, $email2, $email3, $subject, $message) {
    // Create complete HTML email template with provided message
    $htmlContent = "
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>{$subject}</title>
    </head>
    <body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333333;'>
        <table role='presentation' style='width: 100%; max-width: 600px; margin: auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);'>
            <tr>
                <td style='background-color: #005195; padding: 20px; color: #FFFFFF; text-align: center;'>
                    <h2>Premium Freight Notification</h2>
                </td>
            </tr>
            <tr>
                <td style='padding: 30px; text-align: left; color: #333333;'>
                    {$message}
                </td>
            </tr>
            <tr>
                <td style='background-color: #005195; color: #FFFFFF; padding: 15px; text-align: center;'>
                    <p>&copy; " . date('Y') . " Grammer. All rights reserved.</p>
                </td>
            </tr>
        </table>
    </body>
    </html>";
    
    // Initialize PHPMailer with exceptions enabled
    $mail = new PHPMailer(true);
    
    try {
        // Configure SMTP settings
        $mail->isSMTP();                                      // Use SMTP protocol
        $mail->Host       = 'smtp.hostinger.com';             // SMTP server address
        $mail->SMTPAuth   = true;                             // Enable SMTP authentication
        $mail->Username   = 'premium_freight@grammermx.com';  // SMTP username
        $mail->Password   = 'FreightSystem2025.';             // SMTP password
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;      // Enable TLS encryption (ssl)
        $mail->Port       = 465;                              // TCP port (465 for SSL)
        
        // Set sender information
        $mail->setFrom('premium_freight@grammermx.com', 'Premium Freight System');
        
        // Add recipient email addresses
        $mail->addAddress($email1);                           // Primary approver (required)
        if (!empty($email2)) $mail->addAddress($email2);      // Secondary approver (optional)
        if (!empty($email3)) $mail->addAddress($email3);      // Tertiary approver (optional)
        
        // Add BCC recipients for monitoring (system administrators)
        $mail->addBCC('premium_freight@grammermx.com');       // System monitoring address
        $mail->addBCC('extern.jesus.perez@grammer.com');      // System administrator
        
        // Email configuration
        $mail->isHTML(true);                                  // Set email format to HTML
        $mail->CharSet = 'UTF-8';                             // Set character encoding
        $mail->Subject = $subject;                            // Set email subject
        $mail->Body    = $htmlContent;                        // Set HTML email body
        
        // Create plain text version of the email for non-HTML mail clients
        $mail->AltBody = strip_tags(str_replace(['<br>', '</p>'], ["\n", "\n\n"], $message));
        
        // Send email and handle result
        if (!$mail->send()) {
            // Return error if sending fails
            return [
                'status' => 'error', 
                'message' => $mail->ErrorInfo
            ];
        } else {
            // Return success if sending succeeds
            return [
                'status' => 'success', 
                'message' => 'Email sent successfully.'
            ];
        }
    } catch (Exception $e) {
        // Return error details if exception occurs
        return [
            'status' => 'error', 
            'message' => 'Error: ' . $e->getMessage()
        ];
    }
}
?>