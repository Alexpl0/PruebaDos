<?php
/**
 * PFmailNotification.php - Endpoint para enviar notificaciones de aprobación
 */

// Mostrar todos los errores para diagnóstico
error_reporting(E_ALL);
ini_set('display_errors', 1); // Mostrar errores para depuración

// Registrar todos los errores en un archivo
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

try {
    // Cargar configuración primero
    require_once __DIR__ . '/config.php';
    
    // Cargar la clase PFmailer
    require_once 'PFmailer.php';

    // Establecer el tipo de contenido de la respuesta
    header('Content-Type: application/json');

    // Asegurarse de que el directorio de logs existe
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    // Registrar datos de entrada para diagnóstico
    $rawInput = file_get_contents('php://input');
    $logFile = $logDir . '/mail_log.txt';
    $timestamp = date('Y-m-d H:i:s');
    
    file_put_contents($logFile, "[{$timestamp}] Datos recibidos: {$rawInput}\n", FILE_APPEND);
    
    $data = json_decode($rawInput, true);
    
    if ($data === null) {
        $error = 'Datos JSON inválidos: ' . json_last_error_msg();
        file_put_contents($logFile, "[{$timestamp}] ERROR: {$error}\n", FILE_APPEND);
        echo json_encode(['success' => false, 'message' => $error]);
        exit;
    }
    
    file_put_contents($logFile, "[{$timestamp}] Datos decodificados: " . print_r($data, true) . "\n", FILE_APPEND);
    
    // Verificar que orderId esté presente
    if (!isset($data['orderId']) || empty($data['orderId'])) {
        $error = 'orderId es requerido';
        file_put_contents($logFile, "[{$timestamp}] ERROR: {$error}\n", FILE_APPEND);
        echo json_encode(['success' => false, 'message' => $error]);
        exit;
    }
    
    $orderId = intval($data['orderId']);
    file_put_contents($logFile, "[{$timestamp}] Procesando orden ID: {$orderId}\n", FILE_APPEND);
    
    // Crear instancia de PFMailer con manejo de errores
    $mailer = new PFMailer();
    
    // DEBUGGING: Verificar que la orden existe antes de enviar
    $services = new PFEmailServices();
    $orderDetails = $services->getOrderDetails($orderId);
    
    if (!$orderDetails) {
        $error = "Orden #{$orderId} no encontrada en la base de datos";
        file_put_contents($logFile, "[{$timestamp}] ERROR: {$error}\n", FILE_APPEND);
        echo json_encode(['success' => false, 'message' => $error]);
        exit;
    }
    
    file_put_contents($logFile, "[{$timestamp}] Orden encontrada: " . print_r($orderDetails, true) . "\n", FILE_APPEND);
    
    // Verificar próximos aprobadores
    $nextApprovers = $services->getNextApprovers($orderId);
    file_put_contents($logFile, "[{$timestamp}] Próximos aprobadores: " . print_r($nextApprovers, true) . "\n", FILE_APPEND);
    
    if (empty($nextApprovers)) {
        $error = "No se encontraron aprobadores para la orden #{$orderId}";
        file_put_contents($logFile, "[{$timestamp}] ERROR: {$error}\n", FILE_APPEND);
        echo json_encode(['success' => false, 'message' => $error]);
        exit;
    }
    
    // Intentar enviar correo con manejo detallado de errores
    try {
        $result = $mailer->sendApprovalNotification($orderId);
        
        if ($result) {
            file_put_contents($logFile, "[{$timestamp}] Resultado envío: Exitoso\n", FILE_APPEND);
            echo json_encode([
                'success' => true, 
                'message' => "Correo de aprobación enviado exitosamente para la orden #{$orderId}",
                'orderDetails' => $orderDetails,
                'approvers' => $nextApprovers
            ]);
        } else {
            file_put_contents($logFile, "[{$timestamp}] Resultado envío: Fallido\n", FILE_APPEND);
            echo json_encode([
                'success' => false, 
                'message' => "Error al enviar correo de aprobación para la orden #{$orderId}",
                'debug' => [
                    'orderFound' => true,
                    'approversFound' => count($nextApprovers),
                    'orderDetails' => $orderDetails
                ]
            ]);
        }
    } catch (Exception $mailException) {
        $error = "Excepción en envío de correo: " . $mailException->getMessage();
        file_put_contents($logFile, "[{$timestamp}] EXCEPCIÓN: {$error}\n", FILE_APPEND);
        echo json_encode([
            'success' => false, 
            'message' => $error,
            'trace' => $mailException->getTraceAsString()
        ]);
    }
    
} catch (Exception $e) {
    $error = "Error general: " . $e->getMessage();
    $timestamp = date('Y-m-d H:i:s');
    
    if (isset($logFile)) {
        file_put_contents($logFile, "[{$timestamp}] ERROR GENERAL: {$error}\n", FILE_APPEND);
        file_put_contents($logFile, "[{$timestamp}] TRACE: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    }
    
    echo json_encode([
        'success' => false, 
        'message' => $error,
        'trace' => $e->getTraceAsString()
    ]);
}
?>