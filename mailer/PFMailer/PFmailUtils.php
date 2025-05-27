<?php
/**
 * PFmailUtils.php - Funciones de utilidad compartidas para el sistema PFMailer
 * 
 * Este archivo contiene funciones de utilidad compartidas entre diferentes
 * componentes del sistema de correo.
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

// Asegurar que este archivo solo se incluye una vez
if (!defined('PF_MAIL_UTILS_INCLUDED')) {
    define('PF_MAIL_UTILS_INCLUDED', true);

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
            'Acción Exitosa',
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
            'Error en la Acción',
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
}
?>