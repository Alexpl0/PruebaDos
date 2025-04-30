<?php
header('Content-Type: application/json');
include_once('../db/db.php');

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    // Consulta SQL con LEFT JOIN y alias para evitar conflictos de nombres
    $sql = "
        SELECT 
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
            pfa.id AS approval_id,
            pfa.approval_date,
            pfa.act_approv as approval_status,
            u_approver.name AS approver_name,
            u_approver.email AS approver_email,
            u_approver.role AS approver_role
        FROM PremiumFreight pf
        LEFT JOIN User u ON pf.user_id = u.id
        LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
        LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
        LEFT JOIN Status st ON pf.status_id = st.id
        LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
        LEFT JOIN User u_approver ON pfa.user_id = u_approver.id
        ORDER BY pf.id DESC
    ";


    $stmt = $conex->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }

    // Añadir JSON_UNESCAPED_UNICODE para manejar caracteres especiales correctamente
    echo json_encode(['status' => 'success', 'data' => $datos], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conex->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}