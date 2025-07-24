<?php
/**
 * PFmailRecoveryNotification.php - Endpoint para enviar recordatorios de recovery evidence
 * * Este archivo maneja las solicitudes para enviar correos de recordatorio
 * sobre las órdenes que necesitan evidencia de recovery. (Versión robusta con acciones)
 */

header('Content-Type: application/json');

try {
    require_once 'PFmailer.php';

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405); // Method Not Allowed
        echo json_encode(['success' => false, 'message' => 'Method Not Allowed. Please use POST.']);
        exit;
    }

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400); // Bad Request
        echo json_encode(['success' => false, 'message' => 'Invalid JSON format: ' . json_last_error_msg()]);
        exit;
    }

    // Usamos 'task' para evitar posibles bloqueos de WAF
    $task = $data['task'] ?? null;
    $mailer = new PFMailer();

    switch ($task) {
        case 'send_recovery_for_order':
            if (!isset($data['orderId']) || !is_numeric($data['orderId']) || $data['orderId'] <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Task "send_recovery_for_order" requires a valid numeric orderId.']);
                exit;
            }
            $orderId = intval($data['orderId']);
            // CORRECCIÓN: Usar el método correcto que sí existe en PFmailer.php
            $order = $mailer->getOrderDetails($orderId);
            
            if (!$order) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => "Order with ID #{$orderId} not found."]);
                exit;
            }
            if (!empty($order['recovery_evidence'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => "Order #{$orderId} already has a recovery evidence file."]);
                exit;
            }
            
            $user = $mailer->getUser($order['user_id']);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => "Creator for order #{$orderId} not found."]);
                exit;
            }
            
            // CORRECCIÓN: Usar el nuevo método específico para enviar un solo correo de recovery
            $result = $mailer->sendRecoveryCheckEmail($user, [$order]);
            
            if ($result) {
                echo json_encode(['success' => true, 'message' => "A reminder email has been successfully sent to {$user['email']} for order #{$orderId}."]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'The mail server failed to send the email.']);
            }
            break;

        case 'recovery_check': // Acción para el cron job
            $result = $mailer->sendRecoveryNotifications(); 
            echo json_encode([
                'success' => $result['success'],
                'message' => "Bulk recovery check completed.",
                'details' => $result
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'message' => 'No valid task provided. Available tasks: "send_recovery_for_order", "recovery_check".'
            ]);
            break;
    }

} catch (Throwable $e) {
    http_response_code(500);
    error_log("Error in PFmailRecoveryNotification.php: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    echo json_encode([
        'success' => false,
        'message' => 'An internal server error occurred. Please check the logs.',
        'error' => $e->getMessage()
    ]);
}
