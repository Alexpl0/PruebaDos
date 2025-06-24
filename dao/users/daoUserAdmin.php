<?php
include_once('../db/PFDB.php');
require_once('PasswordManager.php');
session_start();

header('Content-Type: application/json');

// Check if user is logged in and has admin privileges
if (!isset($_SESSION['user']) || $_SESSION['user']['authorization_level'] < 1) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'You must have administrator privileges to access this feature'
    ]);
    exit;
}

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // GET - Retrieve all users
    if ($method === 'GET') {
        $stmt = $conex->prepare("SELECT * FROM `User` ORDER BY id DESC");
        $stmt->execute();
        $result = $stmt->get_result();
        
        $users = [];
        while ($row = $result->fetch_assoc()) {
            // NUEVO: Mostrar indicador de si la contraseña está encriptada
            if (PasswordManager::isEncrypted($row['password'])) {
                $row['password'] = '🔐 Encrypted (' . substr($row['password'], 0, 20) . '...)';
            } else {
                $row['password'] = '⚠️ Plain text (' . $row['password'] . ')';
            }
            $users[] = $row;
        }
        
        echo json_encode([
            'success' => true,
            'data' => $users
        ]);
    }
    
    // POST - Create a new user
    else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $required_fields = ['name', 'email', 'plant', 'role', 'password', 'authorization_level'];
        $missing_fields = [];
        
        foreach ($required_fields as $field) {
            if (!isset($input[$field]) || (is_string($input[$field]) && trim($input[$field]) === '')) {
                $missing_fields[] = $field;
            }
        }
        
        if (!empty($missing_fields)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Missing required fields: ' . implode(', ', $missing_fields)
            ]);
            exit;
        }
        
        // Check if email already exists
        $stmt = $conex->prepare("SELECT id FROM `User` WHERE email = ?");
        $stmt->bind_param("s", $input['email']);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'message' => 'A user with this email already exists'
            ]);
            exit;
        }
        $stmt->close();
        
        // NUEVO: Encriptar contraseña antes de guardar
        $encryptedPassword = PasswordManager::prepareForStorage($input['password']);
        
        // Insert new user
        $stmt = $conex->prepare("INSERT INTO `User` (name, email, plant, role, password, authorization_level) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssi", 
            $input['name'], 
            $input['email'], 
            $input['plant'],
            $input['role'], 
            $encryptedPassword,  // Usar contraseña encriptada
            $input['authorization_level']
        );
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'User created successfully with encrypted password',
                'user_id' => $stmt->insert_id
            ]);
        } else {
            throw new Exception("Error creating user: " . $stmt->error);
        }
    }
    
    // PUT - Update an existing user
    else if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Check if ID is provided
        if (!isset($input['id']) || !is_numeric($input['id'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'User ID is required and must be numeric'
            ]);
            exit;
        }
        
        // Check if user exists
        $stmt = $conex->prepare("SELECT id FROM `User` WHERE id = ?");
        $stmt->bind_param("i", $input['id']);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows === 0) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
            exit;
        }
        $stmt->close();
        
        // Prepare update statement based on provided fields
        $updateFields = [];
        $params = [];
        $types = "";
        
        if (isset($input['name']) && trim($input['name']) !== '') {
            $updateFields[] = "name = ?";
            $params[] = $input['name'];
            $types .= "s";
        }
        
        if (isset($input['email']) && trim($input['email']) !== '') {
            $updateFields[] = "email = ?";
            $params[] = $input['email'];
            $types .= "s";
        }
        
        if (isset($input['plant']) && trim($input['plant']) !== '') {
            $updateFields[] = "plant = ?";
            $params[] = $input['plant'];
            $types .= "s";
        }
        
        if (isset($input['role']) && trim($input['role']) !== '') {
            $updateFields[] = "role = ?";
            $params[] = $input['role'];
            $types .= "s";
        }
        
        // NUEVO: Manejar contraseñas encriptadas para actualización
        if (isset($input['password']) && trim($input['password']) !== '' && 
            !str_contains($input['password'], '🔐 Encrypted') && 
            !str_contains($input['password'], '⚠️ Plain text')) {

            $encryptedPassword = PasswordManager::prepareForStorage($input['password']);
            $updateFields[] = "password = ?";
            $params[] = $encryptedPassword;
            $types .= "s";
        }
        
        if (isset($input['authorization_level']) && is_numeric($input['authorization_level'])) {
            $updateFields[] = "authorization_level = ?";
            $params[] = $input['authorization_level'];
            $types .= "i";
        }
        
        if (empty($updateFields)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'No fields to update were provided'
            ]);
            exit;
        }
        
        // Add ID to params for the WHERE clause
        $params[] = $input['id'];
        $types .= "i";
        
        $sql = "UPDATE `User` SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $stmt = $conex->prepare($sql);
        
        // Dynamically bind parameters
        $bindParams = array($types);
        for ($i = 0; $i < count($params); $i++) {
            $bindParams[] = &$params[$i];
        }
        call_user_func_array(array($stmt, 'bind_param'), $bindParams);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'User updated successfully'
            ]);
        } else {
            throw new Exception("Error updating user: " . $stmt->error);
        }
    }
    
    // DELETE - Delete a user
    else if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id']) || !is_numeric($input['id'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'User ID is required and must be numeric'
            ]);
            exit;
        }
        
        // Check if user exists
        $stmt = $conex->prepare("SELECT id FROM `User` WHERE id = ?");
        $stmt->bind_param("i", $input['id']);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows === 0) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
            exit;
        }
        $stmt->close();
        
        // Prevent deleting your own account
        if ($input['id'] == $_SESSION['user']['id']) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'You cannot delete your own account'
            ]);
            exit;
        }
        
        // Delete the user
        $stmt = $conex->prepare("DELETE FROM `User` WHERE id = ?");
        $stmt->bind_param("i", $input['id']);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);
        } else {
            throw new Exception("Error deleting user: " . $stmt->error);
        }
    }
    
    else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred: ' . $e->getMessage()
    ]);
}
?>