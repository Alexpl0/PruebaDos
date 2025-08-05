<?php
/**
 * daoWarningCards.php - Fetches orders that require attention.
 *
 * This endpoint returns a non-paginated list of orders that meet specific criteria:
 * 1. Orders where recovery_file exists, but recovery_evidence is missing.
 * 2. Orders that are not fully approved (status is white or yellow).
 * It respects the user's plant assignment for data segregation.
 */
header('Content-Type: application/json');
include_once('../db/PFDB.php');

// Start session and verify user authentication
session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'User not authenticated']);
    exit;
}

// Get the user's plant from the session
$userPlant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;

try {
    // Establish database connection
    $con = new LocalConector();
    $conex = $con->conectar();

    // --- Build WHERE and HAVING clauses for the SQL query ---
    $whereClauses = [];
    $params = [];
    $paramTypes = '';

    // Base filter by plant (if the user has one assigned)
    // This is crucial for data segregation.
    if ($userPlant !== null && $userPlant !== '') {
        $whereClauses[] = "u.plant = ?";
        $params[] = $userPlant;
        $paramTypes .= 's';
    }

    $whereSql = '';
    if (!empty($whereClauses)) {
        $whereSql = ' WHERE ' . implode(' AND ', $whereClauses);
    }
    
    // The main filtering logic is moved to a HAVING clause.
    // HAVING is executed after columns are selected and calculated,
    // allowing us to filter by aliases like `approval_status`.

    $sql = "
        SELECT 
            pf.*,
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
            st.id as status_id,
            st.name AS status_name,
            (SELECT pfa.act_approv FROM PremiumFreightApprovals pfa WHERE pfa.premium_freight_id = pf.id ORDER BY pfa.id DESC LIMIT 1) AS approval_status,
            (SELECT u_approver.name FROM PremiumFreightApprovals pfa JOIN User u_approver ON pfa.user_id = u_approver.id WHERE pfa.premium_freight_id = pf.id ORDER BY pfa.id DESC LIMIT 1) AS approver_name
        FROM PremiumFreight pf
        LEFT JOIN Carriers c ON pf.carrier_id = c.id
        LEFT JOIN User u ON pf.user_id = u.id
        LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
        LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
        LEFT JOIN Status st ON pf.status_id = st.id
    " . $whereSql . " 
    HAVING 
        -- Condition 1: Missing recovery evidence
        (
            (pf.recovery_file IS NOT NULL AND pf.recovery_file <> '') AND 
            (pf.recovery_evidence IS NULL OR pf.recovery_evidence = '')
        )
        OR
        -- Condition 2: Not fully approved (white/yellow status)
        (
            COALESCE(approval_status, 0) < pf.required_auth_level AND 
            COALESCE(approval_status, 0) <> 99
        )
    ORDER BY pf.id DESC";

    $stmt = $conex->prepare($sql);
    if (!empty($params)) {
        $stmt->bind_param($paramTypes, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        // Ensure approval_status is a number for frontend consistency
        $row['approval_status'] = $row['approval_status'] === null ? 0 : (int)$row['approval_status'];
        $datos[] = $row;
    }

    // --- Final JSON response (without pagination) ---
    $response = [
        'status' => 'success', 
        'data' => $datos,
    ];

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    // Close connections
    $stmt->close();
    $conex->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
