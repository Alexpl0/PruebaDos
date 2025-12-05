<?php
/**
 * daoUpdateBusiness.php - Business Logic for Edit Order Updates
 * Determines scenario, finds next approver, handles reactivation
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

include_once('../db/PFDB.php');

error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use GET."
    ]);
    exit;
}

$orderId = isset($_GET['orderId']) ? intval($_GET['orderId']) : null;

if (!$orderId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Order ID required"
    ]);
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // Get order details
    $orderStmt = $conex->prepare("
        SELECT 
            pf.id,
            pf.user_id,
            pf.required_auth_level,
            pfa.act_approv
        FROM PremiumFreight pf
        LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
        WHERE pf.id = ?
    ");
    $orderStmt->bind_param("i", $orderId);
    $orderStmt->execute();
    $orderResult = $orderStmt->get_result();

    if ($orderResult->num_rows === 0) {
        throw new Exception("Order not found");
    }

    $order = $orderResult->fetch_assoc();
    $orderStmt->close();

    $actApprov = intval($order['act_approv'] ?? 0);
    $requiredAuthLevel = intval($order['required_auth_level'] ?? 1);
    $userId = intval($order['user_id']);

    $scenario = '';
    $nextApprover = null;
    $reactivationRequired = false;

    error_log("Scenario analysis - act_approv: $actApprov, required_auth_level: $requiredAuthLevel");

    // SCENARIO DETERMINATION
    if ($actApprov === 99) {
        // Escenario 2: Order was rejected - needs reactivation
        $scenario = 'SCENARIO_2_REJECTED';
        $reactivationRequired = true;
        error_log("Scenario 2 detected - Order was rejected");

        // Get approval history to find highest level reached before rejection
        $historyStmt = $conex->prepare("
            SELECT MAX(approval_level_reached) as max_level
            FROM ApprovalHistory
            WHERE premium_freight_id = ? AND action_type != 'REJECTED'
            ORDER BY action_timestamp DESC
            LIMIT 1
        ");
        $historyStmt->bind_param("i", $orderId);
        $historyStmt->execute();
        $historyResult = $historyStmt->get_result();
        
        if ($historyResult->num_rows > 0) {
            $historyRow = $historyResult->fetch_assoc();
            $maxLevel = intval($historyRow['max_level'] ?? 0);
            
            // Delete rejection from history
            $deleteRejectStmt = $conex->prepare("
                DELETE FROM ApprovalHistory
                WHERE premium_freight_id = ? AND action_type = 'REJECTED'
            ");
            $deleteRejectStmt->bind_param("i", $orderId);
            $deleteRejectStmt->execute();
            $deleteRejectStmt->close();
            
            // Update act_approv to the highest level reached
            $reactivateStmt = $conex->prepare("
                UPDATE PremiumFreightApprovals
                SET act_approv = ?
                WHERE premium_freight_id = ?
            ");
            $reactivateStmt->bind_param("ii", $maxLevel, $orderId);
            $reactivateStmt->execute();
            $reactivateStmt->close();
            
            $actApprov = $maxLevel;
            error_log("Order reactivated - set act_approv to: $maxLevel");
        }
        $historyStmt->close();

    } else if ($actApprov < $requiredAuthLevel) {
        // Escenario 1: Order in progress - needs more approvals
        $scenario = 'SCENARIO_1_IN_PROGRESS';
        error_log("Scenario 1 detected - Order in approval process");

    } else if ($actApprov === $requiredAuthLevel) {
        // Escenario 3: Order fully approved
        $scenario = 'SCENARIO_3_FULLY_APPROVED';
        error_log("Scenario 3 detected - Order fully approved");
    }

    // Find next approver for Scenario 1 and 2
    if ($scenario !== 'SCENARIO_3_FULLY_APPROVED') {
        $nextLevel = $actApprov + 1;
        
        $approverStmt = $conex->prepare("
            SELECT u.id, u.name, u.email, u.role
            FROM Approvers a
            INNER JOIN User u ON a.user_id = u.id
            WHERE a.approval_level = ? 
            LIMIT 1
        ");
        $approverStmt->bind_param("i", $nextLevel);
        $approverStmt->execute();
        $approverResult = $approverStmt->get_result();

        if ($approverResult->num_rows > 0) {
            $nextApprover = $approverResult->fetch_assoc();
            error_log("Next approver found - ID: {$nextApprover['id']}, Name: {$nextApprover['name']}");
        } else {
            error_log("No approver found for level: $nextLevel");
        }
        $approverStmt->close();
    }

    $conex->close();

    echo json_encode([
        "success" => true,
        "scenario" => $scenario,
        "actApprov" => $actApprov,
        "requiredAuthLevel" => $requiredAuthLevel,
        "nextApprover" => $nextApprover,
        "reactivationRequired" => $reactivationRequired,
        "orderId" => $orderId
    ]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Business logic error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>