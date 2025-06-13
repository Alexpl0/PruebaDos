<?php
/**
 * PFmailBulkAction.php - Procesa acciones en bloque desde los correos semanales
 * 
 * Este archivo maneja las acciones de aprobar/rechazar en bloque que vienen
 * desde los enlaces en los correos electrónicos semanales.
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

// Configurar manejo de errores para mejor diagnóstico
ini_set('display_errors', 0);  // No mostrar errores al usuario final
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/action_debug.log');

// Importar la configuración global para usar la constante URL
require_once __DIR__ . '/config.php';

// Importar las utilidades (que incluyen la función logAction)
require_once __DIR__ . '/PFmailUtils.php';

// Definir constantes como respaldo si no están definidas en config.php
if (!defined('URL')) {
    define('URL', 'https://grammermx.com/Mailer/PFMailer/');
}

if (!defined('URLPF')) {
    define('URLPF', 'https://grammermx.com/Jesus/PruebaDos/');
}

if (!defined('URLM')) {
    define('URLM', URL);
}

// Importar las clases y utilidades necesarias para el procesamiento
require_once __DIR__ . '/PFmailer.php';
require_once __DIR__ . '/PFmailAction.php';

// Verificar si se recibieron los parámetros necesarios
if (!isset($_GET['action']) || !isset($_GET['token'])) {
    logAction("ERROR: Missing required parameters - Action: " . (isset($_GET['action']) ? 'present' : 'missing') . ", Token: " . (isset($_GET['token']) ? 'present' : 'missing'), 'BULKACTION');
    showBulkError('Required parameters missing. "action" and "token" are needed.');
    exit;
}

// Obtener y validar los parámetros con filtros de seguridad
$action = filter_var($_GET['action'], FILTER_SANITIZE_SPECIAL_CHARS);
$token = filter_var($_GET['token'], FILTER_SANITIZE_SPECIAL_CHARS);

logAction("=== Starting bulk action processing ===", 'BULKACTION');
logAction("Action: $action | Token: $token", 'BULKACTION');
logAction("Original token received: " . $_GET['token'], 'BULKACTION');
logAction("Token after sanitization: $token", 'BULKACTION');
logAction("Did token change after sanitization?: " . ($_GET['token'] !== $token ? 'YES' : 'NO'), 'BULKACTION');

// Validar la acción y mostrar error específico
if ($action !== 'approve' && $action !== 'reject') {
    logAction("ERROR: Invalid action: $action", 'BULKACTION');
    showBulkError("Invalid action type: '{$action}'. Allowed actions are 'approve' or 'reject'.");
    exit;
}

try {
    // Verificar si las clases existen antes de instanciarlas
    if (!class_exists('PFMailAction')) {
        logAction("ERROR: PFMailAction class not found", 'BULKACTION');
        throw new Exception("The PFMailAction class is not available.");
    }
    
    // Procesar la acción
    $handler = new PFMailAction();
    
    // Verificar que el método existe
    if (!method_exists($handler, 'processBulkAction')) {
        logAction("ERROR: processBulkAction method not found in PFMailAction", 'BULKACTION');
        throw new Exception("The 'processBulkAction' method is not implemented in the PFMailAction class.");
    }
    
    // VALIDACIÓN PREVIA: Verificar el estado del token ANTES de procesarlo
    $tokenInfo = $handler->validateBulkToken($token);
    
    if (!$tokenInfo) {
        logAction("Invalid or expired bulk token: {$token}", 'BULKACTION');
        showBulkError('Invalid or expired token. This link may no longer be valid.');
        exit;
    }
    
    // Si el token ya fue usado, mostrar mensaje de éxito apropiado
    if (isset($tokenInfo['is_used']) && $tokenInfo['is_used'] == 1) {
        logAction("Used bulk token detected: {$token}", 'BULKACTION');
        
        $totalOrders = $tokenInfo['total_orders'];
        $tokenAction = $tokenInfo['action'];
        
        // Mensaje apropiado según la acción del token
        if ($tokenAction === 'approve') {
            $statusMessage = "Your bulk approvals have already been successfully registered for {$totalOrders} orders.";
        } else {
            $statusMessage = "Your bulk rejections have already been successfully registered for {$totalOrders} orders.";
        }
        
        logAction("Showing success message for already used bulk token: {$token}", 'BULKACTION');
        showBulkSuccess($statusMessage);
        exit;
    }
    
    // Validar que la acción solicitada coincida con la del token
    if ($action !== $tokenInfo['action']) {
        logAction("Action doesn't match bulk token: requested={$action}, token={$tokenInfo['action']}", 'BULKACTION');
        showBulkError("Invalid action for this link.");
        exit;
    }
    
    logAction("=== Executing processBulkAction ===", 'BULKACTION');
    logAction("Token: $token, Action: $action", 'BULKACTION');
    
    // PROCESAR LA ACCIÓN: Solo si el token es válido y no ha sido usado
    $result = $handler->processBulkAction($token, $action);
    
    logAction("=== Processing result ===", 'BULKACTION');
    logAction("Success: " . ($result['success'] ? 'true' : 'false'), 'BULKACTION');
    logAction("Message: " . $result['message'], 'BULKACTION');
    if (isset($result['details'])) {
        logAction("Details: " . print_r($result['details'], true), 'BULKACTION');
    }

    // Mostrar resultado según éxito o fracaso
    if ($result['success']) {
        logAction("Successful processing - showing success page", 'BULKACTION');
        showBulkSuccess($result['message'], $result['details'] ?? null);
    } else {
        logAction("Failed processing - showing error page", 'BULKACTION');
        showBulkError($result['message'], $result['details'] ?? null);
    }
    
} catch (Exception $e) {
    logAction("=== CAUGHT EXCEPTION ===", 'BULKACTION');
    logAction("Error: " . $e->getMessage() . " | File: " . $e->getFile() . " | Line: " . $e->getLine(), 'BULKACTION');
    
    showBulkError("An unexpected error occurred. Please contact the administrator.", ['errors' => [$e->getMessage()]]);
}

/**
 * Muestra un mensaje de éxito con formato mejorado para acciones en bloque
 */
function showBulkSuccess($message, $details = null) {
    $detailsHtml = '';
    if ($details) {
        if (isset($details['total']) && isset($details['successful']) && isset($details['failed'])) {
            $detailsHtml .= "<p class='summary'>Processed <strong>{$details['total']}</strong> orders: " . 
                "<span class='success-count'>{$details['successful']}</span> successful, " . 
                "<span class='error-count'>{$details['failed']}</span> failed.</p>";
        }
        
        if (!empty($details['errors'])) {
            $detailsHtml .= "<div class='error-details'>";
            $detailsHtml .= "<p><strong>Errors:</strong></p><ul>";
            foreach ($details['errors'] as $error) {
                $detailsHtml .= "<li>" . htmlspecialchars($error) . "</li>";
            }
            $detailsHtml .= "</ul></div>";
        }
    }
    
    echo generateBulkHtmlResponse(
        'Bulk Action Successful',
        'success',
        '✓ Success!',
        $message,
        $detailsHtml
    );
    exit;
}

/**
 * Muestra un mensaje de error con formato mejorado para acciones en bloque
 */
function showBulkError($message, $details = null) {
    $detailsHtml = '';
    if ($details && !empty($details['errors'])) {
        $detailsHtml .= "<div class='error-details'>";
        $detailsHtml .= "<p><strong>Details:</strong></p><ul>";
        foreach ($details['errors'] as $error) {
            $detailsHtml .= "<li>" . htmlspecialchars($error) . "</li>";
        }
        $detailsHtml .= "</ul></div>";
    }
    
    echo generateBulkHtmlResponse(
        'Bulk Action Error',
        'error',
        '✗ Error',
        $message,
        $detailsHtml
    );
    exit;
}

/**
 * Genera el HTML para las páginas de respuesta de acciones en bloque
 */
function generateBulkHtmlResponse($title, $type, $heading, $message, $detailsHtml) {
    $colorClass = ($type === 'success') ? '#28a745' : '#dc3545';
    $logoUrl = defined('URLPF') ? URLPF . "assets/logo/logo.png" : "#";
    $ordersUrl = defined('URLPF') ? URLPF . "orders.php" : "#";
    
    return "<!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>{$title}</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                margin: 0;
                padding: 20px; 
                background-color: #f8f9fa;
                color: #333;
            }
            .container {
                max-width: 800px;
                margin: 30px auto;
                padding: 40px 20px;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .{$type} { 
                color: {$colorClass}; 
                font-size: 28px; 
                margin-bottom: 20px; 
                font-weight: bold;
            }
            .message { 
                margin-bottom: 20px; 
                font-size: 18px;
                line-height: 1.5;
            }
            .details { 
                margin-bottom: 30px; 
                font-size: 16px;
            }
            .summary {
                font-size: 16px;
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
            }
            .success-count {
                color: #28a745;
                font-weight: bold;
            }
            .error-count {
                color: #dc3545;
                font-weight: bold;
            }
            .error-details {
                text-align: left;
                margin: 15px auto;
                max-width: 600px;
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                border-left: 4px solid #dc3545;
            }
            .btn { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #034C8C; 
                color: white; 
                text-decoration: none; 
                border-radius: 4px; 
                font-weight: bold;
                transition: background-color 0.3s;
                margin-top: 10px;
            }
            .btn:hover {
                background-color: #023b6a;
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='{$type}'>{$heading}</div>
            <div class='message'>" . htmlspecialchars($message) . "</div>
            <div class='details'>{$detailsHtml}</div>
            <a href='" . htmlspecialchars($ordersUrl) . "' class='btn'>View Orders</a>
        </div>
    </body>
    </html>";
}

logAction("=== End of processing ===", 'BULKACTION');
?>