<?php
/**
 * Endpoint to update the status of a request
 * Intelligent Quoting Portal
 * @author Alejandro Pérez (Corregido - sin funciones duplicadas)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db/db.php';

setCorsHeaders();

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

    // Valid statuses from ShippingRequests table
    $validStatuses = ['pending', 'in_process', 'completed', 'cancelled'];
    if (!in_array($newStatus, $validStatuses)) {
        throw new Exception('Invalid status. Valid statuses: ' . implode(', ', $validStatuses));
    }

    $con = new LocalConector();
    $conex = $con->conectar();

    // Check if request exists
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

    // Update status
    $stmt = $conex->prepare("UPDATE ShippingRequests SET request_status = ?, updated_at = NOW() WHERE request_id = ?");
    $stmt->bind_param("si", $newStatus, $requestId);
    $stmt->execute();
    
    if ($stmt->affected_rows === 0 && $oldStatus !== $newStatus) {
       throw new Exception('Failed to update status, request might not exist or status is already set.');
    }
    $stmt->close();

    sendJsonResponse(true, 'Status updated successfully', [
        'request_id' => $requestId,
        'old_status' => $oldStatus,
        'new_status' => $newStatus
    ]);

} catch (Exception $e) {
    sendJsonResponse(false, 'Error updating status: ' . $e->getMessage(), [
        'request_id' => $requestId, 
        'new_status' => $newStatus ?? null
    ], 500);
} finally {
    if ($conex) {
        $conex->close();
    }
}