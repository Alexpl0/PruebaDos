<?php
/**
 * daoUpdatePremiumFreight.php - Update existing Premium Freight order
 * Improved version: Only updates changed fields, maintains existing data
 * 
 * @author GRAMMER AG
 * @version 2.0
 */

include_once('../db/PFDB.php');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit;
}

$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

error_log("[daoUpdatePremiumFreight.php] Incoming request: " . print_r($data, true));

if ($data === null) {
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

    error_log("[daoUpdatePremiumFreight.php] Processing: orderId=$orderId, tokenId=$tokenId");
    error_log("[daoUpdatePremiumFreight.php] Changes: " . json_encode($changes));

    $verifyStmt = $conex->prepare("SELECT id, user_id, quoted_cost, required_auth_level, cost_euros FROM PremiumFreight WHERE id = ?");
    $verifyStmt->bind_param("i", $orderId);
    $verifyStmt->execute();
    $verifyResult = $verifyStmt->get_result();

    if ($verifyResult->num_rows === 0) {
        throw new Exception("Order not found");
    }

    $order = $verifyResult->fetch_assoc();
    $verifyStmt->close();

    $originalQuotedCost = floatval($order['quoted_cost'] ?? 0);
    $originalAuthLevel = intval($order['required_auth_level'] ?? 5);
    $originalCostEuros = floatval($order['cost_euros'] ?? 0);

    error_log("[daoUpdatePremiumFreight.php] Original values - cost: $originalQuotedCost, auth_level: $originalAuthLevel");

    $newQuotedCost = isset($changes['quoted_cost']) && $changes['quoted_cost'] !== null ? floatval($changes['quoted_cost']) : $originalQuotedCost;
    $newAuthLevel = $originalAuthLevel;
    $newCostEuros = $originalCostEuros;

    if (isset($changes['quoted_cost']) && $changes['quoted_cost'] !== null) {
        $newQuotedCost = floatval($changes['quoted_cost']);
        
        if (isset($changes['cost_euros']) && $changes['cost_euros'] !== null) {
            $newCostEuros = floatval($changes['cost_euros']);
        }
        
        $newAuthLevel = calculateRequiredAuthLevel($newCostEuros);
        error_log("[daoUpdatePremiumFreight.php] Cost changed - new cost_euros: $newCostEuros, new auth_level: $newAuthLevel");
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
        if (isset($changes[$field]) && $changes[$field] !== null) {
            $fieldsToUpdate[] = "$field = ?";
            
            if ($field === 'carrier_id') {
                $updateValues[] = intval($changes[$field]);
                $updateTypes .= 'i';
            } else {
                $updateValues[] = $changes[$field];
                $updateTypes .= 's';
            }
        }
    }

    if ($newCostEuros !== $originalCostEuros || $newAuthLevel !== $originalAuthLevel) {
        $fieldsToUpdate[] = "cost_euros = ?";
        $updateValues[] = $newCostEuros;
        $updateTypes .= 'd';

        $fieldsToUpdate[] = "required_auth_level = ?";
        $updateValues[] = $newAuthLevel;
        $updateTypes .= 'i';
    }

    if (empty($fieldsToUpdate)) {
        error_log("[daoUpdatePremiumFreight.php] No changes to update");
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
    
    error_log("[daoUpdatePremiumFreight.php] Update query: $updateQuery");
    error_log("[daoUpdatePremiumFreight.php] Update types: $updateTypes");

    $updateStmt = $conex->prepare($updateQuery);
    if (!$updateStmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }

    $updateStmt->bind_param($updateTypes, ...$updateValues);

    if (!$updateStmt->execute()) {
        throw new Exception("Error executing update: " . $updateStmt->error);
    }

    $updateStmt->close();
    error_log("[daoUpdatePremiumFreight.php] PremiumFreight updated successfully");

    $historyStmt = $conex->prepare("
        INSERT INTO ApprovalHistory 
        (premium_freight_id, user_id, action_type, approval_level_reached, comments)
        VALUES (?, ?, 'EDITED', 0, 'Order updated via edit request')
    ");
    $historyStmt->bind_param("ii", $orderId, $order['user_id']);
    $historyStmt->execute();
    $historyStmt->close();
    error_log("[daoUpdatePremiumFreight.php] ApprovalHistory entry created");

    $conex->commit();
    $conex->close();

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
    http_response_code(500);
    error_log("[daoUpdatePremiumFreight.php] Error: " . $e->getMessage());
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