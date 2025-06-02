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
    
    // Procesar la acción directamente
    $result = $handler->processAction($token, $action);

    if ($result && isset($result['success']) && $result['success']) {
        logAction("Acción {$action} completada exitosamente", 'SINGLEACTION');
        showSuccess($result['message']);
    } else {
        $msg = isset($result['message']) ? $result['message'] : 'Error procesando la acción.';
        logAction("Error en acción: {$msg}", 'SINGLEACTION');
        
        // Si el token ya fue usado, mostrar éxito en lugar de error
        if (strpos($msg, 'ya ha sido utilizado') !== false || strpos($msg, 'ya utilizado') !== false) {
            showSuccess("Esta acción ya ha sido procesada correctamente.");
        } else {
            showError($msg);
        }
    }
    
} catch (Exception $e) {
    logAction("Excepción en procesamiento: " . $e->getMessage(), 'SINGLEACTION');
    showError("Ha ocurrido un error inesperado. Por favor contacte al administrador.<br><small>{$e->getMessage()}</small>");
}
?>