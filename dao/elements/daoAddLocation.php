<?php

include_once('../db/PFDB.php');

header('Content-Type: application/json; charset=utf-8');

// Asegurarse de que se está usando un método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "error", "message" => "Method not allowed. Use POST."], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Obtener los datos del cuerpo de la solicitud
$postData = json_decode(file_get_contents('php://input'), true);

// Verificar que se recibieron todos los datos necesarios
if (!isset($postData['company_name']) || !isset($postData['city']) || !isset($postData['state']) || !isset($postData['zip'])) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "Missing required data: company_name, city, state, zip"], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Validate zip is numeric
if (!is_numeric($postData['zip'])) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "Zip code must be numeric"], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Sanitize inputs
$companyName = trim($postData['company_name']);
$city = trim($postData['city']);
$state = trim($postData['state']);
$zip = (int)$postData['zip'];

// Check if any required field is empty after trimming
if (empty($companyName) || empty($city) || empty($state)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Required fields cannot be empty"], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // First check if company already exists to prevent duplicates
    $checkQuery = "SELECT id FROM `Location` WHERE company_name = ? AND city = ? AND state = ? LIMIT 1";
    $checkStmt = $conex->prepare($checkQuery);
    $checkStmt->bind_param("sss", $companyName, $city, $state);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        // Company already exists, return its ID
        $row = $checkResult->fetch_assoc();
        $existingId = $row['id'];
        $checkStmt->close();
        $conex->close();
        
        echo json_encode([
            "status" => "success", 
            "message" => "Company already exists", 
            "company_id" => $existingId,
            "is_new" => false
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $checkStmt->close();

    // Preparar la consulta para insertar la nueva ubicación
    $query = "INSERT INTO `Location` (company_name, city, state, zip) VALUES (?, ?, ?, ?)";
    $stmt = $conex->prepare($query);
    
    // Comprobar si la preparación fue exitosa
    if (!$stmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }
    
    // Vincular parámetros
    $stmt->bind_param("sssi", $companyName, $city, $state, $zip);
    
    // Ejecutar la consulta
    $result = $stmt->execute();
    
    if ($result) {
        // Determinar el ID insertado (si la tabla tiene un campo auto-increment)
        $insertedId = $stmt->insert_id;
        
        // Cerrar la declaración
        $stmt->close();
        
        // Devolver éxito y los datos insertados
        echo json_encode([
            "status" => "success", 
            "message" => "Company added successfully", 
            "company_id" => $insertedId,
            "is_new" => true
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    } else {
        throw new Exception("Error executing statement: " . $stmt->error);
    }
    
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>