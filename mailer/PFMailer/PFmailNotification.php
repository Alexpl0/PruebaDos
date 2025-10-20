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

    // ✅ AGREGAR LOGGING DETALLADO DEL RAW INPUT
    $rawInput = file_get_contents('php://input');
    
    error_log("[PFmailNotification] ========================================");
    error_log("[PFmailNotification] 📥 RAW INPUT RECEIVED:");
    error_log("[PFmailNotification] Length: " . strlen($rawInput));
    error_log("[PFmailNotification] Content: " . $rawInput);
    error_log("[PFmailNotification] Content-Type header: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
    error_log("[PFmailNotification] Request Method: " . $_SERVER['REQUEST_METHOD']);
    error_log("[PFmailNotification] ========================================");
    
    // ✅ VALIDAR QUE NO ESTÉ VACÍO
    if (empty($rawInput)) {
        error_log("[PFmailNotification] ❌ ERROR: Raw input is EMPTY");
        throw new Exception('No data received. Request body is empty.');
    }
    
    $data = json_decode($rawInput, true);
    
    // ✅ LOGGING MEJORADO
    error_log("[PFmailNotification] JSON decode result: " . ($data === null ? 'NULL' : 'SUCCESS'));
    error_log("[PFmailNotification] JSON last error: " . json_last_error_msg());
    error_log("[PFmailNotification] Decoded data: " . json_encode($data));

    if ($data === null) {
        // ✅ MENSAJE DE ERROR MÁS DETALLADO
        throw new Exception('Invalid JSON data received. Error: ' . json_last_error_msg() . ' | Raw input: ' . substr($rawInput, 0, 200));
    }
    
    $orderId = intval($data['orderId'] ?? 0);
    
    error_log("[PFmailNotification] Processing order ID: {$orderId}");

    if ($orderId <= 0) {
        throw new Exception("Invalid or missing order ID. Received: " . json_encode($data));
    }
    
    $mailer = new PFMailer();
    
    error_log("[PFmailNotification] Calling sendApprovalNotification for order {$orderId}");
    
    $result = $mailer->sendApprovalNotification($orderId);
    
    error_log("[PFmailNotification] Result: " . ($result ? 'true' : 'false'));
        
    if ($result) {
        echo json_encode([
            'success' => true, 
            'message' => "Approval email sent successfully for order #{$orderId}"
        ]);
    } else {
        throw new Exception("Mailer failed to send approval email for order #{$orderId}");
    }
    
} catch (Exception $e) {
    error_log("[PFmailNotification] ERROR: " . $e->getMessage());
    
    http_response_code(500); 
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
}

?>
