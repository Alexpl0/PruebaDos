<?php
/**
 * PFmailUtils.php - Utilidades comunes para el sistema de correo Premium Freight
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

// Si las constantes no están definidas, cargar config.php
if (!defined('URL') || !defined('URLPF')) {
    require_once __DIR__ . '/config.php';
}

// Definir constantes de respaldo si aún no están definidas
if (!defined('URL')) {
    define('URL', 'https://grammermx.com/Mailer/PFMailer/');
}

if (!defined('URLPF')) {
    define('URLPF', 'https://grammermx.com/Jesus/PruebaDos/');
}

if (!defined('URLM')) {
    define('URLM', URL);
}

/**
 * Función helper para logging con secciones
 * 
 * @param string $message Mensaje a registrar
 * @param string $section Sección/función que genera el log
 */
if (!function_exists('logAction')) {
    function logAction($message, $section = 'MAIN') {
        $logFile = __DIR__ . '/action_debug.log';
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[{$timestamp}] [{$section}] {$message}" . PHP_EOL;
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
}

/**
 * Muestra un mensaje de éxito con formato HTML estilizado
 * 
 * @param string $message - Mensaje principal a mostrar
 * @param string $title - Título de la página (opcional)
 * @param string $buttonText - Texto del botón (opcional)
 * @param string $buttonUrl - URL del botón (opcional)
 */
function showSuccess($message, $title = 'Operación Exitosa', $buttonText = 'Continuar', $buttonUrl = null) {
    // ✅ AGREGAR: Establecer Content-Type correcto ANTES de cualquier output
    header('Content-Type: text/html; charset=utf-8');
    
    // Usar la URL base para el botón si no se especifica una
    if ($buttonUrl === null) {
        $buttonUrl = URLPF . 'orders.php';
    }
    
    echo generateHtmlResponse($title, 'success', '✓ ¡Éxito!', $message, $buttonText, $buttonUrl);
    exit;
}

/**
 * Muestra un mensaje de error con formato HTML estilizado
 * 
 * @param string $message - Mensaje de error a mostrar
 * @param string $title - Título de la página (opcional)
 * @param string $buttonText - Texto del botón (opcional)
 * @param string $buttonUrl - URL del botón (opcional)
 */
function showError($message, $title = 'Error', $buttonText = 'Volver', $buttonUrl = null) {
    // ✅ AGREGAR: Establecer Content-Type correcto ANTES de cualquier output
    header('Content-Type: text/html; charset=utf-8');
    
    // Usar la URL base para el botón si no se especifica una
    if ($buttonUrl === null) {
        $buttonUrl = URLPF . 'orders.php';
    }
    
    echo generateHtmlResponse($title, 'error', '✗ Error', $message, $buttonText, $buttonUrl);
    exit;
}

/**
 * Genera el HTML completo para las páginas de respuesta
 * 
 * @param string $title - Título de la página
 * @param string $type - Tipo de mensaje ('success' o 'error')
 * @param string $heading - Encabezado principal
 * @param string $message - Mensaje a mostrar
 * @param string $buttonText - Texto del botón
 * @param string $buttonUrl - URL del botón
 * @return string - HTML completo
 */
function generateHtmlResponse($title, $type, $heading, $message, $buttonText, $buttonUrl) {
    // Determinar color según tipo
    $colorClass = ($type === 'success') ? '#28a745' : '#dc3545';
    
    return "<!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>{$title}</title>
        <style>
            body { 
                font-family: 'Merriweather', Arial, sans-serif; 
                text-align: center; 
                margin: 0;
                padding: 20px; 
                background-color: #f8f9fa;
                color: #333;
            }
            .container {
                max-width: 600px;
                margin: 50px auto;
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
                margin-bottom: 30px; 
                font-size: 18px;
                line-height: 1.5;
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
            }
            .btn:hover {
                background-color: #023b6a;
            }
            .logo {
                margin-bottom: 30px;
                max-width: 150px;
            }
            @media (max-width: 600px) {
                .container {
                    padding: 20px 15px;
                }
                .message {
                    font-size: 16px;
                }
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <img src='" . htmlspecialchars(URLPF) . "PremiumFreight.svg' alt='Premium Freight Logo' class='logo'>
            <div class='{$type}'>{$heading}</div>
            <div class='message'>" . htmlspecialchars($message) . "</div>
            <a href='" . htmlspecialchars($buttonUrl) . "' class='btn'>{$buttonText}</a>
        </div>
    </body>
    </html>";
}

/**
 * Registra un mensaje en el log del sistema
 * 
 * @param string $message - Mensaje a registrar
 * @param string $level - Nivel del log (INFO, ERROR, WARNING)
 */
function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] [{$level}] {$message}\n";
    error_log($logEntry);
}

/**
 * Valida si una cadena es un email válido
 * 
 * @param string $email - Email a validar
 * @return bool - True si es válido, False en caso contrario
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Genera un token único para acciones de correo
 * 
 * @param int $length - Longitud del token (por defecto 32)
 * @return string - Token generado
 */
function generateUniqueToken($length = 32) {
    return bin2hex(random_bytes($length));
}
?>