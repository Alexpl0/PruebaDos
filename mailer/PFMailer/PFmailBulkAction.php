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

// Función helper para logging con secciones
function logAction($message, $section = 'MAIN') {
    $logFile = __DIR__ . '/action_debug.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] [{$section}] {$message}" . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// Importar la configuración global para usar la constante URL
require_once __DIR__ . '/config.php';

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
require_once __DIR__ . '/PFmailUtils.php';
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
    
    // DEBUG: Verificar el token antes de procesarlo
    logAction("=== Verificación previa del token ===", 'BULKACTION');
    logAction("Token a buscar en BD: '$token'", 'BULKACTION');
    logAction("Longitud del token: " . strlen($token), 'BULKACTION');
    logAction("Caracteres del token: " . bin2hex($token), 'BULKACTION');
    
    // Primero verificar si el token existe en la base de datos
    $con = new LocalConector();
    $db = $con->conectar();
    
    if (!$db) {
        logAction("ERROR: No se pudo conectar a la base de datos", 'BULKACTION');
        throw new Exception("Error de conexión a la base de datos");
    }
    
    logAction("Conexión a BD establecida correctamente", 'BULKACTION');
    
    // Verificar token en EmailActionTokens (acciones individuales) - para casos donde se envía token individual a bulk
    $checkTokenSql = "SELECT * FROM EmailActionTokens WHERE token = ?";
    $checkStmt = $db->prepare($checkTokenSql);
    
    if (!$checkStmt) {
        logAction("ERROR preparando consulta EmailActionTokens: " . $db->error, 'BULKACTION');
        throw new Exception("Error preparando consulta individual");
    }
    
    $checkStmt->bind_param("s", $token);
    $checkStmt->execute();
    $tokenResult = $checkStmt->get_result();
    
    logAction("Consulta EmailActionTokens ejecutada - Filas encontradas: " . $tokenResult->num_rows, 'BULKACTION');
    
    // Verificar token en EmailBulkActionTokens (acciones en bloque)
    $checkBulkTokenSql = "SELECT * FROM EmailBulkActionTokens WHERE token = ?";
    $checkBulkStmt = $db->prepare($checkBulkTokenSql);
    
    if (!$checkBulkStmt) {
        logAction("ERROR preparando consulta EmailBulkActionTokens: " . $db->error, 'BULKACTION');
        throw new Exception("Error preparando consulta en bloque");
    }
    
    $checkBulkStmt->bind_param("s", $token);
    $checkBulkStmt->execute();
    $bulkTokenResult = $checkBulkStmt->get_result();
    
    logAction("Consulta EmailBulkActionTokens ejecutada - Filas encontradas: " . $bulkTokenResult->num_rows, 'BULKACTION');
    logAction("Resumen tokens - Individual: " . $tokenResult->num_rows . " | Bulk: " . $bulkTokenResult->num_rows, 'BULKACTION');
    
    // Si no se encontró el token en ninguna tabla
    if ($tokenResult->num_rows === 0 && $bulkTokenResult->num_rows === 0) {
        logAction("ERROR: Token no encontrado en ninguna tabla", 'BULKACTION');
        logAction("Verificando si existen tokens similares...", 'BULKACTION');
        
        // Buscar tokens similares para debug
        $searchPattern = substr($token, 0, 10) . '%';
        
        // Buscar en EmailActionTokens
        $similarTokensSql = "SELECT token, created_at, is_used FROM EmailActionTokens WHERE token LIKE ? ORDER BY created_at DESC LIMIT 5";
        $similarStmt = $db->prepare($similarTokensSql);
        $similarStmt->bind_param("s", $searchPattern);
        $similarStmt->execute();
        $similarResult = $similarStmt->get_result();
        
        logAction("Tokens similares encontrados en EmailActionTokens: " . $similarResult->num_rows, 'BULKACTION');
        while ($similarToken = $similarResult->fetch_assoc()) {
            logAction("Token similar: {$similarToken['token']} | Created: {$similarToken['created_at']} | Used: {$similarToken['is_used']}", 'BULKACTION');
        }
        
        // Buscar en EmailBulkActionTokens
        $similarBulkSql = "SELECT token, created_at, is_used FROM EmailBulkActionTokens WHERE token LIKE ? ORDER BY created_at DESC LIMIT 5";
        $similarBulkStmt = $db->prepare($similarBulkSql);
        $similarBulkStmt->bind_param("s", $searchPattern);
        $similarBulkStmt->execute();
        $similarBulkResult = $similarBulkStmt->get_result();
        
        logAction("Tokens similares encontrados en EmailBulkActionTokens: " . $similarBulkResult->num_rows, 'BULKACTION');
        while ($similarBulkToken = $similarBulkResult->fetch_assoc()) {
            logAction("Token bulk similar: {$similarBulkToken['token']} | Created: {$similarBulkToken['created_at']} | Used: {$similarBulkToken['is_used']}", 'BULKACTION');
        }
        
        showBulkError("Token inválido o expirado. El enlace puede haber sido usado anteriormente o haber caducado.");
        exit;
    }
    
    // Procesar si es token individual (redirigir a acción individual)
    if ($tokenResult->num_rows > 0) {
        $tokenData = $tokenResult->fetch_assoc();
        logAction("=== Token individual encontrado (redirigiendo a acción individual) ===", 'BULKACTION');
        logAction("Order ID: {$tokenData['order_id']}", 'BULKACTION');
        logAction("User ID: {$tokenData['user_id']}", 'BULKACTION');
        logAction("Action: {$tokenData['action']}", 'BULKACTION');
        logAction("Used: {$tokenData['is_used']}", 'BULKACTION');
        logAction("Created: {$tokenData['created_at']}", 'BULKACTION');
        
        // Verificar si el token ya fue usado
        if ($tokenData['is_used'] == 1) {
            logAction("ERROR: Token ya fue usado anteriormente en: " . $tokenData['used_at'], 'BULKACTION');
            showBulkError("Este enlace ya fue utilizado anteriormente. Cada enlace solo puede usarse una vez.");
            exit;
        }
        
        // Verificar si la acción coincide
        if ($tokenData['action'] !== $action) {
            logAction("ERROR: Acción no coincide - Token: {$tokenData['action']} vs Solicitada: $action", 'BULKACTION');
            showBulkError("La acción solicitada no coincide con el token proporcionado.");
            exit;
        }
        
        // Procesar como acción individual
        logAction("Procesando como acción individual", 'BULKACTION');
        $result = $handler->processAction($token, $action);
    }
    
    // Procesar si es token en bloque
    if ($bulkTokenResult->num_rows > 0) {
        $bulkTokenData = $bulkTokenResult->fetch_assoc();
        logAction("=== Token en bloque encontrado ===", 'BULKACTION');
        logAction("User ID: {$bulkTokenData['user_id']}", 'BULKACTION');
        logAction("Action: {$bulkTokenData['action']}", 'BULKACTION');
        logAction("Used: {$bulkTokenData['is_used']}", 'BULKACTION');
        logAction("Order IDs: {$bulkTokenData['order_ids']}", 'BULKACTION');
        logAction("Created: {$bulkTokenData['created_at']}", 'BULKACTION');
        
        // Verificar si el token ya fue usado
        if ($bulkTokenData['is_used'] == 1) {
            logAction("ERROR: Token bulk ya fue usado anteriormente en: " . $bulkTokenData['used_at'], 'BULKACTION');
            showBulkError("Este enlace ya fue utilizado anteriormente. Cada enlace solo puede usarse una vez.");
            exit;
        }
        
        // Verificar si la acción coincide
        if ($bulkTokenData['action'] !== $action) {
            logAction("ERROR: Acción no coincide - Token: {$bulkTokenData['action']} vs Solicitada: $action", 'BULKACTION');
            showBulkError("La acción solicitada no coincide con el token proporcionado.");
            exit;
        }
        
        // Ejecutar la acción en bloque
        logAction("=== Ejecutando processBulkAction ===", 'BULKACTION');
        logAction("Token validado exitosamente, procediendo con el procesamiento", 'BULKACTION');
        
        $result = $handler->processBulkAction($token, $action);
    }
    
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