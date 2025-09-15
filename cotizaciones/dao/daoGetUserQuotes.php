<?php
/**
 * Endpoint to get user's quote history - GRAMMER Version
 * Returns all requests and quotes for the authenticated user
 * @author Alejandro Pérez
 */

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/users/auth_check.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Method not allowed. Use POST.', null, 405);
}

// Check if user is authenticated
if (!isset($_SESSION['user']) || empty($_SESSION['user']['id'])) {
    sendJsonResponse(false, 'User not authenticated', null, 401);
}

$conex = null;

try {
    $conex = getDbConnection();
    if (!$conex) {
        throw new Exception('Database connection failed');
    }

    $input = file_get_contents('php://input');
    $filters = json_decode($input, true) ?? [];
    
    $userId = $_SESSION['user']['id'];
    $userName = $_SESSION['user']['name'] ?? '';

    // Base query to get user's requests with quote counts
    $sql = "SELECT 
                sr.id, 
                sr.internal_reference,
                sr.user_name, 
                sr.company_area,
                sr.status, 
                sr.shipping_method,
                sr.service_type,
                sr.created_at, 
                sr.updated_at,
                COUNT(q.id) as quotes_count,
                COUNT(CASE WHEN q.is_selected = 1 THEN 1 END) as selected_quotes,
                MIN(q.cost) as min_quote_cost,
                MAX(q.cost) as max_quote_cost,
                AVG(q.cost) as avg_quote_cost,
                GROUP_CONCAT(DISTINCT c.name SEPARATOR ', ') as carrier_names
            FROM shipping_requests sr
            LEFT JOIN quotes q ON sr.id = q.request_id
            LEFT JOIN carriers c ON q.carrier_id = c.id
            WHERE sr.user_name = ?";

    $whereConditions = [];
    $params = [$userName];
    $types = 's';

    // Apply additional filters
    if (!empty($filters['status'])) {
        $whereConditions[] = "sr.status = ?";
        $params[] = $filters['status'];
        $types .= 's';
    }

    if (!empty($filters['shipping_method'])) {
        $whereConditions[] = "sr.shipping_method = ?";
        $params[] = $filters['shipping_method'];
        $types .= 's';
    }

    if (!empty($filters['service_type'])) {
        $whereConditions[] = "sr.service_type = ?";
        $params[] = $filters['service_type'];
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

    if (!empty($filters['has_quotes'])) {
        if ($filters['has_quotes'] === 'true') {
            $whereConditions[] = "EXISTS (SELECT 1 FROM quotes WHERE request_id = sr.id)";
        } else {
            $whereConditions[] = "NOT EXISTS (SELECT 1 FROM quotes WHERE request_id = sr.id)";
        }
    }

    // Add additional WHERE conditions
    if (!empty($whereConditions)) {
        $sql .= " AND " . implode(" AND ", $whereConditions);
    }

    $sql .= " GROUP BY sr.id ORDER BY sr.created_at DESC";

    // Add LIMIT if specified
    if (isset($filters['limit']) && is_numeric($filters['limit'])) {
        $sql .= " LIMIT ?";
        $params[] = intval($filters['limit']);
        $types .= 'i';
    }

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

    // Generate user-specific statistics
    $stats = generateUserStats($conex, $userName, $filters);

    sendJsonResponse(true, 'User quote history retrieved successfully', [
        'requests' => $requests,
        'total' => count($requests),
        'user_info' => [
            'id' => $userId,
            'name' => $userName,
            'email' => $_SESSION['user']['email'] ?? '',
            'role' => $_SESSION['user']['role'] ?? ''
        ],
        'stats' => $stats
    ]);

} catch (Exception $e) {
    writeLog('error', 'Error getting user quotes: ' . $e->getMessage(), ['user_id' => $userId ?? null]);
    sendJsonResponse(false, 'Error getting user quote history: ' . $e->getMessage(), null, 500);
} finally {
    if ($conex) {
        $conex->close();
    }
}

/**
 * Process user request row for response format
 */
function processUserRequestRow($row, $conex) {
    $request = [
        'id' => (int)$row['id'],
        'internal_reference' => $row['internal_reference'],
        'user_name' => $row['user_name'],
        'company_area' => $row['company_area'],
        'status' => $row['status'],
        'shipping_method' => $row['shipping_method'],
        'service_type' => $row['service_type'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
        'created_at_formatted' => formatDateTime($row['created_at']),
        'updated_at_formatted' => formatDateTime($row['updated_at']),
        'quote_status' => [
            'total_quotes' => (int)$row['quotes_count'],
            'selected_quotes' => (int)$row['selected_quotes'],
            'has_quotes' => $row['quotes_count'] > 0,
            'min_cost' => $row['min_quote_cost'] ? (float)$row['min_quote_cost'] : null,
            'max_cost' => $row['max_quote_cost'] ? (float)$row['max_quote_cost'] : null,
            'avg_cost' => $row['avg_quote_cost'] ? (float)$row['avg_quote_cost'] : null,
            'carrier_names' => $row['carrier_names'] ?: 'No quotes yet'
        ]
    ];

    // Get method-specific details
    if (!empty($row['shipping_method'])) {
        $methodDetails = getUserMethodSpecificDetails($conex, $row['id'], $row['shipping_method']);
        $request['method_details'] = $methodDetails;
        
        // Generate route info based on method
        $request['route_info'] = generateUserRouteInfo($methodDetails, $row['shipping_method']);
    } else {
        $request['method_details'] = null;
        $request['route_info'] = [
            'origin_country' => 'N/A',
            'destination_country' => 'N/A',
            'is_international' => false
        ];
    }

    // Get detailed quotes for this request
    $request['quotes'] = getUserRequestQuotes($conex, $row['id']);

    return $request;
}

/**
 * Get method-specific details for user requests
 */
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

/**
 * Get Fedex details for user request
 */
function getUserFedexDetails($conex, $requestId) {
    $stmt = $conex->prepare("SELECT * FROM fedex_requests WHERE request_id = ?");
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    $stmt->close();
    
    return $data;
}

/**
 * Get Air-Sea details for user request
 */
function getUserAereoMaritimoDetails($conex, $requestId) {
    $stmt = $conex->prepare("SELECT * FROM aereo_maritimo_requests WHERE request_id = ?");
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    $stmt->close();
    
    return $data;
}

/**
 * Get Domestic details for user request
 */
function getUserNacionalDetails($conex, $requestId) {
    $stmt = $conex->prepare("SELECT * FROM nacional_requests WHERE request_id = ?");
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    $stmt->close();
    
    return $data;
}

/**
 * Generate route info for user requests
 */
function generateUserRouteInfo($methodDetails, $shippingMethod) {
    if (!$methodDetails) {
        return [
            'origin_country' => 'N/A',
            'destination_country' => 'N/A',
            'is_international' => false
        ];
    }

    switch ($shippingMethod) {
        case 'fedex':
            return [
                'origin_country' => extractCountryFromAddress($methodDetails['origin_address']),
                'destination_country' => extractCountryFromAddress($methodDetails['destination_address']),
                'is_international' => true
            ];
            
        case 'aereo_maritimo':
            return [
                'origin_country' => extractCountryFromAddress($methodDetails['pickup_address']),
                'destination_country' => extractCountryFromAddress($methodDetails['delivery_place']),
                'is_international' => true
            ];
            
        case 'nacional':
            return [
                'origin_country' => 'MX',
                'destination_country' => 'MX',
                'is_international' => false
            ];
            
        default:
            return [
                'origin_country' => 'N/A',
                'destination_country' => 'N/A',  
                'is_international' => false
            ];
    }
}

/**
 * Get detailed quotes for a specific request
 */
function getUserRequestQuotes($conex, $requestId) {
    $sql = "SELECT 
                q.id, q.request_id, q.carrier_id, q.cost, q.currency,
                q.estimated_delivery_time, q.is_selected, q.created_at,
                c.name as carrier_name, c.email as carrier_email
            FROM quotes q
            INNER JOIN carriers c ON q.carrier_id = c.id
            WHERE q.request_id = ?
            ORDER BY q.cost ASC";
    
    $stmt = $conex->prepare($sql);
    $stmt->bind_param("i", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $quotes = [];
    while ($row = $result->fetch_assoc()) {
        $quotes[] = [
            'id' => (int)$row['id'],
            'cost' => (float)$row['cost'],
            'currency' => $row['currency'],
            'estimated_delivery_time' => $row['estimated_delivery_time'],
            'is_selected' => (bool)$row['is_selected'],
            'created_at' => $row['created_at'],
            'created_at_formatted' => formatDateTime($row['created_at']),
            'carrier' => [
                'id' => (int)$row['carrier_id'],
                'name' => $row['carrier_name'],
                'email' => $row['carrier_email']
            ]
        ];
    }
    $stmt->close();
    
    return $quotes;
}

/**
 * Generate user-specific statistics
 */
function generateUserStats($conex, $userName, $filters = []) {
    $stats = [];
    
    try {
        // Basic user stats
        $basicStats = getUserBasicStats($conex, $userName, $filters);
        $stats['basic'] = $basicStats;
        
        // Monthly activity
        $monthlyActivity = getUserMonthlyActivity($conex, $userName);
        $stats['monthly_activity'] = $monthlyActivity;
        
        // Method distribution
        $methodStats = getUserMethodStats($conex, $userName);
        $stats['method_distribution'] = $methodStats;
        
        // Quote response analysis
        $quoteAnalysis = getUserQuoteAnalysis($conex, $userName);
        $stats['quote_analysis'] = $quoteAnalysis;
        
    } catch (Exception $e) {
        writeLog('warning', 'Error generating user stats: ' . $e->getMessage());
        $stats['error'] = 'Stats not available';
    }
    
    return $stats;
}

/**
 * Get basic user statistics
 */
function getUserBasicStats($conex, $userName, $filters) {
    $whereClause = buildUserWhereClause($userName, $filters);
    
    $sql = "SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'quoting' THEN 1 END) as quoting,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled,
                AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100 as success_rate
            FROM shipping_requests" . $whereClause['sql'];
    
    $stmt = $conex->prepare($sql);
    if (!empty($whereClause['params'])) {
        $stmt->bind_param($whereClause['types'], ...$whereClause['params']);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $stats = $result->fetch_assoc();
    $stmt->close();
    
    // Get quote statistics
    $quoteSql = "SELECT 
                    COUNT(q.id) as total_quotes_received,
                    COUNT(CASE WHEN q.is_selected = 1 THEN 1 END) as total_quotes_selected,
                    AVG(q.cost) as avg_quote_cost,
                    MIN(q.cost) as min_quote_cost,
                    MAX(q.cost) as max_quote_cost
                 FROM quotes q
                 INNER JOIN shipping_requests sr ON q.request_id = sr.id
                 WHERE sr.user_name = ?";
    
    $quoteStmt = $conex->prepare($quoteSql);
    $quoteStmt->bind_param("s", $userName);
    $quoteStmt->execute();
    $quoteResult = $quoteStmt->get_result();
    $quoteStats = $quoteResult->fetch_assoc();
    $quoteStmt->close();
    
    return array_merge($stats, $quoteStats);
}

/**
 * Get user monthly activity
 */
function getUserMonthlyActivity($conex, $userName) {
    $sql = "SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as requests,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
            FROM shipping_requests 
            WHERE user_name = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
            LIMIT 12";
    
    $stmt = $conex->prepare($sql);
    $stmt->bind_param("s", $userName);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $activity = [];
    while ($row = $result->fetch_assoc()) {
        $activity[] = $row;
    }
    $stmt->close();
    
    return $activity;
}

/**
 * Get user method statistics
 */
function getUserMethodStats($conex, $userName) {
    $sql = "SELECT 
                shipping_method,
                COUNT(*) as count,
                AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100 as success_rate
            FROM shipping_requests
            WHERE user_name = ?
            GROUP BY shipping_method";
    
    $stmt = $conex->prepare($sql);
    $stmt->bind_param("s", $userName);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $stats = [];
    while ($row = $result->fetch_assoc()) {
        $stats[] = $row;
    }
    $stmt->close();
    
    return $stats;
}

/**
 * Get user quote analysis
 */
function getUserQuoteAnalysis($conex, $userName) {
    $sql = "SELECT 
                COUNT(DISTINCT sr.id) as requests_with_quotes,
                COUNT(q.id) as total_quotes,
                AVG(quotes_per_request.quote_count) as avg_quotes_per_request,
                AVG(q.cost) as avg_quote_cost,
                AVG(DATEDIFF(q.created_at, sr.created_at)) as avg_response_time_days
            FROM shipping_requests sr
            LEFT JOIN quotes q ON sr.id = q.request_id
            LEFT JOIN (
                SELECT request_id, COUNT(*) as quote_count
                FROM quotes
                GROUP BY request_id
            ) quotes_per_request ON sr.id = quotes_per_request.request_id
            WHERE sr.user_name = ? AND q.id IS NOT NULL";
    
    $stmt = $conex->prepare($sql);
    $stmt->bind_param("s", $userName);
    $stmt->execute();
    $result = $stmt->get_result();
    $analysis = $result->fetch_assoc();
    $stmt->close();
    
    return $analysis;
}

/**
 * Build WHERE clause for user filters
 */
function buildUserWhereClause($userName, $filters) {
    $conditions = ["user_name = ?"];
    $params = [$userName];
    $types = 's';
    
    if (!empty($filters['status'])) {
        $conditions[] = "status = ?";
        $params[] = $filters['status'];
        $types .= 's';
    }
    
    if (!empty($filters['shipping_method'])) {
        $conditions[] = "shipping_method = ?";
        $params[] = $filters['shipping_method'];
        $types .= 's';
    }
    
    if (!empty($filters['date_from'])) {
        $conditions[] = "DATE(created_at) >= ?";
        $params[] = $filters['date_from'];
        $types .= 's';
    }
    
    if (!empty($filters['date_to'])) {
        $conditions[] = "DATE(created_at) <= ?";
        $params[] = $filters['date_to'];
        $types .= 's';
    }
    
    $sql = " WHERE " . implode(" AND ", $conditions);
    
    return [
        'sql' => $sql,
        'params' => $params,
        'types' => $types
    ];
}

/**
 * Extract country from address (helper function)
 */
function extractCountryFromAddress($address) {
    if (empty($address)) {
        return 'N/A';
    }
    
    $address_lower = strtolower($address);
    
    if (strpos($address_lower, 'méxico') !== false || strpos($address_lower, 'mexico') !== false) {
        return 'MX';
    } elseif (strpos($address_lower, 'estados unidos') !== false || strpos($address_lower, 'usa') !== false || strpos($address_lower, 'united states') !== false) {
        return 'US';
    } elseif (strpos($address_lower, 'querétaro') !== false || strpos($address_lower, 'queretaro') !== false) {
        return 'MX';
    } elseif (strpos($address_lower, 'texas') !== false || strpos($address_lower, 'tx') !== false) {
        return 'US';
    } elseif (strpos($address_lower, 'california') !== false || strpos($address_lower, 'ca') !== false) {
        return 'US';
    } else {
        return 'INTL';
    }
}

/**
 * Format date and time for display
 */
function formatDateTime($datetime) {
    if (!$datetime) return '';
    
    $date = new DateTime($datetime);
    $date->setTimezone(new DateTimeZone(TIMEZONE));
    
    return $date->format('d/m/Y H:i');
}
?>