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
    // Determine the correct path to files
    $configPath = __DIR__ . '/../../config.php';
    $dbPath = __DIR__ . '/../../mailer/PFMailer/PFDB.php';
    $passwordManagerPath = __DIR__ . '/PasswordManager.php';
    
    debugLog("Paths determined:");
    debugLog("Config: " . $configPath);
    debugLog("DB: " . $dbPath);
    debugLog("PasswordManager: " . $passwordManagerPath);
    
    // Check if required files exist before including
    if (!file_exists($configPath)) {
        debugLog("Config file not found at: " . $configPath);
        throw new Exception("Config file not found");
    }
    require_once($configPath);
    debugLog("Config.php cargado");
    
    if (!file_exists($dbPath)) {
        debugLog("DB file not found at: " . $dbPath);
        throw new Exception("Database file not found");
    }
    require_once($dbPath);
    debugLog("PFDB.php cargado");
    
    if (!file_exists($passwordManagerPath)) {
        debugLog("PasswordManager file not found at: " . $passwordManagerPath);
        throw new Exception("PasswordManager file not found");
    }
    require_once($passwordManagerPath);
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
    
    // Cerrar conexiones antes del envío de email
    $stmt->close();
    $db->close();
    
    // ✅ CORREGIDO: Enviar email usando el servidor externo del mailer
    debugLog("Enviando email de recuperación vía mailer externo");
    $emailSent = false;
    $emailError = '';
    
    try {
        // Preparar datos para el mailer externo
        $mailerData = [
            'email' => $user['email'],
            'token' => $token
        ];
        
        // Hacer llamada HTTP al endpoint del mailer externo
        $mailerUrl = URLM . 'PFmailPasswordReset.php';
        debugLog("Llamando al mailer externo: " . $mailerUrl);
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => [
                    'Content-Type: application/json',
                    'Accept: application/json'
                ],
                'content' => json_encode($mailerData),
                'timeout' => 30
            ]
        ]);
        
        $response = file_get_contents($mailerUrl, false, $context);
        
        if ($response === false) {
            throw new Exception("Failed to connect to mailer service");
        }
        
        $mailerResult = json_decode($response, true);
        
        if ($mailerResult && isset($mailerResult['success'])) {
            if ($mailerResult['success']) {
                debugLog("Email enviado exitosamente vía mailer externo");
                $emailSent = true;
            } else {
                debugLog("Error del mailer externo: " . ($mailerResult['message'] ?? 'Unknown error'));
                $emailError = $mailerResult['message'] ?? 'Mailer service error';
            }
        } else {
            throw new Exception("Invalid response from mailer service");
        }
        
    } catch (Exception $emailException) {
        debugLog("Excepción al enviar email: " . $emailException->getMessage());
        $emailError = $emailException->getMessage();
    }
    
    // Responder según el resultado del email
    if ($emailSent) {
        sendJsonResponse(true, 'Password reset instructions have been sent to your email address. The link will expire in 24 hours.');
    } else {
        // Log the error but don't reveal it to the user for security
        debugLog("Email failed to send: " . $emailError);
        
        // For now, still return success to not reveal system details
        // En producción, podrías querer manejar esto de manera diferente
        sendJsonResponse(true, 'Password reset request processed. If the email exists in our system, you will receive instructions shortly.');
    }
    
} catch (Exception $e) {
    debugLog("Error general: " . $e->getMessage());
    debugLog("Stack trace: " . $e->getTraceAsString());
    sendJsonResponse(false, 'An error occurred processing your request. Please try again later.', 500);
}
?>