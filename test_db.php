<?php
require_once __DIR__ . "/dao/db/db.php";

header('Content-Type: application/json');

try {
    // Suponiendo que tu conexión está en $conn o $pdo
    // Si usas mysqli:
    if (isset($conn) && $conn->connect_errno === 0) {
        echo json_encode(['success' => true]);
    } 
    // Si usas PDO:
    else if (isset($pdo)) {
        $pdo->query('SELECT 1');
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'No DB handler']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}