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
    // Establecer headers antes que nada
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    // Manejar preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }

    // Verificar que sea una petición POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonError('Método no permitido. Use POST.');
    }

    // Obtener los datos de la petición
    $input = file_get_contents('php://input');
    if (empty($input)) {
        sendJsonError('No se recibieron datos en la petición');
    }

    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonError('Error al decodificar JSON: ' . json_last_error_msg());
    }

    if (!isset($data['action'])) {
        sendJsonError('Acción no especificada', [
            'available_actions' => [
                'status_notification' => 'Requiere: orderId, status',
                'weekly_summary' => 'No requiere parámetros adicionales',
                'recovery_check' => 'No requiere parámetros adicionales',
                'approval_notification' => 'Requiere: orderId'
            ]
        ]);
    }

    $action = $data['action'];
    
    // Registrar la acción para debugging
    error_log("Test Email Functions - Acción: " . $action . " - Data: " . json_encode($data));

    // Cargar archivos necesarios (dentro del try-catch)
    if (!file_exists(__DIR__ . '/config.php')) {
        sendJsonError('Archivo config.php no encontrado');
    }
    
    require_once __DIR__ . '/config.php';
    
    if (!file_exists(__DIR__ . '/PFmailer.php')) {
        sendJsonError('Archivo PFmailer.php no encontrado');
    }
    
    require_once __DIR__ . '/PFmailer.php';

    // Crear instancia del mailer
    $mailer = new PFMailer();

    // Procesar según la acción solicitada
    switch ($action) {
        case 'status_notification':
            if (!isset($data['orderId']) || !isset($data['status'])) {
                sendJsonError('orderId y status son requeridos para status_notification', [
                    'required' => ['orderId', 'status'],
                    'received' => array_keys($data)
                ]);
            }
            
            $orderId = intval($data['orderId']);
            $status = $data['status'];
            
            if (!in_array($status, ['approved', 'rejected'])) {
                sendJsonError('Status debe ser "approved" o "rejected"', [
                    'valid_options' => ['approved', 'rejected'],
                    'received' => $status
                ]);
            }
            
            error_log("Enviando notificación de estado: orderId=$orderId, status=$status");
            
            // Enviar notificación de estado
            $result = $mailer->sendStatusNotification($orderId, $status);
            
            if ($result['success']) {
                sendJsonSuccess("Notificación de estado '$status' enviada exitosamente para la orden #$orderId", $result);
            } else {
                sendJsonError("Error al enviar notificación de estado", $result);
            }
            break;
            
        case 'weekly_summary':
            error_log("Enviando resumen semanal");
            
            // Enviar resumen semanal
            $result = $mailer->sendWeeklySummary();
            
            if ($result['success']) {
                sendJsonSuccess("Resumen semanal enviado exitosamente", $result);
            } else {
                sendJsonError("Error al enviar resumen semanal", $result);
            }
            break;
            
        case 'recovery_check':
            error_log("Ejecutando verificación de recuperación");
            
            // Ejecutar verificación de recuperación
            $result = $mailer->sendRecoveryNotifications();
            
            if ($result['success']) {
                sendJsonSuccess("Verificación de recuperación completada exitosamente", $result);
            } else {
                sendJsonError("Error en verificación de recuperación", $result);
            }
            break;
            
        case 'approval_notification':
            if (!isset($data['orderId'])) {
                sendJsonError('orderId es requerido para approval_notification', [
                    'required' => ['orderId'],
                    'received' => array_keys($data)
                ]);
            }
            
            $orderId = intval($data['orderId']);
            error_log("Enviando notificación de aprobación: orderId=$orderId");
            
            // Enviar notificación de aprobación
            $result = $mailer->sendApprovalNotification($orderId);
            
            if ($result['success']) {
                sendJsonSuccess("Notificación de aprobación enviada exitosamente para la orden #$orderId", $result);
            } else {
                sendJsonError("Error al enviar notificación de aprobación", $result);
            }
            break;
            
        default:
            sendJsonError('Acción desconocida: ' . $action, [
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
    sendJsonError('Error de sintaxis PHP', [
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], 500);
    
} catch (Error $e) {
    error_log("Fatal Error: " . $e->getMessage());
    sendJsonError('Error fatal de PHP', [
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], 500);
    
} catch (Exception $e) {
    error_log("Exception: " . $e->getMessage());
    sendJsonError('Excepción no controlada', [
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], 500);
}
?>