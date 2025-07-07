<?php
include_once('../db/PFDB.php');
require_once('PasswordManager.php');

header('Content-Type: application/json');

try {
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $plant = trim($input['plant'] ?? '');
    $password = trim($input['password'] ?? '');
    
    // Validaciones básicas
    if (empty($name) || empty($email) || empty($plant) || empty($password)) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'mensaje' => 'All fields are required'
        ]);
        exit;
    }
    
    // Validar formato de email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'mensaje' => 'Invalid email format'
        ]);
        exit;
    }
    
    // NUEVO: Validar fortaleza de contraseña
    $passwordValidation = PasswordManager::validateStrength($password);
    if (!$passwordValidation['isValid']) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'mensaje' => $passwordValidation['message']
        ]);
        exit;
    }
    
    $con = new LocalConector();
    $conex = $con->conectar();
    
    // Verificar si el email ya existe
    $stmt = $conex->prepare("SELECT id FROM `User` WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false, 
            'mensaje' => 'Email already registered'
        ]);
        exit;
    }
    $stmt->close();
    
    // NUEVO: Encriptar contraseña antes de guardar
    $encryptedPassword = PasswordManager::prepareForStorage($password);
    
    // Insertar nuevo usuario con valores por defecto
    $stmt = $conex->prepare("INSERT INTO `User` (name, email, plant, role, password, authorization_level) VALUES (?, ?, ?, 'Worker', ?, 0)");
    $stmt->bind_param("ssss", $name, $email, $plant, $encryptedPassword);
    
    if ($stmt->execute()) {
        $userId = $stmt->insert_id;

        // Generar token de verificación
        $verificationToken = bin2hex(random_bytes(32)); // ✅ Aumentar a 32 bytes
        $insertTokenSql = "INSERT INTO EmailVerificationTokens (user_id, token, created_at) VALUES (?, ?, NOW())";
        $stmt = $conex->prepare($insertTokenSql);
        $stmt->bind_param("is", $userId, $verificationToken);
        $stmt->execute();

        // ✅ MEJORAR: Llamada al endpoint de mailer
        $endpoint = 'https://grammermx.com/Mailer/PFMailer/PFmailVerification.php';
        $data = [
            'user_id' => $userId,  // ✅ Cambiar 'userId' por 'user_id'
            'action' => 'send'     // ✅ Agregar acción específica
        ];

        $options = [
            'http' => [
                'header'  => [
                    'Content-Type: application/json',
                    'Accept: application/json',
                    'User-Agent: Premium-Freight-System/1.0'
                ],
                'method'  => 'POST',
                'content' => json_encode($data),
                'timeout' => 30,  // ✅ Agregar timeout
                'ignore_errors' => true  // ✅ Para manejar errores HTTP
            ],
        ];

        $context = stream_context_create($options);
        $response = file_get_contents($endpoint, false, $context);
        
        // ✅ MEJORAR: Verificar status HTTP
        $httpCode = null;
        if (isset($http_response_header)) {
            foreach ($http_response_header as $header) {
                if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
                    $httpCode = intval($matches[1]);
                    break;
                }
            }
        }

        if ($response === false || $httpCode >= 400) {
            // Log del error para debugging
            error_log("Failed to send verification email. HTTP Code: $httpCode, Response: $response");
            
            echo json_encode([
                'success' => true, // ✅ Usuario creado exitosamente
                'mensaje' => 'User registered successfully. Verification email will be sent shortly.',
                'user_id' => $userId,
                'email_status' => 'pending' // ✅ Indicar que el email está pendiente
            ]);
        } else {
            $emailResult = json_decode($response, true);
            
            if ($emailResult && isset($emailResult['success']) && $emailResult['success']) {
                echo json_encode([
                    'success' => true,
                    'mensaje' => 'User registered successfully. Please check your email for verification.',
                    'user_id' => $userId,
                    'email_status' => 'sent'
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'mensaje' => 'User registered successfully. Verification email will be sent shortly.',
                    'user_id' => $userId,
                    'email_status' => 'error',
                    'email_error' => $emailResult['message'] ?? 'Unknown error'
                ]);
            }
        }
    } else {
        throw new Exception("Error creating user: " . $stmt->error);
    }
    
    $stmt->close();
    $conex->close();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'mensaje' => 'Registration error: ' . $e->getMessage()
    ]);
}
?>