<?php
/**
 * test_email_functions.php - Endpoint para probar varias funciones de correo
 * 
 * Este script proporciona endpoints de API para probar diferentes funciones de 
 * notificación por correo electrónico dentro del sistema Premium Freight.
 * 
 * @author GRAMMER AG
 * @version 1.0
 * @date 2025-05-29
 */

// Mostrar todos los errores para depuración
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Registrar todos los errores en un archivo
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

try {
    // Cargar configuración
    require_once __DIR__ . '/config.php';
    
    // Cargar la clase PFmailer
    require_once 'PFmailer.php';

    // Establecer el tipo de contenido de la respuesta
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    // Manejar preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }

    // Asegurar que el directorio de logs existe
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    // Obtener datos de la solicitud
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    
    // Registrar solicitud entrante para depuración
    $timestamp = date('Y-m-d H:i:s');
    $logFile = $logDir . '/test_email_functions.log';
    file_put_contents($logFile, "[$timestamp] Request received: " . $rawInput . "\n", FILE_APPEND);
    
    // Inicializar PFMailer
    $mailer = new PFMailer();
    
    // Inicializar respuesta predeterminada
    $response = [
        'success' => false,
        'message' => 'Unknown action or missing parameters',
        'timestamp' => $timestamp
    ];
    
    // Procesar diferentes acciones basadas en el parámetro 'action'
    if (isset($data['action'])) {
        switch ($data['action']) {
            
            case 'status_notification':
                // Probar envío de notificación de estado
                if (!isset($data['order_id']) || !isset($data['status'])) {
                    $response = [
                        'success' => false,
                        'message' => 'Missing required parameters: order_id and status',
                        'required_params' => ['order_id', 'status'],
                        'received_params' => array_keys($data),
                        'timestamp' => $timestamp
                    ];
                } else {
                    // Validar que el estado sea válido
                    $validStatuses = ['approved', 'rejected'];
                    if (!in_array($data['status'], $validStatuses)) {
                        $response = [
                            'success' => false,
                            'message' => 'Invalid status. Must be: approved or rejected',
                            'valid_statuses' => $validStatuses,
                            'received_status' => $data['status'],
                            'timestamp' => $timestamp
                        ];
                    } else {
                        // Enviar notificación de estado
                        $result = $mailer->sendStatusNotification(
                            $data['order_id'], 
                            $data['status'],
                            isset($data['rejector_info']) ? $data['rejector_info'] : null
                        );
                        
                        $response = [
                            'success' => $result,
                            'message' => $result ? 'Status notification sent successfully' : 'Failed to send status notification',
                            'order_id' => $data['order_id'],
                            'status' => $data['status'],
                            'timestamp' => $timestamp
                        ];
                    }
                }
                break;
                
            case 'weekly_summary':
                // Probar envío de correos de resumen semanal
                $result = $mailer->sendWeeklySummaryEmails();
                
                $response = [
                    'success' => ($result['success'] > 0),
                    'message' => "Weekly summary emails processed: {$result['success']} successful, " . count($result['errors']) . " failed",
                    'details' => [
                        'successful_emails' => $result['success'],
                        'failed_emails' => count($result['errors']),
                        'errors' => $result['errors']
                    ],
                    'timestamp' => $timestamp
                ];
                break;
                
            case 'recovery_check':
                // Probar envío de correos de verificación de recovery
                $result = $mailer->sendRecoveryCheckEmails();
                
                $response = [
                    'success' => ($result['success'] > 0),
                    'message' => "Recovery check emails processed: {$result['success']} successful, " . count($result['errors']) . " failed",
                    'details' => [
                        'successful_emails' => $result['success'],
                        'failed_emails' => count($result['errors']),
                        'errors' => $result['errors']
                    ],
                    'timestamp' => $timestamp
                ];
                break;
                
            case 'approval_notification':
                // Probar envío de notificación de aprobación
                if (!isset($data['order_id'])) {
                    $response = [
                        'success' => false,
                        'message' => 'Missing required parameter: order_id',
                        'required_params' => ['order_id'],
                        'received_params' => array_keys($data),
                        'timestamp' => $timestamp
                    ];
                } else {
                    // Enviar notificación de aprobación
                    $result = $mailer->sendApprovalNotification($data['order_id']);
                    
                    $response = [
                        'success' => $result,
                        'message' => $result ? 'Approval notification sent successfully' : 'Failed to send approval notification',
                        'order_id' => $data['order_id'],
                        'timestamp' => $timestamp
                    ];
                }
                break;
                
            case 'test_connection':
                // Probar conexión del mailer
                try {
                    $testResult = $mailer->testConnection();
                    $response = [
                        'success' => true,
                        'message' => 'Mail server connection test successful',
                        'connection_details' => $testResult,
                        'timestamp' => $timestamp
                    ];
                } catch (Exception $e) {
                    $response = [
                        'success' => false,
                        'message' => 'Mail server connection test failed: ' . $e->getMessage(),
                        'timestamp' => $timestamp
                    ];
                }
                break;
                
            default:
                // Acción desconocida
                $response = [
                    'success' => false,
                    'message' => 'Unknown action: ' . $data['action'],
                    'available_actions' => [
                        'status_notification' => 'Send status notification email',
                        'weekly_summary' => 'Send weekly summary emails',
                        'recovery_check' => 'Send recovery check emails',
                        'approval_notification' => 'Send approval notification email',
                        'test_connection' => 'Test mail server connection'
                    ],
                    'timestamp' => $timestamp
                ];
        }
    } else {
        // No se proporcionó acción
        $response = [
            'success' => false,
            'message' => 'No action specified',
            'available_actions' => [
                'status_notification' => 'Send status notification email',
                'weekly_summary' => 'Send weekly summary emails',
                'recovery_check' => 'Send recovery check emails',
                'approval_notification' => 'Send approval notification email',
                'test_connection' => 'Test mail server connection'
            ],
            'usage' => 'Send POST request with JSON body containing "action" parameter',
            'timestamp' => $timestamp
        ];
    }
    
    // Registrar la respuesta para depuración
    file_put_contents($logFile, "[$timestamp] Response: " . json_encode($response) . "\n", FILE_APPEND);
    
    // Enviar la respuesta JSON
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    // Manejar cualquier excepción no capturada
    $errorTimestamp = date('Y-m-d H:i:s');
    $errorMessage = "[$errorTimestamp] Exception caught: " . $e->getMessage() . "\n";
    $errorMessage .= "[$errorTimestamp] Stack trace: " . $e->getTraceAsString() . "\n";
    
    // Registrar el error en el archivo de log
    if (isset($logDir)) {
        file_put_contents($logDir . '/test_email_functions.log', $errorMessage, FILE_APPEND);
    }
    
    // Devolver respuesta de error
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error occurred',
        'error_details' => $e->getMessage(),
        'timestamp' => $errorTimestamp,
        'file' => basename(__FILE__),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
?>