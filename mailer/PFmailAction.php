<?php
/**
 * PFmailAction.php - Procesa acciones de email para Premium Freight
 * 
 * Este archivo maneja las acciones de aprobar/rechazar que vienen
 * desde los enlaces en los correos electrónicos. Recibe un token único
 * y un tipo de acción, valida el token contra la base de datos y 
 * ejecuta la acción correspondiente sobre la orden.
 */

// Establecer códigos de respuesta HTTP apropiados
http_response_code(200);

// Importar la clase necesaria para procesamiento
require_once 'PFmailer.php';
// Se asume que la clase PFMailAction está definida en otro archivo incluido en el sistema

// Inicializar variables para seguimiento de errores
$error = false;
$errorMessage = '';

// Verificar si se recibieron los parámetros necesarios
if (!isset($_GET['action']) || !isset($_GET['token'])) {
    $error = true;
    $errorMessage = 'Parámetros requeridos no encontrados. Se necesitan "action" y "token".';
}

// Solo si no hay errores, continuamos con la validación
if (!$error) {
    // Obtener y sanitizar los parámetros
    $action = filter_var($_GET['action'], FILTER_SANITIZE_SPECIAL_CHARS);
    $token = filter_var($_GET['token'], FILTER_SANITIZE_SPECIAL_CHARS);

    // Validar la acción
    if ($action !== 'approve' && $action !== 'reject') {
        $error = true;
        $errorMessage = 'Tipo de acción inválido. Debe ser "approve" o "reject".';
    }
}

// Si todo está correcto, procesamos la acción
if (!$error) {
    try {
        // Inicializar el manejador de acciones
        // Se asume que la clase PFMailAction implementa el método processAction
        $handler = new PFMailAction();

        // Procesar la acción y obtener el resultado
        $result = $handler->processAction($token, $action);

        // Mostrar resultado apropiado
        if ($result['success']) {
            showSuccess($result['message']);
        } else {
            showError($result['message']);
        }
    } catch (Exception $e) {
        // Capturar cualquier excepción no manejada
        error_log("Error en PFmailAction: " . $e->getMessage());
        showError("Ha ocurrido un error inesperado. Por favor contacte al administrador.");
    }
} else {
    // Si hubo un error en la validación, mostrar mensaje
    showError($errorMessage);
}

/**
 * Muestra un mensaje de éxito
 * 
 * @param string $message Mensaje a mostrar al usuario
 */
function showSuccess($message) {
    echo "<!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Acción Realizada Correctamente</title>
        <style>
            body { 
                font-family: 'Merriweather', Arial, sans-serif; 
                text-align: center; 
                margin-top: 50px; 
                background-color: #f8f9fa;
                color: #333;
            }
            .container {
                max-width: 600px;
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
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .success::before {
                content: '✓';
                display: inline-block;
                margin-right: 10px;
                background-color: #28a745;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                line-height: 30px;
            }
            .message { 
                margin-bottom: 30px; 
                line-height: 1.6;
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
            <img src='https://grammermx.com/Jesus/PruebaDos/PremiumFreight.svg' alt='Premium Freight Logo' class='logo'>
            <div class='success'>¡Acción Exitosa!</div>
            <div class='message'>$message</div>
            <a href='https://grammermx.com/Jesus/PruebaDos/orders.php' class='btn'>Ver Órdenes</a>
        </div>
    </body>
    </html>";
    exit;
}

/**
 * Muestra un mensaje de error
 * 
 * @param string $message Mensaje de error a mostrar al usuario
 */
function showError($message) {
    echo "<!DOCTYPE html>
    <html lang='es'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Error en la Acción</title>
        <style>
            body { 
                font-family: 'Merriweather', Arial, sans-serif; 
                text-align: center; 
                margin-top: 50px; 
                background-color: #f8f9fa;
                color: #333;
            }
            .container {
                max-width: 600px;
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
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .error::before {
                content: '✗';
                display: inline-block;
                margin-right: 10px;
                background-color: #dc3545;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                line-height: 30px;
            }
            .message { 
                margin-bottom: 30px; 
                line-height: 1.6;
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
            <img src='https://grammermx.com/Jesus/PruebaDos/PremiumFreight.svg' alt='Premium Freight Logo' class='logo'>
            <div class='error'>Error</div>
            <div class='message'>$message</div>
            <a href='https://grammermx.com/Jesus/PruebaDos/orders.php' class='btn'>Ver Órdenes</a>
        </div>
    </body>
    </html>";
    exit;
}
?>