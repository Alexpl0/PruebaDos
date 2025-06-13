<?php
// Habilitar reporte de errores
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
include_once('../db/PFDB.php');

try {
    // Verificar que se está recibiendo la petición
    $rawData = file_get_contents('php://input');
    
    // Get input data
    $data = json_decode($rawData, true);
    $userId = isset($data['userId']) ? intval($data['userId']) : 0;

    // Verificar que el JSON se decodificó correctamente
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding JSON: ' . json_last_error_msg());
    }

    // Validate user ID
    if ($userId <= 0) {
        throw new Exception('Invalid user ID provided');
    }

    // Get database connection using your existing LocalConector class
    $con = new LocalConector();
    $conex = $con->conectar();
    
    if (!$conex) {
        throw new Exception('Could not establish database connection');
    }

    // Query to fetch orders created by the specified user (usando MySQLi como en tu daoPremiumFreight.php)
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
        WHERE pf.user_id = ?
        ORDER BY pf.id DESC";
    
    // Usar prepared statement con MySQLi
    $stmt = $conex->prepare($query);
    if (!$stmt) {
        throw new Exception('Error preparing query: ' . $conex->error);
    }
    
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }
    
    // Return success response with orders (siguiendo el formato de tu JS)
    echo json_encode([
        'success' => true,
        'orders' => $orders
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    $stmt->close();
    $conex->close();
    
} catch (Exception $e) {
    // Return error response
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>