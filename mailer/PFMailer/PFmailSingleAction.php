<?php
/**
 * PFmailSingleAction.php - Procesa acciones individuales desde correos electrónicos
 */

// Configurar manejo de errores
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/action_debug.log');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/PFmailUtils.php';
require_once __DIR__ . '/PFmailer.php';
require_once __DIR__ . '/PFmailAction.php';

// Verificar parámetros básicos
if (!isset($_GET['action']) || !isset($_GET['token'])) {
    showError('Faltan parámetros requeridos. Se necesitan "action" y "token".');
    exit;
}

$action = $_GET['action'];
$token = $_GET['token'];

// Validar tipo de acción
if ($action !== 'approve' && $action !== 'reject') {
    showError("Tipo de acción inválido: '{$action}'. Las acciones permitidas son 'approve' o 'reject'.");
    exit;
}

// Log de inicio
logAction("Solicitud recibida: acción={$action}, token={$token}", 'SINGLEACTION');

try {
    $handler = new PFMailAction();
    
    // Primero validar el token ANTES de procesarlo
    $tokenInfo = $handler->validateToken($token);
    
    if (!$tokenInfo) {
        logAction("Token inválido o expirado: {$token}", 'SINGLEACTION');
        showError('Token inválido o expirado. Es posible que este enlace ya no sea válido.');
        exit;
    }
    
    // Si el token ya fue usado, mostrar mensaje de éxito SIN procesar
    if (isset($tokenInfo['is_used']) && $tokenInfo['is_used'] == 1) {
        logAction("Token ya utilizado detectado: {$token}", 'SINGLEACTION');
        
        // Ahora SÍ tenemos acceso a order_id porque validateToken retorna la info
        $orderId = $tokenInfo['order_id'];
        
        // Mensaje apropiado según la acción
        $statusMessage = ($action === 'approve') ? 
            "Su aprobación ha sido registrada exitosamente para la orden #{$orderId}." :
            "Su rechazo ha sido registrado exitosamente para la orden #{$orderId}.";
        
        logAction("Mostrando mensaje de éxito para token ya usado: {$token}", 'SINGLEACTION');
        showSuccess($statusMessage);
        exit;
    }
    
    // Procesar la acción solo si el token no ha sido usado
    $result = $handler->processAction($token, $action);

    if ($result && isset($result['success']) && $result['success']) {
        logAction("Acción {$action} completada exitosamente", 'SINGLEACTION');
        showSuccess($result['message']);
    } else {
        $msg = isset($result['message']) ? $result['message'] : 'Error procesando la acción.';
        logAction("Error en acción: {$msg}", 'SINGLEACTION');
        showError($msg);
    }
    
} catch (Exception $e) {
    logAction("Excepción en procesamiento: " . $e->getMessage(), 'SINGLEACTION');
    showError("Ha ocurrido un error inesperado. Por favor contacte al administrador.<br><small>{$e->getMessage()}</small>");
}
?>