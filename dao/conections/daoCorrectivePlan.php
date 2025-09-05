<?php
require_once __DIR__ . '/../db/cors_config.php';
include_once('../db/PFDB.php');
session_start();

header('Content-Type: application/json');

// --- INICIO DEL BLOQUE DE SEGURIDAD ---

$method = $_SERVER['REQUEST_METHOD'];
$user = $_SESSION['user'] ?? null;
$userId = $user['id'] ?? null;

// 1. Verificación general: El usuario debe haber iniciado sesión
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Access denied. Please log in to continue.']);
    exit;
}

// 2. Verificación para actualizaciones (PUT)
// Solo el usuario con ID 36 puede actualizar
if ($method === 'PUT') {
    if ($userId != 36) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'You do not have permission to update corrective action plans.']);
        exit;
    }
}

// --- FIN DEL BLOQUE DE SEGURIDAD ---

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // POST - Create new corrective action plan
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validar campos requeridos
        $requiredFields = ['premium_freight_id', 'corrective_action', 'person_responsible', 'due_date'];
        foreach ($requiredFields as $field) {
            if (!isset($input[$field]) || empty(trim($input[$field]))) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => ucfirst(str_replace('_', ' ', $field)) . ' is required.']);
                exit;
            }
        }
        
        // Validar que el premium_freight_id sea numérico
        if (!is_numeric($input['premium_freight_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid Premium Freight ID.']);
            exit;
        }
        
        // Validar fecha
        $dueDate = DateTime::createFromFormat('Y-m-d', $input['due_date']);
        if (!$dueDate || $dueDate->format('Y-m-d') !== $input['due_date']) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid due date format. Use YYYY-MM-DD.']);
            exit;
        }
        
        // Verificar que no existe ya un plan para esta orden
        $stmt = $conex->prepare("SELECT cap_id FROM `CorrectiveActionPlan` WHERE premium_freight_id = ?");
        $stmt->bind_param("i", $input['premium_freight_id']);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows > 0) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'A corrective action plan already exists for this order.']);
            exit;
        }
        $stmt->close();
        
        // Insertar nuevo plan
        $stmt = $conex->prepare("
            INSERT INTO `CorrectiveActionPlan` 
            (premium_freight_id, corrective_action, person_responsible, due_date, status) 
            VALUES (?, ?, ?, ?, 'On Track')
        ");
        $stmt->bind_param("isss", $input['premium_freight_id'], $input['corrective_action'], $input['person_responsible'], $input['due_date']);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true, 
                'message' => 'Corrective action plan created successfully.',
                'cap_id' => $stmt->insert_id
            ]);
        } else {
            throw new Exception("Failed to create corrective action plan.");
        }
        $stmt->close();
    }

    // PUT - Update status of corrective action plan
    else if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validar que se proporcione el ID del plan
        if (!isset($input['cap_id']) || !is_numeric($input['cap_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Plan ID is required and must be valid.']);
            exit;
        }
        
        // Verificar que el plan existe
        $stmt = $conex->prepare("SELECT cap_id FROM `CorrectiveActionPlan` WHERE cap_id = ?");
        $stmt->bind_param("i", $input['cap_id']);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Corrective action plan not found.']);
            exit;
        }
        $stmt->close();
        
        // Actualizar status si se proporciona
        if (isset($input['status'])) {
            // Solo el usuario con ID 36 puede actualizar status
            if ($userId != 36) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'You do not have permission to update status.']);
                exit;
            }
            
            // Validar que el status sea uno de los valores permitidos
            $allowedStatuses = ['On Track', 'At Risk', 'Delayed'];
            if (!in_array($input['status'], $allowedStatuses)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Invalid status. Allowed values are: On Track, At Risk, Delayed.'
                ]);
                exit;
            }
            
            $stmt = $conex->prepare("UPDATE `CorrectiveActionPlan` SET status = ? WHERE cap_id = ?");
            $stmt->bind_param("si", $input['status'], $input['cap_id']);
            
            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true, 
                    'message' => 'Status updated successfully.',
                    'new_status' => $input['status']
                ]);
            } else {
                throw new Exception("Failed to update status.");
            }
            $stmt->close();
        }
        
        // Actualizar comentarios si se proporcionan
        else if (isset($input['comments'])) {
            $stmt = $conex->prepare("UPDATE `CorrectiveActionPlan` SET comments = ? WHERE cap_id = ?");
            $stmt->bind_param("si", $input['comments'], $input['cap_id']);
            
            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true, 
                    'message' => 'Comments updated successfully.'
                ]);
            } else {
                throw new Exception("Failed to update comments.");
            }
            $stmt->close();
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No valid fields to update.']);
        }
    }
    
    // GET - Retrieve corrective action plans (opcional, por si lo necesitas)
    else if ($method === 'GET') {
        $stmt = $conex->prepare("
            SELECT 
                cap_id, 
                premium_freight_id, 
                corrective_action, 
                person_responsible, 
                due_date, 
                status, 
                creation_date 
            FROM `CorrectiveActionPlan` 
            ORDER BY creation_date DESC
        ");
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $plans = [];
        while ($row = $result->fetch_assoc()) {
            $plans[] = $row;
        }
        
        echo json_encode(['success' => true, 'data' => $plans]);
        $stmt->close();
    }
    
    else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    }
    
} catch (Exception $e) {
    error_log("CorrectivePlan error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred while processing your request. Please try again later.']);
} finally {
    if (isset($conex)) {
        $conex->close();
    }
}
?>