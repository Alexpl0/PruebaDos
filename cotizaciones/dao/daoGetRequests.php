<?php
/**
 * Endpoint to get quote requests - GRAMMER Version
 * @author Alejandro Pérez (Updated for new DB schema)
 */

require_once __DIR__ . '/config.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Method not allowed. Use POST.', null, 405);
}

$conex = null;

try {
    $conex = getDbConnection();
    if (!$conex) {
        throw new Exception('Database connection failed');
    }

    $input = file_get_contents('php://input');
    $filters = json_decode($input, true) ?? [];

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

    if (!empty($filters['shipping_method'])) {
        $whereConditions[] = "sr.shipping_method = ?";
        $params[] = $filters['shipping_method'];
        $types .= 's';
    }
    
    if (!empty($filters['user_name'])) {
        $whereConditions[] = "sr.user_name LIKE ?";
        $params[] = '%' . $filters['user_name'] . '%';
        $types .= 's';
    }

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

    if (!empty($filters['id'])) {
        $whereConditions[] = "sr.request_id = ?";
        $params[] = $filters['id'];
        $types .= 'i';
    }

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
        $processedRequest = processRequestRow($row, $conex);
        $requests[] = $processedRequest;
    }
    $stmt->close();

    $stats = [];
    if (empty($filters['id'])) {
        $stats = generateRequestStats($conex, $filters);
    }

    sendJsonResponse(true, 'Requests retrieved successfully', [
        'requests' => $requests,
        'total' => count($requests),
        'stats' => $stats
    ]);

} catch (Exception $e) {
    writeLog('error', 'Error getting requests: ' . $e->getMessage(), $filters ?? []);
    sendJsonResponse(false, 'Error getting requests: ' . $e->getMessage(), ['filters' => $filters ?? null], 500);
} finally {
    if ($conex) {
        $conex->close();
    }
}

function processRequestRow($row, $conex) {
    $request = [
        'id' => (int)$row['request_id'], // DB Schema Change
        'user_name' => $row['user_name'],
        'company_area' => $row['company_area'],
        'status' => $row['request_status'], // DB Schema Change
        'shipping_method' => $row['shipping_method'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
        'created_at_formatted' => formatDateTime($row['created_at']),
        'updated_at_formatted' => formatDateTime($row['updated_at']),
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

// DB Schema Change: Updated table names to `FedexShipments`, `AirSeaShipments`, `DomesticShipments`
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
            return ['origin_country' => extractCountryFromAddress($methodDetails['origin_address']), 'destination_country' => extractCountryFromAddress($methodDetails['destination_address']), 'is_international' => true];
        case 'aereo_maritimo':
            return ['origin_country' => extractCountryFromAddress($methodDetails['pickup_address']), 'destination_country' => extractCountryFromAddress($methodDetails['delivery_place']), 'is_international' => true];
        case 'nacional':
            return ['origin_country' => 'MX', 'destination_country' => 'MX', 'is_international' => false];
        default:
            return ['origin_country' => 'N/A', 'destination_country' => 'N/A', 'is_international' => false];
    }
}

function extractCountryFromAddress($address) {
    if (empty($address)) return 'N/A';
    $address_lower = strtolower($address);
    if (strpos($address_lower, 'méxico') !== false || strpos($address_lower, 'mexico') !== false) return 'MX';
    if (strpos($address_lower, 'estados unidos') !== false || strpos($address_lower, 'usa') !== false) return 'US';
    return 'INTL';
}

// DB Schema Change: Updated table `ShippingRequests` and column `request_status` in stats functions
function generateRequestStats($conex, $filters = []) {
    // Functions getBasicStats, getMethodStats, etc., need to be updated as well.
    // This is a sample of the required change.
    return [
        'basic' => getBasicStats($conex, $filters),
        // ... other stats
    ];
}

function getBasicStats($conex, $filters) {
    $whereClause = buildWhereClause($filters);
    $sql = "SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN request_status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN request_status = 'in_process' THEN 1 END) as in_process,
                COUNT(CASE WHEN request_status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN request_status = 'cancelled' THEN 1 END) as cancelled
            FROM ShippingRequests" . $whereClause['sql'];
    
    $stmt = $conex->prepare($sql);
    if (!empty($whereClause['params'])) {
        $stmt->bind_param($whereClause['types'], ...$whereClause['params']);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $stats = $result->fetch_assoc();
    $stmt->close();
    return $stats;
}

function buildWhereClause($filters) {
    $conditions = [];
    $params = [];
    $types = '';
    
    if (!empty($filters['status'])) {
        $conditions[] = "request_status = ?"; // DB Schema Change
        $params[] = $filters['status'];
        $types .= 's';
    }
    // ... other filters
    
    $sql = '';
    if (!empty($conditions)) {
        $sql = " WHERE " . implode(" AND ", $conditions);
    }
    
    return ['sql' => $sql, 'params' => $params, 'types' => $types];
}

function formatDateTime($datetime) {
    if (!$datetime) return '';
    $date = new DateTime($datetime);
    $date->setTimezone(new DateTimeZone(TIMEZONE));
    return $date->format('d/m/Y H:i');
}
