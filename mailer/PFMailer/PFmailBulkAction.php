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

// Importar las clases y utilidades necesarias para el procesamiento
require_once __DIR__ . '/PFmailUtils.php';  // Importar primero las utilidades
require_once __DIR__ . '/PFmailer.php';
require_once __DIR__ . '/PFmailAction.php'; 

// Verificar si se recibieron los parámetros necesarios
if (!isset($_GET['action']) || !isset($_GET['token'])) {
    showError('Faltan parámetros requeridos. Se necesitan "action" y "token".');
    exit;
}

// Obtener y validar los parámetros con filtros de seguridad
$action = filter_var($_GET['action'], FILTER_SANITIZE_SPECIAL_CHARS);
$token = filter_var($_GET['token'], FILTER_SANITIZE_SPECIAL_CHARS);

// Validar la acción y mostrar error específico
if ($action !== 'approve' && $action !== 'reject') {
    showError("Tipo de acción inválido: '{$action}'. Las acciones permitidas son 'approve' o 'reject'.");
    exit;
}

try {
    // Registrar el inicio de la operación
    error_log("Iniciando procesamiento de acción en bloque: {$action} con token: {$token}");
    
    // Procesar la acción
    $handler = new PFMailAction();
    
    // Verificar que el método existe
    if (!method_exists($handler, 'processBulkAction')) {
        throw new Exception("El método 'processBulkAction' no está implementado en la clase PFMailAction.");
    }
    
    // Ejecutar la acción en bloque
    $result = $handler->processBulkAction($token, $action);

    // Mostrar resultado según éxito o fracaso
    if ($result['success']) {
        showSuccess($result['message'], $result['details'] ?? null);
    } else {
        showError($result['message'], $result['details'] ?? null);
    }
} catch (Exception $e) {
    // Capturar cualquier excepción no manejada
    error_log("Error en PFmailBulkAction: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    showError("Ha ocurrido un error inesperado. Por favor contacte al administrador.", ['errors' => [$e->getMessage()]]);
}

/**
 * Muestra un mensaje de éxito con formato mejorado
 * 
 * @param string $message Mensaje a mostrar al usuario
 * @param array|null $details Detalles adicionales del proceso
 */
function showSuccess($message, $details = null) {
    // Acceder a la constante URL global
    global $URL;
    
    // Asegurar que URL tiene un valor
    if (!isset($URL) || empty($URL)) {
        $URL = '/';  // Valor por defecto
        error_log("La constante URL no está definida en config.php. Usando valor por defecto: '/'");
    }
    
    // Generar HTML para detalles si existen
    $detailsHtml = '';
    if ($details) {
        // Información de conteo de procesamiento
        if (isset($details['total']) && isset($details['successful']) && isset($details['failed'])) {
            $detailsHtml .= "<p class='summary'>Se procesaron <strong>{$details['total']}</strong> órdenes: " . 
                "<span class='success-count'>{$details['successful']}</span> exitosas, " . 
                "<span class='error-count'>{$details['failed']}</span> fallidas.</p>";
        }
        
        // Información de errores específicos
        if (!empty($details['errors'])) {
            $detailsHtml .= "<div class='error-details'>";
            $detailsHtml .= "<p><strong>Errores:</strong></p><ul>";
            foreach ($details['errors'] as $error) {
                $detailsHtml .= "<li>" . htmlspecialchars($error) . "</li>";
            }
            $detailsHtml .= "</ul></div>";
        }
    }
    
    // Generar la página HTML de respuesta
    echo generateHtmlResponse(
        'Acción en Bloque Exitosa',
        'success',
        '✓ ¡Éxito!',
        $message,
        $detailsHtml
    );
    exit;
}

/**
 * Muestra un mensaje de error con formato mejorado
 * 
 * @param string $message Mensaje de error a mostrar al usuario
 * @param array|null $details Detalles adicionales del error
 */
function showError($message, $details = null) {
    // Acceder a la constante URL global
    global $URL;
    
    // Asegurar que URL tiene un valor
    if (!isset($URL) || empty($URL)) {
        $URL = '/';  // Valor por defecto
        error_log("La constante URL no está definida en config.php. Usando valor por defecto: '/'");
    }
    
    // Generar HTML para detalles si existen
    $detailsHtml = '';
    if ($details && !empty($details['errors'])) {
        $detailsHtml .= "<div class='error-details'>";
        $detailsHtml .= "<p><strong>Detalles:</strong></p><ul>";
        foreach ($details['errors'] as $error) {
            $detailsHtml .= "<li>" . htmlspecialchars($error) . "</li>";
        }
        $detailsHtml .= "</ul></div>";
    }
    
    // Generar la página HTML de respuesta
    echo generateHtmlResponse(
        'Error en Acción en Bloque',
        'error',
        '✗ Error',
        $message,
        $detailsHtml
    );
    exit;
}

/**
 * Genera el HTML para las páginas de respuesta
 * 
 * @param string $title Título de la página
 * @param string $type Tipo de mensaje ('success' o 'error')
 * @param string $heading Encabezado principal
 * @param string $message Mensaje a mostrar
 * @param string $detailsHtml HTML con detalles adicionales
 * @return string HTML completo para la página
 */
function generateHtmlResponse($title, $type, $heading, $message, $detailsHtml) {
    global $URL;
    
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
            <img src='" . htmlspecialchars($URL) . "PremiumFreight.svg' alt='Premium Freight Logo' class='logo'>
            <div class='{$type}'>{$heading}</div>
            <div class='message'>" . htmlspecialchars($message) . "</div>
            <div class='details'>{$detailsHtml}</div>
            <a href='" . htmlspecialchars($URL) . "orders.php' class='btn'>Ver Órdenes</a>
        </div>
    </body>
    </html>";
}
?>