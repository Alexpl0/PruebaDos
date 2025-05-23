<?php
include_once('../../config.php'); // Incluir la constante URL
include_once('../db/PFDB.php');
session_start();

// Establecer cabeceras para JSON
header('Content-Type: application/json; charset=utf-8');

// Verificar si es una solicitud POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use POST."
    ]);
    exit;
}

// Verificar campos requeridos
$requiredFields = ['premium_freight_id', 'userName'];
foreach ($requiredFields as $field) {
    if (empty($_POST[$field])) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Missing required field: $field"
        ]);
        exit;
    }
}

// Verificar si se subió un archivo
if (
    !isset($_FILES['evidenceFile']) ||
    $_FILES['evidenceFile']['error'] !== UPLOAD_ERR_OK
) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "No file uploaded or upload error: " . ($_FILES['evidenceFile']['error'] ?? 'Unknown error')
    ]);
    exit;
}

// Validar tipo de archivo (debe ser PDF)
$fileType = mime_content_type($_FILES['evidenceFile']['tmp_name']);
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
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Failed to create upload directory."
        ]);
        exit;
    }
}

// Obtener y sanitizar datos para el nombre del archivo
$premiumFreightId = (int)$_POST['premium_freight_id'];
$userName = trim($_POST['userName']);
$safeUserName = preg_replace('/[^A-Za-z0-9_]/', '', str_replace(' ', '_', $userName));

// Generar nombre de archivo único
$timestamp = time();
$filename = "EvidencePF{$premiumFreightId}_{$safeUserName}_{$timestamp}.pdf";
$filePath = $uploadDir . $filename;

// Mover el archivo subido al directorio destino
if (!move_uploaded_file($_FILES['evidenceFile']['tmp_name'], $filePath)) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to save file."
    ]);
    exit;
}

try {
    // Conectar a la base de datos
    $con = new LocalConector();
    $conex = $con->conectar();

    // Guardar referencia al archivo en la base de datos
    $sql = "UPDATE PremiumFreight SET recovery_evidence = ? WHERE id = ?";
    $stmt = $conex->prepare($sql);

    if (!$stmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }

    // Usar la constante URL definida en config.php
    $fileUrl = URL . "assets/files/recovery/{$filename}";

    $stmt->bind_param("si", $fileUrl, $premiumFreightId);

    if (!$stmt->execute()) {
        throw new Exception("Error executing statement: " . $stmt->error);
    }

    if ($stmt->affected_rows === 0) {
        throw new Exception("No premium freight record found with ID: $premiumFreightId");
    }

    $stmt->close();
    $conex->close();

    // Responder con éxito
    echo json_encode([
        "success" => true,
        "message" => "Evidence file uploaded successfully.",
        "file_path" => $fileUrl
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