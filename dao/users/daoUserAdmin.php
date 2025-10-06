<?php
/**
 * daoUserAdmin.php - User Administration DAO
 * 
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - Soporte para gestión de niveles de aprobación en tabla Approvers
 * - Mantiene authorization_level en tabla User para control de acceso
 */

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
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'You must be logged in to access this feature.']);
    exit;
}

// 2. Verificación para acciones de modificación (Crear, Actualizar, Borrar).
// Solo el súper usuario (ID 36) puede realizar estas acciones.
if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
    if ($userId != 36 && $userId !== 32) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'You do not have permission to modify user data.']);
        exit;
    }
}

// 3. Verificación para ver datos (GET).
// Solo los administradores (nivel > 0) pueden ver la lista de usuarios.
if ($method === 'GET' && $authLevel < 1) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'You do not have permission to view user data.']);
    exit;
}

// --- FIN DEL BLOQUE DE SEGURIDAD ---

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // ========== GET: Obtener lista de usuarios ==========
    if ($method === 'GET') {
        
        // ACTUALIZADO: Incluir información de aprobadores
        $sql = "SELECT 
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.plant,
                    u.authorization_level,
                    GROUP_CONCAT(
                        DISTINCT CONCAT(a.approval_level, ':', IFNULL(a.plant, 'REGIONAL'))
                        ORDER BY a.approval_level
                        SEPARATOR '|'
                    ) as approval_info
                FROM User u
                LEFT JOIN Approvers a ON u.id = a.user_id
                GROUP BY u.id, u.name, u.email, u.role, u.plant, u.authorization_level
                ORDER BY u.name ASC";
        
        $result = $conex->query($sql);
        
        if (!$result) {
            throw new Exception("Error fetching users: " . $conex->error);
        }
        
        $users = [];
        while ($row = $result->fetch_assoc()) {
            // Parsear información de aprobación
            $approvalLevels = [];
            if ($row['approval_info']) {
                $approvalPairs = explode('|', $row['approval_info']);
                foreach ($approvalPairs as $pair) {
                    list($level, $plant) = explode(':', $pair);
                    $approvalLevels[] = [
                        'level' => intval($level),
                        'plant' => $plant === 'REGIONAL' ? null : $plant
                    ];
                }
            }
            
            $row['approval_levels'] = $approvalLevels;
            unset($row['approval_info']); // Remover campo temporal
            
            $users[] = $row;
        }
        
        echo json_encode(['success' => true, 'users' => $users]);
    }

    // ========== POST: Crear nuevo usuario ==========
    elseif ($method === 'POST') {
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validar campos requeridos
        $requiredFields = ['name', 'email', 'password', 'role'];
        foreach ($requiredFields as $field) {
            if (!isset($input[$field]) || empty(trim($input[$field]))) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => "Field '$field' is required."]);
                exit;
            }
        }
        
        $name = trim($input['name']);
        $email = trim($input['email']);
        $password = trim($input['password']);
        $role = trim($input['role']);
        $plant = isset($input['plant']) && $input['plant'] !== '' ? trim($input['plant']) : null;
        $authLevel = isset($input['authorization_level']) ? intval($input['authorization_level']) : 0;
        
        // NUEVO: Obtener niveles de aprobación
        $approvalLevels = isset($input['approval_levels']) ? $input['approval_levels'] : [];
        
        // Validar email único
        $stmt = $conex->prepare("SELECT id FROM User WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows > 0) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Email already exists.']);
            exit;
        }
        $stmt->close();
        
        // Hash de contraseña
        $hashedPassword = PasswordManager::hashPassword($password);
        
        // Iniciar transacción
        $conex->begin_transaction();
        
        try {
            // Insertar usuario
            $stmt = $conex->prepare("INSERT INTO User (name, email, password, role, plant, authorization_level) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sssssi", $name, $email, $hashedPassword, $role, $plant, $authLevel);
            
            if (!$stmt->execute()) {
                throw new Exception("Error creating user: " . $stmt->error);
            }
            
            $newUserId = $conex->insert_id;
            $stmt->close();
            
            // NUEVO: Insertar niveles de aprobación si existen
            if (!empty($approvalLevels) && is_array($approvalLevels)) {
                $stmt = $conex->prepare("INSERT INTO Approvers (user_id, approval_level, plant) VALUES (?, ?, ?)");
                
                foreach ($approvalLevels as $approvalInfo) {
                    if (!isset($approvalInfo['level'])) continue;
                    
                    $approvalLevel = intval($approvalInfo['level']);
                    $approvalPlant = isset($approvalInfo['plant']) && $approvalInfo['plant'] !== '' ? trim($approvalInfo['plant']) : null;
                    
                    $stmt->bind_param("iis", $newUserId, $approvalLevel, $approvalPlant);
                    
                    if (!$stmt->execute()) {
                        throw new Exception("Error creating approval level: " . $stmt->error);
                    }
                }
                
                $stmt->close();
            }
            
            $conex->commit();
            
            echo json_encode([
                'success' => true, 
                'message' => 'User created successfully.',
                'user_id' => $newUserId
            ]);
            
        } catch (Exception $e) {
            $conex->rollback();
            throw $e;
        }
    }

    // ========== PUT: Actualizar usuario existente ==========
    elseif ($method === 'PUT') {
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id']) || !is_numeric($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'User ID is required.']);
            exit;
        }
        
        $updateUserId = intval($input['id']);
        
        // Construir query de actualización dinámica
        $updates = [];
        $types = "";
        $values = [];
        
        if (isset($input['name']) && !empty(trim($input['name']))) {
            $updates[] = "name = ?";
            $types .= "s";
            $values[] = trim($input['name']);
        }
        
        if (isset($input['email']) && !empty(trim($input['email']))) {
            $email = trim($input['email']);
            
            // Verificar que el email no esté en uso por otro usuario
            $stmt = $conex->prepare("SELECT id FROM User WHERE email = ? AND id != ?");
            $stmt->bind_param("si", $email, $updateUserId);
            $stmt->execute();
            $stmt->store_result();
            
            if ($stmt->num_rows > 0) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Email already in use by another user.']);
                exit;
            }
            $stmt->close();
            
            $updates[] = "email = ?";
            $types .= "s";
            $values[] = $email;
        }
        
        if (isset($input['role']) && !empty(trim($input['role']))) {
            $updates[] = "role = ?";
            $types .= "s";
            $values[] = trim($input['role']);
        }
        
        if (isset($input['plant'])) {
            $updates[] = "plant = ?";
            $types .= "s";
            $values[] = $input['plant'] !== '' ? trim($input['plant']) : null;
        }
        
        if (isset($input['authorization_level'])) {
            $updates[] = "authorization_level = ?";
            $types .= "i";
            $values[] = intval($input['authorization_level']);
        }
        
        // Actualizar contraseña si se proporciona
        if (isset($input['password']) && !empty(trim($input['password']))) {
            $hashedPassword = PasswordManager::hashPassword(trim($input['password']));
            $updates[] = "password = ?";
            $types .= "s";
            $values[] = $hashedPassword;
        }
        
        // NUEVO: Manejar niveles de aprobación
        $approvalLevels = isset($input['approval_levels']) ? $input['approval_levels'] : null;
        
        // Iniciar transacción
        $conex->begin_transaction();
        
        try {
            // Actualizar datos del usuario si hay cambios
            if (!empty($updates)) {
                $sql = "UPDATE User SET " . implode(", ", $updates) . " WHERE id = ?";
                $types .= "i";
                $values[] = $updateUserId;
                
                $stmt = $conex->prepare($sql);
                $stmt->bind_param($types, ...$values);
                
                if (!$stmt->execute()) {
                    throw new Exception("Error updating user: " . $stmt->error);
                }
                $stmt->close();
            }
            
            // NUEVO: Actualizar niveles de aprobación si se proporcionan
            if ($approvalLevels !== null && is_array($approvalLevels)) {
                // Eliminar niveles existentes
                $stmt = $conex->prepare("DELETE FROM Approvers WHERE user_id = ?");
                $stmt->bind_param("i", $updateUserId);
                $stmt->execute();
                $stmt->close();
                
                // Insertar nuevos niveles
                if (!empty($approvalLevels)) {
                    $stmt = $conex->prepare("INSERT INTO Approvers (user_id, approval_level, plant) VALUES (?, ?, ?)");
                    
                    foreach ($approvalLevels as $approvalInfo) {
                        if (!isset($approvalInfo['level'])) continue;
                        
                        $approvalLevel = intval($approvalInfo['level']);
                        $approvalPlant = isset($approvalInfo['plant']) && $approvalInfo['plant'] !== '' ? trim($approvalInfo['plant']) : null;
                        
                        $stmt->bind_param("iis", $updateUserId, $approvalLevel, $approvalPlant);
                        
                        if (!$stmt->execute()) {
                            throw new Exception("Error updating approval level: " . $stmt->error);
                        }
                    }
                    
                    $stmt->close();
                }
            }
            
            $conex->commit();
            
            echo json_encode(['success' => true, 'message' => 'User updated successfully.']);
            
        } catch (Exception $e) {
            $conex->rollback();
            throw $e;
        }
    }

    // ========== DELETE: Eliminar usuario ==========
    elseif ($method === 'DELETE') {
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['id']) || !is_numeric($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'User ID is required.']);
            exit;
        }
        
        $deleteUserId = intval($input['id']);
        
        // No permitir eliminar al usuario 36 (súper admin)
        if ($deleteUserId == 36) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Cannot delete super admin user.']);
            exit;
        }
        
        // Iniciar transacción
        $conex->begin_transaction();
        
        try {
            // NUEVO: Eliminar niveles de aprobación primero (FK constraint)
            $stmt = $conex->prepare("DELETE FROM Approvers WHERE user_id = ?");
            $stmt->bind_param("i", $deleteUserId);
            
            if (!$stmt->execute()) {
                throw new Exception("Error deleting approval levels: " . $stmt->error);
            }
            $stmt->close();
            
            // Eliminar usuario
            $stmt = $conex->prepare("DELETE FROM User WHERE id = ?");
            $stmt->bind_param("i", $deleteUserId);
            
            if (!$stmt->execute()) {
                throw new Exception("Error deleting user: " . $stmt->error);
            }
            
            if ($stmt->affected_rows === 0) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'User not found.']);
                exit;
            }
            
            $stmt->close();
            
            $conex->commit();
            
            echo json_encode(['success' => true, 'message' => 'User deleted successfully.']);
            
        } catch (Exception $e) {
            $conex->rollback();
            throw $e;
        }
    }

    $conex->close();
    
} catch (Exception $e) {
    error_log("Error in daoUserAdmin: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Internal server error: ' . $e->getMessage()]);
}
?>