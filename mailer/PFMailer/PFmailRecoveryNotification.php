<?php
/**
 * PFmailRecoveryNotification.php - Endpoint para enviar recordatorios de recovery evidence
 * * Este archivo maneja las solicitudes para enviar correos de recordatorio
 * sobre las órdenes que necesitan evidencia de recovery. (Versión robusta)
 */

// Establecer el header de contenido al principio para asegurar que se envíe.
header('Content-Type: application/json');

// Usamos un bloque try/catch para capturar cualquier error fatal y devolver una respuesta JSON válida.
try {
    // Este require es un punto crítico. Si falla, el bloque catch lo manejará.
    require_once 'PFmailer.php';

    // Verificar el método de la solicitud
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405); // Method Not Allowed
        echo json_encode([
            'success' => false,
            'message' => 'Method Not Allowed. Please use POST.'
        ]);
        exit;
    }

    // Obtener y decodificar los datos de la solicitud
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // Validar que el JSON sea correcto
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400); // Bad Request
        echo json_encode([
            'success' => false,
            'message' => 'Invalid JSON format: ' . json_last_error_msg()
        ]);
        exit;
    }

    // El cliente solo envía orderId, así que lo validamos específicamente.
    if (!isset($data['orderId']) || !is_numeric($data['orderId']) || $data['orderId'] <= 0) {
        http_response_code(400); // Bad Request
        echo json_encode([
            'success' => false,
            'message' => 'Request must contain a valid numeric orderId.'
        ]);
        exit;
    }

    $orderId = intval($data['orderId']);
    
    // Inicializar el mailer
    $mailer = new PFMailer();

    // Obtener detalles de la orden
    $order = $mailer->getOrder($orderId);
    
    // Validar que la orden es apta para una notificación
    if (!$order) {
        http_response_code(404); // Not Found
        echo json_encode([
            'success' => false,
            'message' => "Order with ID #{$orderId} not found."
        ]);
        exit;
    }

    if (empty($order['recovery_file'])) {
        http_response_code(400); // Bad Request
        echo json_encode([
            'success' => false,
            'message' => "Order #{$orderId} does not require a recovery file, so no notification can be sent."
        ]);
        exit;
    }
    
    if (!empty($order['recovery_evidence'])) {
        http_response_code(400); // Bad Request
        echo json_encode([
            'success' => false,
            'message' => "Order #{$orderId} already has a recovery evidence file."
        ]);
        exit;
    }
    
    // Obtener datos del usuario creador
    $userId = $order['user_id'];
    $user = $mailer->getUser($userId);
    
    if (!$user) {
        http_response_code(404); // Not Found
        echo json_encode([
            'success' => false,
            'message' => "The creator (User ID: {$userId}) for order #{$orderId} was not found."
        ]);
        exit;
    }
    
    // Enviar el correo. sendRecoveryCheckEmail espera un array de órdenes.
    $result = $mailer->sendRecoveryCheckEmail($user, [$order]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => "A reminder email has been successfully sent to {$user['email']} for order #{$orderId}."
        ]);
    } else {
        // Esto indica un fallo dentro de la librería PHPMailer.
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'The mail server failed to send the email. Please check server logs for PHPMailer errors.'
        ]);
    }

} catch (Throwable $e) {
    // Captura cualquier otro error (incluyendo errores fatales)
    // Esto previene la página en blanco del error 500.
    http_response_code(500);
    error_log($e); // Escribe el error real en el log de errores del servidor
    echo json_encode([
        'success' => false,
        'message' => 'An internal server error occurred. Please contact the administrator.',
        'error_details' => $e->getMessage() // Para depuración, se puede quitar en producción
    ]);
}
