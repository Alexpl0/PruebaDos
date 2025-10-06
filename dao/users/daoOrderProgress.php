<?php
/**
 * daoOrderProgress.php - Progreso de Aprobación de Órdenes
 * 
 * ACTUALIZACIÓN v2.1 (2025-10-06):
 * - Corregidos los nombres de columnas según estructura real de las tablas
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
    // CORREGIDO: Nombres de columnas según tabla real
    $orderSql = "SELECT 
        pf.id,
        pf.reference_number as premium_freight_number,
        pf.status_id,
        pf.required_auth_level,
        pf.date,
        pf.description,
        pf.cost_euros,
        pf.planta,
        pf.code_planta,
        pf.transport,
        pf.in_out_bound,
        pf.area,
        pf.recovery,
        pf.recovery_file,
        pf.recovery_evidence,
        pf.user_id as creator_id,
        u.plant as order_plant,
        u.name as creator_name,
        pfa.act_approv as current_approval_level,
        pfa.rejection_reason
    FROM PremiumFreight pf
    LEFT JOIN User u ON pf.user_id = u.id
    LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
    WHERE pf.id = ?";
    
    $stmt = $conex->prepare($orderSql);
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conex->error);
    }
    
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $orderResult = $stmt->get_result();
    
    if ($orderResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Order not found'
        ]);
        exit;
    }
    
    $orderInfo = $orderResult->fetch_assoc();
    $orderPlant = $orderInfo['order_plant'];
    
    // 2. Verificar permisos de acceso según planta
    if ($currentUserAuthLevel < 4 && $currentUserPlant !== null && $currentUserPlant != $orderPlant) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'You do not have permission to view this order'
        ]);
        exit;
    }
    
    // 3. Obtener estado actual de aprobación
    $currentApprovalLevel = intval($orderInfo['current_approval_level'] ?? 0);
    $rejectionReason = $orderInfo['rejection_reason'];
    $isRejected = ($currentApprovalLevel === 99);
    
    // 4. Obtener historial de aprobaciones
    // CORREGIDO: approver_id → user_id
    $historySql = "SELECT 
        ah.id,
        ah.user_id as approver_id,
        ah.approval_level_reached,
        ah.action_timestamp as approved_at,
        ah.action_type,
        ah.comments as rejection_reason,
        u.name as approver_name,
        u.email as approver_email
    FROM ApprovalHistory ah
    LEFT JOIN User u ON ah.user_id = u.id
    WHERE ah.premium_freight_id = ?
    ORDER BY ah.action_timestamp ASC";
    
    $stmt = $conex->prepare($historySql);
    if (!$stmt) {
        throw new Exception("Failed to prepare history statement: " . $conex->error);
    }
    
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $historyResult = $stmt->get_result();
    
    $approvalHistory = [];
    while ($row = $historyResult->fetch_assoc()) {
        $approvalHistory[] = $row;
    }
    
    // 5. Construir línea de tiempo de aprobación usando tabla Approvers
    $requiredLevel = intval($orderInfo['required_auth_level']);
    $approvalTimeline = [];
    
    for ($level = 1; $level <= $requiredLevel; $level++) {
        // Buscar aprobadores desde tabla Approvers
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
        if (!$stmt) {
            throw new Exception("Failed to prepare approver statement: " . $conex->error);
        }
        
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
        
        // Determinar estado del nivel
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
    
    // 6. Mapear status_id a texto legible
    $statusText = 'Unknown';
    switch ($orderInfo['status_id']) {
        case 1:
            $statusText = 'Active';
            break;
        case 2:
            $statusText = 'Completed';
            break;
        case 3:
            $statusText = 'Cancelled';
            break;
        case 4:
            $statusText = 'In Progress';
            break;
    }
    
    // 7. Preparar respuesta
    $response = [
        'success' => true,
        'order' => [
            'id' => $orderInfo['id'],
            'premium_freight_number' => $orderInfo['premium_freight_number'],
            'status' => $statusText,
            'status_id' => $orderInfo['status_id'],
            'current_approval_level' => $currentApprovalLevel,
            'required_auth_level' => $requiredLevel,
            'is_rejected' => $isRejected,
            'rejection_reason' => $rejectionReason,
            'order_plant' => $orderPlant,
            'creator_name' => $orderInfo['creator_name'],
            'creator_id' => $orderInfo['creator_id'],
            'date' => $orderInfo['date'],
            'description' => $orderInfo['description'],
            'cost_euros' => $orderInfo['cost_euros'],
            'planta' => $orderInfo['planta'],
            'code_planta' => $orderInfo['code_planta'],
            'transport' => $orderInfo['transport'],
            'in_out_bound' => $orderInfo['in_out_bound'],
            'area' => $orderInfo['area'],
            'recovery' => $orderInfo['recovery'],
            'recovery_file' => $orderInfo['recovery_file'],
            'recovery_evidence' => $orderInfo['recovery_evidence']
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