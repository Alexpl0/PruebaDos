<?php
/**
 * Endpoint to select a quote
 * Intelligent Quoting Portal
 * @author Alejandro Pérez (Updated for QuoteResponses table)
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db/db.php';
require_once __DIR__ . '/dao/mailer/mailer.php';

use App\Mailer\AppMailer;

function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Method not allowed. Use POST.', null, 405);
}

$conex = null;
$quoteId = 0;

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    $quoteId = intval($data['quote_id'] ?? 0);
    if ($quoteId <= 0) {
        throw new Exception('Invalid quote ID');
    }

    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->begin_transaction();

    // Get quote information - Updated to use QuoteResponses
    $stmtQuote = $conex->prepare("
        SELECT qr.request_id, qr.cost, qr.delivery_time, c.name as carrier_name, c.email as carrier_email
        FROM QuoteResponses qr
        INNER JOIN Carriers c ON qr.carrier_id = c.id
        WHERE qr.response_id = ?");
    $stmtQuote->bind_param("i", $quoteId);
    $stmtQuote->execute();
    $quoteResult = $stmtQuote->get_result();
    $quote = $quoteResult->fetch_assoc();
    $stmtQuote->close();

    if (!$quote) {
        throw new Exception('Quote not found');
    }
    $requestId = $quote['request_id'];

    // Unselect other quotes for the same request - Updated to use QuoteResponses
    $stmtUpdateOthers = $conex->prepare("UPDATE QuoteResponses SET is_selected = 0 WHERE request_id = ?");
    $stmtUpdateOthers->bind_param("i", $requestId);
    $stmtUpdateOthers->execute();
    $stmtUpdateOthers->close();

    // Select the current quote - Updated to use QuoteResponses
    $stmtUpdateCurrent = $conex->prepare("UPDATE QuoteResponses SET is_selected = 1 WHERE response_id = ?");
    $stmtUpdateCurrent->bind_param("i", $quoteId);
    $stmtUpdateCurrent->execute();
    $stmtUpdateCurrent->close();

    // Update ShippingRequests status to completed
    $stmtUpdateRequest = $conex->prepare("UPDATE ShippingRequests SET request_status = 'completed', updated_at = NOW() WHERE request_id = ?");
    $stmtUpdateRequest->bind_param("i", $requestId);
    $stmtUpdateRequest->execute();
    $stmtUpdateRequest->close();

    $conex->commit();
    
    // Send notification email
    $emailSent = sendSelectionNotification($quote, $requestId);

    sendJsonResponse(true, 'Quote selected successfully', [
        'quote_id' => $quoteId, 
        'request_id' => $requestId, 
        'email_sent' => $emailSent
    ]);

} catch (Exception $e) {
    if ($conex) $conex->rollback();
    sendJsonResponse(false, 'Error selecting quote: ' . $e->getMessage(), ['quote_id' => $quoteId], 500);
} finally {
    if ($conex) $conex->close();
}

function sendSelectionNotification($quote, $requestId) {
    try {
        $mailer = new AppMailer();
        $subject = "✅ Your quote for request #{$requestId} has been selected - GRAMMER";
        
        $body = "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: linear-gradient(135deg, #003366, #0066CC); color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .highlight { background: #e8f4f8; padding: 15px; border-left: 4px solid #0066CC; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class='header'>
                <h2>🎉 Congratulations!</h2>
            </div>
            <div class='content'>
                <p>Dear <strong>{$quote['carrier_name']}</strong>,</p>
                
                <p>We are pleased to inform you that your quote has been <strong>selected</strong> for GRAMMER shipping request <strong>#{$requestId}</strong>.</p>
                
                <div class='highlight'>
                    <strong>Selected Quote Details:</strong><br>
                    💰 Cost: $" . number_format($quote['cost'], 2) . " USD<br>
                    🚚 Delivery Time: {$quote['delivery_time']}<br>
                    📋 Request ID: #{$requestId}
                </div>
                
                <p>Our logistics team will contact you shortly with further details to proceed with the shipment.</p>
                
                <p>Thank you for your prompt response and competitive pricing!</p>
                
                <p>Best regards,<br>
                <strong>GRAMMER Logistics & Traffic Team</strong></p>
            </div>
            <div class='footer'>
                <p>GRAMMER Automotive Puebla S.A. de C.V.<br>
                This is an automated notification from the GRAMMER Intelligent Quotation Portal</p>
            </div>
        </body>
        </html>";
        
        return $mailer->sendEmail($quote['carrier_email'], $quote['carrier_name'], $subject, $body);
    } catch (Exception $e) {
        error_log("Failed to send selection email: " . $e->getMessage());
        return false;
    }
}