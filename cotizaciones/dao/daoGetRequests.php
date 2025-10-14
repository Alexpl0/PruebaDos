<?php
/**
 * Endpoint to get quote requests - GRAMMER Version
 * @author Alejandro Pérez (Updated for QuoteResponses table)
 */
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
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

    // Updated query to use QuoteResponses instead of quotes
    $sql = "SELECT 
                sr.request_id, 
                sr.user_name, 
                sr.company_area,
                sr.request_status, 
                sr.shipping_method,
                sr.created_at, 
                sr.updated_at,
                COUNT(qr.response_id) as quotes_count,
                COUNT(CASE WHEN qr.is_selected = 1 THEN 1 END) as selected_quotes
            FROM ShippingRequests sr
            LEFT JOIN QuoteResponses qr ON sr.request_id = qr.request_id";

    $whereConditions = [];
    $params = [];
    $types = '';

    // Filter by status
    if (!empty($filters['status'])) {
        $whereConditions[] = "sr.request_status = ?";
        $params[] = $filters['status'];
        $types .= 's';
    }

    // Filter by shipping method
    if (!empty($filters['shipping_method'])) {
        $whereConditions[] = "sr.shipping_method = ?";
        $params[] = $filters['shipping_method'];
        $types .= 's';
    }

    // Filter by date range
    if (!empty($filters['date_from'])) {
        $whereConditions[] = "DATE(sr.created_at) >= ?";
        $params[] = $filters['date_from'];
        $types .= 's';
    }

    if (!empty($filters['date_to'])) {
        $whereConditions[] = "DATE(sr.created_at) <= ?";
        $params[] = $filters['date_to'];
        $types .= 's';
    }

    // Filter by specific request ID
    if (!empty($filters['id'])) {
        $whereConditions[] = "sr.request_id = ?";
        $params[] = intval($filters['id']);
        $types .= 'i';
    }

    // Filter by user name
    if (!empty($filters['user_name'])) {
        $whereConditions[] = "sr.user_name LIKE ?";
        $params[] = '%' . $filters['user_name'] . '%';
        $types .= 's';
    }

    if (!empty($whereConditions)) {
        $sql .= " WHERE " . implode(" AND ", $whereConditions);
    }

    $sql .= " GROUP BY sr.request_id ORDER BY sr.created_at DESC";

    // Apply limit
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
        $requests[] = processRequestRow($row, $conex);
    }
    $stmt->close();

    // Generate statistics
    $stats = generateStats($requests, $conex);

    sendJsonResponse(true, 'Requests retrieved successfully', [
        'requests' => $requests,
        'total' => count($requests),
        'stats' => $stats
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
        'created_at_formatted' => formatDateTime($row['created_at']),
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

function formatDateTime($datetime) {
    if (empty($datetime)) return 'N/A';
    $date = new DateTime($datetime);
    return $date->format('d/m/Y H:i');
}

/**
 * Generate statistics for the dashboard
 */
function generateStats($requests, $conex) {
    $stats = [
        'basic' => [
            'total_requests' => count($requests),
            'pending' => 0,
            'in_process' => 0,
            'completed' => 0,
            'cancelled' => 0
        ],
        'by_service_type' => [],
        'recent_activity' => [],
        'top_users' => []
    ];

    // Count by status
    foreach ($requests as $request) {
        $status = $request['status'];
        if (isset($stats['basic'][$status])) {
            $stats['basic'][$status]++;
        }
    }

    // Count by shipping method
    $methodCounts = [];
    foreach ($requests as $request) {
        $method = $request['shipping_method'];
        if (!isset($methodCounts[$method])) {
            $methodCounts[$method] = 0;
        }
        $methodCounts[$method]++;
    }

    foreach ($methodCounts as $method => $count) {
        $stats['by_service_type'][] = [
            'service_type' => $method,
            'count' => $count
        ];
    }

    // Recent activity (last 7 days)
    $recentActivity = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $dayRequests = array_filter($requests, function($r) use ($date) {
            return strpos($r['created_at'], $date) === 0;
        });
        $dayCompleted = array_filter($dayRequests, function($r) {
            return $r['status'] === 'completed';
        });
        
        $recentActivity[] = [
            'date' => $date,
            'requests' => count($dayRequests),
            'completed' => count($dayCompleted)
        ];
    }
    $stats['recent_activity'] = $recentActivity;

    // Top users
    $userCounts = [];
    foreach ($requests as $request) {
        $userName = $request['user_name'];
        if (!isset($userCounts[$userName])) {
            $userCounts[$userName] = 0;
        }
        $userCounts[$userName]++;
    }
    
    arsort($userCounts);
    $topUsers = [];
    $count = 0;
    foreach ($userCounts as $userName => $requestCount) {
        if ($count >= 5) break;
        $topUsers[] = [
            'user_name' => $userName,
            'request_count' => $requestCount
        ];
        $count++;
    }
    $stats['top_users'] = $topUsers;

    return $stats;
}