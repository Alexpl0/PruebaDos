<?php
/**
 * Endpoint to update the status of a request
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

require_once __DIR__ . '/db/db.php';

function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Method not allowed. Use POST.', null, 405);
}

$conex = null;
$requestId = 0;

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }

    $requestId = intval($data['request_id'] ?? 0);
    $newStatus = trim($data['status'] ?? '');

    if ($requestId <= 0 || empty($newStatus)) {
        throw new Exception('Required parameters: request_id and status');
    }

    // DB Schema Change: Updated valid statuses
    $validStatuses = ['pending', 'in_process', 'completed', 'cancelled'];
    if (!in_array($newStatus, $validStatuses)) {
        throw new Exception('Invalid status. Valid statuses: ' . implode(', ', $validStatuses));
    }

    $con = new LocalConector();
    $conex = $con->conectar();

    // DB Schema Change: Check `ShippingRequests` table, `request_status` column, and use `request_id`
    $stmtCheck = $conex->prepare("SELECT request_status FROM ShippingRequests WHERE request_id = ?");
    $stmtCheck->bind_param("i", $requestId);
    $stmtCheck->execute();
    $resultCheck = $stmtCheck->get_result();
    $currentRequest = $resultCheck->fetch_assoc();
    $stmtCheck->close();

    if (!$currentRequest) {
        throw new Exception('Request not found');
    }
    $oldStatus = $currentRequest['request_status'];

    // DB Schema Change: Update `ShippingRequests` table, `request_status` column, and use `request_id`
    $stmt = $conex->prepare("UPDATE ShippingRequests SET request_status = ?, updated_at = NOW() WHERE request_id = ?");
    $stmt->bind_param("si", $newStatus, $requestId);
    $stmt->execute();
    
    if ($stmt->affected_rows === 0 && $oldStatus !== $newStatus) {
       // Only throw error if the status is actually different and no rows were affected
       throw new Exception('Failed to update status, request might not exist or status is already set.');
    }
    $stmt->close();

    sendJsonResponse(true, 'Status updated successfully', [
        'request_id' => $requestId,
        'old_status' => $oldStatus,
        'new_status' => $newStatus
    ]);

} catch (Exception $e) {
    sendJsonResponse(false, 'Error updating status: ' . $e->getMessage(), ['request_id' => $requestId, 'new_status' => $newStatus ?? null], 500);
} finally {
    if ($conex) {
        $conex->close();
    }
}
