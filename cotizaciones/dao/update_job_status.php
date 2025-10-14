<?php
/**
 * Endpoint to update the status of SAP jobs
 * Intelligent Quoting Portal
 * @author Alejandro Pérez (Corregido - sin funciones duplicadas)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db/db.php';

setCorsHeaders();

define('MAX_RETRIES', 5);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Method not allowed. Use POST.', null, 405);
}

$conex = null;

try {
    $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
    if (!validateSapApiKey($apiKey)) {
        sendJsonResponse(false, 'Invalid or missing API Key', null, 401);
    }

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    $queueId = intval($data['queue_id'] ?? 0);
    $status = trim($data['status'] ?? '');

    if ($queueId <= 0 || empty($status)) {
        throw new Exception('Required parameters: queue_id and status');
    }

    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->begin_transaction();

    $stmtJob = $conex->prepare("SELECT retry_count FROM sap_queue WHERE id = ?");
    $stmtJob->bind_param("i", $queueId);
    $stmtJob->execute();
    $jobResult = $stmtJob->get_result();
    $job = $jobResult->fetch_assoc();
    $stmtJob->close();

    if (!$job) {
        throw new Exception('Job not found in queue');
    }

    $sql = "UPDATE sap_queue SET status = ?, processed_at = NOW()";
    $params = [$status];
    $types = 's';
    
    if ($status === 'failed') {
        $newRetryCount = intval($job['retry_count']) + 1;
        $sql .= ", retry_count = ?";
        $params[] = $newRetryCount;
        $types .= 'i';

        if ($newRetryCount >= MAX_RETRIES) {
             // Status remains 'failed'
        } else {
             $params[0] = 'pending'; // Re-queue by setting status to 'pending'
        }
    }
    
    $sql .= " WHERE id = ?";
    $params[] = $queueId;
    $types .= 'i';
    
    $stmtUpdate = $conex->prepare($sql);
    $stmtUpdate->bind_param($types, ...$params);
    $stmtUpdate->execute();
    $stmtUpdate->close();

    $conex->commit();
    
    sendJsonResponse(true, 'Job status updated successfully', [
        'queue_id' => $queueId, 
        'new_status' => $params[0]
    ]);

} catch (Exception $e) {
    if ($conex) $conex->rollback();
    error_log("Error updating SAP job status: " . $e->getMessage());
    sendJsonResponse(false, 'Error updating job status: ' . $e->getMessage(), null, 500);
} finally {
    if ($conex) {
        $conex->close();
    }
}