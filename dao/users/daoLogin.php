<?php

include_once('../db/PFDB.php');

header('Content-Type: application/json');

try {
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['success' => false, 'mensaje' => 'Email and password are required']);
        exit;
    }

    $con = new LocalConector();
    $conex = $con->conectar();

    // Buscar usuario por email
    $stmt = $conex->prepare("SELECT * FROM `User` WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        // Comparar contraseñas (en producción usa hash)
        if ($user['password'] === $password) {
            unset($user['password']); // No enviar el password de vuelta
            // Almacenar datos del usuario en la sesión
            $_SESSION['user'] = [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'plant' => $user['plant'], // Asegurarse de que este campo exista y tenga datos
                'authorization_level' => $user['authorization_level'],
                'role' => $user['role']
            ];
            echo json_encode(['status' => 'success', 'data' => $user]);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'mensaje' => 'Incorrect credentials']);
        }
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'mensaje' => 'User not found']);
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}