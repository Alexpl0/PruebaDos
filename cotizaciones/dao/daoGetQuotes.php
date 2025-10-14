<?php
/**
 * Endpoint to get quotes for a specific request
 * Intelligent Quoting Portal
 * @author Alejandro Pérez (Updated for new DB schema)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../../dao/users/auth_check.php';
require_once __DIR__ . '/db/db.php';

function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Method not allowed. Use POST.', null, 405);
}

if (!isset($_SESSION['user']) || empty($_SESSION['user']['id'])) {
    sendJsonResponse(false, 'User not authenticated', null, 401);
}

$conex = null;

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    $requestId = intval($data['request_id'] ?? 0);
    if ($requestId <= 0) {
        throw new Exception('A valid request ID is required');
    }

    $con = new LocalConector();
    $conex = $con->conectar();
    
    $userCondition = "";
    $params = [$requestId];
    $types = "i";
    
    if ($_SESSION['user']['role'] !== 'admin') {
        $userCondition = " AND user_name = ?";
        $params[] = $_SESSION['user']['name'];
        $types .= "s";
    }
    
    // DB Schema Change: Updated table `ShippingRequests` and columns `request_id`, `request_status`
    $stmtReq = $conex->prepare("SELECT request_id, request_status, user_name FROM ShippingRequests WHERE request_id = ?" . $userCondition);
    $stmtReq->bind_param($types, ...$params);
    $stmtReq->execute();
    $requestResult = $stmtReq->get_result();
    $request = $requestResult->fetch_assoc();
    $stmtReq->close();

    if (!$request) {
        throw new Exception('Request not found or access denied');
    }

    // Get quotes with carrier information
    $sql = "SELECT 
                q.id, q.request_id, q.carrier_id, q.cost, q.currency,
                q.estimated_delivery_time, q.is_selected, q.created_at,
                c.name as carrier_name
            FROM quotes q
            INNER JOIN carriers c ON q.carrier_id = c.id
            WHERE q.request_id = ?
            ORDER BY q.created_at ASC";
    
    $stmt = $conex->prepare($sql);
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $quotes = [];
    while ($row = $result->fetch_assoc()) {
        $quotes[] = $row;
    }
    $stmt->close();

    sendJsonResponse(true, 'Quotes retrieved successfully', [
        'request_info' => $request,
        'quotes' => $quotes
    ]);

} catch (Exception $e) {
    sendJsonResponse(false, 'Error getting quotes: ' . $e->getMessage(), ['request_id' => $requestId ?? null], 500);
} finally {
    if ($conex) {
        $conex->close();
    }
}
