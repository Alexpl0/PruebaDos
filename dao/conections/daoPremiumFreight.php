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

    // ================== CONSULTA SQL ACTUALIZADA CON CORRECTIVE ACTION PLAN ==================
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
            -- Campos del Corrective Action Plan
            cap.cap_id,
            cap.corrective_action,
            cap.person_responsible,
            cap.due_date,
            cap.status AS corrective_action_status,
            cap.creation_date AS corrective_action_creation_date,
            -- Último aprobador
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
    ";
    // =========================================================================================

    if ($userPlant !== null && $userPlant !== '') {
        $sql .= " WHERE u.plant = ?";
        $stmt = $conex->prepare($sql . " ORDER BY pf.id DESC");
        $stmt->bind_param("s", $userPlant);
    } else {
        $stmt = $conex->prepare($sql . " ORDER BY pf.id DESC");
    }

    $stmt->execute();
    $result = $stmt->get_result();

    // Obtener información de aprobadores para cada orden
    $approversQuery = "
        SELECT 
            ah.premium_freight_id,
            u.authorization_level,
            u.name as approver_name,
            ah.action_type,
            ah.action_timestamp
        FROM ApprovalHistory ah
        INNER JOIN User u ON ah.user_id = u.id
        WHERE ah.premium_freight_id IN (
            SELECT DISTINCT pf.id FROM PremiumFreight pf
            " . ($userPlant !== null && $userPlant !== '' ? "INNER JOIN User u2 ON pf.user_id = u2.id WHERE u2.plant = ?" : "") . "
        )
        AND ah.action_type = 'approved'
        ORDER BY ah.premium_freight_id, u.authorization_level";

    $approversStmt = $conex->prepare($approversQuery);
    if ($userPlant !== null && $userPlant !== '') {
        $approversStmt->bind_param("s", $userPlant);
    }
    $approversStmt->execute();
    $approversResult = $approversStmt->get_result();

    // Organizar aprobadores por orden y nivel
    $orderApprovers = [];
    while ($approver = $approversResult->fetch_assoc()) {
        $orderId = $approver['premium_freight_id'];
        $level = $approver['authorization_level'];
        $orderApprovers[$orderId][$level] = $approver['approver_name'];
    }

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $orderId = $row['id'];
        
        // Agregar información de aprobadores
        $row['approver_level_1'] = $orderApprovers[$orderId][1] ?? '';
        $row['approver_level_2'] = $orderApprovers[$orderId][2] ?? '';
        $row['approver_level_3'] = $orderApprovers[$orderId][3] ?? '';
        $row['approver_level_4'] = $orderApprovers[$orderId][4] ?? '';
        $row['approver_level_5'] = $orderApprovers[$orderId][5] ?? '';
        $row['approver_level_6'] = $orderApprovers[$orderId][6] ?? '';
        $row['approver_level_7'] = $orderApprovers[$orderId][7] ?? '';
        $row['approver_level_8'] = $orderApprovers[$orderId][8] ?? '';
        
        // Organizar información del Corrective Action Plan
        $row['corrective_action_plan'] = null;
        if (!empty($row['cap_id'])) {
            $row['corrective_action_plan'] = [
                'cap_id' => $row['cap_id'],
                'corrective_action' => $row['corrective_action'],
                'person_responsible' => $row['person_responsible'],
                'due_date' => $row['due_date'],
                'status' => $row['corrective_action_status'],
                'creation_date' => $row['corrective_action_creation_date']
            ];
        }
        
        // Limpiar campos duplicados del plan correctivo del nivel principal
        unset($row['cap_id'], $row['corrective_action'], $row['person_responsible'], 
             $row['due_date'], $row['corrective_action_status'], $row['corrective_action_creation_date']);
        
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

// En la parte donde se obtienen los corrective action plans, asegúrate de que la consulta incluya los comentarios:
$correctiveQuery = "
    SELECT 
        cap_id,
        corrective_action,
        person_responsible,
        due_date,
        status,
        comments,
        created_date
    FROM CorrectiveActionPlan 
    WHERE premium_freight_id = ?
";
?>
