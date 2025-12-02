<?php
/**
 * daoUpdatePremiumFreight.php - Update existing Premium Freight order
 * Updates PremiumFreight and related records after edit request approval
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

include_once('../db/PFDB.php');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use POST."
    ]);
    exit;
}

$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

error_log("Update incoming data: " . print_r($data, true));

if ($data === null) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON data provided."
    ]);
    exit;
}

$requiredFields = ['orderId', 'tokenId', 'currentData'];

$missingFields = [];
foreach ($requiredFields as $field) {
    if (!isset($data[$field])) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Missing required fields: " . implode(', ', $missingFields)
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
    $currentData = $data['currentData'];

    error_log("Updating order ID: $orderId with token ID: $tokenId");

    // Verify order exists
    $verifyStmt = $conex->prepare("SELECT id, user_id FROM PremiumFreight WHERE id = ?");
    $verifyStmt->bind_param("i", $orderId);
    $verifyStmt->execute();
    $verifyResult = $verifyStmt->get_result();

    if ($verifyResult->num_rows === 0) {
        throw new Exception("Order not found");
    }

    $order = $verifyResult->fetch_assoc();
    $verifyStmt->close();

    // Update PremiumFreight table
    $updateStmt = $conex->prepare("
        UPDATE PremiumFreight SET
            transport = ?,
            in_out_bound = ?,
            description = ?,
            area = ?,
            int_ext = ?,
            paid_by = ?,
            category_cause = ?,
            project_status = ?,
            recovery = ?,
            weight = ?,
            measures = ?,
            products = ?,
            carrier_id = ?,
            quoted_cost = ?,
            reference_number = ?
        WHERE id = ?
    ");

    if (!$updateStmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }

    $transport = $currentData['transport'] ?? '';
    $inOutBound = $currentData['in_out_bound'] ?? '';
    $description = $currentData['description'] ?? '';
    $area = $currentData['area'] ?? '';
    $intExt = $currentData['int_ext'] ?? '';
    $paidBy = $currentData['paid_by'] ?? '';
    $categoryCause = $currentData['category_cause'] ?? '';
    $projectStatus = $currentData['project_status'] ?? '';
    $recovery = $currentData['recovery'] ?? '';
    $weight = intval($currentData['weight'] ?? 0);
    $measures = $currentData['measures'] ?? '';
    $products = intval($currentData['products'] ?? 0);
    $carrier = intval($currentData['carrier_id'] ?? 0);
    $quotedCost = floatval($currentData['quoted_cost'] ?? 0);
    $referenceNumber = intval($currentData['reference_number'] ?? 0);

    error_log("Update values: transport=$transport, area=$area, weight=$weight, products=$products, carrier=$carrier");

    $updateStmt->bind_param(
        "sssssssssisiiisi",
        $transport, $inOutBound, $description, $area, $intExt, $paidBy,
        $categoryCause, $projectStatus, $recovery, $weight, $measures,
        $products, $carrier, $quotedCost, $referenceNumber, $orderId
    );

    if (!$updateStmt->execute()) {
        throw new Exception("Error executing update: " . $updateStmt->error);
    }

    $updateStmt->close();
    error_log("PremiumFreight updated successfully");

    // Update Corrective Action Plan if provided
    if (!empty($currentData['corrective_action'])) {
        $capCheck = $conex->prepare("
            SELECT id FROM CorrectiveActionPlan 
            WHERE premium_freight_id = ?
        ");
        $capCheck->bind_param("i", $orderId);
        $capCheck->execute();
        $capResult = $capCheck->get_result();
        $capCheck->close();

        if ($capResult->num_rows > 0) {
            $capUpdate = $conex->prepare("
                UPDATE CorrectiveActionPlan SET
                    corrective_action = ?,
                    person_responsible = ?,
                    due_date = ?
                WHERE premium_freight_id = ?
            ");
            $capUpdate->bind_param(
                "sssi",
                $currentData['corrective_action'],
                $currentData['person_responsible'],
                $currentData['target_date'],
                $orderId
            );
            $capUpdate->execute();
            $capUpdate->close();
            error_log("Corrective Action Plan updated");
        } else {
            $capInsert = $conex->prepare("
                INSERT INTO CorrectiveActionPlan 
                (premium_freight_id, corrective_action, person_responsible, due_date, status)
                VALUES (?, ?, ?, ?, 'On Track')
            ");
            $capInsert->bind_param(
                "isss",
                $orderId,
                $currentData['corrective_action'],
                $currentData['person_responsible'],
                $currentData['target_date']
            );
            $capInsert->execute();
            $capInsert->close();
            error_log("Corrective Action Plan created");
        }
    }

    // Log the update in ApprovalHistory
    $historyStmt = $conex->prepare("
        INSERT INTO ApprovalHistory 
        (premium_freight_id, user_id, action_type, approval_level_reached, comments)
        VALUES (?, ?, 'EDITED', 0, 'Order updated via edit request')
    ");
    $historyStmt->bind_param("ii", $orderId, $order['user_id']);
    $historyStmt->execute();
    $historyStmt->close();
    error_log("ApprovalHistory entry created");

    // Mark token as used (will be done later after email)
    // UPDATE EmailEditTokens SET is_used = 1, used_at = NOW() WHERE id = ?
    // This is done in the JavaScript after email confirmation

    $conex->commit();
    $conex->close();

    echo json_encode([
        "success" => true,
        "message" => "Order updated successfully",
        "orderId" => $orderId,
        "tokenId" => $tokenId
    ]);

} catch (Exception $e) {
    if (isset($conex) && $conex->ping()) {
        $conex->rollback();
        $conex->close();
    }
    http_response_code(500);
    error_log("Update error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>