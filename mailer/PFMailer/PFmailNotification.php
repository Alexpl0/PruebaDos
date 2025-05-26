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
    
    $logMessage = "[$timestamp] Datos recibidos: " . $rawInput . "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND);

    // Verificar método de solicitud
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode([
            'success' => false,
            'message' => 'Método no permitido. Utilice POST.'
        ]);
        exit;
    }

    // Procesar los datos recibidos
    // Obtener datos de la solicitud
    $data = json_decode($rawInput, true);
    
    // Registrar datos decodificados
    file_put_contents($logFile, "[$timestamp] Datos decodificados: " . print_r($data, true) . "\n", FILE_APPEND);
    
    // Verificar estructura de datos
    if ($data === null) {
        throw new Exception("Error decodificando JSON: " . json_last_error_msg());
    }
    
    // Validar datos
    if (!isset($data['orderId'])) {
        throw new Exception("Falta el parámetro requerido: orderId");
    }
    
    $orderId = intval($data['orderId']);
    file_put_contents($logFile, "[$timestamp] Procesando orden ID: $orderId\n", FILE_APPEND);
    
    // Verificar si ya se envió una notificación reciente para esta orden (evitar duplicados)
    $checkSql = "SELECT COUNT(*) as total FROM EmailNotifications 
                 WHERE order_id = ? AND type = 'approval_request' 
                 AND sent_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)";
    $mailer = new PFMailer();
    $db = $mailer->getDatabase();
    $checkStmt = $db->prepare($checkSql);
    $checkStmt->bind_param("i", $orderId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    $recentNotifications = $checkResult->fetch_assoc()['total'];

    if ($recentNotifications > 0) {
        // Ya se envió una notificación reciente, informar pero no considerar error
        file_put_contents($logFile, "[$timestamp] Notificación reciente ya enviada para orden #$orderId\n", FILE_APPEND);
        echo json_encode([
            'success' => true,
            'message' => 'Ya se ha enviado una notificación reciente para esta orden'
        ]);
        exit;
    }

    // Enviar la notificación
    $result = $mailer->sendApprovalNotification($orderId);
    
    // Registrar resultado
    file_put_contents($logFile, "[$timestamp] Resultado envío: " . ($result ? "Éxito" : "Fallido") . "\n", FILE_APPEND);
    
    // Responder con el resultado
    echo json_encode([
        'success' => $result,
        'message' => $result ? 'Notificación enviada correctamente' : 'Error al enviar la notificación'
    ]);
} catch (Exception $e) {
    // Registrar la excepción
    $errorMessage = "[$timestamp] Error: " . $e->getMessage() . "\n" . $e->getTraceAsString();
    file_put_contents($logFile, $errorMessage . "\n", FILE_APPEND);
    
    // Responder con el error y código de estado apropiado
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>