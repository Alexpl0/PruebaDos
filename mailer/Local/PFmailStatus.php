<?php
/**
 * PFmailStatus.php - Endpoint para enviar notificaciones de estado
 * 
 * Este archivo maneja las solicitudes para enviar correos de notificación
 * sobre el estado final (aprobado o rechazado) de órdenes de Premium Freight.
 */

require_once 'PFmailer.php';

// Establecer el tipo de contenido de la respuesta
header('Content-Type: application/json');

// Verificar método de solicitud
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Utilice POST.'
    ]);
    exit;
}

// Obtener datos de la solicitud
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validar datos
if (!$data || !isset($data['orderId']) || !isset($data['status'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Faltan parámetros requeridos: orderId y status'
    ]);
    exit;
}

$orderId = intval($data['orderId']);
$status = $data['status'];
$rejectorInfo = isset($data['rejectorInfo']) ? $data['rejectorInfo'] : null;

// Validar el estado
if ($status !== 'approved' && $status !== 'rejected') {
    echo json_encode([
        'success' => false,
        'message' => 'Estado inválido. Debe ser "approved" o "rejected".'
    ]);
    exit;
}

// Enviar la notificación
$mailer = new PFMailer();
$result = $mailer->sendStatusNotification($orderId, $status, $rejectorInfo);

// Responder con el resultado
if ($result) {
    echo json_encode([
        'success' => true,
        'message' => 'Notificación de estado enviada correctamente'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Error al enviar la notificación de estado'
    ]);
}
?>