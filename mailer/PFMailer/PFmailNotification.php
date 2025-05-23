<?php
/**
 * PFmailNotification.php - Endpoint para enviar notificaciones de aprobación
 */

require_once 'PFmailer.php';

// Establecer el tipo de contenido de la respuesta
header('Content-Type: application/json');

// Capturar todos los errores para diagnóstico
error_reporting(E_ALL);
ini_set('display_errors', 0); // No mostrar errores directamente

// Registrar datos de entrada para diagnóstico
$rawInput = file_get_contents('php://input');
$logMessage = "Datos recibidos: " . $rawInput . "\n";
file_put_contents('mail_log.txt', $logMessage, FILE_APPEND);

// Verificar método de solicitud
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Utilice POST.'
    ]);
    exit;
}

// Procesar los datos recibidos
try {
    // Obtener datos de la solicitud
    $data = json_decode($rawInput, true);
    
    // Registrar datos decodificados
    file_put_contents('mail_log.txt', "Datos decodificados: " . print_r($data, true) . "\n", FILE_APPEND);
    
    // Verificar estructura de datos
    if ($data === null) {
        throw new Exception("Error decodificando JSON: " . json_last_error_msg());
    }
    
    // Validar datos
    if (!isset($data['orderId'])) {
        throw new Exception("Falta el parámetro requerido: orderId");
    }
    
    $orderId = intval($data['orderId']);
    
    // Enviar la notificación
    $mailer = new PFMailer();
    $result = $mailer->sendApprovalNotification($orderId);
    
    // Registrar resultado
    file_put_contents('mail_log.txt', "Resultado envío: " . ($result ? "Éxito" : "Fallido") . "\n", FILE_APPEND);
    
    // Responder con el resultado
    echo json_encode([
        'success' => $result,
        'message' => $result ? 'Notificación enviada correctamente' : 'Error al enviar la notificación'
    ]);
} catch (Exception $e) {
    // Registrar la excepción
    file_put_contents('mail_log.txt', "Error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Responder con el error
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>