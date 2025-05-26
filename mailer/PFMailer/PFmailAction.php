<?php
/**
 * PFmailAction.php - Procesa acciones de email para Premium Freight
 * 
 * Este archivo maneja las acciones de aprobar/rechazar que vienen
 * desde los enlaces en los correos electrónicos. Recibe un token único
 * y un tipo de acción, valida el token contra la base de datos y 
 * ejecuta la acción correspondiente sobre la orden.
 */

// Importar la configuración global
require_once __DIR__ . '/config.php';

// Establecer códigos de respuesta HTTP apropiados
http_response_code(200);

// Importar las clases necesarias para procesamiento
require_once 'PFmailer.php';

// Clase para manejar acciones de correo
class PFMailAction {
    private $db;
    
    public function __construct() {
        // Inicializar conexión a la base de datos
        $con = new LocalConector();
        $this->db = $con->conectar();
    }
    
    /**
     * Procesa una acción basada en un token
     * 
     * @param string $token Token único de la acción
     * @param string $action Tipo de acción (approve/reject)
     * @return array Resultado del procesamiento
     */
    public function processAction($token, $action) {
        try {
            // 1. Verificar si el token existe y no ha sido usado
            $sql = "SELECT * FROM EmailActionTokens WHERE token = ? AND is_used = 0";
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("s", $token);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return [
                    'success' => false,
                    'message' => 'El token proporcionado no es válido o ya ha sido utilizado.'
                ];
            }
            
            // 2. Obtener datos del token
            $tokenData = $result->fetch_assoc();
            $orderId = $tokenData['order_id'];
            $userId = $tokenData['user_id'];
            $tokenAction = $tokenData['action'];
            
            // 3. Verificar que la acción solicitada coincida con la del token
            if ($action !== $tokenAction) {
                return [
                    'success' => false,
                    'message' => 'La acción solicitada no coincide con la acción autorizada por el token.'
                ];
            }
            
            // 4. Ejecutar la acción correspondiente
            if ($action === 'approve') {
                // Lógica para aprobar la orden
                $result = $this->approveOrder($orderId, $userId);
            } else {
                // Lógica para rechazar la orden
                $result = $this->rejectOrder($orderId, $userId);
            }
            
            // 5. Marcar el token como usado
            $this->markTokenAsUsed($token);
            
            return $result;
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error al procesar la acción: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Aprueba una orden
     */
    private function approveOrder($orderId, $userId) {
        // Implementar lógica para aprobar orden
        // Esta es una implementación simplificada
        return [
            'success' => true,
            'message' => "La orden #$orderId ha sido aprobada exitosamente."
        ];
    }
    
    /**
     * Rechaza una orden
     */
    private function rejectOrder($orderId, $userId) {
        // Implementar lógica para rechazar orden
        // Esta es una implementación simplificada
        return [
            'success' => true,
            'message' => "La orden #$orderId ha sido rechazada."
        ];
    }
    
    /**
     * Marca un token como usado
     */
    private function markTokenAsUsed($token) {
        $sql = "UPDATE EmailActionTokens SET is_used = 1, used_at = NOW() WHERE token = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->bind_param("s", $token);
        $stmt->execute();
    }
}

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
    // Usar la constante URL global definida en config.php
    global $URL;
    
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
            <img src='" . URL . "PremiumFreight.svg' alt='Premium Freight Logo' class='logo'>
            <div class='success'>¡Acción Exitosa!</div>
            <div class='message'>$message</div>
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
 */
function showError($message) {
    // Usar la constante URL global definida en config.php
    global $URL;
    
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
            <img src='" . URL . "PremiumFreight.svg' alt='Premium Freight Logo' class='logo'>
            <div class='error'>Error</div>
            <div class='message'>$message</div>
            <a href='" . URL . "orders.php' class='btn'>Ver Órdenes</a>
        </div>
    </body>
    </html>";
    exit;
}
?>