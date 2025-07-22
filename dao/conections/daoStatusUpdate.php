<?php
session_start();
include_once('../db/PFDB.php');

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (
    !$data || !isset($data['orderId']) || !isset($data['newStatusId']) ||
    !isset($data['userLevel']) || !isset($data['userID']) || !isset($data['authDate'])
) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid or incomplete JSON data."]);
    exit;
}

if (!isset($_SESSION['user']) || !isset($_SESSION['user']['authorization_level'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized. Please log in."]);
    exit;
}

$sessionLevel = intval($_SESSION['user']['authorization_level']);
$userLevel = intval($data['userLevel']);
$userID = intval($data['userID']);
$authDate = $data['authDate'];
$orderId = intval($data['orderId']);
$newStatusId = intval($data['newStatusId']);
$userPlant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
$rejectionReason = isset($data['rejection_reason']) ? trim($data['rejection_reason']) : null;

if ($newStatusId === 99) {
    if (empty($rejectionReason)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "A reason is required to reject the order."]);
        exit;
    }
    if (strlen($rejectionReason) > 999) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Rejection reason cannot exceed 999 characters."]);
        exit;
    }
} else {
    $rejectionReason = null;
}

if ($sessionLevel !== $userLevel) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Unauthorized. Session level does not match the sent level."]);
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->begin_transaction();

    $stmt = $conex->prepare(
        "SELECT pfa.act_approv, pf.required_auth_level, u.plant AS creator_plant
         FROM PremiumFreightApprovals pfa
         JOIN PremiumFreight pf ON pfa.premium_freight_id = pf.id
         JOIN User u ON pf.user_id = u.id
         WHERE pfa.premium_freight_id = ?"
    );
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $stmt->bind_result($approvalStatus, $requiredAuthLevel, $creatorPlant);
    
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Order not found."]);
        $stmt->close();
        $conex->close();
        exit;
    }
    $stmt->close();

    if ($userPlant !== null && $userPlant !== '' && $creatorPlant !== $userPlant) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "You do not have permission to approve/reject orders from other plants."]);
        $conex->close();
        exit;
    }

    if ($sessionLevel !== ((intval($approvalStatus)) + 1)) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "You do not have permission to approve/reject this order at this time."]);
        $conex->close();
        exit;
    }

    if ($newStatusId !== 99 && $newStatusId > intval($requiredAuthLevel)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "The order has already reached the required approval level."]);
        $conex->close();
        exit;
    }

    $stmtUpdate = $conex->prepare(
        "UPDATE PremiumFreightApprovals 
         SET act_approv = ?, user_id = ?, approval_date = ?, rejection_reason = ?
         WHERE premium_freight_id = ?"
    );
    $stmtUpdate->bind_param("isssi", $newStatusId, $userID, $authDate, $rejectionReason, $orderId);
    $stmtUpdate->execute();
    $affectedRows = $stmtUpdate->affected_rows;
    $stmtUpdate->close();

    if ($affectedRows > 0) {
        // =================================================================================
        // NUEVO: Insertar el registro de la acción en el historial
        // =================================================================================
        $actionType = ($newStatusId === 99) ? 'REJECTED' : 'APPROVED';
        $comments = ($newStatusId === 99) ? $rejectionReason : NULL;
        $levelReached = ($newStatusId === 99) ? $sessionLevel : $newStatusId; // Si se rechaza, guarda el nivel en que ocurrió

        $stmtHistory = $conex->prepare(
            "INSERT INTO ApprovalHistory (premium_freight_id, user_id, action_type, approval_level_reached, comments) VALUES (?, ?, ?, ?, ?)"
        );
        if ($stmtHistory) {
            $stmtHistory->bind_param("iisis", $orderId, $userID, $actionType, $levelReached, $comments);
            $stmtHistory->execute();
            $stmtHistory->close();
        }
        // =================================================================================

        if ($newStatusId === 99) {
            $stmtStatus = $conex->prepare("UPDATE PremiumFreight SET status_id = 4 WHERE id = ?");
            $stmtStatus->bind_param("i", $orderId);
            $stmtStatus->execute();
            $stmtStatus->close();
        }

        if ($newStatusId === intval($requiredAuthLevel)) {
            $stmtStatus = $conex->prepare("UPDATE PremiumFreight SET status_id = 3 WHERE id = ?");
            $stmtStatus->bind_param("i", $orderId);
            $stmtStatus->execute();
            $stmtStatus->close();
        }

        $conex->commit();
        $response = [
            "success" => true,
            "message" => $newStatusId === 99 ? "Order rejected successfully" : "Status updated successfully",
            "new_status" => $newStatusId,
            "required_level" => $requiredAuthLevel
        ];
        if ($newStatusId === 99 && $rejectionReason) {
            $response['rejection_reason'] = $rejectionReason;
        }
        echo json_encode($response);
    } else {
        $conex->rollback();
        echo json_encode(["success" => false, "message" => "No records updated. The ID might not exist or the status is the same."]);
    }

    $conex->close();

} catch (Exception $e) {
    if (isset($conex) && $conex->connect_errno === 0) {
        $conex->rollback();
        $conex->close();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>
