<?php
/**
 * daoOrderProgress.php - Progreso de Aprobación de Órdenes
 * 
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - Migrado a tabla Approvers para obtener aprobadores por nivel
 */

require_once __DIR__ . '/../db/cors_config.php';
header('Content-Type: application/json');
include_once('../db/PFDB.php');
session_start();

// Verificar que el usuario esté logueado
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['message' => 'User not authenticated']);
    exit;
}

// Obtener el ID de la orden
if (!isset($_GET['orderId']) || !is_numeric($_GET['orderId'])) {
    http_response_code(400);
    echo json_encode(['message' => 'Order ID is required']);
    exit;
}

$orderId = intval($_GET['orderId']);
$currentUserPlant = $_SESSION['user']['plant'] ?? null;
$currentUserAuthLevel = $_SESSION['user']['authorization_level'] ?? 0;

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    
    // 1. Obtener información básica de la orden
    $orderSql = "SELECT 
        pf.id,
        pf.premium_freight_number,
        pf.status,
        pf.required_auth_level,
        u.plant as order_plant,
        u.name as creator_name,
        pfa.act_approv as current_approval_level,
        pfa.rejection_reason
    FROM PremiumFreight pf
    LEFT JOIN User u ON pf.id_user = u.id
    LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
    WHERE pf.id = ?";
    
    $stmt = $conex->prepare($orderSql);
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $orderResult = $stmt->get_result();
    
    if ($orderResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['message' => 'Order not found']);
        exit;
    }
    
    $orderInfo = $orderResult->fetch_assoc();
    $orderPlant = $orderInfo['order_plant'];
    
    // 2. Verificar permisos de acceso según planta
    if ($currentUserAuthLevel < 4 && $currentUserPlant !== null && $currentUserPlant != $orderPlant) {
        http_response_code(403);
        echo json_encode(['message' => 'You do not have permission to view this order']);
        exit;
    }
    
    // 3. Obtener estado actual de aprobación
    $currentApprovalLevel = intval($orderInfo['current_approval_level']);
    $rejectionReason = $orderInfo['rejection_reason'];
    $isRejected = ($currentApprovalLevel === 99);
    
    // 4. Obtener historial de aprobaciones
    $historySql = "SELECT 
        ah.id,
        ah.approver_id,
        ah.approval_level_reached,
        ah.approved_at,
        ah.rejection_reason,
        u.name as approver_name,
        u.email as approver_email
    FROM ApprovalHistory ah
    LEFT JOIN User u ON ah.approver_id = u.id
    WHERE ah.premium_freight_id = ?
    ORDER BY ah.approved_at ASC";
    
    $stmt = $conex->prepare($historySql);
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $historyResult = $stmt->get_result();
    
    $approvalHistory = [];
    while ($row = $historyResult->fetch_assoc()) {
        $approvalHistory[] = $row;
    }
    
    // 5. NUEVO: Construir línea de tiempo de aprobación usando tabla Approvers
    $requiredLevel = intval($orderInfo['required_auth_level']);
    $approvalTimeline = [];
    
    for ($level = 1; $level <= $requiredLevel; $level++) {
        // ACTUALIZADO: Buscar aprobadores desde tabla Approvers
        $approverSql = "SELECT 
            u.id,
            u.name,
            u.email,
            u.role,
            a.approval_level,
            a.plant
        FROM Approvers a
        INNER JOIN User u ON a.user_id = u.id
        WHERE a.approval_level = ? 
        AND (a.plant = ? OR a.plant IS NULL)
        ORDER BY a.plant ASC, u.name ASC
        LIMIT 1";
        
        $stmt = $conex->prepare($approverSql);
        $stmt->bind_param("is", $level, $orderPlant);
        $stmt->execute();
        $approverResult = $stmt->get_result();
        
        $approver = null;
        if ($approverResult->num_rows > 0) {
            $approver = $approverResult->fetch_assoc();
        }
        
        // Buscar en el historial si este nivel fue aprobado
        $historyItem = null;
        foreach ($approvalHistory as $history) {
            if ($history['approval_level_reached'] == $level) {
                $historyItem = $history;
                break;
            }
        }
        
        $status = 'pending';
        if ($isRejected && $level > $currentApprovalLevel) {
            $status = 'skipped';
        } elseif ($level <= $currentApprovalLevel && !$isRejected) {
            $status = 'approved';
        } elseif ($level == $currentApprovalLevel + 1 && !$isRejected) {
            $status = 'current';
        }
        
        $approvalTimeline[] = [
            'level' => $level,
            'status' => $status,
            'approver' => $approver,
            'history' => $historyItem
        ];
    }
    
    // 6. Preparar respuesta
    $response = [
        'success' => true,
        'order' => [
            'id' => $orderInfo['id'],
            'premium_freight_number' => $orderInfo['premium_freight_number'],
            'status' => $orderInfo['status'],
            'current_approval_level' => $currentApprovalLevel,
            'required_auth_level' => $requiredLevel,
            'is_rejected' => $isRejected,
            'rejection_reason' => $rejectionReason,
            'order_plant' => $orderPlant,
            'creator_name' => $orderInfo['creator_name']
        ],
        'approval_timeline' => $approvalTimeline,
        'approval_history' => $approvalHistory
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Error in daoOrderProgress: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}
?>
