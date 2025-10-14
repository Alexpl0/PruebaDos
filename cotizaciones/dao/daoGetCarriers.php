<?php
/**
 * Endpoint to get the list of carriers
 * Intelligent Quoting Portal
 * @author Alejandro Pérez (Updated for new DB schema)
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

    // DB Schema Change: Updated table to `Carriers` and selected `email` column.
    // Removed non-existent columns like `is_active` and `created_at`.
    $sql = "SELECT 
                c.id, c.name, c.email,
                COUNT(q.id) as total_quotes,
                COUNT(CASE WHEN q.is_selected = 1 THEN 1 END) as selected_quotes,
                AVG(q.cost) as avg_cost,
                COUNT(DISTINCT q.request_id) as unique_requests
            FROM Carriers c
            LEFT JOIN quotes q ON c.id = q.carrier_id
            WHERE 1=1";

    $params = [];
    $types = '';

    if (!empty($filters['name'])) {
        $sql .= " AND c.name LIKE ?";
        $params[] = '%' . $filters['name'] . '%';
        $types .= 's';
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
    
    // DB Schema Change: Mapped `email` and removed `is_active`.
    return [
        'id' => intval($carrier['id']),
        'name' => $carrier['name'],
        'email' => $carrier['email'], // Changed from contact_email
        'performance' => [
            'total_quotes' => $totalQuotes,
            'selected_quotes' => $selectedQuotes,
            'success_rate' => $totalQuotes > 0 ? round(($selectedQuotes / $totalQuotes) * 100, 1) : 0,
        ]
    ];
}

