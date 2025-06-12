<?php
/**
 * daoPasswordUpdate.php - Actualiza la contraseña usando el token
 */

require_once('../../config.php');
require_once('../db/PFDB.php');

header('Content-Type: application/json');

try {
    // Verificar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
        exit;
    }
    
    // Obtener datos
    $input = json_decode(file_get_contents('php://input'), true);
    $token = trim($input['token'] ?? '');
    $userId = intval($input['userId'] ?? 0);
    $newPassword = trim($input['newPassword'] ?? '');
    
    // Validaciones
    $missing = [];
    if (empty($token)) $missing[] = 'token';
    if (empty($newPassword)) $missing[] = 'newPassword';
    if ($userId <= 0) $missing[] = 'userId';

    if (!empty($missing)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Datos incompletos: falta(n) ' . implode(', ', $missing)
        ]);
        exit;
    }
    
    if (strlen($newPassword) < 8) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'La contraseña debe tener al menos 8 caracteres']);
        exit;
    }
    
    // Conectar a BD
    $con = new LocalConector();
    $db = $con->conectar();
    
    // Iniciar transacción
    $db->begin_transaction();
    
    try {
        // Verificar y marcar token como usado
        $tokenSql = "UPDATE EmailPasswordTokens 
                     SET is_used = 1, used_at = NOW() 
                     WHERE token = ? AND user_id = ? AND is_used = 0 
                     AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)";
        
        $tokenStmt = $db->prepare($tokenSql);
        $tokenStmt->bind_param("si", $token, $userId);
        $tokenStmt->execute();
        
        if ($tokenStmt->affected_rows === 0) {
            throw new Exception("Token inválido, expirado o ya utilizado");
        }
        
        // Actualizar contraseña del usuario
        $updateSql = "UPDATE User SET password = ? WHERE id = ?";
        $updateStmt = $db->prepare($updateSql);
        $updateStmt->bind_param("si", $newPassword, $userId);
        
        if (!$updateStmt->execute()) {
            throw new Exception("Error al actualizar la contraseña");
        }
        
        if ($updateStmt->affected_rows === 0) {
            throw new Exception("Usuario no encontrado");
        }
        
        // Confirmar transacción
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Contraseña actualizada exitosamente'
        ]);
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
    $db->close();
    
} catch (Exception $e) {
    error_log("Error en password update: " . $e->getMessage());
    
    $message = $e->getMessage();
    if (strpos($message, 'Token') !== false) {
        http_response_code(400);
    } else {
        http_response_code(500);
        $message = 'Error interno del servidor';
    }
    
    echo json_encode([
        'success' => false,
        'message' => $message
    ]);
}
?>