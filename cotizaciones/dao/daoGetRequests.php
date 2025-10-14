<?php
/**
 * Endpoint to get quote requests - GRAMMER Version
 * @author Alejandro Pérez (Updated for new DB schema)
 */
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
// FIX: Corrected the path to db.php, assuming 'dao' and 'db' are sibling directories.
require_once __DIR__ . '/db/db.php'; 

// Helper function to set CORS headers
function setCorsHeaders() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// Helper function for JSON responses
function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Method not allowed. Use POST.', null, 405);
}

$conex = null;

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    if (!$conex) {
        throw new Exception('Database connection failed');
    }

    $input = file_get_contents('php://input');
    $filters = json_decode($input, true) ?? [];

    $sql = "SELECT 
                sr.request_id, 
                sr.user_name, 
                sr.company_area,
                sr.request_status, 
                sr.shipping_method,
                sr.created_at, 
                sr.updated_at,
                COUNT(q.id) as quotes_count,
                COUNT(CASE WHEN q.is_selected = 1 THEN 1 END) as selected_quotes
            FROM ShippingRequests sr
            LEFT JOIN quotes q ON sr.request_id = q.request_id";

    $whereConditions = [];
    $params = [];
    $types = '';

    if (!empty($filters['status'])) {
        $whereConditions[] = "sr.request_status = ?";
        $params[] = $filters['status'];
        $types .= 's';
    }
    // ... other filters ...

    if (!empty($whereConditions)) {
        $sql .= " WHERE " . implode(" AND ", $whereConditions);
    }

    $sql .= " GROUP BY sr.request_id ORDER BY sr.created_at DESC";

    if (isset($filters['limit']) && is_numeric($filters['limit'])) {
        $sql .= " LIMIT ?";
        $params[] = intval($filters['limit']);
        $types .= 'i';
    }

    $stmt = $conex->prepare($sql);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $requests = [];
    while ($row = $result->fetch_assoc()) {
        // FIX: Restored full processing for each request row
        $requests[] = processRequestRow($row, $conex);
    }
    $stmt->close();

    sendJsonResponse(true, 'Requests retrieved successfully', [
        'requests' => $requests,
        'total' => count($requests)
    ]);

} catch (Exception $e) {
    sendJsonResponse(false, 'Error getting requests: ' . $e->getMessage(), ['filters' => $filters ?? null], 500);
} finally {
    if ($conex) {
        $conex->close();
    }
}


/**
 * Processes a request row to add detailed information.
 */
function processRequestRow($row, $conex) {
    $request = [
        'id' => (int)$row['request_id'],
        'user_name' => $row['user_name'],
        'company_area' => $row['company_area'],
        'status' => $row['request_status'],
        'shipping_method' => $row['shipping_method'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
        'quote_status' => [
            'total_quotes' => (int)$row['quotes_count'],
            'selected_quotes' => (int)$row['selected_quotes'],
            'has_quotes' => $row['quotes_count'] > 0
        ]
    ];

    if (!empty($row['shipping_method'])) {
        $methodDetails = getMethodSpecificDetails($conex, $row['request_id'], $row['shipping_method']);
        $request['method_details'] = $methodDetails;
        $request['route_info'] = generateRouteInfo($methodDetails, $row['shipping_method']);
    } else {
        $request['method_details'] = null;
        $request['route_info'] = ['origin_country' => 'N/A', 'destination_country' => 'N/A', 'is_international' => false];
    }
    return $request;
}

function getMethodSpecificDetails($conex, $requestId, $method) {
    switch ($method) {
        case 'fedex':
            return getFedexDetails($conex, $requestId);
        case 'aereo_maritimo':
            return getAereoMaritimoDetails($conex, $requestId);
        case 'nacional':
            return getNacionalDetails($conex, $requestId);
        default:
            return null;
    }
}

function getFedexDetails($conex, $requestId) {
    $stmt = $conex->prepare("SELECT * FROM FedexShipments WHERE request_id = ?");
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    $stmt->close();
    return $data;
}

function getAereoMaritimoDetails($conex, $requestId) {
    $stmt = $conex->prepare("SELECT * FROM AirSeaShipments WHERE request_id = ?");
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    $stmt->close();
    return $data;
}

function getNacionalDetails($conex, $requestId) {
    $stmt = $conex->prepare("SELECT * FROM DomesticShipments WHERE request_id = ?");
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    $stmt->close();
    return $data;
}

function generateRouteInfo($methodDetails, $shippingMethod) {
    if (!$methodDetails) {
        return ['origin_country' => 'N/A', 'destination_country' => 'N/A', 'is_international' => false];
    }
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

