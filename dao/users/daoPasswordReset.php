<?php
/**
 * daoPasswordReset.php - Maneja las solicitudes de reset de contraseña
 */

require_once('../../config.php');
require_once('../db/PFDB.php');
require_once('../../mailer/PFMailer/PFmailer.php');

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
    $email = trim($input['email'] ?? '');
    
    if (empty($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email requerido']);
        exit;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email inválido']);
        exit;
    }
    
    // Conectar a BD
    $con = new LocalConector();
    $db = $con->conectar();
    
    // Verificar si el usuario existe
    $sql = "SELECT id, name, email FROM User WHERE email = ? LIMIT 1";
    $stmt = $db->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Por seguridad, no revelar si el email existe o no
        echo json_encode([
            'success' => true, 
            'message' => 'Si el email existe, se enviará un correo de recuperación'
        ]);
        exit;
    }
    
    $user = $result->fetch_assoc();
    
    // Generar token único
    $token = bin2hex(random_bytes(32));
    
    // Crear tabla si no existe
    $createTableSql = "CREATE TABLE IF NOT EXISTS EmailPasswordTokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(128) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP NULL,
        is_used BOOLEAN DEFAULT FALSE,
        ip_address VARCHAR(45) NULL,
        
        INDEX idx_token (token),
        INDEX idx_user (user_id),
        INDEX idx_created (created_at),
        INDEX idx_used (is_used, used_at),
        
        FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $db->query($createTableSql);
    
    // Invalidar tokens anteriores del usuario
    $invalidateSql = "UPDATE EmailPasswordTokens SET is_used = 1 WHERE user_id = ? AND is_used = 0";
    $invalidateStmt = $db->prepare($invalidateSql);
    $invalidateStmt->bind_param("i", $user['id']);
    $invalidateStmt->execute();
    
    // Insertar nuevo token
    $insertSql = "INSERT INTO EmailPasswordTokens (token, user_id, ip_address) VALUES (?, ?, ?)";
    $insertStmt = $db->prepare($insertSql);
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? null;
    $insertStmt->bind_param("sis", $token, $user['id'], $clientIp);
    
    if (!$insertStmt->execute()) {
        throw new Exception("Error creating reset token");
    }
    
    // Enviar correo
    $mailer = new PFMailer();
    $emailSent = $mailer->sendPasswordResetEmail($user, $token);
    
    if ($emailSent) {
        echo json_encode([
            'success' => true,
            'message' => 'Correo de recuperación enviado exitosamente'
        ]);
    } else {
        // Eliminar token si falla el envío
        $deleteSql = "DELETE FROM EmailPasswordTokens WHERE token = ?";
        $deleteStmt = $db->prepare($deleteSql);
        $deleteStmt->bind_param("s", $token);
        $deleteStmt->execute();
        
        throw new Exception("Error al enviar correo de recuperación");
    }
    
    $db->close();
    
} catch (Exception $e) {
    error_log("Error en password reset: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error interno del servidor'
    ]);
}
?>