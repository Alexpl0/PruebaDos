<?php
/**
 * PFmailNotification.php - Endpoint para enviar notificaciones de aprobación
 * 
 * Este archivo recibe solicitudes para enviar correos de notificación
 * a los siguientes aprobadores en línea para órdenes de Premium Freight.
 */

require_once 'PFmailer.php';

// Establecer el tipo de contenido de la respuesta
header('Content-Type: application/json');

// Verificar método de solicitud
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Use POST.'
    ]);
    exit;
}

// Obtener datos de la solicitud
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validar datos
if (!$data || !isset($data['orderId'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing required parameter: orderId'
    ]);
    exit;
}

$orderId = intval($data['orderId']);

// Enviar la notificación
$mailer = new PFMailer();
$result = $mailer->sendApprovalNotification($orderId);

// Responder con el resultado
if ($result) {
    echo json_encode([
        'success' => true,
        'message' => 'Notification sent successfully'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to send notification'
    ]);
}
?>