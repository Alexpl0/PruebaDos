<?php
/**
 * daoPasswordReset.php - Maneja las solicitudes de reset de contraseña
 */

// Disable HTML error output for clean JSON responses
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Set JSON header immediately
header('Content-Type: application/json');

// Function to send JSON response and exit
function sendJsonResponse($success, $message, $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

// Log personalizado para debug
function debugLog($message) {
    error_log("[PASSWORD_RESET_DEBUG] " . $message);
}

debugLog("Script iniciado");

try {
    debugLog("Intentando cargar archivos requeridos");
    
    // Check if required files exist before including
    if (!file_exists('../../config.php')) {
        throw new Exception("Config file not found");
    }
    require_once('../../config.php');
    debugLog("Config.php cargado");
    
    if (!file_exists('../db/PFDB.php')) {
        throw new Exception("Database file not found");
    }
    require_once('../db/PFDB.php');
    debugLog("PFDB.php cargado");
    
    if (!file_exists('PasswordManager.php')) {
        throw new Exception("PasswordManager file not found");
    }
    require_once('PasswordManager.php');
    debugLog("PasswordManager.php cargado");

    // Verificar método
    debugLog("Método recibido: " . $_SERVER['REQUEST_METHOD']);
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonResponse(false, 'Method not allowed', 405);
    }
    
    // Obtener datos
    debugLog("Obteniendo datos del request");
    $rawInput = file_get_contents('php://input');
    debugLog("Raw input length: " . strlen($rawInput));
    
    if (empty($rawInput)) {
        sendJsonResponse(false, 'No data received', 400);
    }
    
    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        debugLog("JSON decode error: " . json_last_error_msg());
        sendJsonResponse(false, 'Invalid JSON data', 400);
    }
    
    debugLog("JSON decodificado correctamente");
    
    $email = trim($input['email'] ?? '');
    debugLog("Email extraído: " . $email);
    
    if (empty($email)) {
        sendJsonResponse(false, 'Email is required', 400);
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJsonResponse(false, 'Invalid email format', 400);
    }
    
    // Conectar a BD
    debugLog("Intentando conectar a BD");
    $con = new LocalConector();
    $db = $con->conectar();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    debugLog("Conexión a BD establecida");
    
    // Verificar si el usuario existe
    debugLog("Buscando usuario con email: " . $email);
    $sql = "SELECT id, name, email FROM User WHERE email = ? LIMIT 1";
    $stmt = $db->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $db->error);
    }
    
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    debugLog("Filas encontradas: " . $result->num_rows);
    
    if ($result->num_rows === 0) {
        $stmt->close();
        $db->close();
        // Por seguridad, no revelamos si el email existe o no
        sendJsonResponse(true, 'If the email exists in our system, you will receive a password reset link shortly.');
    }
    
    $user = $result->fetch_assoc();
    debugLog("Usuario encontrado: ID " . $user['id'] . ", Nombre: " . $user['name']);
    
    // Generar token único
    $token = bin2hex(random_bytes(32));
    debugLog("Token generado: " . substr($token, 0, 10) . "...");
    
    // Crear tabla si no existe
    debugLog("Creando tabla de tokens si no existe");
    $createTableSql = "
        CREATE TABLE IF NOT EXISTS EmailPasswordTokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(64) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_used BOOLEAN DEFAULT FALSE,
            used_at TIMESTAMP NULL,
            FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
            INDEX idx_token (token),
            INDEX idx_user_id (user_id),
            INDEX idx_created_at (created_at)
        )
    ";
    
    if (!$db->query($createTableSql)) {
        throw new Exception("Error creating tokens table: " . $db->error);
    }
    
    // Invalidar tokens anteriores del usuario
    debugLog("Invalidando tokens anteriores");
    $invalidateTokensSql = "UPDATE EmailPasswordTokens SET is_used = 1, used_at = NOW() WHERE user_id = ? AND is_used = 0";
    $invalidateStmt = $db->prepare($invalidateTokensSql);
    
    if (!$invalidateStmt) {
        throw new Exception("Failed to prepare invalidate statement: " . $db->error);
    }
    
    $invalidateStmt->bind_param("i", $user['id']);
    $invalidateStmt->execute();
    $invalidateStmt->close();
    
    // Insertar nuevo token
    debugLog("Insertando nuevo token");
    $insertTokenSql = "INSERT INTO EmailPasswordTokens (user_id, token) VALUES (?, ?)";
    $tokenStmt = $db->prepare($insertTokenSql);
    
    if (!$tokenStmt) {
        throw new Exception("Failed to prepare token statement: " . $db->error);
    }
    
    $tokenStmt->bind_param("is", $user['id'], $token);
    
    if (!$tokenStmt->execute()) {
        throw new Exception("Error saving reset token: " . $tokenStmt->error);
    }
    $tokenStmt->close();
    
    // Log de información de encriptación para debug
    debugLog("Verificando estado de encriptación de contraseñas en el sistema");
    $encryptionCheckSql = "SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN LENGTH(password) > 20 THEN 1 ELSE 0 END) as encrypted_passwords,
        SUM(CASE WHEN LENGTH(password) <= 20 THEN 1 ELSE 0 END) as plain_passwords
        FROM User";
    
    $encryptionResult = $db->query($encryptionCheckSql);
    if ($encryptionResult) {
        $encryptionStats = $encryptionResult->fetch_assoc();
        debugLog("Estadísticas de encriptación: Total usuarios: " . $encryptionStats['total_users'] . 
                ", Contraseñas encriptadas: " . $encryptionStats['encrypted_passwords'] . 
                ", Contraseñas planas: " . $encryptionStats['plain_passwords']);
    }
    
    // Construir URL de reset
    $resetUrl = URLPF . "password_reset.php?token=" . urlencode($token);
    debugLog("URL de reset generada: " . $resetUrl);
    
    // Enviar email
    debugLog("Enviando email de recuperación");
    try {
        if (!file_exists('../../mailer/PFMailer/PFMailerSender.php')) {
            throw new Exception("Mailer file not found");
        }
        require_once('../../mailer/PFMailer/PFMailerSender.php');
        
        $subject = "Password Reset Request - Premium Freight";
        $body = "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h2 style='color: #2c3e50;'>Password Reset Request</h2>
                <p>Hello " . htmlspecialchars($user['name']) . ",</p>
                <p>You have requested to reset your password for your Premium Freight account.</p>
                <p>Click the button below to reset your password:</p>
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{$resetUrl}' style='background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;'>Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style='word-break: break-all; color: #3498db;'>{$resetUrl}</p>
                <p style='color: #e74c3c; font-weight: bold;'>This link will expire in 24 hours.</p>
                <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
                <hr style='border: none; border-top: 1px solid #eee; margin: 30px 0;'>
                <p style='color: #7f8c8d; font-size: 12px;'>This is an automated message from Premium Freight System. Please do not reply to this email.</p>
            </div>
        ";
        
        $mailer = new PFMailerSender();
        $result = $mailer->sendMail($user['email'], $subject, $body);
        
        if ($result['success']) {
            debugLog("Email enviado exitosamente");
            $stmt->close();
            $db->close();
            sendJsonResponse(true, 'Password reset instructions have been sent to your email address. The link will expire in 24 hours.');
        } else {
            debugLog("Error enviando email: " . $result['message']);
            throw new Exception("Failed to send email: " . $result['message']);
        }
        
    } catch (Exception $emailError) {
        debugLog("Excepción al enviar email: " . $emailError->getMessage());
        
        // Limpiar el token si el email falló
        $deleteTokenSql = "DELETE FROM EmailPasswordTokens WHERE token = ?";
        $deleteStmt = $db->prepare($deleteTokenSql);
        if ($deleteStmt) {
            $deleteStmt->bind_param("s", $token);
            $deleteStmt->execute();
            $deleteStmt->close();
        }
        
        throw new Exception("Unable to send password reset email. Please try again later.");
    }
    
    $stmt->close();
    $db->close();
    
} catch (Exception $e) {
    debugLog("Error general: " . $e->getMessage());
    sendJsonResponse(false, 'An error occurred processing your request. Please try again later.', 500);
}
?>