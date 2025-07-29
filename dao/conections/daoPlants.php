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
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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
                  AND TRIM(plant) != ''
                  ORDER BY plant ASC";
    
    $stmt = $conex->prepare($plantsSql);
    
    if (!$stmt) {
        throw new Exception("Error preparing query: " . $conex->error);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $plants = [];
    while ($row = $result->fetch_assoc()) {
        if ($row['plant'] && trim($row['plant']) !== '') {
            $plants[] = trim($row['plant']);
        }
    }

    // Log para debugging
    error_log("Plants found: " . json_encode($plants));

    // Preparar respuesta
    $response = [
        'status' => 'success',
        'data' => $plants,
        'count' => count($plants),
        'user_info' => [
            'plant' => $userPlant,
            'authorization_level' => $userAuthLevel
        ]
    ];

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    error_log("Error in daoPlants.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Database error: ' . $e->getMessage(),
        'debug' => [
            'file' => __FILE__,
            'line' => __LINE__,
            'user_session' => isset($_SESSION['user']) ? 'exists' : 'missing'
        ]
    ]);
}
?>