<?php
/**
 * Endpoint to get quotes for a specific request
 * Intelligent Quoting Portal
 * @author Alejandro Pérez (Updated for QuoteResponses table)
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
    
    // Check if request exists and user has access
    $stmtReq = $conex->prepare("SELECT request_id, request_status, user_name FROM ShippingRequests WHERE request_id = ?" . $userCondition);
    $stmtReq->bind_param($types, ...$params);
    $stmtReq->execute();
    $requestResult = $stmtReq->get_result();
    $request = $requestResult->fetch_assoc();
    $stmtReq->close();

    if (!$request) {
        throw new Exception('Request not found or access denied');
    }

    // Get quotes with carrier information - Updated to use QuoteResponses
    $sql = "SELECT 
                qr.response_id, 
                qr.request_id, 
                qr.carrier_id, 
                qr.cost, 
                qr.delivery_time as estimated_delivery_time, 
                qr.is_selected, 
                qr.response_date as created_at,
                qr.pdf_url,
                qr.ia_data_json,
                c.name as carrier_name,
                c.email as carrier_email
            FROM QuoteResponses qr
            INNER JOIN Carriers c ON qr.carrier_id = c.id
            WHERE qr.request_id = ?
            ORDER BY qr.response_date ASC";
    
    $stmt = $conex->prepare($sql);
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $quotes = [];
    while ($row = $result->fetch_assoc()) {
        // Parse IA data if available
        $iaData = null;
        if (!empty($row['ia_data_json'])) {
            $iaData = json_decode($row['ia_data_json'], true);
        }

        $quotes[] = [
            'id' => (int)$row['response_id'],
            'request_id' => (int)$row['request_id'],
            'carrier_id' => (int)$row['carrier_id'],
            'carrier_name' => $row['carrier_name'],
            'carrier_email' => $row['carrier_email'],
            'cost' => (float)$row['cost'],
            'currency' => 'USD', // Default, puede ajustarse según necesidad
            'estimated_delivery_time' => $row['estimated_delivery_time'],
            'is_selected' => (bool)$row['is_selected'],
            'created_at' => $row['created_at'],
            'pdf_url' => $row['pdf_url'],
            'ia_analysis' => $iaData
        ];
    }
    $stmt->close();

    sendJsonResponse(true, 'Quotes retrieved successfully', [
        'request_info' => [
            'request_id' => (int)$request['request_id'],
            'status' => $request['request_status'],
            'user_name' => $request['user_name']
        ],
        'quotes' => $quotes,
        'total_quotes' => count($quotes)
    ]);

} catch (Exception $e) {
    sendJsonResponse(false, 'Error getting quotes: ' . $e->getMessage(), ['request_id' => $requestId ?? null], 500);
} finally {
    if ($conex) {
        $conex->close();
    }
}