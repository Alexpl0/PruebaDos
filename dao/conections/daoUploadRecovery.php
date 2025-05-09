<?php
include_once('../db/db.php');
session_start();

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

// Verificar si hay un ID de orden
if (!isset($_POST['premium_freight_id']) || empty($_POST['premium_freight_id'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Missing premium freight ID"
    ]);
    exit;
}

// Verificar si se subió un archivo
if (!isset($_FILES['recoveryFile']) || $_FILES['recoveryFile']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "No file uploaded or upload error: " . ($_FILES['recoveryFile']['error'] ?? 'Unknown error')
    ]);
    exit;
}

// Validar tipo de archivo (debe ser PDF)
$fileType = mime_content_type($_FILES['recoveryFile']['tmp_name']);
if ($fileType !== 'application/pdf') {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid file type. Only PDF files are allowed."
    ]);
    exit;
}

// Crear directorio para almacenar archivos si no existe
$uploadDir = __DIR__ . '/../../assets/files/recovery/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generar nombre de archivo único
$premiumFreightId = (int)$_POST['premium_freight_id'];
$timestamp = time();
$filename = "recovery_{$premiumFreightId}_{$timestamp}.pdf";
$filePath = $uploadDir . $filename;

// Mover el archivo subido al directorio destino
if (!move_uploaded_file($_FILES['recoveryFile']['tmp_name'], $filePath)) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to save file"
    ]);
    exit;
}

try {
    // Conectar a la base de datos
    $con = new LocalConector();
    $conex = $con->conectar();
    
    // Guardar referencia al archivo en la base de datos
    $sql = "UPDATE PremiumFreight SET recovery_file = ? WHERE id = ?";
    $stmt = $conex->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }
    
    // Ruta relativa para almacenar en la base de datos
    $relativeFilePath = "assets/files/recovery/{$filename}";
    
    $stmt->bind_param("si", $relativeFilePath, $premiumFreightId);
    
    if (!$stmt->execute()) {
        throw new Exception("Error executing statement: " . $stmt->error);
    }
    
    $stmt->close();
    $conex->close();
    
    // Responder con éxito
    echo json_encode([
        "success" => true,
        "message" => "Recovery file uploaded successfully",
        "file_path" => $relativeFilePath
    ]);
    
} catch (Exception $e) {
    // Eliminar el archivo si hubo un error en la base de datos
    if (file_exists($filePath)) {
        unlink($filePath);
    }
    
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>