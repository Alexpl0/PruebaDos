<?php
/**
 * test_gemini.php - Prueba rápida de Gemini API
 * Guarda este archivo en: dao/lucyAI/test_gemini.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Configuración (usa tus valores reales)
define('GEMINI_API_KEY', 'AIzaSyA7ajOKqgm8CsnGg1tv3I_C2l7Rwxf-2tM');
define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent');

echo json_encode(['status' => 'iniciando', 'time' => date('H:i:s')], JSON_PRETTY_PRINT) . "\n\n";

// Test simple
$startTime = microtime(true);

$payload = [
    'contents' => [
        [
            'role' => 'user',
            'parts' => [
                ['text' => 'Responde SOLO con un JSON simple: {"mensaje": "hola", "numero": 42}']
            ]
        ]
    ],
    'generationConfig' => [
        'temperature' => 0.4,
        'maxOutputTokens' => 100
    ]
];

$ch = curl_init(GEMINI_API_URL . '?key=' . GEMINI_API_KEY);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

$elapsedTime = round(microtime(true) - $startTime, 2);

if ($response === false) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Error de conexión: ' . $curlError,
        'elapsed_time' => $elapsedTime . 's'
    ], JSON_PRETTY_PRINT);
    exit;
}

if ($httpCode !== 200) {
    echo json_encode([
        'status' => 'error',
        'http_code' => $httpCode,
        'response' => json_decode($response, true),
        'elapsed_time' => $elapsedTime . 's'
    ], JSON_PRETTY_PRINT);
    exit;
}

$decoded = json_decode($response, true);

echo json_encode([
    'status' => 'success',
    'elapsed_time' => $elapsedTime . 's',
    'http_code' => $httpCode,
    'gemini_response' => $decoded['candidates'][0]['content']['parts'][0]['text'] ?? 'No text',
    'full_response' => $decoded
], JSON_PRETTY_PRINT);