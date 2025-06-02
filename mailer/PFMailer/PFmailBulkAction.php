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
ini_set('error_log', __DIR__ . '/bulk_action_errors.log');

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
    error_log("ERROR: Faltan parámetros requeridos - Action: " . (isset($_GET['action']) ? 'presente' : 'ausente') . ", Token: " . (isset($_GET['token']) ? 'presente' : 'ausente'));
    showBulkError('Faltan parámetros requeridos. Se necesitan "action" y "token".');
    exit;
}

// Obtener y validar los parámetros con filtros de seguridad
$action = filter_var($_GET['action'], FILTER_SANITIZE_SPECIAL_CHARS);
$token = filter_var($_GET['token'], FILTER_SANITIZE_SPECIAL_CHARS);

error_log("=== Iniciando procesamiento de acción en bloque ===");
error_log("Acción: $action | Token: $token");
error_log("Token original recibido: " . $_GET['token']);
error_log("Token después de sanitización: $token");
error_log("¿Token cambió después de sanitización?: " . ($_GET['token'] !== $token ? 'SÍ' : 'NO'));

// Validar la acción y mostrar error específico
if ($action !== 'approve' && $action !== 'reject') {
    error_log("ERROR: Acción inválida: $action");
    showBulkError("Tipo de acción inválido: '{$action}'. Las acciones permitidas son 'approve' o 'reject'.");
    exit;
}

try {
    // Verificar si las clases existen antes de instanciarlas
    if (!class_exists('PFMailAction')) {
        error_log("ERROR: Clase PFMailAction no encontrada");
        throw new Exception("La clase PFMailAction no está disponible.");
    }
    
    // Procesar la acción
    $handler = new PFMailAction();
    
    // Verificar que el método existe
    if (!method_exists($handler, 'processBulkAction')) {
        error_log("ERROR: Método processBulkAction no encontrado en PFMailAction");
        throw new Exception("El método 'processBulkAction' no está implementado en la clase PFMailAction.");
    }
    
    // DEBUG: Verificar el token antes de procesarlo
    error_log("=== Verificación previa del token ===");
    error_log("Token a buscar en BD: '$token'");
    error_log("Longitud del token: " . strlen($token));
    error_log("Caracteres del token: " . bin2hex($token));
    
    // Primero verificar si el token existe en la base de datos
    $con = new LocalConector();
    $db = $con->conectar();
    
    if (!$db) {
        error_log("ERROR: No se pudo conectar a la base de datos");
        throw new Exception("Error de conexión a la base de datos");
    }
    
    error_log("Conexión a BD establecida correctamente");
    
    // Verificar token en EmailActionTokens (acciones individuales)
    $checkTokenSql = "SELECT * FROM EmailActionTokens WHERE token = ?";
    $checkStmt = $db->prepare($checkTokenSql);
    
    if (!$checkStmt) {
        error_log("ERROR preparando consulta EmailActionTokens: " . $db->error);
        throw new Exception("Error preparando consulta individual");
    }
    
    $checkStmt->bind_param("s", $token);
    $checkStmt->execute();
    $tokenResult = $checkStmt->get_result();
    
    error_log("Consulta EmailActionTokens ejecutada - Filas encontradas: " . $tokenResult->num_rows);
    
    // Verificar token en EmailBulkActionTokens (acciones en bloque)
    $checkBulkTokenSql = "SELECT * FROM EmailBulkActionTokens WHERE token = ?";
    $checkBulkStmt = $db->prepare($checkBulkTokenSql);
    
    if (!$checkBulkStmt) {
        error_log("ERROR preparando consulta EmailBulkActionTokens: " . $db->error);
        throw new Exception("Error preparando consulta en bloque");
    }
    
    $checkBulkStmt->bind_param("s", $token);
    $checkBulkStmt->execute();
    $bulkTokenResult = $checkBulkStmt->get_result();
    
    error_log("Consulta EmailBulkActionTokens ejecutada - Filas encontradas: " . $bulkTokenResult->num_rows);
    
    error_log("Resumen tokens - Individual: " . $tokenResult->num_rows . " | Bulk: " . $bulkTokenResult->num_rows);
    
    // Si no se encontró el token en ninguna tabla
    if ($tokenResult->num_rows === 0 && $bulkTokenResult->num_rows === 0) {
        error_log("ERROR: Token no encontrado en ninguna tabla");
        error_log("Verificando si existen tokens similares...");
        
        // Buscar tokens similares para debug
        $similarTokensSql = "SELECT token, created_at, is_used FROM EmailActionTokens WHERE token LIKE ? ORDER BY created_at DESC LIMIT 5";
        $similarStmt = $db->prepare($similarTokensSql);
        $searchPattern = substr($token, 0, 10) . '%';
        $similarStmt->bind_param("s", $searchPattern);
        $similarStmt->execute();
        $similarResult = $similarStmt->get_result();
        
        error_log("Tokens similares encontrados en EmailActionTokens: " . $similarResult->num_rows);
        while ($similarToken = $similarResult->fetch_assoc()) {
            error_log("Token similar: {$similarToken['token']} | Created: {$similarToken['created_at']} | Used: {$similarToken['is_used']}");
        }
        
        // Buscar tokens similares en bulk
        $similarBulkSql = "SELECT token, created_at, is_used FROM EmailBulkActionTokens WHERE token LIKE ? ORDER BY created_at DESC LIMIT 5";
        $similarBulkStmt = $db->prepare($similarBulkSql);
        $similarBulkStmt->bind_param("s", $searchPattern);
        $similarBulkStmt->execute();
        $similarBulkResult = $similarBulkStmt->get_result();
        
        error_log("Tokens similares encontrados en EmailBulkActionTokens: " . $similarBulkResult->num_rows);
        while ($similarBulkToken = $similarBulkResult->fetch_assoc()) {
            error_log("Token bulk similar: {$similarBulkToken['token']} | Created: {$similarBulkToken['created_at']} | Used: {$similarBulkToken['is_used']}");
        }
        
        showBulkError("Token inválido o expirado. El enlace puede haber sido usado anteriormente o haber caducado.");
        exit;
    }
    
    if ($tokenResult->num_rows > 0) {
        $tokenData = $tokenResult->fetch_assoc();
        error_log("=== Token individual encontrado ===");
        error_log("Order ID: {$tokenData['order_id']}");
        error_log("User ID: {$tokenData['user_id']}");
        error_log("Action: {$tokenData['action']}");
        error_log("Used: {$tokenData['is_used']}");
        error_log("Created: {$tokenData['created_at']}");
        error_log("Used at: " . ($tokenData['used_at'] ?? 'NULL'));
        
        // Verificar si el token ya fue usado
        if ($tokenData['is_used'] == 1) {
            error_log("ERROR: Token ya fue usado anteriormente en: " . $tokenData['used_at']);
            showBulkError("Este enlace ya fue utilizado anteriormente. Cada enlace solo puede usarse una vez.");
            exit;
        }
        
        // Verificar si la acción coincide
        if ($tokenData['action'] !== $action) {
            error_log("ERROR: Acción no coincide - Token: {$tokenData['action']} vs Solicitada: $action");
            showBulkError("La acción solicitada no coincide con el token proporcionado.");
            exit;
        }
    }
    
    if ($bulkTokenResult->num_rows > 0) {
        $bulkTokenData = $bulkTokenResult->fetch_assoc();
        error_log("=== Token en bloque encontrado ===");
        error_log("User ID: {$bulkTokenData['user_id']}");
        error_log("Action: {$bulkTokenData['action']}");
        error_log("Used: {$bulkTokenData['is_used']}");
        error_log("Order IDs: {$bulkTokenData['order_ids']}");
        error_log("Created: {$bulkTokenData['created_at']}");
        error_log("Used at: " . ($bulkTokenData['used_at'] ?? 'NULL'));
        
        // Verificar si el token ya fue usado
        if ($bulkTokenData['is_used'] == 1) {
            error_log("ERROR: Token bulk ya fue usado anteriormente en: " . $bulkTokenData['used_at']);
            showBulkError("Este enlace ya fue utilizado anteriormente. Cada enlace solo puede usarse una vez.");
            exit;
        }
        
        // Verificar si la acción coincide
        if ($bulkTokenData['action'] !== $action) {
            error_log("ERROR: Acción no coincide - Token: {$bulkTokenData['action']} vs Solicitada: $action");
            showBulkError("La acción solicitada no coincide con el token proporcionado.");
            exit;
        }
    }
    
    // Ejecutar la acción en bloque
    error_log("=== Ejecutando processBulkAction ===");
    error_log("Token validado exitosamente, procediendo con el procesamiento");
    
    $result = $handler->processBulkAction($token, $action);
    
    error_log("=== Resultado del procesamiento ===");
    error_log("Success: " . ($result['success'] ? 'true' : 'false'));
    error_log("Message: " . $result['message']);
    if (isset($result['details'])) {
        error_log("Details: " . print_r($result['details'], true));
    }

    // Mostrar resultado según éxito o fracaso
    if ($result['success']) {
        error_log("Procesamiento exitoso - mostrando página de éxito");
        showBulkSuccess($result['message'], $result['details'] ?? null);
    } else {
        error_log("Procesamiento fallido - mostrando página de error");
        showBulkError($result['message'], $result['details'] ?? null);
    }
    
} catch (Exception $e) {
    error_log("=== EXCEPCIÓN CAPTURADA ===");
    error_log("Error: " . $e->getMessage() . " | File: " . $e->getFile() . " | Line: " . $e->getLine());
    
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

error_log("=== Fin del procesamiento ===");
?>