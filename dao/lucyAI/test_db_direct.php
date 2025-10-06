<?php
/**
 * test_db_direct.php - Prueba de acceso DIRECTO a la BD
 * Guarda en: dao/lucyAI/test_db_direct.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$startTime = microtime(true);

echo json_encode(['status' => 'inicio', 'time' => date('H:i:s')], JSON_PRETTY_PRINT) . "\n\n";

try {
    // Verificar sesión
    if (!isset($_SESSION['user'])) {
        echo json_encode(['status' => 'error', 'message' => 'No hay usuario en sesión'], JSON_PRETTY_PRINT);
        exit;
    }
    
    echo json_encode(['step' => 'session_ok', 'user' => $_SESSION['user']['name']], JSON_PRETTY_PRINT) . "\n\n";
    
    // Buscar PFDB.php
    $dbPath = dirname(dirname(__DIR__)) . '/dao/db/PFDB.php';
    
    if (!file_exists($dbPath)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'No se encuentra PFDB.php',
            'path_checked' => $dbPath,
            'current_dir' => __DIR__
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    echo json_encode(['step' => 'file_found', 'path' => $dbPath], JSON_PRETTY_PRINT) . "\n\n";
    
    // Incluir y conectar
    include_once($dbPath);
    
    $con = new LocalConector();
    $conex = $con->conectar();
    
    echo json_encode(['step' => 'connected', 'message' => 'Conexión exitosa a BD'], JSON_PRETTY_PRINT) . "\n\n";
    
    // Query de prueba
    $userPlant = $_SESSION['user']['plant'];
    
    $sql = "
        SELECT 
            pf.id,
            pf.planta,
            pf.cost_euros,
            c.name AS carrier
        FROM PremiumFreight pf
        LEFT JOIN Carriers c ON pf.carrier_id = c.id
        LEFT JOIN User u ON pf.user_id = u.id
        WHERE u.plant = ?
        ORDER BY pf.id DESC
        LIMIT 10
    ";
    
    $stmt = $conex->prepare($sql);
    $stmt->bind_param("s", $userPlant);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }
    
    $stmt->close();
    $conex->close();
    
    $elapsedTime = round(microtime(true) - $startTime, 2);
    
    echo json_encode([
        'status' => 'SUCCESS',
        'elapsed_time' => $elapsedTime . 's',
        'records_retrieved' => count($datos),
        'sample_data' => array_slice($datos, 0, 3)
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}