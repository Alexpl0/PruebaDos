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
    $authorization_level = $input['authorization_level'] ?? '';

    if (!$name || !$email || !$role || !$password || !$authorization_level) {
        http_response_code(400);
        echo json_encode(['success' => false, 'mensaje' => 'Todos los campos son requeridos']);
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
        echo json_encode(['success' => false, 'mensaje' => 'El correo ya esta rergistrado']);
        $stmt->close();
        $conex->close();
        exit;
    }
    $stmt->close();

    // Insertar nuevo usuario
    $stmt = $conex->prepare("INSERT INTO `User` (name, email, role, password, authorization_level) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssi", $name, $email, $role, $password, $authorization_level);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'mensaje' => 'Usuario registrado correctamente']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'mensaje' => 'Error al registrar usuario']);
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}