<?php
/**
 * API endpoint to fetch orders created by a specific user
 */

// Include database connection
header('Content-Type: application/json');
include_once('../db/PFDB.php');

// Get input data
$data = json_decode(file_get_contents('php://input'), true);
$userId = isset($data['userId']) ? intval($data['userId']) : 0;

// Validate user ID
if ($userId <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid user ID'
    ]);
    exit;
}

try {
    // Get database connection
    $con = new LocalConector();
    $conex = $con->conectar();

    // Query to fetch orders created by the specified user
    $query = "SELECT
        pf.*,
        u.name AS creator_name,
        u.email AS creator_email,
        u.role AS creator_role,
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
        u_approver.role AS approver_role
    FROM PremiumFreight pf
    LEFT JOIN Carriers c ON pf.carrier_id = c.id
    LEFT JOIN User u ON pf.user_id = u.id
    LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
    LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
    LEFT JOIN Status st ON pf.status_id = st.id
    LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
    LEFT JOIN User u_approver ON pfa.user_id = u_approver.id
    WHERE pf.user_id = :userId
    ORDER BY pf.id DESC;";
    
    $stmt = $conex->prepare($query);
    $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
    $stmt->execute();
    
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Return success response with orders
    echo json_encode([
        'success' => true,
        'orders' => $orders
    ]);
    
} catch (PDOException $e) {
    // Return error response
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>