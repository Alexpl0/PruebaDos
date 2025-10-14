<?php
/**
 * Endpoint to get the list of carriers
 * Intelligent Quoting Portal
 * @author Alejandro Pérez (Updated for QuoteResponses table)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db/db.php';

// Helper function for JSON responses
function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit();
}

$conex = null;

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    $input = file_get_contents('php://input');
    $filters = json_decode($input, true) ?? [];

    // Updated query to use QuoteResponses instead of quotes
    $sql = "SELECT 
                c.id, 
                c.name, 
                c.email,
                COUNT(qr.response_id) as total_quotes,
                COUNT(CASE WHEN qr.is_selected = 1 THEN 1 END) as selected_quotes,
                AVG(qr.cost) as avg_cost,
                COUNT(DISTINCT qr.request_id) as unique_requests,
                MIN(qr.cost) as min_cost,
                MAX(qr.cost) as max_cost
            FROM Carriers c
            LEFT JOIN QuoteResponses qr ON c.id = qr.carrier_id
            WHERE 1=1";

    $params = [];
    $types = '';

    // Filter by carrier name
    if (!empty($filters['name'])) {
        $sql .= " AND c.name LIKE ?";
        $params[] = '%' . $filters['name'] . '%';
        $types .= 's';
    }

    // Filter by carrier ID
    if (!empty($filters['id'])) {
        $sql .= " AND c.id = ?";
        $params[] = intval($filters['id']);
        $types .= 'i';
    }

    $sql .= " GROUP BY c.id ORDER BY c.name ASC";

    $stmt = $conex->prepare($sql);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $carriers = [];
    while ($row = $result->fetch_assoc()) {
        $carriers[] = $row;
    }

    $stmt->close();
    
    $processedCarriers = array_map('processCarrierData', $carriers);

    sendJsonResponse(true, 'Carriers retrieved successfully', [
        'carriers' => $processedCarriers,
        'total' => count($processedCarriers)
    ]);

} catch (Exception $e) {
    sendJsonResponse(false, 'Error getting carriers: ' . $e->getMessage(), null, 500);
} finally {
    if ($conex) {
        $conex->close();
    }
}

function processCarrierData($carrier) {
    $totalQuotes = intval($carrier['total_quotes']);
    $selectedQuotes = intval($carrier['selected_quotes']);
    
    return [
        'id' => intval($carrier['id']),
        'name' => $carrier['name'],
        'email' => $carrier['email'],
        'performance' => [
            'total_quotes' => $totalQuotes,
            'selected_quotes' => $selectedQuotes,
            'unique_requests' => intval($carrier['unique_requests']),
            'success_rate' => $totalQuotes > 0 ? round(($selectedQuotes / $totalQuotes) * 100, 1) : 0,
            'avg_cost' => $carrier['avg_cost'] ? round((float)$carrier['avg_cost'], 2) : null,
            'min_cost' => $carrier['min_cost'] ? round((float)$carrier['min_cost'], 2) : null,
            'max_cost' => $carrier['max_cost'] ? round((float)$carrier['max_cost'], 2) : null
        ],
        'statistics' => [
            'total_responses' => $totalQuotes,
            'wins' => $selectedQuotes,
            'loss' => $totalQuotes - $selectedQuotes,
            'win_rate_percentage' => $totalQuotes > 0 ? round(($selectedQuotes / $totalQuotes) * 100, 1) : 0
        ]
    ];
}