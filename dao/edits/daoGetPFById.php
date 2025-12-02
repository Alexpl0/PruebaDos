<?php
/**
 * daoGetPFById.php - Get Single Premium Freight Order by ID
 * Returns only ONE order by ID - used for edit form population
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../db/PFDB.php';

$orderId = isset($_GET['id']) ? intval($_GET['id']) : null;

if (!$orderId) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Order ID is required'
    ]);
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    $sql = "
        SELECT 
            pf.*,
            p.productName AS products,
            no.Number AS reference_number,
            no.Name AS reference_name,
            u.name AS creator_name,
            u.email AS creator_email,
            u.role AS creator_role,
            u.plant AS creator_plant,
            lo_from.company_name AS origin_company_name,
            lo_from.city AS origin_city,
            lo_from.state AS origin_state,
            lo_from.zip AS origin_zip,
            lo_to.company_name AS destiny_company_name,
            lo_to.city AS destiny_city,
            lo_to.state AS destiny_state,
            lo_to.zip AS destiny_zip,
            c.name AS carrier,
            st.id AS statusid,
            st.name AS status_name,
            pfa.id AS approval_id,
            pfa.approval_date,
            pfa.act_approv AS approval_status,
            u_approver.name AS approver_name,
            u_approver.email AS approver_email,
            u_approver.role AS approver_role,
            cap.cap_id,
            cap.corrective_action,
            cap.person_responsible,
            cap.due_date,
            cap.status AS corrective_action_status,
            cap.creation_date AS corrective_action_creation_date,
            last_approver.name AS last_approver_name,
            last_approver.email AS last_approver_email
        FROM PremiumFreight pf
        LEFT JOIN Products p ON pf.products = p.id
        LEFT JOIN NumOrders no ON pf.reference_number = no.ID
        LEFT JOIN Carriers c ON pf.carrier_id = c.id
        LEFT JOIN User u ON pf.user_id = u.id
        LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
        LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
        LEFT JOIN Status st ON pf.status_id = st.id
        LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
        LEFT JOIN User u_approver ON pfa.user_id = u_approver.id
        LEFT JOIN CorrectiveActionPlan cap ON pf.id = cap.premium_freight_id
        LEFT JOIN (
            SELECT ah1.premium_freight_id, ah1.user_id
            FROM ApprovalHistory ah1
            WHERE ah1.action_type = 'APPROVED'
            AND ah1.action_timestamp = (
                SELECT MAX(ah2.action_timestamp)
                FROM ApprovalHistory ah2
                WHERE ah2.premium_freight_id = ah1.premium_freight_id
                AND ah2.action_type = 'APPROVED'
            )
        ) last_approval ON pf.id = last_approval.premium_freight_id
        LEFT JOIN User last_approver ON last_approval.user_id = last_approver.id
        WHERE pf.id = ?
        LIMIT 1
    ";

    $stmt = $conex->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare error: " . $conex->error);
    }

    $stmt->bind_param("i", $orderId);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute error: " . $stmt->error);
    }

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Order not found'
        ]);
        $stmt->close();
        $conex->close();
        exit;
    }

    $orderData = $result->fetch_assoc();
    $stmt->close();

    // Organize corrective action plan if exists
    if (!empty($orderData['cap_id'])) {
        $orderData['corrective_action_plan'] = [
            'cap_id' => $orderData['cap_id'],
            'corrective_action' => $orderData['corrective_action'],
            'person_responsible' => $orderData['person_responsible'],
            'due_date' => $orderData['due_date'],
            'status' => $orderData['corrective_action_status'],
            'creation_date' => $orderData['corrective_action_creation_date']
        ];
    } else {
        $orderData['corrective_action_plan'] = null;
    }

    // Clean up duplicate fields
    unset($orderData['cap_id'], $orderData['corrective_action'], $orderData['person_responsible'], 
          $orderData['due_date'], $orderData['corrective_action_status'], $orderData['corrective_action_creation_date']);

    $conex->close();

    echo json_encode([
        'success' => true,
        'message' => 'Order retrieved successfully',
        'data' => $orderData
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>