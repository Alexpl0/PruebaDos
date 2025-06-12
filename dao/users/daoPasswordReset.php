<?php
/**
 * daoPasswordReset.php - Maneja las solicitudes de reset de contraseña
 */

// Agregar debug al inicio
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Log personalizado para debug
function debugLog($message) {
    error_log("[PASSWORD_RESET_DEBUG] " . $message);
}

debugLog("Script iniciado");

try {
    debugLog("Intentando cargar archivos requeridos");
    
    require_once('../../config.php');
    debugLog("Config.php cargado");
    
    require_once('../../db/PFDB.php');
    debugLog("PFDB.php cargado");
    
    require_once('../../mailer/PFMailer/PFmailer.php');
    debugLog("PFmailer.php cargado");

    header('Content-Type: application/json');
    debugLog("Headers establecidos");

    // Verificar método
    debugLog("Método recibido: " . $_SERVER['REQUEST_METHOD']);
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        debugLog("Método no es POST, terminando");
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
        exit;
    }
    
    // Obtener datos
    debugLog("Obteniendo datos del request");
    $rawInput = file_get_contents('php://input');
    debugLog("Raw input: " . $rawInput);
    
    $input = json_decode($rawInput, true);
    debugLog("JSON decodificado: " . json_encode($input));
    
    $email = trim($input['email'] ?? '');
    debugLog("Email extraído: " . $email);
    
    if (empty($email)) {
        debugLog("Email vacío");
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email requerido']);
        exit;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        debugLog("Email inválido: " . $email);
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email inválido']);
        exit;
    }
    
    // Conectar a BD
    debugLog("Intentando conectar a BD");
    $con = new LocalConector();
    $db = $con->conectar();
    debugLog("Conexión a BD establecida");
    
    // Verificar si el usuario existe
    debugLog("Buscando usuario con email: " . $email);
    $sql = "SELECT id, name, email FROM User WHERE email = ? LIMIT 1";
    $stmt = $db->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    debugLog("Filas encontradas: " . $result->num_rows);
    
    if ($result->num_rows === 0) {
        debugLog("Usuario no encontrado, enviando respuesta de seguridad");
        echo json_encode([
            'success' => true, 
            'message' => 'Si el email existe, se enviará un correo de recuperación'
        ]);
        exit;
    }
    
    $user = $result->fetch_assoc();
    debugLog("Usuario encontrado: ID " . $user['id'] . ", Nombre: " . $user['name']);
    
    // Generar token único
    $token = bin2hex(random_bytes(32));
    debugLog("Token generado: " . substr($token, 0, 10) . "...");
    
    // Crear tabla si no existe
    debugLog("Creando tabla si no existe");
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
    
    $tableResult = $db->query($createTableSql);
    debugLog("Resultado creación tabla: " . ($tableResult ? "exitoso" : "falló"));
    
    // Invalidar tokens anteriores del usuario
    debugLog("Invalidando tokens anteriores del usuario");
    $invalidateSql = "UPDATE EmailPasswordTokens SET is_used = 1 WHERE user_id = ? AND is_used = 0";
    $invalidateStmt = $db->prepare($invalidateSql);
    $invalidateStmt->bind_param("i", $user['id']);
    $invalidateResult = $invalidateStmt->execute();
    debugLog("Tokens invalidados: " . ($invalidateResult ? "exitoso" : "falló"));
    
    // Insertar nuevo token
    debugLog("Insertando nuevo token");
    $insertSql = "INSERT INTO EmailPasswordTokens (token, user_id, ip_address) VALUES (?, ?, ?)";
    $insertStmt = $db->prepare($insertSql);
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? null;
    debugLog("IP del cliente: " . ($clientIp ?: "no disponible"));
    $insertStmt->bind_param("sis", $token, $user['id'], $clientIp);
    
    if (!$insertStmt->execute()) {
        debugLog("Error al insertar token: " . $insertStmt->error);
        throw new Exception("Error creating reset token");
    }
    debugLog("Token insertado exitosamente");
    
    // Enviar correo
    debugLog("Creando instancia de PFMailer");
    $mailer = new PFMailer();
    debugLog("PFMailer creado, enviando email");
    
    $emailSent = $mailer->sendPasswordResetEmail($user, $token);
    debugLog("Resultado envío email: " . ($emailSent ? "exitoso" : "falló"));
    
    if ($emailSent) {
        debugLog("Email enviado exitosamente, enviando respuesta");
        echo json_encode([
            'success' => true,
            'message' => 'Correo de recuperación enviado exitosamente'
        ]);
    } else {
        debugLog("Fallo en envío de email, eliminando token");
        // Eliminar token si falla el envío
        $deleteSql = "DELETE FROM EmailPasswordTokens WHERE token = ?";
        $deleteStmt = $db->prepare($deleteSql);
        $deleteStmt->bind_param("s", $token);
        $deleteStmt->execute();
        
        throw new Exception("Error al enviar correo de recuperación");
    }
    
    $db->close();
    debugLog("Script completado exitosamente");
    
} catch (Exception $e) {
    debugLog("EXCEPCIÓN CAPTURADA: " . $e->getMessage());
    debugLog("Archivo: " . $e->getFile());
    debugLog("Línea: " . $e->getLine());
    debugLog("Stack trace: " . $e->getTraceAsString());
    
    error_log("Error en password reset: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error interno del servidor',
        'debug' => $e->getMessage() // Solo para desarrollo
    ]);
}
?>