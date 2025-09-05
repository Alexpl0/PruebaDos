<?php
require_once __DIR__ . '/../db/cors_config.php';
include_once('../db/PFDB.php');
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $capId = $_POST['cap_id'] ?? null;
    $uploadedBy = $_POST['uploaded_by'] ?? $_SESSION['user']['id'];
    
    if (!$capId || !is_numeric($capId)) {
        throw new Exception('Valid CAP ID required');
    }
    
    if (!isset($_FILES['evidenceFile'])) {
        throw new Exception('No file uploaded');
    }
    
    $file = $_FILES['evidenceFile'];
    
    // Validar archivo
    $maxSize = 5 * 1024 * 1024; // 5MB
    $allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    
    if ($file['size'] > $maxSize) {
        throw new Exception('File too large. Maximum size is 5MB');
    }
    
    if (!in_array($file['type'], $allowedTypes)) {
        throw new Exception('Invalid file type. Only PDF and image files are allowed');
    }
    
    // Crear directorio si no existe
    $uploadDir = __DIR__ . '/../../uploads/corrective_evidence/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generar nombre único
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $fileName = 'corrective_' . $capId . '_' . time() . '_' . uniqid() . '.' . $extension;
    $filePath = $uploadDir . $fileName;
    
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Failed to upload file');
    }
    
    // Guardar en base de datos
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");
    
    $fileType = strpos($file['type'], 'image') !== false ? 'image' : 'pdf';
    $relativePath = 'uploads/corrective_evidence/' . $fileName;
    
    $stmt = $conex->prepare("
        INSERT INTO CorrectiveActionFiles (cap_id, file_name, file_path, file_type, uploaded_by) 
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("isssi", $capId, $file['name'], $relativePath, $fileType, $uploadedBy);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'File uploaded successfully',
            'file_id' => $stmt->insert_id
        ]);
    } else {
        throw new Exception('Failed to save file record');
    }
    
    $stmt->close();
    $conex->close();
    
} catch (Exception $e) {
    error_log("Upload corrective evidence error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>