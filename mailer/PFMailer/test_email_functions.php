<?php
/**
 * test_email_functions.php - Endpoint para probar funciones de correo
 * 
 * Este script proporciona endpoints de API para probar diferentes funciones de 
 * notificación por correo electrónico dentro del sistema Premium Freight.
 * 
 * @author GRAMMER AG
 * @version 1.0
 * @date 2025-05-29
 */

// Limpiar cualquier output previo
ob_clean();

// Configurar manejo de errores para retornar JSON limpio
error_reporting(E_ALL);
ini_set('display_errors', 0); // NO mostrar errores en pantalla
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/test_errors.log');

// Función para manejar errores fatales
function handleFatalError() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Fatal PHP error occurred',
            'error' => $error['message'],
            'file' => basename($error['file']),
            'line' => $error['line'],
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_PRETTY_PRINT);
        exit;
    }
}

// Registrar el manejador de errores fatales
register_shutdown_function('handleFatalError');

// Función para manejar errores y retornar JSON
function sendJsonError($message, $details = null, $httpCode = 400) {
    http_response_code($httpCode);
    header('Content-Type: application/json');
    
    $response = [
        'success' => false,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    if ($details) {
        $response['details'] = $details;
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
}

// Función para retornar respuesta exitosa
function sendJsonSuccess($message, $data = null) {
    header('Content-Type: application/json');
    
    $response = [
        'success' => true,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    if ($data) {
        $response['data'] = $data;
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
}

try {
    // Establecer headers
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Cache-Control: no-cache, must-revalidate');

    // Manejar preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }

    // Verificar que sea una petición POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonError('Method not allowed. Use POST.');
    }

    // Obtener los datos de la petición
    $input = file_get_contents('php://input');
    if (empty($input)) {
        sendJsonError('No data received in request');
    }

    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonError('Error decoding JSON: ' . json_last_error_msg());
    }

    if (!isset($data['action'])) {
        sendJsonError('Action not specified', [
            'available_actions' => [
                'status_notification' => 'Requires: orderId, status',
                'weekly_summary' => 'No additional parameters required',
                'recovery_check' => 'No additional parameters required',
                'approval_notification' => 'Requires: orderId'
            ]
        ]);
    }

    $action = $data['action'];
    
    // Registrar la acción para debugging
    error_log("Test Email Functions - Action: " . $action . " - Data: " . json_encode($data));

    // Cargar archivos necesarios (dentro del try-catch)
    if (!file_exists(__DIR__ . '/config.php')) {
        sendJsonError('config.php file not found');
    }
    
    require_once __DIR__ . '/config.php';
    
    if (!file_exists(__DIR__ . '/PFmailer.php')) {
        sendJsonError('PFmailer.php file not found');
    }
    
    require_once __DIR__ . '/PFmailer.php';

    // Crear instancia del mailer
    $mailer = new PFMailer();

    // Procesar según la acción solicitada
    switch ($action) {
        case 'status_notification':
            if (!isset($data['orderId']) || !isset($data['status'])) {
                sendJsonError('orderId and status are required for status_notification', [
                    'required' => ['orderId', 'status'],
                    'received' => array_keys($data)
                ]);
            }
            
            $orderId = intval($data['orderId']);
            $status = $data['status'];
            
            if (!in_array($status, ['approved', 'rejected'])) {
                sendJsonError('Status must be "approved" or "rejected"', [
                    'valid_options' => ['approved', 'rejected'],
                    'received' => $status
                ]);
            }
            
            error_log("Sending status notification: orderId=$orderId, status=$status");
            
            // Enviar notificación de estado
            $result = $mailer->sendStatusNotification($orderId, $status);
            
            if ($result['success']) {
                sendJsonSuccess("Status notification '$status' sent successfully for order #$orderId", $result);
            } else {
                sendJsonError("Error sending status notification", $result);
            }
            break;
            
        case 'weekly_summary':
            error_log("Sending weekly summary");
            
            // Enviar resumen semanal
            $result = $mailer->sendWeeklySummary();
            
            if ($result['success']) {
                sendJsonSuccess("Weekly summary sent successfully", $result);
            } else {
                sendJsonError("Error sending weekly summary", $result);
            }
            break;
            
        case 'recovery_check':
            error_log("Executing recovery check");
            
            // Ejecutar verificación de recuperación
            $result = $mailer->sendRecoveryNotifications();
            
            if ($result['success']) {
                sendJsonSuccess("Recovery check completed successfully", $result);
            } else {
                sendJsonError("Error in recovery check", $result);
            }
            break;
            
        case 'approval_notification':
            if (!isset($data['orderId'])) {
                sendJsonError('orderId is required for approval_notification', [
                    'required' => ['orderId'],
                    'received' => array_keys($data)
                ]);
            }
            
            $orderId = intval($data['orderId']);
            error_log("Sending approval notification: orderId=$orderId");
            
            // Enviar notificación de aprobación
            $result = $mailer->sendApprovalNotification($orderId);
            
            if ($result['success']) {
                sendJsonSuccess("Approval notification sent successfully for order #$orderId", $result);
            } else {
                sendJsonError("Error sending approval notification", $result);
            }
            break;
            
        default:
            sendJsonError('Unknown action: ' . $action, [
                'available_actions' => [
                    'status_notification',
                    'weekly_summary', 
                    'recovery_check',
                    'approval_notification'
                ]
            ]);
    }

} catch (ParseError $e) {
    error_log("Parse Error: " . $e->getMessage());
    sendJsonError('PHP syntax error', [
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], 500);
    
} catch (Error $e) {
    error_log("Fatal Error: " . $e->getMessage());
    sendJsonError('Fatal PHP error', [
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], 500);
    
} catch (Exception $e) {
    error_log("Exception: " . $e->getMessage());
    sendJsonError('Unhandled exception', [
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], 500);
}

// Asegurar respuesta JSON válida
echo json_encode([
    'success' => true,
    'message' => 'Operation completed successfully',
    'data' => $result
]);

// Detener la ejecución para evitar output adicional
exit;
?>