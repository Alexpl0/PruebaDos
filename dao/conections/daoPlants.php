<?php
/**
 * daoPlants.php
 * 
 * Endpoint específico para obtener las plantas disponibles
 * desde la tabla User para el selector de plantas del dashboard.
 * 
 * @author      GRAMMER AG
 * @since       2025-07-28
 */

header('Content-Type: application/json');
include_once('../db/PFDB.php');

// Verificar que el usuario esté autenticado
session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'User not authenticated']);
    exit;
}

$userPlant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
$userAuthLevel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // Consulta para obtener plantas únicas de la tabla User
    $plantsSql = "SELECT DISTINCT plant 
                  FROM User 
                  WHERE plant IS NOT NULL 
                  AND plant != '' 
                  ORDER BY plant ASC";
    
    $stmt = $conex->prepare($plantsSql);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $plants = [];
    while ($row = $result->fetch_assoc()) {
        $plants[] = $row['plant'];
    }

    // Preparar respuesta
    $response = [
        'status' => 'success',
        'data' => $plants,
        'user_info' => [
            'plant' => $userPlant,
            'authorization_level' => $userAuthLevel
        ]
    ];

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>