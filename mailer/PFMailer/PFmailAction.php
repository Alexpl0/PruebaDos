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
     * 
     * @param int $orderId ID de la orden a aprobar
     * @param int $userId ID del usuario que aprueba
     * @return array Resultado de la operación
     */
    private function approveOrder($orderId, $userId) {
        try {
            // Registrar para diagnóstico
            $logFile = __DIR__ . '/action_debug.log';
            file_put_contents($logFile, date('Y-m-d H:i:s') . " - Aprobando orden #$orderId por usuario #$userId\n", FILE_APPEND);
            
            // 1. Actualizar PremiumFreightApprovals para esta orden
            $updateSql = "UPDATE PremiumFreightApprovals SET act_approv = 1 WHERE premium_freight_id = ?";
            $updateStmt = $this->db->prepare($updateSql);
            
            if (!$updateStmt) {
                file_put_contents($logFile, "Error preparando consulta de aprobación: " . $this->db->error . "\n", FILE_APPEND);
                throw new Exception("Error al preparar la consulta de aprobación: " . $this->db->error);
            }
            
            $updateStmt->bind_param("i", $orderId);
            
            if (!$updateStmt->execute()) {
                file_put_contents($logFile, "Error ejecutando consulta de aprobación: " . $updateStmt->error . "\n", FILE_APPEND);
                throw new Exception("Error al ejecutar la consulta de aprobación: " . $updateStmt->error);
            }
            
            $affectedRows = $updateStmt->affected_rows;
            file_put_contents($logFile, "Filas actualizadas en PremiumFreightApprovals: $affectedRows\n", FILE_APPEND);
            
            if ($affectedRows === 0) {
                // Verificar si el registro existe
                $checkSql = "SELECT COUNT(*) as total FROM PremiumFreightApprovals WHERE premium_freight_id = ?";
                $checkStmt = $this->db->prepare($checkSql);
                $checkStmt->bind_param("i", $orderId);
                $checkStmt->execute();
                $checkResult = $checkStmt->get_result();
                $totalRecords = $checkResult->fetch_assoc()['total'];
                
                if ($totalRecords === 0) {
                    // Si no existe, crear el registro
                    file_put_contents($logFile, "No se encontró registro en PremiumFreightApprovals, creando uno nuevo\n", FILE_APPEND);
                    $insertSql = "INSERT INTO PremiumFreightApprovals (premium_freight_id, act_approv, user_id, approval_date) 
                                 VALUES (?, 1, ?, NOW())";
                    $insertStmt = $this->db->prepare($insertSql);
                    $insertStmt->bind_param("ii", $orderId, $userId);
                    
                    if (!$insertStmt->execute()) {
                        file_put_contents($logFile, "Error insertando aprobación: " . $insertStmt->error . "\n", FILE_APPEND);
                        throw new Exception("Error al insertar la aprobación: " . $insertStmt->error);
                    }
                } else {
                    file_put_contents($logFile, "El registro ya existía pero no se actualizó (posiblemente ya estaba aprobado)\n", FILE_APPEND);
                }
            }
            
            // Registrar la acción exitosa
            file_put_contents($logFile, "Orden #$orderId aprobada exitosamente\n", FILE_APPEND);
            
            return [
                'success' => true,
                'message' => "La orden #$orderId ha sido aprobada exitosamente."
            ];
        } catch (Exception $e) {
            // Registrar el error
            file_put_contents($logFile, "Error aprobando orden: " . $e->getMessage() . "\n", FILE_APPEND);
            
            return [
                'success' => false,
                'message' => "Error al aprobar la orden: " . $e->getMessage()
            ];
        }
    }
    
    /**
     * Rechaza una orden
     * 
     * @param int $orderId ID de la orden a rechazar
     * @param int $userId ID del usuario que rechaza
     * @return array Resultado de la operación
     */
    private function rejectOrder($orderId, $userId) {
        try {
            // Registrar para diagnóstico
            $logFile = __DIR__ . '/action_debug.log';
            file_put_contents($logFile, date('Y-m-d H:i:s') . " - Rechazando orden #$orderId por usuario #$userId\n", FILE_APPEND);
            
            // 1. Actualizar PremiumFreight para marcar la orden como rechazada (status_id = 4)
            $updateSql = "UPDATE PremiumFreight SET status_id = 4 WHERE id = ?";
            $updateStmt = $this->db->prepare($updateSql);
            
            if (!$updateStmt) {
                file_put_contents($logFile, "Error preparando consulta de rechazo: " . $this->db->error . "\n", FILE_APPEND);
                throw new Exception("Error al preparar la consulta de rechazo: " . $this->db->error);
            }
            
            $updateStmt->bind_param("i", $orderId);
            
            if (!$updateStmt->execute()) {
                file_put_contents($logFile, "Error ejecutando consulta de rechazo: " . $updateStmt->error . "\n", FILE_APPEND);
                throw new Exception("Error al ejecutar la consulta de rechazo: " . $updateStmt->error);
            }
            
            $affectedRows = $updateStmt->affected_rows;
            file_put_contents($logFile, "Filas actualizadas en PremiumFreight: $affectedRows\n", FILE_APPEND);
            
            if ($affectedRows === 0) {
                // Verificar si la orden existe
                $checkSql = "SELECT COUNT(*) as total FROM PremiumFreight WHERE id = ?";
                $checkStmt = $this->db->prepare($checkSql);
                $checkStmt->bind_param("i", $orderId);
                $checkStmt->execute();
                $checkResult = $checkStmt->get_result();
                $totalOrders = $checkResult->fetch_assoc()['total'];
                
                if ($totalOrders === 0) {
                    file_put_contents($logFile, "La orden #$orderId no existe\n", FILE_APPEND);
                    throw new Exception("La orden #$orderId no existe en el sistema");
                } else {
                    // Si la orden existe pero no se actualizó, podría ser que ya estuviera rechazada
                    $statusSql = "SELECT status_id FROM PremiumFreight WHERE id = ?";
                    $statusStmt = $this->db->prepare($statusSql);
                    $statusStmt->bind_param("i", $orderId);
                    $statusStmt->execute();
                    $statusResult = $statusStmt->get_result();
                    $currentStatus = $statusResult->fetch_assoc()['status_id'];
                    
                    file_put_contents($logFile, "La orden existe pero no se actualizó. Estado actual: $currentStatus\n", FILE_APPEND);
                    
                    if ($currentStatus == 4) {
                        // La orden ya estaba rechazada
                        return [
                            'success' => true,
                            'message' => "La orden #$orderId ya estaba marcada como rechazada."
                        ];
                    }
                }
            }
            
            // 2. También registrar el rechazo en la tabla de aprobaciones si existe
            $rejectSql = "UPDATE PremiumFreightApprovals SET act_approv = 0, rejection_reason = 'Rechazado vía email', 
                          rejection_date = NOW(), rejector_id = ? WHERE premium_freight_id = ?";
            $rejectStmt = $this->db->prepare($rejectSql);
            $rejectStmt->bind_param("ii", $userId, $orderId);
            $rejectStmt->execute();
            
            // Registrar la acción exitosa
            file_put_contents($logFile, "Orden #$orderId rechazada exitosamente\n", FILE_APPEND);
            
            return [
                'success' => true,
                'message' => "La orden #$orderId ha sido rechazada."
            ];
        } catch (Exception $e) {
            // Registrar el error
            file_put_contents($logFile, "Error rechazando orden: " . $e->getMessage() . "\n", FILE_APPEND);
            
            return [
                'success' => false,
                'message' => "Error al rechazar la orden: " . $e->getMessage()
            ];
        }
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
        // Verificar el token primero
        $con = new LocalConector();
        $db = $con->conectar();
        
        // Verificar si el token existe y su estado
        $sql = "SELECT t.*, p.status_id, pa.act_approv 
                FROM EmailActionTokens t
                LEFT JOIN PremiumFreight p ON t.order_id = p.id
                LEFT JOIN PremiumFreightApprovals pa ON p.id = pa.premium_freight_id
                WHERE t.token = ?";
        $stmt = $db->prepare($sql);
        $stmt->bind_param("s", $token);
        $stmt->execute();
        $result = $stmt->get_result();
        
        // Si no hay resultados o el token ya fue usado, mostrar error
        if ($result->num_rows === 0) {
            showError("El token proporcionado no existe.");
            exit;
        }
        
        $tokenData = $result->fetch_assoc();
        if ($tokenData['is_used'] == 1) {
            // Preparar mensaje detallado para el usuario
            $usedDate = new DateTime($tokenData['used_at']);
            $formattedDate = $usedDate->format('d/m/Y H:i:s');
            
            showError("Este token ya fue utilizado el {$formattedDate}. 
                      Por favor, contacte al administrador si necesita realizar una nueva acción sobre esta orden.");
            exit;
        }
        
        // Si todo está bien, procesar normalmente
        $handler = new PFMailAction();
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
            <a href='" . URLPF . "orders.php' class='btn'>Ver Órdenes</a>
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
            <a href='" . URLPF . "orders.php' class='btn'>Ver Órdenes</a>
        </div>
    </body>
    </html>";
    exit;
}
?>