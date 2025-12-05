<?php
/**
 * daoUpdatePremiumFreight.php - Update existing Premium Freight order
 * Improved version: Only updates changed fields, maintains existing data
 * Includes detailed logging for debugging
 * 
 * @author GRAMMER AG
 * @version 2.1
 */

include_once('../db/PFDB.php');

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

$logDir = __DIR__ . '/logs';
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}
$logFile = $logDir . '/update_' . date('Y-m-d') . '.log';

function logMessage($message, $data = null) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMsg = "[$timestamp] $message";
    if ($data !== null) {
        $logMsg .= " | " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    $logMsg .= "\n";
    file_put_contents($logFile, $logMsg, FILE_APPEND);
    error_log($logMsg);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logMessage('ERROR: Invalid method', ['method' => $_SERVER['REQUEST_METHOD']]);
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit;
}

$requestBody = file_get_contents('php://input');
logMessage('REQUEST_RECEIVED', ['body_length' => strlen($requestBody)]);

$data = json_decode($requestBody, true);

if ($data === null) {
    logMessage('ERROR: Invalid JSON');
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data provided.']);
    exit;
}

$requiredFields = ['orderId', 'tokenId', 'changes'];
$missingFields = [];
foreach ($requiredFields as $field) {
    if (!isset($data[$field])) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    logMessage('ERROR: Missing fields', ['missing' => $missingFields]);
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Missing required fields: ' . implode(', ', $missingFields)
    ]);
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");
    $conex->begin_transaction();

    $orderId = intval($data['orderId']);
    $tokenId = intval($data['tokenId']);
    $changes = $data['changes'];

    logMessage('PROCESSING_START', ['orderId' => $orderId, 'tokenId' => $tokenId]);
    logMessage('CHANGES_RECEIVED', array_keys($changes));

    $verifyStmt = $conex->prepare("SELECT id, user_id, quoted_cost, required_auth_level, cost_euros, carrier_id FROM PremiumFreight WHERE id = ?");
    $verifyStmt->bind_param("i", $orderId);
    $verifyStmt->execute();
    $verifyResult = $verifyStmt->get_result();

    if ($verifyResult->num_rows === 0) {
        throw new Exception("Order not found");
    }

    $order = $verifyResult->fetch_assoc();
    $verifyStmt->close();

    logMessage('ORDER_FOUND', $order);

    $originalQuotedCost = floatval($order['quoted_cost'] ?? 0);
    $originalAuthLevel = intval($order['required_auth_level'] ?? 5);
    $originalCostEuros = floatval($order['cost_euros'] ?? 0);
    $originalCarrierId = intval($order['carrier_id'] ?? 0);

    logMessage('ORIGINAL_VALUES', [
        'cost' => $originalQuotedCost,
        'auth_level' => $originalAuthLevel,
        'cost_euros' => $originalCostEuros,
        'carrier_id' => $originalCarrierId
    ]);

    $newQuotedCost = isset($changes['quoted_cost']) && $changes['quoted_cost'] !== null ? floatval($changes['quoted_cost']) : $originalQuotedCost;
    $newAuthLevel = $originalAuthLevel;
    $newCostEuros = $originalCostEuros;

    if (isset($changes['quoted_cost']) && $changes['quoted_cost'] !== null) {
        $newQuotedCost = floatval($changes['quoted_cost']);
        
        if (isset($changes['cost_euros']) && $changes['cost_euros'] !== null) {
            $newCostEuros = floatval($changes['cost_euros']);
        }
        
        $newAuthLevel = calculateRequiredAuthLevel($newCostEuros);
        logMessage('COST_CHANGED', ['new_cost_euros' => $newCostEuros, 'new_auth_level' => $newAuthLevel]);
    }

    $fieldsToUpdate = [];
    $updateValues = [];
    $updateTypes = '';

    $editableFields = [
        'transport',
        'in_out_bound',
        'description',
        'area',
        'int_ext',
        'paid_by',
        'category_cause',
        'project_status',
        'recovery',
        'carrier_id',
        'quoted_cost'
    ];

    foreach ($editableFields as $field) {
        if (isset($changes[$field]) && $changes[$field] !== null && $changes[$field] !== '') {
            
            if ($field === 'carrier_id') {
                $carrierId = intval($changes[$field]);
                logMessage('CHECKING_FK_CARRIER', ['carrier_id' => $carrierId]);
                
                if ($carrierId > 0) {
                    $carrierCheck = $conex->prepare("SELECT id FROM Carriers WHERE id = ?");
                    $carrierCheck->bind_param("i", $carrierId);
                    $carrierCheck->execute();
                    $carrierResult = $carrierCheck->get_result();
                    
                    if ($carrierResult->num_rows === 0) {
                        throw new Exception("Invalid carrier ID: $carrierId does not exist in Carriers table");
                    }
                    $carrierCheck->close();
                }
                
                $fieldsToUpdate[] = "$field = ?";
                $updateValues[] = $carrierId;
                $updateTypes .= 'i';
                logMessage('FK_CARRIER_VALID', ['carrier_id' => $carrierId]);
            } else {
                $fieldsToUpdate[] = "$field = ?";
                $updateValues[] = $changes[$field];
                $updateTypes .= 's';
                logMessage('FIELD_TO_UPDATE', ['field' => $field, 'value' => substr($changes[$field], 0, 50)]);
            }
        } else if (isset($changes[$field]) && ($changes[$field] === '' || $changes[$field] === null)) {
            logMessage('SKIPPING_EMPTY_FIELD', ['field' => $field, 'reason' => 'empty_or_null']);
        }
    }

    if ($newCostEuros !== $originalCostEuros || $newAuthLevel !== $originalAuthLevel) {
        $fieldsToUpdate[] = "cost_euros = ?";
        $updateValues[] = $newCostEuros;
        $updateTypes .= 'd';

        $fieldsToUpdate[] = "required_auth_level = ?";
        $updateValues[] = $newAuthLevel;
        $updateTypes .= 'i';
        
        logMessage('RECALCULATED_VALUES', ['cost_euros' => $newCostEuros, 'auth_level' => $newAuthLevel]);
    }

    if (empty($fieldsToUpdate)) {
        logMessage('NO_CHANGES_TO_UPDATE');
        echo json_encode([
            'success' => true,
            'message' => 'No changes to update',
            'orderId' => $orderId
        ]);
        exit;
    }

    $updateValues[] = $orderId;
    $updateTypes .= 'i';

    $updateQuery = "UPDATE PremiumFreight SET " . implode(", ", $fieldsToUpdate) . " WHERE id = ?";
    
    logMessage('QUERY_CONSTRUCTED', [
        'query' => $updateQuery,
        'types' => $updateTypes,
        'values_count' => count($updateValues)
    ]);

    $updateStmt = $conex->prepare($updateQuery);
    if (!$updateStmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }

    $updateStmt->bind_param($updateTypes, ...$updateValues);

    if (!$updateStmt->execute()) {
        throw new Exception("Error executing update: " . $updateStmt->error);
    }

    $updateStmt->close();
    logMessage('UPDATE_EXECUTED_SUCCESS');

    $historyStmt = $conex->prepare("
        INSERT INTO ApprovalHistory 
        (premium_freight_id, user_id, action_type, approval_level_reached, comments)
        VALUES (?, ?, 'EDITED', 0, 'Order updated via edit request')
    ");
    $historyStmt->bind_param("ii", $orderId, $order['user_id']);
    $historyStmt->execute();
    $historyStmt->close();
    logMessage('HISTORY_LOGGED');

    $conex->commit();
    $conex->close();

    logMessage('TRANSACTION_COMMITTED', ['orderId' => $orderId]);

    echo json_encode([
        'success' => true,
        'message' => 'Order updated successfully',
        'orderId' => $orderId,
        'tokenId' => $tokenId,
        'updatedFields' => count($fieldsToUpdate),
        'newAuthLevel' => $newAuthLevel
    ]);

} catch (Exception $e) {
    if (isset($conex) && $conex->ping()) {
        $conex->rollback();
        $conex->close();
    }
    
    logMessage('ERROR_CAUGHT', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

exit;

function calculateRequiredAuthLevel($costInEuros) {
    $costInEuros = floatval($costInEuros);
    
    if ($costInEuros <= 1500) return 5;
    if ($costInEuros <= 5000) return 6;
    if ($costInEuros <= 10000) return 7;
    return 8;
}
?>