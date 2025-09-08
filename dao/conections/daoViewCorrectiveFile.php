<?php
require_once __DIR__ . '/../db/cors_config.php';
include_once('../db/PFDB.php');
session_start();

// Verificar autenticación
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo 'Authentication required';
    exit;
}

$fileId = $_GET['file_id'] ?? null;

if (!$fileId || !is_numeric($fileId)) {
    http_response_code(400);
    echo 'Invalid file ID';
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    $stmt = $conex->prepare("
        SELECT file_name, file_path, file_type 
        FROM CorrectiveActionFiles 
        WHERE file_id = ?
    ");
    $stmt->bind_param("i", $fileId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        // Construir la ruta completa del archivo
        $filePath = __DIR__ . '/../../' . $row['file_path'];
        
        if (!file_exists($filePath)) {
            http_response_code(404);
            echo 'File not found on server';
            exit;
        }

        // Configurar headers apropiados
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $filePath);
        finfo_close($finfo);

        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($filePath));
        header('Content-Disposition: inline; filename="' . $row['file_name'] . '"');
        header('Cache-Control: private, max-age=0');
        header('Pragma: public');

        // Enviar archivo
        readfile($filePath);
    } else {
        http_response_code(404);
        echo 'File not found in database';
    }
    
    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    error_log("File view error: " . $e->getMessage());
    http_response_code(500);
    echo 'Error loading file';
}
?>