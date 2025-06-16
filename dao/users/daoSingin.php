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
    $stmt = $conex->prepare("INSERT INTO `User` (name, email, plant, role, password, authorization_level) VALUES (?, ?, ?, 'User', ?, 0)");
    $stmt->bind_param("ssss", $name, $email, $plant, $encryptedPassword);
    
    if ($stmt->execute()) {
        $userId = $stmt->insert_id;
        
        echo json_encode([
            'success' => true,
            'mensaje' => 'User registered successfully with encrypted password',
            'user_id' => $userId
        ]);
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