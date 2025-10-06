<?php
/**
 * debug_gemini.php - Archivo temporal para debuggear errores
 * ELIMINAR después de solucionar el problema
 */

// Activar TODOS los errores
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

header('Content-Type: application/json');

echo json_encode([
    'status' => 'debug',
    'message' => 'Testing basic PHP',
    'php_version' => phpversion(),
    'session_status' => session_status(),
    'pwd' => __DIR__
]);

// Ahora probemos las rutas
try {
    session_start();
    
    $checks = [
        'session_started' => session_status() === PHP_SESSION_ACTIVE,
        'user_in_session' => isset($_SESSION['user']),
        'current_dir' => __DIR__,
        'parent_dir' => dirname(__DIR__),
        'root_dir' => dirname(dirname(__DIR__))
    ];
    
    // Verificar si los archivos existen
    $baseDir = dirname(dirname(__DIR__)); // Subir 2 niveles desde dao/lucyAI
    $checks['auth_check_exists'] = file_exists($baseDir . '/dao/users/auth_check.php');
    $checks['daoPF_exists'] = file_exists($baseDir . '/dao/connections/daoPremiumFreight.php');
    
    echo json_encode([
        'status' => 'success',
        'checks' => $checks,
        'session_data' => $_SESSION ?? []
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}