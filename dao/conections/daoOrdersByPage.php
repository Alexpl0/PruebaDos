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

// --- Parámetros de Paginación y Búsqueda ---
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 24; // 24 órdenes por página por defecto
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;   // Página por defecto es 1
$searchQuery = isset($_GET['search']) ? $_GET['search'] : '';
$offset = ($page - 1) * $limit;

$userPlant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    // --- Construcción de la cláusula WHERE y parámetros ---
    $whereClauses = [];
    $params = [];
    $paramTypes = '';

    // Filtro por planta (si el usuario tiene una asignada)
    if ($userPlant !== null && $userPlant !== '') {
        $whereClauses[] = "u.plant = ?";
        $params[] = $userPlant;
        $paramTypes .= 's';
    }

    // Filtro por término de búsqueda
    if (!empty($searchQuery)) {
        // Busca en el ID de la orden o en la descripción
        $whereClauses[] = "(pf.id LIKE ? OR pf.description LIKE ?)";
        $searchTerm = "%{$searchQuery}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $paramTypes .= 'ss';
    }

    $whereSql = '';
    if (!empty($whereClauses)) {
        $whereSql = ' WHERE ' . implode(' AND ', $whereClauses);
    }

    // --- Obtener el conteo total de registros para la paginación ---
    $countSql = "SELECT COUNT(DISTINCT pf.id) as total FROM PremiumFreight pf LEFT JOIN User u ON pf.user_id = u.id" . $whereSql;
    $stmtCount = $conex->prepare($countSql);
    if (!empty($params)) {
        $stmtCount->bind_param($paramTypes, ...$params);
    }
    $stmtCount->execute();
    $totalResult = $stmtCount->get_result()->fetch_assoc();
    $totalRecords = $totalResult['total'];
    $stmtCount->close();

    // --- Obtener los datos paginados ---
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
            (SELECT pfa.id FROM PremiumFreightApprovals pfa WHERE pfa.premium_freight_id = pf.id ORDER BY pfa.id DESC LIMIT 1) AS approval_id,
            (SELECT pfa.approval_date FROM PremiumFreightApprovals pfa WHERE pfa.premium_freight_id = pf.id ORDER BY pfa.id DESC LIMIT 1) AS approval_date,
            (SELECT pfa.act_approv FROM PremiumFreightApprovals pfa WHERE pfa.premium_freight_id = pf.id ORDER BY pfa.id DESC LIMIT 1) AS approval_status,
            (SELECT u_approver.name FROM PremiumFreightApprovals pfa JOIN User u_approver ON pfa.user_id = u_approver.id WHERE pfa.premium_freight_id = pf.id ORDER BY pfa.id DESC LIMIT 1) AS approver_name
        FROM PremiumFreight pf
        LEFT JOIN Carriers c ON pf.carrier_id = c.id
        LEFT JOIN User u ON pf.user_id = u.id
        LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
        LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
        LEFT JOIN Status st ON pf.status_id = st.id
    " . $whereSql . " ORDER BY pf.id DESC LIMIT ? OFFSET ?";

    // Añadir límite y offset a los parámetros para la consulta de datos
    $dataParams = $params;
    $dataParams[] = $limit;
    $dataParams[] = $offset;
    $dataParamTypes = $paramTypes . 'ii';

    $stmt = $conex->prepare($sql);
    if (!empty($dataParams)) {
        $stmt->bind_param($dataParamTypes, ...$dataParams);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }

    // --- Respuesta Final en formato JSON ---
    $response = [
        'status' => 'success', 
        'data' => $datos,
        'pagination' => [
            'total' => (int)$totalRecords,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => ceil($totalRecords / $limit)
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
