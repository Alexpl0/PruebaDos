<?php
/**
 * PFmailBulkAction.php - Procesa acciones en bloque desde los correos semanales
 * 
 * Este archivo maneja las acciones de aprobar/rechazar en bloque que vienen
 * desde los enlaces en los correos electrónicos semanales.
 */

// Importar la configuración global para usar la constante URL
require_once __DIR__ . '/../config.php';

// Importar las clases necesarias para el procesamiento
require_once 'PFmailer.php';
require_once 'PFMailAction.class.php';

// Verificar si se recibieron los parámetros necesarios
if (!isset($_GET['action']) || !isset($_GET['token'])) {
    showError('Faltan parámetros requeridos.');
    exit;
}

// Obtener y validar los parámetros
$action = filter_var($_GET['action'], FILTER_SANITIZE_SPECIAL_CHARS);
$token = filter_var($_GET['token'], FILTER_SANITIZE_SPECIAL_CHARS);

// Validar la acción
if ($action !== 'approve' && $action !== 'reject') {
    showError('Tipo de acción inválido.');
    exit;
}

try {
    // Procesar la acción
    $handler = new PFMailAction();
    $result = $handler->processBulkAction($token, $action);

    // Mostrar resultado
    if ($result['success']) {
        showSuccess($result['message'], $result['details']);
    } else {
        showError($result['message'], $result['details'] ?? null);
    }
} catch (Exception $e) {
    // Capturar cualquier excepción no manejada
    error_log("Error en PFmailBulkAction: " . $e->getMessage());
    showError("Ha ocurrido un error inesperado. Por favor contacte al administrador.");
}

/**
 * Muestra un mensaje de éxito
 * 
 * @param string $message Mensaje a mostrar al usuario
 * @param array|null $details Detalles adicionales del proceso
 */
function showSuccess($message, $details = null) {
    // Acceder a la constante URL global
    global $URL;
    
    $detailsHtml = '';
    if ($details) {
        $detailsHtml .= "<p>Se procesaron {$details['total']} órdenes: {$details['successful']} exitosas, {$details['failed']} fallidas.</p>";
        
        if (!empty($details['errors'])) {
            $detailsHtml .= "<div style='text-align: left; margin: 15px auto; max-width: 600px;'>";
            $detailsHtml .= "<p><strong>Errores:</strong></p><ul>";
            foreach ($details['errors'] as $error) {
                $detailsHtml .= "<li>$error</li>";
            }
            $detailsHtml .= "</ul></div>";
        }
    }
    
    echo "<!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Acción en Bloque Exitosa</title>
        <style>
            body { 
                font-family: 'Merriweather', Arial, sans-serif; 
                text-align: center; 
                margin-top: 50px; 
                background-color: #f8f9fa;
                color: #333;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success { 
                color: #28a745; 
                font-size: 24px; 
                margin-bottom: 20px; 
            }
            .message { 
                margin-bottom: 20px; 
                font-size: 18px;
            }
            .details { 
                margin-bottom: 30px; 
                font-size: 16px;
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
                margin-bottom: 20px;
                max-width: 150px;
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <img src='" . URL . "PremiumFreight.svg' alt='Premium Freight Logo' class='logo'>
            <div class='success'>✓ ¡Éxito!</div>
            <div class='message'>$message</div>
            <div class='details'>$detailsHtml</div>
            <a href='" . URL . "orders.php' class='btn'>Ver Órdenes</a>
        </div>
    </body>
    </html>";
    exit;
}

/**
 * Muestra un mensaje de error
 * 
 * @param string $message Mensaje de error a mostrar al usuario
 * @param array|null $details Detalles adicionales del error
 */
function showError($message, $details = null) {
    // Acceder a la constante URL global
    global $URL;
    
    $detailsHtml = '';
    if ($details) {
        if (!empty($details['errors'])) {
            $detailsHtml .= "<div style='text-align: left; margin: 15px auto; max-width: 600px;'>";
            $detailsHtml .= "<p><strong>Detalles:</strong></p><ul>";
            foreach ($details['errors'] as $error) {
                $detailsHtml .= "<li>$error</li>";
            }
            $detailsHtml .= "</ul></div>";
        }
    }
    
    echo "<!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Error en Acción en Bloque</title>
        <style>
            body { 
                font-family: 'Merriweather', Arial, sans-serif; 
                text-align: center; 
                margin-top: 50px; 
                background-color: #f8f9fa;
                color: #333;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .error { 
                color: #dc3545; 
                font-size: 24px; 
                margin-bottom: 20px; 
            }
            .message { 
                margin-bottom: 20px;
                font-size: 18px;
            }
            .details { 
                margin-bottom: 30px;
                font-size: 16px;
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
                margin-bottom: 20px;
                max-width: 150px;
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <img src='" . URL . "PremiumFreight.svg' alt='Premium Freight Logo' class='logo'>
            <div class='error'>✗ Error</div>
            <div class='message'>$message</div>
            <div class='details'>$detailsHtml</div>
            <a href='" . URL . "orders.php' class='btn'>Ver Órdenes</a>
        </div>
    </body>
    </html>";
    exit;
}
?>