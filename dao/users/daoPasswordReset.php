<?php
require_once __DIR__ . '/../db/cors_config.php';
/**
 * daoPasswordReset.php - Maneja las solicitudes para iniciar el reseteo de contraseña.
 * Este script solo debe recibir un email.
 */

// Deshabilitar la salida de errores HTML para respuestas JSON limpias.
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Establecer la cabecera JSON inmediatamente.
header('Content-Type: application/json');

// Función para enviar respuestas JSON y terminar el script.
function sendJsonResponse($success, $message, $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

// Log personalizado para depuración.
function debugLog($message) {
    error_log("[PASSWORD_RESET_DEBUG] " . $message);
}

debugLog("daoPasswordReset.php: Script iniciado");

try {
    // Determinar la ruta correcta a los archivos.
    $configPath = __DIR__ . '/../../config.php';
    $dbPath = __DIR__ . '/../../mailer/PFMailer/PFDB.php';
    
    // Verificar si los archivos requeridos existen.
    if (!file_exists($configPath) || !file_exists($dbPath)) {
        throw new Exception("Archivos de configuración o base de datos no encontrados.");
    }
    require_once($configPath);
    require_once($dbPath);

    // Verificar el método de la solicitud.
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonResponse(false, 'Method Not Allowed', 405);
    }
    
    // Obtener los datos de la solicitud.
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(false, 'Invalid JSON data', 400);
    }
    
    // --- LÓGICA CORRECTA PARA SOLICITAR RESETEO ---
    // El script solo debe esperar un 'email'.
    $email = trim($input['email'] ?? '');
    
    if (empty($email)) {
        sendJsonResponse(false, 'Email is required', 400);
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJsonResponse(false, 'Invalid email format', 400);
    }
    
    // Conectar a la base de datos.
    $con = new LocalConector();
    $db = $con->conectar();
    
    // Verificar si el usuario existe.
    $sql = "SELECT id, name, email FROM User WHERE email = ? LIMIT 1";
    $stmt = $db->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Por seguridad, no revelamos si el email existe o no.
        // Se envía una respuesta exitosa genérica.
        sendJsonResponse(true, 'If the email exists in our system, you will receive a password reset link shortly.');
    }
    
    $user = $result->fetch_assoc();
    
    // Generar un token único y seguro.
    $token = bin2hex(random_bytes(32));
    
    // Crear la tabla de tokens si no existe.
    $db->query("
        CREATE TABLE IF NOT EXISTS EmailPasswordTokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(64) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_used BOOLEAN DEFAULT FALSE,
            used_at TIMESTAMP NULL,
            FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        )
    ");
    
    // Invalidar tokens anteriores del mismo usuario.
    $invalidateStmt = $db->prepare("UPDATE EmailPasswordTokens SET is_used = 1, used_at = NOW() WHERE user_id = ? AND is_used = 0");
    $invalidateStmt->bind_param("i", $user['id']);
    $invalidateStmt->execute();
    $invalidateStmt->close();
    
    // Insertar el nuevo token.
    $insertTokenSql = "INSERT INTO EmailPasswordTokens (user_id, token) VALUES (?, ?)";
    $tokenStmt = $db->prepare($insertTokenSql);
    $tokenStmt->bind_param("is", $user['id'], $token);
    $tokenStmt->execute();
    $tokenStmt->close();
    
    $stmt->close();
    $db->close();
    
    // Enviar el email usando un servicio externo (mailer).
    $emailSent = false;
    try {
        $mailerData = ['email' => $user['email'], 'token' => $token];
        $mailerUrl = URLM . 'PFmailPasswordReset.php'; // URL del servicio de correo.
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => 'Content-Type: application/json',
                'content' => json_encode($mailerData),
                'timeout' => 30
            ]
        ]);
        
        $response = file_get_contents($mailerUrl, false, $context);
        $mailerResult = json_decode($response, true);
        
        if ($mailerResult && $mailerResult['success']) {
            $emailSent = true;
        }
    } catch (Exception $e) {
        debugLog("Error al enviar email: " . $e->getMessage());
    }
    
    // Responder al cliente.
    if ($emailSent) {
        sendJsonResponse(true, 'Password reset instructions have been sent to your email address.');
    } else {
        // Aún así, enviar una respuesta genérica para no revelar fallos internos.
        sendJsonResponse(true, 'If the email exists in our system, you will receive a password reset link shortly.');
    }
    
} catch (Exception $e) {
    debugLog("Error general en daoPasswordReset.php: " . $e->getMessage());
    sendJsonResponse(false, 'An error occurred processing your request. Please try again later.', 500);
}
