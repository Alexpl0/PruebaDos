<?php
/**
 * daoPasswordUpdate.php - Actualiza la contraseña usando el token
 */

require_once('../../config.php');
require_once('../db/PFDB.php');
require_once('PasswordManager.php');

header('Content-Type: application/json');

try {
    // Verificar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
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
            'message' => 'Incomplete data: missing ' . implode(', ', $missing)
        ]);
        exit;
    }
    
    if (strlen($newPassword) < 8) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long']);
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
            throw new Exception("Invalid, expired, or already used token");
        }
        
        // NUEVO: Encriptar nueva contraseña
        $encryptedPassword = PasswordManager::prepareForStorage($newPassword);
        
        // Actualizar contraseña del usuario
        $updateSql = "UPDATE User SET password = ? WHERE id = ?";
        $updateStmt = $db->prepare($updateSql);
        $updateStmt->bind_param("si", $encryptedPassword, $userId);
        
        if (!$updateStmt->execute()) {
            throw new Exception("Error updating password");
        }
        
        if ($updateStmt->affected_rows === 0) {
            throw new Exception("User not found");
        }
        
        // Confirmar transacción
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Password updated successfully with encryption'
        ]);
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
    $db->close();
    
} catch (Exception $e) {
    error_log("Error en password update: " . $e->getMessage());
    
    $message = $e->getMessage();
    if (strpos($message, 'Token') !== false || strpos($message, 'token') !== false) {
        http_response_code(400);
    } else {
        http_response_code(500);
        $message = 'Internal server error';
    }
    
    echo json_encode([
        'success' => false,
        'message' => $message
    ]);
}
?>