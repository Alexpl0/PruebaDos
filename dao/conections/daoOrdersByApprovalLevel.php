<?php
/**
 * daoOrdersByApprovalLevel.php
 * Filtra órdenes que están esperando aprobación de un nivel específico
 * Basado en la lógica: approval_level = (act_approv + 1) y misma planta o regional
 */

header('Content-Type: application/json');
include_once('../db/PFDB.php');

// Verificar que el usuario esté autenticado
session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'User not authenticated']);
    exit;
}

// --- Parámetros de Paginación, Búsqueda y Filtrado ---
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 24;
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$searchQuery = isset($_GET['search']) ? $_GET['search'] : '';
$offset = ($page - 1) * $limit;

// Parámetros de filtrado por nivel de aprobación
$approvalLevel = isset($_GET['approval_level']) ? (int)$_GET['approval_level'] : 0;
$filterPlant = isset($_GET['plant']) ? $_GET['plant'] : null;

// Validar que se haya proporcionado un nivel de aprobación válido
if ($approvalLevel <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid approval level provided']);
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // --- Construcción de la cláusula WHERE y parámetros ---
    $whereClauses = [];
    $params = [];
    $paramTypes = '';

    // FILTRO PRINCIPAL: Órdenes que necesitan aprobación de este nivel específico
    // act_approv + 1 = approval_level
    $requiredActApprov = $approvalLevel - 1;
    $whereClauses[] = "pfa.act_approv = ?";
    $params[] = $requiredActApprov;
    $paramTypes .= 'i';

    // FILTRO: La orden no debe estar completamente aprobada ni rechazada
    $whereClauses[] = "pfa.act_approv != 99"; // No rechazada
    $whereClauses[] = "pfa.act_approv < pf.required_auth_level"; // No completamente aprobada

    // FILTRO DE PLANTA: Misma planta del creador o sin planta (regional)
    if ($filterPlant !== null && $filterPlant !== '') {
        // Si el rol tiene planta específica, filtrar por esa planta
        $whereClauses[] = "u.plant = ?";
        $params[] = $filterPlant;
        $paramTypes .= 's';
    }
    // Si filterPlant es NULL, significa que es regional y puede ver todas las plantas
    // (no agregamos filtro de planta)

    // Filtro por término de búsqueda
    if (!empty($searchQuery)) {
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

    // --- Obtener el conteo total de registros ---
    $countSql = "
        SELECT COUNT(DISTINCT pf.id) as total 
        FROM PremiumFreight pf
        INNER JOIN User u ON pf.user_id = u.id
        INNER JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
    " . $whereSql;

    $stmtCount = $conex->prepare($countSql);
    if (!$stmtCount) {
        throw new Exception('Error preparing count query: ' . $conex->error);
    }

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
            pfa.id AS approval_id,
            pfa.approval_date,
            pfa.act_approv AS approval_status,
            pfa.user_id AS approver_user_id,
            u_approver.name AS approver_name,
            u_approver.email AS approver_email
        FROM PremiumFreight pf
        INNER JOIN User u ON pf.user_id = u.id
        INNER JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
        LEFT JOIN Carriers c ON pf.carrier_id = c.id
        LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
        LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
        LEFT JOIN Status st ON pf.status_id = st.id
        LEFT JOIN User u_approver ON pfa.user_id = u_approver.id
    " . $whereSql . " ORDER BY pf.id DESC LIMIT ? OFFSET ?";

    // Añadir límite y offset a los parámetros
    $dataParams = $params;
    $dataParams[] = $limit;
    $dataParams[] = $offset;
    $dataParamTypes = $paramTypes . 'ii';

    $stmt = $conex->prepare($sql);
    if (!$stmt) {
        throw new Exception('Error preparing data query: ' . $conex->error);
    }

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
        ],
        'filter' => [
            'approval_level' => $approvalLevel,
            'plant' => $filterPlant,
            'required_act_approv' => $requiredActApprov
        ]
    ];

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conex->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error fetching filtered orders: ' . $e->getMessage()
    ]);
}
?>