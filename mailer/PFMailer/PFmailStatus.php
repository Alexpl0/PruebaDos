<?php
/**
 * PFmailStatus.php - Endpoint para enviar notificaciones de estado
 *
 * Versión corregida:
 * - Añadido manejo de errores con try-catch para asegurar respuestas JSON.
 */

// Establecer el tipo de contenido de la respuesta
header('Content-Type: application/json');

// --- CONFIGURACIÓN DE ERRORES ---
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

try {
    require_once 'PFmailer.php';

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed. Use POST.');
    }

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data || !isset($data['orderId']) || !isset($data['status'])) {
        throw new Exception('Missing required parameters: orderId and status.');
    }

    $orderId = intval($data['orderId']);
    $status = $data['status'];
    $rejectorInfo = isset($data['rejectorInfo']) ? $data['rejectorInfo'] : null;

    if ($status !== 'approved' && $status !== 'rejected') {
        throw new Exception('Invalid status. Must be "approved" or "rejected".');
    }

    $mailer = new PFMailer();
    $result = $mailer->sendStatusNotification($orderId, $status, $rejectorInfo);

    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Status notification sent successfully.'
        ]);
    } else {
        throw new Exception('Mailer failed to send the status notification.');
    }

} catch (Exception $e) {
    // Registrar el error
    error_log("Error en PFmailStatus.php: " . $e->getMessage());

    // Enviar respuesta de error JSON
    http_response_code(400); // Bad Request o 500 Internal Server Error
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

?>
