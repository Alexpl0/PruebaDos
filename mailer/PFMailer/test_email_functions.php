<?php
/**
 * test_email_functions.php - Endpoint to test various email functions
 * 
 * This script provides API endpoints to test different email notification
 * functions within the Premium Freight system.
 */

// Show all errors for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Log all errors to a file
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

try {
    // Load configuration
    require_once __DIR__ . '/config.php';
    
    // Load the PFmailer class
    require_once 'PFmailer.php';

    // Set response content type
    header('Content-Type: application/json');

    // Ensure logs directory exists
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    // Get request data
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    
    // Log incoming request
    $timestamp = date('Y-m-d H:i:s');
    $logFile = $logDir . '/test_email_functions.log';
    file_put_contents($logFile, "[$timestamp] Request received: " . $rawInput . "\n", FILE_APPEND);
    
    // Initialize PFMailer
    $mailer = new PFMailer();
    
    // Initialize response
    $response = [
        'success' => false,
        'message' => 'Unknown action'
    ];
    
    // Process different actions
    if (isset($data['action'])) {
        switch ($data['action']) {
            case 'status_notification':
                // Test sending a status notification email
                if (!isset($data['order_id']) || !isset($data['status'])) {
                    $response = [
                        'success' => false,
                        'message' => 'Missing required parameters: order_id and status'
                    ];
                } else {
                    $result = $mailer->sendStatusNotification(
                        $data['order_id'], 
                        $data['status'],
                        isset($data['rejector_info']) ? $data['rejector_info'] : null
                    );
                    
                    $response = [
                        'success' => $result,
                        'message' => $result ? 'Status notification sent successfully' : 'Failed to send status notification'
                    ];
                }
                break;
                
            case 'weekly_summary':
                // Test sending weekly summary emails
                $result = $mailer->sendWeeklySummaryEmails();
                
                $response = [
                    'success' => ($result['success'] > 0),
                    'message' => "Weekly summary emails sent: {$result['success']} successful, " . count($result['errors']) . " failed",
                    'details' => $result
                ];
                break;
                
            case 'recovery_check':
                // Test sending recovery check emails
                $result = $mailer->sendRecoveryCheckEmails();
                
                $response = [
                    'success' => ($result['success'] > 0),
                    'message' => "Recovery check emails sent: {$result['success']} successful, " . count($result['errors']) . " failed",
                    'details' => $result
                ];
                break;
                
            default:
                $response = [
                    'success' => false,
                    'message' => 'Unknown action: ' . $data['action']
                ];
        }
    }
    
    // Log the response
    file_put_contents($logFile, "[$timestamp] Response: " . json_encode($response) . "\n", FILE_APPEND);
    
    // Send the response
    echo json_encode($response);
    
} catch (Exception $e) {
    // Log the exception
    $errorTimestamp = date('Y-m-d H:i:s');
    $errorMessage = "[$errorTimestamp] Exception: " . $e->getMessage() . "\n";
    file_put_contents($logDir . '/test_email_functions.log', $errorMessage, FILE_APPEND);
    
    // Return error response
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>