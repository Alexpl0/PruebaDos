<?php
include_once('../db/PFDB.php');

// Habilitar reporte detallado de errores para depuración
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Establecer cabecera para respuesta JSON
header('Content-Type: application/json; charset=utf-8');

// Verificar que la solicitud sea POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Método no permitido
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use POST."
    ]);
    exit;
}

// Obtener el cuerpo de la solicitud y decodificar el JSON recibido
$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

// Registrar los datos entrantes para depuración
error_log("Incoming data: " . print_r($data, true));

// Verificar que los datos se hayan decodificado correctamente
if ($data === null) {
    http_response_code(400); // Solicitud incorrecta
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON data provided."
    ]);
    exit;
}

$requiredFields = [
    'planta', 'code_planta', 'transport', 'in_out_bound', 'cost_euros',
    'description', 'area', 'int_ext', 'paid_by', 'category_cause',
    'project_status', 'recovery', 'weight', 'measures', 'products',
    'carrier', 'quoted_cost', 'num_order_id',
    'origin_id', 'destiny_id', 'moneda'
];

$missingFields = [];
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Missing required fields: " . implode(', ', $missingFields)
    ]);
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");
    $conex->begin_transaction();

    $sql = "INSERT INTO PremiumFreight (
                user_id, date, planta, code_planta, transport, in_out_bound,
                cost_euros, description, area, int_ext, paid_by, category_cause,
                project_status, recovery, weight, measures, products,
                carrier_id, quoted_cost, reference, reference_number,
                origin_id, destiny_id, status_id, required_auth_level, moneda
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )";

    $stmt = $conex->prepare($sql);
    if (!$stmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }

    $userId = isset($data['user_id']) ? intval($data['user_id']) : 1;
    $statusId = isset($data['status_id']) ? intval($data['status_id']) : 1;
    $requiredAuthLevel = isset($data['required_auth_level']) ? intval($data['required_auth_level']) : 1;
    $date = isset($data['date']) ? substr($data['date'], 0, 30) : date('Y-m-d H:i:s');
    $reference = null;
    $referenceNumberId = intval($data['num_order_id']);

    // CORRECCIÓN: Se cambió el tipo de dato para 'quoted_cost' de 's' a 'd' (double).
    $stmt->bind_param(
        "isssssdssssssssidisiisiiis",
        $userId, $date, $data['planta'], $data['code_planta'], $data['transport'],
        $data['in_out_bound'], $data['cost_euros'], $data['description'], $data['area'],
        $data['int_ext'], $data['paid_by'], $data['category_cause'], $data['project_status'],
        $data['recovery'], $data['weight'], $data['measures'], $data['products'],
        $data['carrier'], $data['quoted_cost'], $reference, $referenceNumberId,
        $data['origin_id'], $data['destiny_id'], $statusId, $requiredAuthLevel, $data['moneda']
    );

    if (!$stmt->execute()) {
        $conex->rollback();
        throw new Exception("Error executing statement: " . $stmt->error);
    }

    $premiumFreightId = $stmt->insert_id;
    $stmt->close();

    // Si $premiumFreightId es 0, es muy probable que la clave primaria de la tabla no sea AUTO_INCREMENT
    if (empty($premiumFreightId)) {
        $conex->rollback();
        throw new Exception("Failed to retrieve insert_id. Please check if the primary key of the 'PremiumFreight' table is set to AUTO_INCREMENT.");
    }

    $sqlApproval = "INSERT INTO PremiumFreightApprovals (premium_freight_id, user_id, approval_date, status_id, act_approv) VALUES (?, ?, NOW(), ?, 0)";
    $stmtApproval = $conex->prepare($sqlApproval);
    $stmtApproval->bind_param("iii", $premiumFreightId, $userId, $statusId);
    $stmtApproval->execute();
    $stmtApproval->close();

    $sqlHistory = "INSERT INTO ApprovalHistory (premium_freight_id, user_id, action_type, approval_level_reached, comments) VALUES (?, ?, 'CREATED', 0, 'Order created successfully')";
    $stmtHistory = $conex->prepare($sqlHistory);
    if ($stmtHistory) {
        $stmtHistory->bind_param("ii", $premiumFreightId, $userId);
        $stmtHistory->execute();
        $stmtHistory->close();
    }

    $conex->commit();
    $conex->close();

    echo json_encode([
        "success" => true,
        "message" => "Premium freight order created successfully.",
        "order_id" => $premiumFreightId
    ]);

} catch (Exception $e) {
    if (isset($conex) && $conex->ping()) {
        $conex->rollback();
        $conex->close();
    }
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>
