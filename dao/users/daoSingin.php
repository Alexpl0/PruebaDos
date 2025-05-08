<?php

include_once('../db/db.php');

header('Content-Type: application/json');

try {
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    $name = $input['name'] ?? '';
    $email = $input['email'] ?? '';
    $role = $input['role'] ?? '';
    $password = $input['password'] ?? '';
    $authorization_level = isset($input['authorization_level']) ? $input['authorization_level'] : null;

    // Verificar cada campo individualmente
    $missing_fields = [];
    
    if (empty($name)) {
        $missing_fields[] = 'Complete Name';
    }
    if (empty($email)) {
        $missing_fields[] = 'Email Address';
    }
    if (empty($role)) {
        $missing_fields[] = 'Role';
    }
    if (empty($password)) {
        $missing_fields[] = 'Password';
    }
    // Validación especial para authorization_level que permite el valor 0
    if (!isset($input['authorization_level']) || $authorization_level === null || $authorization_level === '') {
        $missing_fields[] = 'Authorization Level';
    }

    if (!empty($missing_fields)) {
        http_response_code(400);
        $missing_fields_str = implode(', ', $missing_fields);
        echo json_encode(['success' => false, 'mensaje' => 'The following fields are required: ' . $missing_fields_str]);
        exit;
    }

    $con = new LocalConector();
    $conex = $con->conectar();

    // Verificar si el usuario ya existe
    $stmt = $conex->prepare("SELECT id FROM `User` WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'mensaje' => 'This email is already registered']);
        $stmt->close();
        $conex->close();
        exit;
    }
    $stmt->close();

    // Asegurarnos de que authorization_level sea un entero
    $authorization_level = (int)$authorization_level;

    // Insertar nuevo usuario
    $stmt = $conex->prepare("INSERT INTO `User` (name, email, role, password, authorization_level) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssi", $name, $email, $role, $password, $authorization_level);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'mensaje' => 'User registered successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'mensaje' => 'Error registering user']);
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}