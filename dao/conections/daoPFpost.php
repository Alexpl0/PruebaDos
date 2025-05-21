<?php
include_once('../db/db.php');

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

// Definir los campos obligatorios que debe contener la solicitud
$requiredFields = [
    'planta', 'code_planta', 'transport', 'in_out_bound', 'cost_euros',
    'description', 'area', 'int_ext', 'paid_by', 'category_cause',
    'project_status', 'recovery', 'weight', 'measures', 'products',
    'carrier', 'quoted_cost', 'reference', 'reference_number',
    'origin_id', 'destiny_id', 'moneda'
];

// Verificar si falta algún campo obligatorio
$missingFields = [];
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    http_response_code(400); // Solicitud incorrecta
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
    // Crear conexión a la base de datos usando la clase LocalConector
    $con = new LocalConector();
    $conex = $con->conectar();

    if (!$conex) {
        throw new Exception("Database connection failed");
    }

    // Establecer el charset para soportar caracteres especiales y emojis
    $conex->set_charset("utf8mb4");

    // Iniciar una transacción para asegurar la integridad de los datos
    $conex->begin_transaction();

    // Preparar la consulta SQL para insertar en la tabla PremiumFreight
    $sql = "INSERT INTO PremiumFreight (
                user_id, date, planta, code_planta, transport, in_out_bound,
                cost_euros, description, area, int_ext, paid_by, category_cause,
                project_status, recovery, weight, measures, products,
                carrier_id, quoted_cost, reference, reference_number,
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

    // Obtener valores de los campos, asegurando tipos y longitudes
    $userId = isset($data['user_id']) ? intval($data['user_id']) : 1;
    $statusId = isset($data['status_id']) ? intval($data['status_id']) : 1;
    $requiredAuthLevel = isset($data['required_auth_level']) ? intval($data['required_auth_level']) : 1;

    // Convertir campos numéricos a su tipo correcto
    $costEuros = floatval($data['cost_euros']);
    $quotedCost = floatval($data['quoted_cost']);
    $weight = floatval($data['weight']);
    $originId = intval($data['origin_id']);
    $destinyId = intval($data['destiny_id']);

    // Limitar la longitud de los campos de texto según la estructura de la base de datos
    $date = isset($data['date']) ? substr($data['date'], 0, 30) : date('Y-m-d H:i:s');
    $planta = substr($data['planta'], 0, 100);
    $codePlanta = substr($data['code_planta'], 0, 50);
    $transport = substr($data['transport'], 0, 50);
    $inOutBound = substr($data['in_out_bound'], 0, 50);

    // *** IMPORTANTE: No limitar el campo description para permitir textos largos ***
    $description = $data['description']; // LONGTEXT soporta hasta 4GB

    $area = substr($data['area'], 0, 100);
    $intExt = substr($data['int_ext'], 0, 50);
    $paidBy = substr($data['paid_by'], 0, 100);
    $categoryCause = substr($data['category_cause'], 0, 100);
    $projectStatus = substr($data['project_status'], 0, 100);
    $recovery = substr($data['recovery'], 0, 100);
    $measures = substr($data['measures'], 0, 100);
    $products = substr($data['products'], 0, 100);
    $carrier = substr($data['carrier'], 0, 100);
    $reference = substr($data['reference'], 0, 100);
    $referenceNumber = substr($data['reference_number'], 0, 100);
    $moneda = substr($data['moneda'], 0, 10);

    // Vincular los parámetros a la consulta preparada
    // Tipos: i = integer, d = double, s = string
    $bindResult = $stmt->bind_param(
        "issssssssssssssssssssiiiis",
        $userId,
        $date,
        $planta,
        $codePlanta,
        $transport,
        $inOutBound,
        $costEuros,
        $description,
        $area,
        $intExt,
        $paidBy,
        $categoryCause,
        $projectStatus,
        $recovery,
        $weight,
        $measures,
        $products,
        $carrier,
        $quotedCost,
        $reference,
        $referenceNumber,
        $originId,
        $destinyId,
        $statusId,
        $requiredAuthLevel,
        $moneda
    );

    if (!$bindResult) {
        throw new Exception("Error binding parameters: " . $stmt->error);
    }

    // Ejecutar la consulta para insertar en PremiumFreight
    if (!$stmt->execute()) {
        // Si hay error, revertir la transacción
        $conex->rollback();
        throw new Exception("Error executing statement: " . $stmt->error);
    }

    // Obtener el ID del registro recién insertado
    $premiumFreightId = $stmt->insert_id;

    if (!$premiumFreightId) {
        $conex->rollback();
        throw new Exception("Failed to get last insert ID");
    }

    $stmt->close();

    // Insertar registro en la tabla de aprobaciones (PremiumFreightApprovals)
    $sqlApproval = "INSERT INTO PremiumFreightApprovals 
                    (premium_freight_id, user_id, approval_date, status_id, act_approv) 
                    VALUES (?, ?, NOW(), ?, 0)";

    $stmtApproval = $conex->prepare($sqlApproval);

    if (!$stmtApproval) {
        $conex->rollback();
        throw new Exception("Error preparing approval statement: " . $conex->error);
    }

    // Vincular parámetros para la tabla de aprobaciones
    $bindApprovalResult = $stmtApproval->bind_param("iii", 
        $premiumFreightId, 
        $userId, 
        $statusId
    );

    if (!$bindApprovalResult) {
        $conex->rollback();
        throw new Exception("Error binding approval parameters: " . $stmtApproval->error);
    }

    // Ejecutar la inserción en la tabla de aprobaciones
    if (!$stmtApproval->execute()) {
        $conex->rollback();
        throw new Exception("Error inserting approval record: " . $stmtApproval->error);
    }

    $stmtApproval->close();

    // Obtener el nombre del usuario creador
    $sqlUser = "SELECT name as userName FROM User WHERE id = ?";
    $stmtUser = $conex->prepare($sqlUser);
    $stmtUser->bind_param("i", $userId);
    $stmtUser->execute();
    $stmtUser->bind_result($userName);
    $stmtUser->fetch();
    $stmtUser->close();

    // Confirmar la transacción si todo salió bien
    $conex->commit();

    // Cerrar la conexión a la base de datos
    $conex->close();

    // Responder con éxito y el ID del nuevo registro
    echo json_encode([
        "success" => true,
        "message" => "Premium freight order created successfully with approval record.",
        "shipment_id" => $premiumFreightId,
        "user_name" => $userName
    ]);

} catch (Exception $e) {
    // Registrar información detallada del error para depuración
    error_log("PremiumFreight insertion error: " . $e->getMessage());
    error_log("Error occurred in file: " . $e->getFile() . " on line " . $e->getLine());
    error_log("Stack trace: " . $e->getTraceAsString());

    // Registrar error SQL si aplica
    if (isset($stmt) && $stmt) {
        error_log("SQL Error: " . $stmt->error);
    }

    // Revertir la transacción si la conexión está activa
    if (isset($conex) && $conex->connect_errno === 0) {
        $conex->rollback();
        $conex->close();
    }

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage(),
        "details" => "Check server logs for more information"
    ]);
}

// https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFpost.php
?>