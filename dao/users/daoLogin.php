<?php
session_start();
include_once('../db/PFDB.php');
require_once('PasswordManager.php');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'status' => 'error',
            'mensaje' => 'Email and password are required',
            'message' => 'Email and password are required'
        ]);
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
        // Verificar contraseña usando PasswordManager
        $passwordMatch = false;
        
        // Si la contraseña viene encriptada del cliente, desencriptarla primero
        if (PasswordManager::isEncrypted($password)) {
            $decryptedPassword = PasswordManager::decrypt($password);
            if ($decryptedPassword !== null) {
                $passwordMatch = PasswordManager::verify($decryptedPassword, $user['password']);
            }
        } else {
            // Contraseña en texto plano
            $passwordMatch = PasswordManager::verify($password, $user['password']);
        }
        
        if ($passwordMatch) {
            
            // Almacenar datos del usuario en la sesión
            $_SESSION['user'] = [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'plant' => $user['plant'],
                'authorization_level' => $user['authorization_level'],
                'role' => $user['role']
            ];
            
            // No enviar el password de vuelta
            unset($user['password']);
            
            // Respuesta en múltiples formatos para compatibilidad
            echo json_encode([
                'success' => true,
                'status' => 'success', 
                'data' => $user,
                'user' => $user,
                'mensaje' => 'Login successful',
                'message' => 'Login successful'
            ]);
            
        } else {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'status' => 'error',
                'mensaje' => 'Invalid email or password',
                'message' => 'Invalid email or password'
            ]);
        }
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'status' => 'error',
            'mensaje' => 'Invalid email or password',
            'message' => 'Invalid email or password'
        ]);
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'mensaje' => 'Server error occurred',
        'message' => 'Server error occurred',
        'error' => $e->getMessage()
    ]);
}
?>