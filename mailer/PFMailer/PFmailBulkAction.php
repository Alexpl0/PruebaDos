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
    logAction("ERROR: Faltan parámetros requeridos - Action: " . (isset($_GET['action']) ? 'presente' : 'ausente') . ", Token: " . (isset($_GET['token']) ? 'presente' : 'ausente'), 'BULKACTION');
    showBulkError('Faltan parámetros requeridos. Se necesitan "action" y "token".');
    exit;
}

// Obtener y validar los parámetros con filtros de seguridad
$action = filter_var($_GET['action'], FILTER_SANITIZE_SPECIAL_CHARS);
$token = filter_var($_GET['token'], FILTER_SANITIZE_SPECIAL_CHARS);

logAction("=== Iniciando procesamiento de acción en bloque ===", 'BULKACTION');
logAction("Acción: $action | Token: $token", 'BULKACTION');
logAction("Token original recibido: " . $_GET['token'], 'BULKACTION');
logAction("Token después de sanitización: $token", 'BULKACTION');
logAction("¿Token cambió después de sanitización?: " . ($_GET['token'] !== $token ? 'SÍ' : 'NO'), 'BULKACTION');

// Validar la acción y mostrar error específico
if ($action !== 'approve' && $action !== 'reject') {
    logAction("ERROR: Acción inválida: $action", 'BULKACTION');
    showBulkError("Tipo de acción inválido: '{$action}'. Las acciones permitidas son 'approve' o 'reject'.");
    exit;
}

try {
    // Verificar si las clases existen antes de instanciarlas
    if (!class_exists('PFMailAction')) {
        logAction("ERROR: Clase PFMailAction no encontrada", 'BULKACTION');
        throw new Exception("La clase PFMailAction no está disponible.");
    }
    
    // Procesar la acción
    $handler = new PFMailAction();
    
    // Verificar que el método existe
    if (!method_exists($handler, 'processBulkAction')) {
        logAction("ERROR: Método processBulkAction no encontrado en PFMailAction", 'BULKACTION');
        throw new Exception("El método 'processBulkAction' no está implementado en la clase PFMailAction.");
    }
    
    // VALIDACIÓN PREVIA: Verificar el estado del token ANTES de procesarlo
    $tokenInfo = $handler->validateBulkToken($token);
    
    if (!$tokenInfo) {
        logAction("Token en bloque inválido o expirado: {$token}", 'BULKACTION');
        showBulkError('Token inválido o expirado. Es posible que este enlace ya no sea válido.');
        exit;
    }
    
    // Si el token ya fue usado, mostrar mensaje de éxito apropiado
    if (isset($tokenInfo['is_used']) && $tokenInfo['is_used'] == 1) {
        logAction("Token en bloque ya utilizado detectado: {$token}", 'BULKACTION');
        
        $totalOrders = $tokenInfo['total_orders'];
        $tokenAction = $tokenInfo['action'];
        
        // Mensaje apropiado según la acción del token
        if ($tokenAction === 'approve') {
            $statusMessage = "Sus aprobaciones en bloque ya fueron registradas exitosamente para {$totalOrders} órdenes.";
        } else {
            $statusMessage = "Sus rechazos en bloque ya fueron registrados exitosamente para {$totalOrders} órdenes.";
        }
        
        logAction("Mostrando mensaje de éxito para token en bloque ya usado: {$token}", 'BULKACTION');
        showBulkSuccess($statusMessage);
        exit;
    }
    
    // Validar que la acción solicitada coincida con la del token
    if ($action !== $tokenInfo['action']) {
        logAction("Acción no coincide con token en bloque: solicitada={$action}, token={$tokenInfo['action']}", 'BULKACTION');
        showBulkError("Acción no válida para este enlace.");
        exit;
    }
    
    logAction("=== Ejecutando processBulkAction ===", 'BULKACTION');
    logAction("Token: $token, Acción: $action", 'BULKACTION');
    
    // PROCESAR LA ACCIÓN: Solo si el token es válido y no ha sido usado
    $result = $handler->processBulkAction($token, $action);
    
    logAction("=== Resultado del procesamiento ===", 'BULKACTION');
    logAction("Success: " . ($result['success'] ? 'true' : 'false'), 'BULKACTION');
    logAction("Message: " . $result['message'], 'BULKACTION');
    if (isset($result['details'])) {
        logAction("Details: " . print_r($result['details'], true), 'BULKACTION');
    }

    // Mostrar resultado según éxito o fracaso
    if ($result['success']) {
        logAction("Procesamiento exitoso - mostrando página de éxito", 'BULKACTION');
        showBulkSuccess($result['message'], $result['details'] ?? null);
    } else {
        logAction("Procesamiento fallido - mostrando página de error", 'BULKACTION');
        showBulkError($result['message'], $result['details'] ?? null);
    }
    
} catch (Exception $e) {
    logAction("=== EXCEPCIÓN CAPTURADA ===", 'BULKACTION');
    logAction("Error: " . $e->getMessage() . " | File: " . $e->getFile() . " | Line: " . $e->getLine(), 'BULKACTION');
    
    showBulkError("Ha ocurrido un error inesperado. Por favor contacte al administrador.", ['errors' => [$e->getMessage()]]);
}

/**
 * Muestra un mensaje de éxito con formato mejorado para acciones en bloque
 */
function showBulkSuccess($message, $details = null) {
    $detailsHtml = '';
    if ($details) {
        if (isset($details['total']) && isset($details['successful']) && isset($details['failed'])) {
            $detailsHtml .= "<p class='summary'>Se procesaron <strong>{$details['total']}</strong> órdenes: " . 
                "<span class='success-count'>{$details['successful']}</span> exitosas, " . 
                "<span class='error-count'>{$details['failed']}</span> fallidas.</p>";
        }
        
        if (!empty($details['errors'])) {
            $detailsHtml .= "<div class='error-details'>";
            $detailsHtml .= "<p><strong>Errores:</strong></p><ul>";
            foreach ($details['errors'] as $error) {
                $detailsHtml .= "<li>" . htmlspecialchars($error) . "</li>";
            }
            $detailsHtml .= "</ul></div>";
        }
    }
    
    echo generateBulkHtmlResponse(
        'Acción en Bloque Exitosa',
        'success',
        '✓ ¡Éxito!',
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
        $detailsHtml .= "<p><strong>Detalles:</strong></p><ul>";
        foreach ($details['errors'] as $error) {
            $detailsHtml .= "<li>" . htmlspecialchars($error) . "</li>";
        }
        $detailsHtml .= "</ul></div>";
    }
    
    echo generateBulkHtmlResponse(
        'Error en Acción en Bloque',
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
    <html lang='es'>
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
            <a href='" . htmlspecialchars($ordersUrl) . "' class='btn'>Ver Órdenes</a>
        </div>
    </body>
    </html>";
}

logAction("=== Fin del procesamiento ===", 'BULKACTION');
?>