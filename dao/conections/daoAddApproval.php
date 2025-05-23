<?php
include_once('../db/PFDB.php');

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
$requiredFields = ['premium_freight_id', 'user_id', 'status_id'];

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

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // Por defecto, act_approv será 0 a menos que se especifique lo contrario
    $actApprov = isset($data['act_approv']) ? intval($data['act_approv']) : 0;

    // Preparar la consulta SQL
    $sql = "INSERT INTO PremiumFreightApprovals 
            (premium_freight_id, user_id, approval_date, status_id, act_approv) 
            VALUES (?, ?, NOW(), ?, ?)";

    $stmt = $conex->prepare($sql);

    if (!$stmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }

    // Vincular parámetros
    $stmt->bind_param("iiii", 
        $data['premium_freight_id'], 
        $data['user_id'], 
        $data['status_id'],
        $actApprov
    );

    // Ejecutar la consulta
    if ($stmt->execute()) {
        $approvalId = $stmt->insert_id;
        
        // Cerrar la declaración y la conexión
        $stmt->close();
        $conex->close();
        
        echo json_encode([
            "success" => true,
            "message" => "Approval record created successfully.",
            "approval_id" => $approvalId
        ]);
    } else {
        throw new Exception("Error executing statement: " . $stmt->error);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>