<?php
require_once __DIR__ . '/../db/cors_config.php';
include_once('../db/PFDB.php');
session_start();

header('Content-Type: application/json');

// Verificar autenticación
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    if ($method === 'GET') {
        $capId = $_GET['cap_id'] ?? null;
        
        if (!$capId || !is_numeric($capId)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Valid CAP ID required']);
            exit;
        }

        $stmt = $conex->prepare("
            SELECT cf.*, u.name as uploader_name 
            FROM CorrectiveActionFiles cf 
            LEFT JOIN User u ON cf.uploaded_by = u.id 
            WHERE cf.cap_id = ? 
            ORDER BY cf.upload_date DESC
        ");
        $stmt->bind_param("i", $capId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $files = [];
        while ($row = $result->fetch_assoc()) {
            $files[] = $row;
        }
        
        echo json_encode(['success' => true, 'files' => $files]);
        $stmt->close();
    }
    
    $conex->close();
} catch (Exception $e) {
    error_log("CorrectiveFiles error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error']);
}
?>