<?php
header('Content-Type: application/json');
include_once('../db/PFDB.php');

// Verificar que el usuario esté autenticado
session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'User not authenticated']);
    exit;
}

$userPlant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
$userAuthLevel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    // ================== MODIFICADO: Consulta SQL actualizada con JOIN a NumOrders ==================
    // Se reemplaza pf.* para listar explícitamente las columnas y evitar conflictos.
    // Se añade un LEFT JOIN a NumOrders y se selecciona no.Number como 'reference_number'.
    $sql = "
        SELECT 
            pf.id, pf.user_id, pf.date, pf.planta, pf.code_planta, pf.transport, 
            pf.in_out_bound, pf.cost_euros, pf.description, pf.area, pf.int_ext, 
            pf.paid_by, pf.category_cause, pf.project_status, pf.recovery, 
            pf.weight, pf.measures, pf.products, pf.carrier_id, pf.quoted_cost, 
            pf.reference, pf.origin_id, pf.destiny_id, pf.status_id, 
            pf.required_auth_level, pf.moneda,
            
            no.Number AS reference_number, -- Se trae el número de la orden y se renombra

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
            u_approver.role AS approver_role
        FROM PremiumFreight pf
        LEFT JOIN NumOrders no ON pf.reference_number = no.ID -- El JOIN se hace por el ID
        LEFT JOIN Carriers c ON pf.carrier_id = c.id
        LEFT JOIN User u ON pf.user_id = u.id
        LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
        LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
        LEFT JOIN Status st ON pf.status_id = st.id
        LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
        LEFT JOIN User u_approver ON pfa.user_id = u_approver.id
    ";
    // =========================================================================================

    // El resto de la lógica para filtrar y ordenar permanece igual
    if ($userPlant !== null && $userPlant !== '') {
        $sql .= " WHERE u.plant = ?";
        $stmt = $conex->prepare($sql . " ORDER BY pf.id DESC");
        $stmt->bind_param("s", $userPlant);
    } else {
        $stmt = $conex->prepare($sql . " ORDER BY pf.id DESC");
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }

    $response = [
        'status' => 'success', 
        'data' => $datos,
        'user_info' => [
            'plant' => $userPlant,
            'authorization_level' => $userAuthLevel
        ]
    ];

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conex->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
