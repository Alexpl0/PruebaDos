<?php
include_once('../db/PFDB.php');
require_once('PasswordManager.php');
session_start();

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'You must be logged in to update your profile'
    ]);
    exit;
}

try {
    // Get JSON data from request body
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required data
    $name = trim($input['name'] ?? '');
    $current_password = $input['current_password'] ?? '';
    $new_password = $input['new_password'] ?? null;
    
    if (empty($name)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Name is required'
        ]);
        exit;
    }
    
    // Get user ID from session
    $userId = $_SESSION['user']['id'];
    
    // Connect to database
    $con = new LocalConector();
    $conex = $con->conectar();
    
    // Si el usuario está intentando cambiar la contraseña, verificar la contraseña actual
    if (!empty($current_password) && !empty($new_password)) {
        // NUEVO: Usar PasswordManager para verificar contraseña actual
        $stmt = $conex->prepare("SELECT password FROM `User` WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $stmt->bind_result($db_password);
        
        if (!$stmt->fetch() || !PasswordManager::verify($current_password, $db_password)) {
            $stmt->close();
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Current password is incorrect'
            ]);
            exit;
        }
        $stmt->close();
        
        // NUEVO: Encriptar nueva contraseña
        $encryptedNewPassword = PasswordManager::prepareForStorage($new_password);
        
        // Update name and password
        $stmt = $conex->prepare("UPDATE `User` SET name = ?, password = ? WHERE id = ?");
        $stmt->bind_param("ssi", $name, $encryptedNewPassword, $userId);
    } else {
        // Actualizar solo el nombre
        $stmt = $conex->prepare("UPDATE `User` SET name = ? WHERE id = ?");
        $stmt->bind_param("si", $name, $userId);
    }
    
    if ($stmt->execute()) {
        // Update session data
        $_SESSION['user']['name'] = $name;
        
        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update profile: ' . $stmt->error
        ]);
    }
    
    $stmt->close();
    $conex->close();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred: ' . $e->getMessage()
    ]);
}
?>