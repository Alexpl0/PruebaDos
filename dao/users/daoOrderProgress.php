<?php
require_once __DIR__ . '/../db/cors_config.php';
// daoOrderProgress.php
header('Content-Type: application/json');
include_once('../db/PFDB.php');
session_start();

// Verificar que el usuario esté logueado
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false, 
        'error_type' => 'authentication',
        'message' => 'User not authenticated'
    ]);
    exit;
}

// Obtener el ID de la orden
if (!isset($_GET['orderId']) || !is_numeric($_GET['orderId'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error_type' => 'validation',
        'message' => 'Order ID is required'
    ]);
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
                    pf.user_id, 
                    pf.required_auth_level,
                    u.name as creator_name,
                    u.plant as order_plant
                FROM PremiumFreight pf
                INNER JOIN User u ON pf.user_id = u.id
                WHERE pf.id = ?";
    
    $stmt = $conex->prepare($orderSql);
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $orderResult = $stmt->get_result();
    
    if ($orderResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error_type' => 'not_found',
            'message' => "Order #$orderId does not exist in the system"
        ]);
        exit;
    }
    
    $orderInfo = $orderResult->fetch_assoc();
    $orderPlant = $orderInfo['order_plant'];
    
    // 2. Verificar permisos de acceso según planta
    // Solo usuarios con authorization_level >= 4 pueden ver órdenes de otras plantas
    if ($currentUserAuthLevel < 4 && $currentUserPlant != $orderPlant) {
        echo json_encode([
            'success' => false,
            'error_type' => 'plant_restriction',
            'message' => "You don't have permission to view orders from plant $orderPlant. You can only view orders from your plant ($currentUserPlant)."
        ]);
        exit;
    }
    
    // 3. Obtener estado actual de aprobación
    $approvalSql = "SELECT 
                        act_approv, 
                        user_id as last_approver_id,
                        rejection_reason
                    FROM PremiumFreightApprovals 
                    WHERE premium_freight_id = ?";
    
    $stmt = $conex->prepare($approvalSql);
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $approvalResult = $stmt->get_result();
    
    $currentApprovalLevel = 0;
    $rejectionReason = null;
    $isRejected = false;
    
    if ($approvalResult->num_rows > 0) {
        $approvalInfo = $approvalResult->fetch_assoc();
        $currentApprovalLevel = intval($approvalInfo['act_approv']);
        $rejectionReason = $approvalInfo['rejection_reason'];
        $isRejected = ($currentApprovalLevel === 99);
    }

    // 4. NUEVO: Obtener el historial de aprobaciones con fechas
    $historySql = "SELECT 
                       approval_level, 
                       timestamp, 
                       action 
                   FROM ApprovalHistory 
                   WHERE premium_freight_id = ? 
                   ORDER BY timestamp ASC";
    $stmt = $conex->prepare($historySql);
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $historyResult = $stmt->get_result();
    $historyMap = [];
    while ($row = $historyResult->fetch_assoc()) {
        $historyMap[$row['approval_level']] = $row;
    }
    
    // 5. Obtener lista de aprobadores necesarios
    $requiredLevel = intval($orderInfo['required_auth_level']);
    $approvers = [];
    
    for ($level = 1; $level <= $requiredLevel; $level++) {
        $approverSql = "SELECT id, name, role, authorization_level, plant
                        FROM User 
                        WHERE authorization_level = ? 
                        AND (plant = ? OR plant IS NULL)
                        ORDER BY plant ASC, name ASC
                        LIMIT 1";
        
        $stmt = $conex->prepare($approverSql);
        $stmt->bind_param("is", $level, $orderPlant);
        $stmt->execute();
        $approverResult = $stmt->get_result();
        
        if ($approverResult->num_rows > 0) {
            $approver = $approverResult->fetch_assoc();
            $historyEntry = $historyMap[$level] ?? null;

            $approvers[] = [
                'level' => $level,
                'id' => $approver['id'],
                'name' => $approver['name'],
                'role' => $approver['role'],
                'authorization_level' => $approver['authorization_level'],
                'plant' => $approver['plant'],
                'isCompleted' => !$isRejected && $currentApprovalLevel >= $level,
                'isCurrent' => !$isRejected && $currentApprovalLevel + 1 === $level,
                'isRejectedHere' => $isRejected && $historyEntry && $historyEntry['action'] === 'rejected',
                'actionTimestamp' => $historyEntry['timestamp'] ?? null // <-- NUEVO CAMPO
            ];
        } else {
            error_log("No approver found for level $level and plant $orderPlant");
        }
    }
    
    // 6. Verificar que tengamos todos los aprobadores necesarios
    if (count($approvers) < $requiredLevel) {
        echo json_encode([
            'success' => false,
            'error_type' => 'incomplete_approver_chain',
            'message' => 'Could not find all required approvers for this order. Please contact the system administrator.'
        ]);
        exit;
    }
    
    // 7. Calcular porcentaje de progreso
    $progressPercentage = 0;
    if ($isRejected) {
        foreach ($approvers as $index => $approver) {
            if ($approver['isRejectedHere']) {
                $progressPercentage = (($index + 1) / count($approvers)) * 100;
                break;
            }
        }
    } else {
        if ($currentApprovalLevel >= $requiredLevel) {
            $progressPercentage = 100;
        } else {
            $progressPercentage = ($currentApprovalLevel / $requiredLevel) * 100;
        }
    }
    
    $response = [
        'success' => true,
        'showProgress' => true, // Siempre se muestra
        'error_type' => null,
        'orderInfo' => [
            'creator_name' => $orderInfo['creator_name'],
            'required_level' => $requiredLevel,
            'current_level' => $currentApprovalLevel,
            'is_rejected' => $isRejected,
            'is_completed' => !$isRejected && $currentApprovalLevel >= $requiredLevel,
            'rejection_reason' => $rejectionReason,
            'order_plant' => $orderPlant
        ],
        'approvers' => $approvers,
        'progress' => [
            'percentage' => round($progressPercentage, 1),
            'current_step' => $isRejected ? 'rejected' : ($currentApprovalLevel >= $requiredLevel ? 'completed' : $currentApprovalLevel + 1)
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Error en daoOrderProgress: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error_type' => 'server_error',
        'message' => 'Internal server error',
        'details' => [ 'error_message' => $e->getMessage() ]
    ]);
}
?>
