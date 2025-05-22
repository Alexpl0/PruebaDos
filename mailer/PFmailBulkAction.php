<?php
/**
 * PFmailBulkAction.php - Procesa acciones en bloque desde los correos semanales
 * 
 * Este archivo maneja las acciones de aprobar/rechazar en bloque que vienen
 * desde los enlaces en los correos electrónicos semanales.
 */

require_once 'PFmailer.php';

// Verificar si se recibieron los parámetros necesarios
if (!isset($_GET['action']) || !isset($_GET['token'])) {
    showError('Missing required parameters.');
    exit;
}

// Obtener y validar los parámetros
$action = $_GET['action'];
$token = $_GET['token'];

// Validar la acción
if ($action !== 'approve' && $action !== 'reject') {
    showError('Invalid action type.');
    exit;
}

// Procesar la acción
$handler = new PFMailAction();
$result = $handler->processBulkAction($token, $action);

// Mostrar resultado
if ($result['success']) {
    showSuccess($result['message'], $result['details']);
} else {
    showError($result['message'], $result['details'] ?? null);
}

/**
 * Muestra un mensaje de éxito
 */
function showSuccess($message, $details = null) {
    $detailsHtml = '';
    if ($details) {
        $detailsHtml .= "<p>Processed {$details['total']} orders: {$details['successful']} successful, {$details['failed']} failed.</p>";
        
        if (!empty($details['errors'])) {
            $detailsHtml .= "<div style='text-align: left; margin: 15px auto; max-width: 600px;'>";
            $detailsHtml .= "<p><strong>Errors:</strong></p><ul>";
            foreach ($details['errors'] as $error) {
                $detailsHtml .= "<li>$error</li>";
            }
            $detailsHtml .= "</ul></div>";
        }
    }
    
    echo "<!DOCTYPE html>
    <html>
    <head>
        <title>Bulk Action Successful</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
            .message { margin-bottom: 20px; }
            .details { margin-bottom: 30px; }
            .btn { display: inline-block; padding: 10px 20px; background-color: #007bff; 
                   color: white; text-decoration: none; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class='success'>✓ Success!</div>
        <div class='message'>$message</div>
        <div class='details'>$detailsHtml</div>
        <a href='https://grammermx.com/Jesus/PruebaDos/orders.php' class='btn'>Go to Orders</a>
    </body>
    </html>";
}

/**
 * Muestra un mensaje de error
 */
function showError($message, $details = null) {
    $detailsHtml = '';
    if ($details) {
        if (!empty($details['errors'])) {
            $detailsHtml .= "<div style='text-align: left; margin: 15px auto; max-width: 600px;'>";
            $detailsHtml .= "<p><strong>Details:</strong></p><ul>";
            foreach ($details['errors'] as $error) {
                $detailsHtml .= "<li>$error</li>";
            }
            $detailsHtml .= "</ul></div>";
        }
    }
    
    echo "<!DOCTYPE html>
    <html>
    <head>
        <title>Bulk Action Failed</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
            .message { margin-bottom: 20px; }
            .details { margin-bottom: 30px; }
            .btn { display: inline-block; padding: 10px 20px; background-color: #007bff; 
                   color: white; text-decoration: none; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class='error'>✗ Error</div>
        <div class='message'>$message</div>
        <div class='details'>$detailsHtml</div>
        <a href='https://grammermx.com/Jesus/PruebaDos/orders.php' class='btn'>Go to Orders</a>
    </body>
    </html>";
}
?>