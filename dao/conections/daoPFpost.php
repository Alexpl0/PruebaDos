<?php
include_once('../db/db.php');

// Establecer cabeceras para JSON
header('Content-Type: application/json; charset=utf-8');

// Verificar si es una solicitud POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use POST."
    ]);
    exit;
}

// Obtener datos JSON del cuerpo de la solicitud
$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

// Verificar si los datos se pudieron decodificar correctamente
if ($data === null) {
    http_response_code(400); // Bad Request
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON data provided."
    ]);
    exit;
}

// Validar campos obligatorios
$requiredFields = [
    'planta', 'code_planta', 'transport', 'in_out_bound', 'cost_euros',
    'description', 'area', 'int_ext', 'paid_by', 'category_cause',
    'project_status', 'recovery', 'weight', 'measures', 'products',
    'carrier', 'quoted_cost', 'reference', 'reference_number',
    'origin_id', 'destiny_id', 'moneda'
];

$missingFields = [];
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    http_response_code(400); // Bad Request
    echo json_encode([
        "success" => false,
        "message" => "Missing required fields: " . implode(', ', $missingFields)
    ]);
    exit;
}

// Validar que los campos numéricos tengan valores válidos
$numericFields = ['cost_euros', 'weight', 'quoted_cost'];
foreach ($numericFields as $field) {
    if (isset($data[$field]) && !is_numeric($data[$field])) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Field '$field' must be a valid number."
        ]);
        exit;
    }
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // Iniciar transacción para asegurar que ambas inserciones se ejecuten juntas
    $conex->begin_transaction();

    // Preparar la consulta SQL para PremiumFreight
    $sql = "INSERT INTO PremiumFreight (
                user_id, date, planta, code_planta, transport, in_out_bound,
                cost_euros, description, area, int_ext, paid_by, category_cause,
                project_status, recovery, weight, measures, products,
                carrier, quoted_cost, reference, reference_number,
                origin_id, destiny_id, status_id, required_auth_level, moneda
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?
            )";

    $stmt = $conex->prepare($sql);

    if (!$stmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }

    // Obtener valor del usuario (usar 1 como valor predeterminado si no está definido)
    $userId = isset($data['user_id']) ? $data['user_id'] : 1;
    
    // Obtener valor del estado (usar 1 como valor predeterminado si no está definido)
    $statusId = isset($data['status_id']) ? $data['status_id'] : 1;
    
    // Obtener el nivel de autorización requerido
    $requiredAuthLevel = isset($data['required_auth_level']) ? $data['required_auth_level'] : 1;
    
    // Asegurar que los valores decimales se formateen correctamente
    $costEuros = floatval($data['cost_euros']);
    $quotedCost = floatval($data['quoted_cost']);
    $weight = floatval($data['weight']);

    // Vincular parámetros con los tipos de datos correctos
    $stmt->bind_param(
        "issssssssssssssssssssiiiis",
        $userId,
        $data['date'],
        $data['planta'],
        $data['code_planta'],
        $data['transport'],
        $data['in_out_bound'],
        $costEuros,
        $data['description'],
        $data['area'],
        $data['int_ext'],
        $data['paid_by'],
        $data['category_cause'],
        $data['project_status'],
        $data['recovery'],
        $weight,
        $data['measures'],
        $data['products'],
        $data['carrier'],
        $quotedCost,
        $data['reference'],
        $data['reference_number'],
        $data['origin_id'],
        $data['destiny_id'],
        $statusId,
        $requiredAuthLevel,
        $data['moneda']
    );

    // Ejecutar la consulta para PremiumFreight
    if (!$stmt->execute()) {
        // Si hay error, revertir la transacción
        $conex->rollback();
        throw new Exception("Error executing statement: " . $stmt->error);
    }
    
    // Obtener el ID de la inserción de PremiumFreight
    $premiumFreightId = $stmt->insert_id;
    $stmt->close();
    
    // Ahora insertar en la tabla PremiumFreightApprovals
    $sqlApproval = "INSERT INTO PremiumFreightApprovals 
                    (premium_freight_id, user_id, approval_date, status_id, act_approv) 
                    VALUES (?, ?, NOW(), ?, 0)";
                    
    $stmtApproval = $conex->prepare($sqlApproval);
    
    if (!$stmtApproval) {
        // Si hay error, revertir la transacción
        $conex->rollback();
        throw new Exception("Error preparing approval statement: " . $conex->error);
    }
    
    // Vincular parámetros para la tabla de aprobaciones
    $stmtApproval->bind_param("iii", $premiumFreightId, $userId, $statusId);
    
    // Ejecutar la inserción en la tabla de aprobaciones
    if (!$stmtApproval->execute()) {
        // Si hay error, revertir la transacción
        $conex->rollback();
        throw new Exception("Error inserting approval record: " . $stmtApproval->error);
    }
    
    $stmtApproval->close();
    
    // Si todo ha ido bien, confirmar la transacción
    $conex->commit();
    
    // Cerrar la conexión
    $conex->close();
    
    echo json_encode([
        "success" => true,
        "message" => "Premium freight order created successfully with approval record.",
        "shipment_id" => $premiumFreightId
    ]);

} catch (Exception $e) {
    // En caso de error, asegurarse de que cualquier transacción abierta se revierta
    if (isset($conex) && $conex->connect_errno === 0) {
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