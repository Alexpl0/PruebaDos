<?php
/**
 * PFmailNotification.php - Endpoint para enviar notificaciones de aprobación
 *
 * Versión corregida:
 * - Se desactiva `display_errors` para asegurar respuestas JSON.
 * - Se usa un manejador de excepciones global para capturar cualquier error.
 */

// Establecer el tipo de contenido de la respuesta ANTES de cualquier salida.
header('Content-Type: application/json');

// --- CONFIGURACIÓN DE ERRORES PARA PRODUCCIÓN/APIs ---
// Desactivar la visualización de errores en la respuesta. ¡CRÍTICO!
ini_set('display_errors', 0);
// Activar el registro de errores en un archivo.
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log'); // Asegúrate de que este archivo tenga permisos de escritura.

// --- MANEJADOR DE EXCEPCIONES GLOBAL ---
// Esto captura cualquier error que no esté dentro de un bloque try-catch.
set_exception_handler(function($exception) {
    // Registrar el error detallado en el log.
    error_log("Excepción no capturada: " . $exception->getMessage() . "\n" . $exception->getTraceAsString());
    // Enviar una respuesta JSON genérica de error.
    echo json_encode([
        'success' => false,
        'message' => 'An internal server error occurred.'
    ]);
    exit;
});

try {
    // Cargar dependencias
    require_once __DIR__ . '/config.php';
    require_once 'PFmailer.php';

    // Registrar datos de entrada para diagnóstico (opcional pero útil)
    $rawInput = file_get_contents('php://input');
    
    $data = json_decode($rawInput, true);
    
    if ($data === null) {
        throw new Exception('Invalid JSON data received: ' . json_last_error_msg());
    }
    
    if (!isset($data['orderId']) || empty($data['orderId'])) {
        throw new Exception('Required parameter "orderId" is missing.');
    }
    
    $orderId = intval($data['orderId']);
    
    $mailer = new PFMailer();
    $result = $mailer->sendApprovalNotification($orderId);
        
    if ($result) {
        echo json_encode([
            'success' => true, 
            'message' => "Approval email sent successfully for order #{$orderId}"
        ]);
    } else {
        // Si sendApprovalNotification devuelve false sin una excepción, es un fallo controlado.
        throw new Exception("Mailer failed to send approval email for order #{$orderId}");
    }
    
} catch (Exception $e) {
    // Registrar el error específico en el log.
    error_log("Error en PFmailNotification.php: " . $e->getMessage());

    // Enviar una respuesta JSON de error controlada.
    // El http_response_code es opcional pero es una buena práctica.
    http_response_code(500); 
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
}

?>
