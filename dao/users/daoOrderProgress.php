<?php
// filepath: c:\Users\Ex-Perez-J\OneDrive - GRAMMER AG\Desktop\PruebaDos\dao\users\daoOrderProgress.php
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
$currentUserId = $_SESSION['user']['id'];
$currentUserPlant = $_SESSION['user']['plant'] ?? null;

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
    $currentUserAuthLevel = $_SESSION['user']['authorization_level'] ?? 0;
    
    if ($currentUserAuthLevel < 4 && $currentUserPlant != $orderPlant) {
        echo json_encode([
            'success' => false,
            'error_type' => 'plant_restriction',
            'message' => "You don't have permission to view orders from plant $orderPlant. You can only view orders from your plant ($currentUserPlant).",
            'details' => [
                'user_plant' => $currentUserPlant,
                'order_plant' => $orderPlant,
                'user_auth_level' => $currentUserAuthLevel,
                'required_auth_level' => 4
            ]
        ]);
        exit;
    }
    
    // 3. Verificar que el usuario actual sea el creador de la orden
    if ($orderInfo['user_id'] != $currentUserId) {
        echo json_encode([
            'success' => true,
            'showProgress' => false,
            'error_type' => 'not_creator',
            'message' => 'Progress line is only available for the order creator',
            'details' => [
                'creator_name' => $orderInfo['creator_name'],
                'can_view_order' => true,
                'can_view_progress' => false
            ]
        ]);
        exit;
    }
    
    // 4. Obtener estado actual de aprobación
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
    $lastApproverId = null;
    $isRejected = false;
    
    if ($approvalResult->num_rows > 0) {
        $approvalInfo = $approvalResult->fetch_assoc();
        $currentApprovalLevel = intval($approvalInfo['act_approv']);
        $rejectionReason = $approvalInfo['rejection_reason'];
        $lastApproverId = $approvalInfo['last_approver_id'];
        $isRejected = ($currentApprovalLevel === 99);
    }
    
    // 5. Obtener lista de aprobadores necesarios
    $requiredLevel = intval($orderInfo['required_auth_level']);
    $approvers = [];
    
    for ($level = 1; $level <= $requiredLevel; $level++) {
        // Buscar aprobadores para este nivel
        $approverSql = "SELECT 
                            id,
                            name, 
                            role,
                            authorization_level,
                            plant
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
            $approvers[] = [
                'level' => $level,
                'id' => $approver['id'],
                'name' => $approver['name'],
                'role' => $approver['role'],
                'authorization_level' => $approver['authorization_level'],
                'plant' => $approver['plant'],
                'isCompleted' => !$isRejected && $currentApprovalLevel >= $level,
                'isCurrent' => !$isRejected && $currentApprovalLevel + 1 === $level,
                'isRejectedHere' => $isRejected && $approver['id'] == $lastApproverId
            ];
        } else {
            // No se encontró aprobador para este nivel
            error_log("No approver found for level $level and plant $orderPlant");
        }
    }
    
    // 6. Verificar que tengamos todos los aprobadores necesarios
    if (count($approvers) < $requiredLevel) {
        echo json_encode([
            'success' => false,
            'error_type' => 'incomplete_approver_chain',
            'message' => 'Could not find all required approvers for this order. Please contact the system administrator.',
            'details' => [
                'required_levels' => $requiredLevel,
                'found_approvers' => count($approvers),
                'order_plant' => $orderPlant
            ]
        ]);
        exit;
    }
    
    // 7. Calcular porcentaje de progreso
    $progressPercentage = 0;
    if ($isRejected) {
        // Si está rechazada, encontrar en qué nivel se rechazó
        foreach ($approvers as $index => $approver) {
            if ($approver['isRejectedHere']) {
                $progressPercentage = (($index + 1) / count($approvers)) * 100;
                break;
            }
        }
    } else {
        // Progreso normal
        if ($currentApprovalLevel >= $requiredLevel) {
            $progressPercentage = 100; // Completamente aprobada
        } else {
            $progressPercentage = ($currentApprovalLevel / $requiredLevel) * 100;
        }
    }
    
    $response = [
        'success' => true,
        'showProgress' => true,
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
        'details' => [
            'error_message' => $e->getMessage(),
            'order_id' => $orderId
        ]
    ]);
}
?>