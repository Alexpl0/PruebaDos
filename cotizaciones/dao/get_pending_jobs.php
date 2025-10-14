<?php
/**
 * Endpoint to get pending SAP jobs
 * Intelligent Quoting Portal
 * @author Alejandro Pérez (Updated for QuoteResponses table)
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db/db.php';
define('SAP_API_KEY', 'tu_clave_sap_secreta'); 
define('MAX_RETRIES', 5);

function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

function validateSapApiKey($apiKey) {
    return !empty($apiKey) && hash_equals(SAP_API_KEY, $apiKey);
}

$conex = null;

try {
    $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
    if (!validateSapApiKey($apiKey)) {
        sendJsonResponse(false, 'Invalid or missing API Key', null, 401);
    }

    $con = new LocalConector();
    $conex = $con->conectar();

    // Updated query to use QuoteResponses instead of quotes
    // Note: This assumes sap_queue table exists. If it doesn't, you'll need to create it.
    $sql = "SELECT 
                sq.id as queue_id, 
                sq.quote_id, 
                sq.status,
                sq.retry_count,
                sr.request_id,
                sr.user_name,
                sr.shipping_method,
                sr.request_status,
                qr.cost,
                qr.delivery_time,
                qr.carrier_id,
                c.name as carrier_name
            FROM sap_queue sq
            INNER JOIN QuoteResponses qr ON sq.quote_id = qr.response_id
            INNER JOIN ShippingRequests sr ON qr.request_id = sr.request_id
            INNER JOIN Carriers c ON qr.carrier_id = c.id
            WHERE sq.status = 'pending' 
              AND sq.retry_count < ?
            ORDER BY sq.created_at ASC
            LIMIT 50";
    
    $stmt = $conex->prepare($sql);
    $maxRetries = MAX_RETRIES;
    $stmt->bind_param("i", $maxRetries);
    $stmt->execute();
    $result = $stmt->get_result();

    $pendingJobs = [];
    $queueIds = [];
    while ($job = $result->fetch_assoc()) {
        $pendingJobs[] = [
            'queue_id' => (int)$job['queue_id'],
            'quote_id' => (int)$job['quote_id'],
            'request_id' => (int)$job['request_id'],
            'user_name' => $job['user_name'],
            'shipping_method' => $job['shipping_method'],
            'request_status' => $job['request_status'],
            'carrier_name' => $job['carrier_name'],
            'cost' => (float)$job['cost'],
            'delivery_time' => $job['delivery_time'],
            'retry_count' => (int)$job['retry_count']
        ];
        $queueIds[] = $job['queue_id'];
    }
    $stmt->close();
    
    // Mark jobs as processing
    if (!empty($queueIds)) {
        $placeholders = implode(',', array_fill(0, count($queueIds), '?'));
        $types = str_repeat('i', count($queueIds));
        $stmtUpdate = $conex->prepare("UPDATE sap_queue SET status = 'processing', processed_at = NOW() WHERE id IN ($placeholders)");
        $stmtUpdate->bind_param($types, ...$queueIds);
        $stmtUpdate->execute();
        $stmtUpdate->close();
    }
    
    sendJsonResponse(true, 'Pending jobs retrieved successfully', [
        'jobs' => $pendingJobs,
        'total' => count($pendingJobs)
    ]);

} catch (Exception $e) {
    error_log("Error getting pending SAP jobs: " . $e->getMessage());
    sendJsonResponse(false, 'Error getting jobs: ' . $e->getMessage(), null, 500);
} finally {
    if ($conex) {
        $conex->close();
    }
}