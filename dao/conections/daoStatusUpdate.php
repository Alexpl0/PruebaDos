<?php
/**
 * daoStatusUpdate.php - Actualización de Estado de Órdenes
 * 
 * ACTUALIZACIÓN v3.0 (2025-10-07):
 * - CORREGIDO: Validación correcta con múltiples approval_level por usuario
 * - Verifica que el userLevel enviado exista en Approvers para ese usuario
 * - No compara contra authorization_level de sesión
 */

session_start();
include_once('../db/PFDB.php');

$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Log para debugging
error_log("daoStatusUpdate: Received data: " . json_encode($data));

if (
    !$data || !isset($data['orderId']) || !isset($data['newStatusId']) ||
    !isset($data['userLevel']) || !isset($data['userID']) || !isset($data['authDate'])
) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid or incomplete JSON data."]);
    exit;
}

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized. Please log in."]);
    exit;
}

$userLevel = intval($data['userLevel']); // Este es el approval_level que el usuario está usando
$userID = intval($data['userID']);
$authDate = $data['authDate'];
$orderId = intval($data['orderId']);
$newStatusId = intval($data['newStatusId']);
$rejectionReason = isset($data['rejection_reason']) ? trim($data['rejection_reason']) : null;

error_log("daoStatusUpdate: Processing - OrderID: $orderId, UserID: $userID, UserLevel: $userLevel, NewStatus: $newStatusId");

// Validar razón de rechazo si es necesario
if ($newStatusId === 99) {
    if (empty($rejectionReason)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "A rejection reason is required."]);
        exit;
    }
    if (strlen($rejectionReason) > 999) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Rejection reason is too long (max 999 characters)."]);
        exit;
    }
} else {
    $rejectionReason = null;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");
    $conex->begin_transaction();

    // 1. Obtener información de la orden
    $stmt = $conex->prepare("
        SELECT 
            pfa.act_approv, 
            pf.required_auth_level, 
            u.plant as creator_plant,
            pf.user_id as creator_user_id
        FROM PremiumFreight pf
        LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
        LEFT JOIN User u ON pf.user_id = u.id
        WHERE pf.id = ?
    ");
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $stmt->bind_result($approvalStatus, $requiredAuthLevel, $creatorPlant, $creatorUserId);
    
    if (!$stmt->fetch()) {
        $stmt->close();
        $conex->rollback();
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Order not found."]);
        exit;
    }
    $stmt->close();

    error_log("daoStatusUpdate: Order info - ActApprov: $approvalStatus, RequiredLevel: $requiredAuthLevel, CreatorPlant: $creatorPlant");

    // 2. CRÍTICO: Verificar que el usuario SÍ TENGA el approval_level que está intentando usar
    //    Y que ese nivel sea válido para la planta de la orden
    $stmt = $conex->prepare("
        SELECT COUNT(*) as count
        FROM Approvers 
        WHERE user_id = ? 
        AND approval_level = ?
        AND (plant = ? OR plant IS NULL)
    ");
    $stmt->bind_param("iis", $userID, $userLevel, $creatorPlant);
    $stmt->execute();
    $stmt->bind_result($approverCount);
    $stmt->fetch();
    $stmt->close();

    error_log("daoStatusUpdate: Approver validation - UserID: $userID, Level: $userLevel, Plant: $creatorPlant, Count: $approverCount");

    if ($approverCount === 0) {
        $conex->rollback();
        http_response_code(403);
        echo json_encode([
            "success" => false, 
            "message" => "Unauthorized: You do not have approval level $userLevel for plant $creatorPlant."
        ]);
        exit;
    }

    // 3. Validar que el nivel sea el correcto según el ciclo de aprobación
    if ($newStatusId !== 99) { // Si NO es rechazo
        $expectedLevel = intval($approvalStatus) + 1;
        
        if ($userLevel !== $expectedLevel) {
            $conex->rollback();
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "Unauthorized: This order requires approval level $expectedLevel, but you are using level $userLevel."
            ]);
            exit;
        }
        
        error_log("daoStatusUpdate: Approval level validation passed - Expected: $expectedLevel, Using: $userLevel");
    }

    // 4. Verificar que la orden no esté ya completamente aprobada
    if ($approvalStatus >= $requiredAuthLevel) {
        $conex->rollback();
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Order is already fully approved."
        ]);
        exit;
    }

    // 5. Verificar que la orden no esté ya rechazada
    if ($approvalStatus === 99) {
        $conex->rollback();
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Order was previously rejected."
        ]);
        exit;
    }

    // 6. Actualizar el estado de la orden
    if ($newStatusId === 99) {
        // Rechazo
        $stmt = $conex->prepare("
            UPDATE PremiumFreightApprovals 
            SET act_approv = ?, rejection_reason = ?
            WHERE premium_freight_id = ?
        ");
        $stmt->bind_param("isi", $newStatusId, $rejectionReason, $orderId);
        error_log("daoStatusUpdate: Updating to REJECTED (99)");
    } else {
        // Aprobación - usar el userLevel como nuevo act_approv
        $stmt = $conex->prepare("
            UPDATE PremiumFreightApprovals 
            SET act_approv = ?, rejection_reason = NULL
            WHERE premium_freight_id = ?
        ");
        $stmt->bind_param("ii", $userLevel, $orderId); // Usar userLevel, no newStatusId
        error_log("daoStatusUpdate: Updating to approval level: $userLevel");
    }

    if (!$stmt->execute()) {
        throw new Exception("Failed to update approval status: " . $stmt->error);
    }
    $affectedRows = $stmt->affected_rows;
    $stmt->close();

    error_log("daoStatusUpdate: PremiumFreightApprovals updated, affected rows: $affectedRows");

    // 7. Registrar en el historial
    $actionType = $newStatusId === 99 ? 'REJECTED' : 'APPROVED';
    $levelReached = $newStatusId === 99 ? 99 : $userLevel;
    
    $stmt = $conex->prepare("
        INSERT INTO ApprovalHistory 
        (premium_freight_id, user_id, action_timestamp, action_type, approval_level_reached, comments)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("iissis", $orderId, $userID, $authDate, $actionType, $levelReached, $rejectionReason);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to insert approval history: " . $stmt->error);
    }
    $stmt->close();

    error_log("daoStatusUpdate: Approval history inserted - Action: $actionType, Level: $levelReached");

    // 8. Actualizar estado general de la orden si es necesario
    if ($newStatusId === 99) {
        // Orden rechazada - Actualizar status_id a 4 (rejected)
        $stmt = $conex->prepare("UPDATE PremiumFreight SET status_id = 4 WHERE id = ?");
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $stmt->close();
        error_log("daoStatusUpdate: Order status updated to REJECTED (status_id=4)");
    } elseif ($userLevel >= $requiredAuthLevel) {
        // Orden completamente aprobada - Actualizar status_id a 3 (approved)
        $stmt = $conex->prepare("UPDATE PremiumFreight SET status_id = 3 WHERE id = ?");
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $stmt->close();
        error_log("daoStatusUpdate: Order status updated to FULLY APPROVED (status_id=3)");
    } else {
        // Orden en proceso de aprobación - Actualizar status_id a 2 (review)
        $stmt = $conex->prepare("UPDATE PremiumFreight SET status_id = 2 WHERE id = ?");
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $stmt->close();
        error_log("daoStatusUpdate: Order status updated to IN REVIEW (status_id=2)");
    }

    $conex->commit();
    
    error_log("daoStatusUpdate: SUCCESS - Order $orderId processed successfully");
    
    echo json_encode([
        "success" => true,
        "message" => $newStatusId === 99 ? "Order rejected successfully." : "Order approved successfully.",
        "newStatus" => $newStatusId === 99 ? 99 : $userLevel
    ]);

} catch (Exception $e) {
    if (isset($conex)) {
        $conex->rollback();
    }
    error_log("ERROR in daoStatusUpdate: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Internal server error: " . $e->getMessage()]);
}
?>