<?php
/**
 * Endpoint to get user's quote history - GRAMMER Version
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
    $con = new LocalConector();
    $conex = $con->conectar();
    
    $input = file_get_contents('php://input');
    $filters = json_decode($input, true) ?? [];
    
    $userId = $_SESSION['user']['id'];
    $userName = $_SESSION['user']['name'] ?? '';

    // DB Schema Change: Updated table `ShippingRequests` and columns `request_id`, `request_status`
    $sql = "SELECT 
                sr.request_id, 
                sr.user_name, 
                sr.company_area,
                sr.request_status, 
                sr.shipping_method,
                sr.created_at, 
                sr.updated_at,
                COUNT(q.id) as quotes_count,
                COUNT(CASE WHEN q.is_selected = 1 THEN 1 END) as selected_quotes,
                MIN(q.cost) as min_quote_cost,
                MAX(q.cost) as max_quote_cost,
                AVG(q.cost) as avg_quote_cost,
                GROUP_CONCAT(DISTINCT c.name SEPARATOR ', ') as carrier_names
            FROM ShippingRequests sr
            LEFT JOIN quotes q ON sr.request_id = q.request_id
            LEFT JOIN carriers c ON q.carrier_id = c.id
            WHERE sr.user_name = ?";

    $whereConditions = [];
    $params = [$userName];
    $types = 's';

    // Apply filters
    if (!empty($filters['status'])) {
        $whereConditions[] = "sr.request_status = ?";
        $params[] = $filters['status'];
        $types .= 's';
    }
    // ... other filters ...

    if (!empty($whereConditions)) {
        $sql .= " AND " . implode(" AND ", $whereConditions);
    }

    $sql .= " GROUP BY sr.request_id ORDER BY sr.created_at DESC";

    $stmt = $conex->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $requests = [];
    while ($row = $result->fetch_assoc()) {
        $processedRequest = processUserRequestRow($row, $conex);
        $requests[] = $processedRequest;
    }
    $stmt->close();

    sendJsonResponse(true, 'User quote history retrieved successfully', [
        'requests' => $requests,
        'total' => count($requests)
    ]);

} catch (Exception $e) {
    sendJsonResponse(false, 'Error getting user quote history: ' . $e->getMessage(), null, 500);
} finally {
    if ($conex) {
        $conex->close();
    }
}

function processUserRequestRow($row, $conex) {
    $request = [
        'id' => (int)$row['request_id'], // DB Schema Change
        'user_name' => $row['user_name'],
        'company_area' => $row['company_area'],
        'status' => $row['request_status'], // DB Schema Change
        'shipping_method' => $row['shipping_method'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
        'quote_status' => [
            'total_quotes' => (int)$row['quotes_count'],
            'selected_quotes' => (int)$row['selected_quotes'],
            'min_cost' => $row['min_quote_cost'] ? (float)$row['min_quote_cost'] : null,
            'max_cost' => $row['max_quote_cost'] ? (float)$row['max_quote_cost'] : null,
            'carrier_names' => $row['carrier_names'] ?: 'No quotes yet'
        ]
    ];

    if (!empty($row['shipping_method'])) {
        // DB Schema Change: Pass new request_id
        $methodDetails = getUserMethodSpecificDetails($conex, $row['request_id'], $row['shipping_method']);
        $request['method_details'] = $methodDetails;
        $request['route_info'] = generateUserRouteInfo($methodDetails, $row['shipping_method']);
    }
    
    // DB Schema Change: Pass new request_id
    $request['quotes'] = getUserRequestQuotes($conex, $row['request_id']);

    return $request;
}

function getUserMethodSpecificDetails($conex, $requestId, $method) {
    switch ($method) {
        case 'fedex':
            return getUserFedexDetails($conex, $requestId);
        case 'aereo_maritimo':
            return getUserAereoMaritimoDetails($conex, $requestId);
        case 'nacional':
            return getUserNacionalDetails($conex, $requestId);
        default:
            return null;
    }
}

// DB Schema Change: Updated table names to `FedexShipments`, `AirSeaShipments`, `DomesticShipments`
function getUserFedexDetails($conex, $requestId) {
    $stmt = $conex->prepare("SELECT * FROM FedexShipments WHERE request_id = ?");
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->fetch_assoc();
}

function getUserAereoMaritimoDetails($conex, $requestId) {
    $stmt = $conex->prepare("SELECT * FROM AirSeaShipments WHERE request_id = ?");
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->fetch_assoc();
}

function getUserNacionalDetails($conex, $requestId) {
    $stmt = $conex->prepare("SELECT * FROM DomesticShipments WHERE request_id = ?");
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->fetch_assoc();
}

function generateUserRouteInfo($methodDetails, $shippingMethod) {
    if (!$methodDetails) {
        return ['origin_country' => 'N/A', 'destination_country' => 'N/A', 'is_international' => false];
    }
    // Logic remains the same, but relies on corrected data from new tables
    switch ($shippingMethod) {
        case 'fedex':
            return ['origin_country' => 'INTL', 'destination_country' => 'INTL', 'is_international' => true];
        case 'aereo_maritimo':
            return ['origin_country' => 'INTL', 'destination_country' => 'INTL', 'is_international' => true];
        case 'nacional':
            return ['origin_country' => 'MX', 'destination_country' => 'MX', 'is_international' => false];
        default:
            return ['origin_country' => 'N/A', 'destination_country' => 'N/A', 'is_international' => false];
    }
}

function getUserRequestQuotes($conex, $requestId) {
    $sql = "SELECT q.id, q.cost, q.currency, q.estimated_delivery_time, q.is_selected, c.name as carrier_name
            FROM quotes q
            INNER JOIN carriers c ON q.carrier_id = c.id
            WHERE q.request_id = ?
            ORDER BY q.cost ASC";
    
    $stmt = $conex->prepare($sql);
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    return $result->fetch_all(MYSQLI_ASSOC);
}

// Other helper functions like formatDateTime would remain the same
