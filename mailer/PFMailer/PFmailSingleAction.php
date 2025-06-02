<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/PFmailUtils.php';
require_once __DIR__ . '/PFmailer.php';
require_once __DIR__ . '/PFmailAction.php';

// Verificar parámetros
if (!isset($_GET['action']) || !isset($_GET['token'])) {
    showError('Faltan parámetros requeridos. Se necesitan "action" y "token".');
    exit;
}

$action = $_GET['action'];
$token = $_GET['token'];

// Verificar si hay una sesión activa para este token para evitar doble procesamiento
session_start();
$sessionKey = 'processed_token_' . md5($token);

if (isset($_SESSION[$sessionKey])) {
    logAction("Token ya procesado en esta sesión: {$token}", 'SINGLEACTION');
    showSuccess("Esta acción ya ha sido procesada correctamente.");
    exit;
}

if ($action !== 'approve' && $action !== 'reject') {
    showError("Tipo de acción inválido: '{$action}'. Las acciones permitidas son 'approve' o 'reject'.");
    exit;
}

try {
    $handler = new PFMailAction();
    $result = $handler->processAction($token, $action);

    if ($result && isset($result['success']) && $result['success']) {
        // Marcar como procesado en la sesión
        $_SESSION[$sessionKey] = time();
        showSuccess($result['message']);
    } else {
        $msg = isset($result['message']) ? $result['message'] : 'Error procesando la acción.';
        showError($msg);
    }
} catch (Exception $e) {
    showError("Ha ocurrido un error inesperado. Por favor contacte al administrador.<br><small>{$e->getMessage()}</small>");
}
?>