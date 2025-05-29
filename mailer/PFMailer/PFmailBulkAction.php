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

// DEBUG: Registrar información inicial
error_log("=== PFmailBulkAction.php - Inicio de ejecución ===");
error_log("Script path: " . __FILE__);
error_log("Current directory: " . __DIR__);

// Importar la configuración global para usar la constante URL
require_once __DIR__ . '/config.php';

// DEBUG: Verificar constantes después de incluir config.php
error_log("¿URL definida después de config.php? " . (defined('URL') ? 'SÍ: ' . URL : 'NO'));
error_log("¿URLPF definida después de config.php? " . (defined('URLPF') ? 'SÍ: ' . URLPF : 'NO'));

// Definir constantes como respaldo si no están definidas en config.php
if (!defined('URL')) {
    define('URL', 'https://grammermx.com/Mailer/PFMailer/');
    error_log("URL definida como respaldo: " . URL);
}

if (!defined('URLPF')) {
    define('URLPF', 'https://grammermx.com/Jesus/PruebaDos/');
    error_log("URLPF definida como respaldo: " . URLPF);
}

if (!defined('URLM')) {
    define('URLM', URL);
    error_log("URLM definida usando URL: " . URLM);
}

// DEBUG: Verificar parámetros GET recibidos
error_log("=== Parámetros recibidos ===");
error_log("GET parameters: " . print_r($_GET, true));
error_log("REQUEST_URI: " . ($_SERVER['REQUEST_URI'] ?? 'NO DISPONIBLE'));

// Importar las clases y utilidades necesarias para el procesamiento
error_log("Cargando PFmailUtils.php...");
require_once __DIR__ . '/PFmailUtils.php';

error_log("Cargando PFmailer.php...");
require_once __DIR__ . '/PFmailer.php';

error_log("Cargando PFmailAction.php...");
require_once __DIR__ . '/PFmailAction.php';

error_log("Todos los archivos cargados exitosamente");

// Verificar si se recibieron los parámetros necesarios
if (!isset($_GET['action']) || !isset($_GET['token'])) {
    error_log("ERROR: Faltan parámetros requeridos");
    error_log("Action presente: " . (isset($_GET['action']) ? 'SÍ' : 'NO'));
    error_log("Token presente: " . (isset($_GET['token']) ? 'SÍ' : 'NO'));
    
    showBulkError('Faltan parámetros requeridos. Se necesitan "action" y "token".');
    exit;
}

// Obtener y validar los parámetros con filtros de seguridad
$action = filter_var($_GET['action'], FILTER_SANITIZE_SPECIAL_CHARS);
$token = filter_var($_GET['token'], FILTER_SANITIZE_SPECIAL_CHARS);

error_log("Acción sanitizada: " . $action);
error_log("Token sanitizado: " . substr($token, 0, 8) . "...");

// Validar la acción y mostrar error específico
if ($action !== 'approve' && $action !== 'reject') {
    error_log("ERROR: Acción inválida: " . $action);
    showBulkError("Tipo de acción inválido: '{$action}'. Las acciones permitidas son 'approve' o 'reject'.");
    exit;
}

try {
    error_log("=== Iniciando procesamiento ===");
    error_log("Procesando acción en bloque: {$action} con token: " . substr($token, 0, 8) . "...");
    
    // Verificar si las clases existen antes de instanciarlas
    if (!class_exists('PFMailAction')) {
        error_log("ERROR: Clase PFMailAction no encontrada");
        throw new Exception("La clase PFMailAction no está disponible.");
    }
    
    error_log("Clase PFMailAction encontrada, creando instancia...");
    
    // Procesar la acción
    $handler = new PFMailAction();
    error_log("Instancia de PFMailAction creada exitosamente");
    
    // Verificar que el método existe
    if (!method_exists($handler, 'processBulkAction')) {
        error_log("ERROR: Método processBulkAction no encontrado en PFMailAction");
        error_log("Métodos disponibles: " . implode(', ', get_class_methods($handler)));
        throw new Exception("El método 'processBulkAction' no está implementado en la clase PFMailAction.");
    }
    
    error_log("Método processBulkAction encontrado, ejecutando...");
    
    // Ejecutar la acción en bloque
    $result = $handler->processBulkAction($token, $action);
    
    error_log("=== Resultado del procesamiento ===");
    error_log("Success: " . ($result['success'] ? 'true' : 'false'));
    error_log("Message: " . $result['message']);
    if (isset($result['details'])) {
        error_log("Details: " . print_r($result['details'], true));
    }

    // Mostrar resultado según éxito o fracaso
    if ($result['success']) {
        error_log("Mostrando página de éxito");
        showBulkSuccess($result['message'], $result['details'] ?? null);
    } else {
        error_log("Mostrando página de error");
        showBulkError($result['message'], $result['details'] ?? null);
    }
    
} catch (Exception $e) {
    error_log("=== EXCEPCIÓN CAPTURADA ===");
    error_log("Error en PFmailBulkAction: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    error_log("File: " . $e->getFile());
    error_log("Line: " . $e->getLine());
    
    showBulkError("Ha ocurrido un error inesperado. Por favor contacte al administrador.", ['errors' => [$e->getMessage()]]);
}

/**
 * Muestra un mensaje de éxito con formato mejorado para acciones en bloque
 */
function showBulkSuccess($message, $details = null) {
    error_log("=== Generando página de éxito ===");
    
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
    error_log("=== Generando página de error ===");
    
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
            .debug-info {
                font-size: 10px;
                color: #999;
                margin-top: 20px;
                text-align: left;
                background-color: #f8f9fa;
                padding: 10px;
                border-radius: 4px;
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='{$type}'>{$heading}</div>
            <div class='message'>" . htmlspecialchars($message) . "</div>
            <div class='details'>{$detailsHtml}</div>
            <a href='" . htmlspecialchars($ordersUrl) . "' class='btn'>Ver Órdenes</a>
            
            <div class='debug-info'>
                <strong>Debug Info:</strong><br>
                URLPF: " . (defined('URLPF') ? URLPF : 'NO DEFINIDA') . "<br>
                Script: " . __FILE__ . "<br>
                Time: " . date('Y-m-d H:i:s') . "
            </div>
        </div>
    </body>
    </html>";
}

error_log("=== PFmailBulkAction.php - Fin del script ===");
?>