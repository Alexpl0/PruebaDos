<?php
/**
 * daoStatusUpdate.php - Actualización de Estado de Órdenes
 * 
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - Migrado a tabla Approvers para validación de niveles de aprobación
 * - Mantiene authorization_level para validación de sesión
 */

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

$sessionAuthLevel = intval($_SESSION['user']['authorization_level']);
$userLevel = intval($data['userLevel']);
$userID = intval($data['userID']);
$authDate = $data['authDate'];
$orderId = intval($data['orderId']);
$newStatusId = intval($data['newStatusId']);
$userPlant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
$rejectionReason = isset($data['rejection_reason']) ? trim($data['rejection_reason']) : null;

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
    $conex->begin_transaction();

    // 1. Obtener información de la orden
    $stmt = $conex->prepare("
        SELECT pfa.act_approv, pf.required_auth_level, u.plant as creator_plant
        FROM PremiumFreight pf
        LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
        LEFT JOIN User u ON pf.id_user = u.id
        WHERE pf.id = ?
    ");
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $stmt->bind_result($approvalStatus, $requiredAuthLevel, $creatorPlant);
    
    if (!$stmt->fetch()) {
        $stmt->close();
        $conex->rollback();
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Order not found."]);
        exit;
    }
    $stmt->close();

    // 2. Validar planta del usuario vs planta de la orden
    if ($userPlant !== null && $userPlant !== '' && $creatorPlant !== $userPlant) {
        $conex->rollback();
        http_response_code(403);
        echo json_encode([
            "success" => false, 
            "message" => "Permission denied: Order plant ($creatorPlant) does not match your plant ($userPlant)."
        ]);
        exit;
    }

    // 3. NUEVO: Obtener approval_level del usuario desde tabla Approvers
    $stmt = $conex->prepare("
        SELECT approval_level 
        FROM Approvers 
        WHERE user_id = ? 
        AND (plant = ? OR plant IS NULL)
        ORDER BY plant ASC
        LIMIT 1
    ");
    $stmt->bind_param("is", $userID, $creatorPlant);
    $stmt->execute();
    $stmt->bind_result($userApprovalLevel);
    
    if (!$stmt->fetch()) {
        $stmt->close();
        $conex->rollback();
        http_response_code(403);
        echo json_encode([
            "success" => false, 
            "message" => "You do not have approval permissions for this order."
        ]);
        exit;
    }
    $stmt->close();

    // 4. Validar que el usuario tenga el nivel correcto para aprobar
    if ($newStatusId !== 99) { // Si NO es rechazo
        $expectedLevel = intval($approvalStatus) + 1;
        
        if ($userApprovalLevel !== $expectedLevel) {
            $conex->rollback();
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "Unauthorized: Your approval level ($userApprovalLevel) does not match the required level ($expectedLevel)."
            ]);
            exit;
        }
    }

    // 5. Actualizar el estado de la orden
    if ($newStatusId === 99) {
        // Rechazo
        $stmt = $conex->prepare("
            UPDATE PremiumFreightApprovals 
            SET act_approv = ?, rejection_reason = ?
            WHERE premium_freight_id = ?
        ");
        $stmt->bind_param("isi", $newStatusId, $rejectionReason, $orderId);
    } else {
        // Aprobación
        $stmt = $conex->prepare("
            UPDATE PremiumFreightApprovals 
            SET act_approv = ?
            WHERE premium_freight_id = ?
        ");
        $stmt->bind_param("ii", $newStatusId, $orderId);
    }

    if (!$stmt->execute()) {
        throw new Exception("Failed to update approval status: " . $stmt->error);
    }
    $stmt->close();

    // 6. Registrar en el historial
    $stmt = $conex->prepare("
        INSERT INTO ApprovalHistory 
        (premium_freight_id, approver_id, approval_level_reached, approved_at, rejection_reason)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("iiiss", $orderId, $userID, $newStatusId, $authDate, $rejectionReason);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to insert approval history: " . $stmt->error);
    }
    $stmt->close();

    // 7. Actualizar estado general de la orden si es necesario
    if ($newStatusId === 99) {
        // Orden rechazada
        $stmt = $conex->prepare("UPDATE PremiumFreight SET status = 'rejected' WHERE id = ?");
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $stmt->close();
    } elseif ($newStatusId >= $requiredAuthLevel) {
        // Orden completamente aprobada
        $stmt = $conex->prepare("UPDATE PremiumFreight SET status = 'approved' WHERE id = ?");
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $stmt->close();
    }

    $conex->commit();
    
    echo json_encode([
        "success" => true,
        "message" => $newStatusId === 99 ? "Order rejected successfully." : "Order approved successfully.",
        "newStatus" => $newStatusId
    ]);

} catch (Exception $e) {
    if (isset($conex)) {
        $conex->rollback();
    }
    error_log("Error in daoStatusUpdate: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Internal server error: " . $e->getMessage()]);
}
?>
