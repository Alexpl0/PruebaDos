<?php
require_once __DIR__ . '/../db/cors_config.php';
include_once('../db/PFDB.php');
require_once('PasswordManager.php');
session_start();

header('Content-Type: application/json');

// --- INICIO DEL BLOQUE DE SEGURIDAD REFORZADO ---

$method = $_SERVER['REQUEST_METHOD'];
$user = $_SESSION['user'] ?? null;
$userId = $user['id'] ?? null;
$authLevel = $user['authorization_level'] ?? null;

// 1. Verificación general: El usuario debe haber iniciado sesión.
if (!$user) {
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'You must be logged in to access this feature.']);
    exit;
}

// 2. Verificación para acciones de modificación (Crear, Actualizar, Borrar).
// Solo el súper usuario (ID 36) puede realizar estas acciones.
if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
    if ($userId != 36) {
        http_response_code(403); // Forbidden
        echo json_encode(['success' => false, 'message' => 'You do not have permission to modify user data.']);
        exit;
    }
}

// 3. Verificación para ver datos (GET).
// Solo los administradores (nivel > 0) pueden ver la lista de usuarios.
// El súper usuario (ID 36) está incluido si su nivel de autorización es > 0.
if ($method === 'GET' && $authLevel < 1) {
    http_response_code(403); // Forbidden
    echo json_encode(['success' => false, 'message' => 'You do not have permission to view user data.']);
    exit;
}

// --- FIN DEL BLOQUE DE SEGURIDAD ---


try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // GET - Retrieve users
    if ($method === 'GET') {
        $userPlant = $_SESSION['user']['plant']; 

        // El súper usuario (asumiendo que no tiene planta) verá a todos los usuarios.
        if (empty($userPlant) || $userId == 36) {
            $stmt = $conex->prepare("SELECT id, name, email, plant, role, authorization_level FROM `User` ORDER BY id DESC");
        } else {
            $stmt = $conex->prepare("SELECT id, name, email, plant, role, authorization_level FROM `User` WHERE plant = ? ORDER BY id DESC");
            $stmt->bind_param("s", $userPlant);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
        
        echo json_encode(['success' => true, 'data' => $users]);
    }
    
    // POST - Create a new user
    else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $required_fields = ['name', 'email', 'plant', 'role', 'authorization_level', 'password'];
        $missing_fields = [];
        
        foreach ($required_fields as $field) {
            if (!isset($input[$field]) || (is_string($input[$field]) && trim($input[$field]) === '')) {
                $missing_fields[] = $field;
            }
        }
        
        if (!empty($missing_fields)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields: ' . implode(', ', $missing_fields)]);
            exit;
        }
        
        $stmt = $conex->prepare("SELECT id FROM `User` WHERE email = ?");
        $stmt->bind_param("s", $input['email']);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows > 0) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'A user with this email already exists']);
            exit;
        }
        $stmt->close();
        
        $encryptedPassword = PasswordManager::prepareForStorage($input['password']);
        
        $stmt = $conex->prepare("INSERT INTO `User` (name, email, plant, role, password, authorization_level) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssi", $input['name'], $input['email'], $input['plant'], $input['role'], $encryptedPassword, $input['authorization_level']);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'User created successfully.', 'user_id' => $stmt->insert_id]);
        } else {
            throw new Exception("Error creating user: " . $stmt->error);
        }
    }
    
    // PUT - Update an existing user
    else if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id']) || !is_numeric($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'User ID is required and must be numeric']);
            exit;
        }
        
        $stmt = $conex->prepare("SELECT id FROM `User` WHERE id = ?");
        $stmt->bind_param("i", $input['id']);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found']);
            exit;
        }
        $stmt->close();
        
        $updateFields = [];
        $params = [];
        $types = "";
        
        if (isset($input['name'])) { $updateFields[] = "name = ?"; $params[] = $input['name']; $types .= "s"; }
        if (isset($input['email'])) { $updateFields[] = "email = ?"; $params[] = $input['email']; $types .= "s"; }
        if (isset($input['plant'])) { $updateFields[] = "plant = ?"; $params[] = $input['plant']; $types .= "s"; }
        if (isset($input['role'])) { $updateFields[] = "role = ?"; $params[] = $input['role']; $types .= "s"; }
        if (isset($input['authorization_level'])) { $updateFields[] = "authorization_level = ?"; $params[] = $input['authorization_level']; $types .= "i"; }
        
        if (empty($updateFields)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No fields to update were provided']);
            exit;
        }
        
        $params[] = $input['id'];
        $types .= "i";
        
        $sql = "UPDATE `User` SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $stmt = $conex->prepare($sql);
        
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'User updated successfully']);
        } else {
            throw new Exception("Error updating user: " . $stmt->error);
        }
    }
    
    // DELETE - Delete a user
    else if ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id']) || !is_numeric($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'User ID is required and must be numeric']);
            exit;
        }
        
        if ($input['id'] == $_SESSION['user']['id']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'You cannot delete your own account']);
            exit;
        }
        
        $stmt = $conex->prepare("DELETE FROM `User` WHERE id = ?");
        $stmt->bind_param("i", $input['id']);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
        } else {
            throw new Exception("Error deleting user: " . $stmt->error);
        }
    }
    
    else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>
