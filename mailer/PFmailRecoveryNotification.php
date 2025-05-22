<?php
/**
 * PFmailRecoveryNotification.php - Endpoint para enviar recordatorios de recovery evidence
 * 
 * Este archivo maneja las solicitudes para enviar correos de recordatorio
 * sobre las órdenes que necesitan evidencia de recovery.
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

// Inicializar mailer
$mailer = new PFMailer();

// Si se proporciona un ID de usuario específico, enviar solo para ese usuario
if (isset($data['userId'])) {
    $userId = intval($data['userId']);
    
    // Obtener órdenes pendientes de recovery evidence para el usuario
    $pendingOrders = $mailer->getPendingRecoveryOrdersByUser($userId);
    
    if (empty($pendingOrders)) {
        echo json_encode([
            'success' => false,
            'message' => 'No se encontraron órdenes que necesiten evidencia de recovery para este usuario.'
        ]);
        exit;
    }
    
    // Obtener datos del usuario
    $user = $mailer->getUser($userId);
    if (!$user) {
        echo json_encode([
            'success' => false,
            'message' => 'Usuario no encontrado.'
        ]);
        exit;
    }
    
    // Enviar correo
    $result = $mailer->sendRecoveryCheckEmail($user, $pendingOrders);
    
    echo json_encode([
        'success' => $result,
        'message' => $result ? 'Correo de verificación de recovery enviado correctamente.' : 'Error al enviar correo de verificación de recovery.'
    ]);
} 
// Si se proporciona un ID de orden específico, enviar solo para esa orden
else if (isset($data['orderId'])) {
    $orderId = intval($data['orderId']);
    
    // Obtener detalles de la orden
    $order = $mailer->getOrder($orderId);
    
    if (!$order || empty($order['recovery_file']) || !empty($order['recovery_evidence'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Orden no encontrada o no necesita evidencia de recovery.'
        ]);
        exit;
    }
    
    // Obtener datos del usuario
    $userId = $order['user_id'];
    $user = $mailer->getUser($userId);
    
    if (!$user) {
        echo json_encode([
            'success' => false,
            'message' => 'Usuario no encontrado para esta orden.'
        ]);
        exit;
    }
    
    // Enviar correo
    $result = $mailer->sendRecoveryCheckEmail($user, [$order]);
    
    echo json_encode([
        'success' => $result,
        'message' => $result ? 'Correo de verificación de recovery enviado correctamente.' : 'Error al enviar correo de verificación de recovery.'
    ]);
} 
// Si no se proporcionan parámetros específicos, enviar a todos los usuarios con órdenes pendientes
else {
    $result = $mailer->sendRecoveryCheckEmails();
    
    echo json_encode([
        'success' => ($result['success'] > 0),
        'message' => "Correos de verificación de recovery enviados: {$result['success']} exitosos, " . count($result['errors']) . " fallidos.",
        'details' => $result
    ]);
}
?>