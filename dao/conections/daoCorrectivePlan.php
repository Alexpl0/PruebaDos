<?php
// NUEVO: Capturar todos los errores y warnings
error_reporting(E_ALL);
ini_set('display_errors', 0); // No mostrar errores en pantalla
ini_set('log_errors', 1);

// NUEVO: Buffer de salida para evitar HTML accidental
ob_start();

require_once __DIR__ . '/../db/cors_config.php';
include_once('../db/PFDB.php');
session_start();

// Limpiar cualquier salida accidental
ob_clean();

header('Content-Type: application/json');

// Verificar autenticación
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    
    if (!$conex) {
        throw new Exception('Database connection failed');
    }
    
    $conex->set_charset("utf8mb4");

    if ($method === 'GET') {
        // NUEVO: Obtener plan correctivo por order ID
        $orderId = $_GET['order_id'] ?? null;
        
        // NUEVO: Log para debug
        error_log("CorrectivePlan GET request - Order ID: " . $orderId);
        
        if (!$orderId || !is_numeric($orderId)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Valid order ID required']);
            exit;
        }

        $stmt = $conex->prepare("
            SELECT 
                cap_id,
                premium_freight_id,
                corrective_action,
                person_responsible,
                due_date,
                status,
                comments,
                creation_date
            FROM CorrectiveActionPlan 
            WHERE premium_freight_id = ?
        ");
        
        if (!$stmt) {
            throw new Exception('Prepare statement failed: ' . $conex->error);
        }
        
        $stmt->bind_param("i", $orderId);
        
        if (!$stmt->execute()) {
            throw new Exception('Execute failed: ' . $stmt->error);
        }
        
        $result = $stmt->get_result();
        
        if ($plan = $result->fetch_assoc()) {
            error_log("CorrectivePlan: Plan found for order " . $orderId);
            echo json_encode(['success' => true, 'plan' => $plan]);
        } else {
            error_log("CorrectivePlan: No plan found for order " . $orderId);
            echo json_encode(['success' => false, 'message' => 'No corrective action plan found']);
        }
        $stmt->close();
    }
    
    elseif ($method === 'PUT') {
        // Actualizar comentarios o status
        $requestBody = file_get_contents('php://input');
        $data = json_decode($requestBody, true);
        
        if (!$data || !isset($data['cap_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'CAP ID required']);
            exit;
        }

        $capId = intval($data['cap_id']);
        
        if (isset($data['comments'])) {
            // Actualizar comentarios
            $comments = $data['comments'];
            $stmt = $conex->prepare("UPDATE CorrectiveActionPlan SET comments = ? WHERE cap_id = ?");
            
            if (!$stmt) {
                throw new Exception('Prepare statement failed: ' . $conex->error);
            }
            
            $stmt->bind_param("si", $comments, $capId);
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Comments updated successfully']);
            } else {
                throw new Exception('Failed to update comments: ' . $stmt->error);
            }
            $stmt->close();
        }
        
        if (isset($data['status'])) {
            // Actualizar status
            $status = $data['status'];
            $stmt = $conex->prepare("UPDATE CorrectiveActionPlan SET status = ? WHERE cap_id = ?");
            
            if (!$stmt) {
                throw new Exception('Prepare statement failed: ' . $conex->error);
            }
            
            $stmt->bind_param("si", $status, $capId);
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
            } else {
                throw new Exception('Failed to update status: ' . $stmt->error);
            }
            $stmt->close();
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
    $conex->close();
} catch (Exception $e) {
    error_log("CorrectivePlan error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

// NUEVO: Finalizar buffer de salida
ob_end_flush();
?>