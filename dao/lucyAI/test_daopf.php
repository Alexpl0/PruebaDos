<?php
/**
 * test_daopf.php - Prueba específica de conexión a daoPremiumFreight.php
 * Guarda este archivo en: dao/lucyAI/test_daopf.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Iniciar sesión
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verificar sesión
if (!isset($_SESSION['user'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'No hay usuario en sesión'
    ]);
    exit;
}

// Construir URL
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$scriptPath = dirname($_SERVER['PHP_SELF']);
$baseUrl = str_replace('/dao/lucyAI', '', $scriptPath);
$url = $protocol . '://' . $host . $baseUrl . '/dao/conections/daoPremiumFreight.php';

echo json_encode([
    'status' => 'testing',
    'url_to_call' => $url,
    'session_id' => session_id(),
    'session_name' => session_name(),
    'user' => $_SESSION['user']
], JSON_PRETTY_PRINT);

echo "\n\n--- Intentando llamar al endpoint con file_get_contents ---\n\n";

// Opción 1: file_get_contents
$opts = [
    'http' => [
        'method' => 'GET',
        'header' => 'Cookie: ' . session_name() . '=' . session_id() . "\r\n"
    ]
];

$context = stream_context_create($opts);
$response = @file_get_contents($url, false, $context);

if ($response !== false) {
    echo json_encode([
        'status' => 'success_file_get_contents',
        'response_length' => strlen($response),
        'response_preview' => substr($response, 0, 500),
        'full_response' => json_decode($response, true)
    ], JSON_PRETTY_PRINT);
} else {
    echo json_encode([
        'status' => 'error_file_get_contents',
        'error' => error_get_last()
    ], JSON_PRETTY_PRINT);
    
    echo "\n\n--- Intentando con CURL ---\n\n";
    
    // Opción 2: CURL
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $curlResponse = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        echo json_encode([
            'status' => 'curl_result',
            'http_code' => $httpCode,
            'error' => $curlError,
            'response_length' => strlen($curlResponse),
            'response_preview' => substr($curlResponse, 0, 500),
            'full_response' => json_decode($curlResponse, true)
        ], JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'CURL no está disponible'
        ], JSON_PRETTY_PRINT);
    }
}