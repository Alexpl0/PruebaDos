<?php
/**
 * test_gemini_full.php - Test del flujo completo de Gemini SOLO (sin Excel)
 * Guarda en: dao/lucyAI/test_gemini_full.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(60); // 60 segundos máximo

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ==================== CONFIGURACIÓN ====================
define('GEMINI_API_KEY', 'AIzaSyA7ajOKqgm8CsnGg1tv3I_C2l7Rwxf-2tM');
define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2-flash-lite:generateContent');

$totalStartTime = microtime(true);

// ==== PASO 1: Obtener datos de PremiumFreight ====
echo json_encode(['step' => 1, 'message' => 'Obteniendo datos de Premium Freight...'], JSON_PRETTY_PRINT) . "\n\n";
$step1Start = microtime(true);

$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$scriptPath = dirname($_SERVER['PHP_SELF']);
$baseUrl = str_replace('/dao/lucyAI', '', $scriptPath);
$url = $protocol . '://' . $host . $baseUrl . '/dao/conections/daoPremiumFreight.php';

$opts = [
    'http' => [
        'method' => 'GET',
        'header' => 'Cookie: ' . session_name() . '=' . session_id() . "\r\n"
    ]
];

$context = stream_context_create($opts);
$response = @file_get_contents($url, false, $context);

if ($response === false) {
    // Intentar con CURL
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
}

$step1Time = round(microtime(true) - $step1Start, 2);

$data = json_decode($response, true);

if (!$data || !isset($data['data'])) {
    echo json_encode([
        'status' => 'error',
        'step' => 1,
        'message' => 'No se pudieron obtener datos',
        'elapsed_time' => $step1Time . 's'
    ], JSON_PRETTY_PRINT);
    exit;
}

echo json_encode([
    'step' => 1,
    'status' => 'success',
    'records_count' => count($data['data']),
    'elapsed_time' => $step1Time . 's'
], JSON_PRETTY_PRINT) . "\n\n";

// ==== PASO 2: Preparar contexto (con muestra pequeña) ====
echo json_encode(['step' => 2, 'message' => 'Preparando contexto para Gemini...'], JSON_PRETTY_PRINT) . "\n\n";
$step2Start = microtime(true);

$totalRecords = count($data['data']);
$sampleSize = min($totalRecords, 20); // Solo 20 registros de muestra
$sampleData = array_slice($data['data'], 0, $sampleSize);

$userPrompt = "Crea un dashboard con costos por transportista y número de órdenes por planta";

$systemContext = "Eres Lucy, asistente de IA para análisis de Premium Freight.

DATOS: Tienes acceso a {$totalRecords} registros. Muestra de campos:
- id, date, planta, carrier, cost_euros, category_cause, transport, in_out_bound, status_name

RESPONDE SOLO CON JSON en formato markdown. MÍNIMO 2 gráficos.

```json
{
  \"action\": \"create\",
  \"worksheets\": [
    {
      \"name\": \"Dashboard\",
      \"data\": [...],
      \"columns\": [...],
      \"charts\": [
        {\"type\": \"ColumnClustered\", \"dataRange\": \"A1:B10\", \"title\": \"Costos por Carrier\", \"position\": {\"row\": 0, \"column\": 4}},
        {\"type\": \"Pie\", \"dataRange\": \"A1:B6\", \"title\": \"Distribución\", \"position\": {\"row\": 15, \"column\": 4}}
      ],
      \"tables\": [{\"range\": \"A1:B10\", \"hasHeaders\": true}]
    }
  ]
}
```";

$step2Time = round(microtime(true) - $step2Start, 2);

echo json_encode([
    'step' => 2,
    'status' => 'success',
    'context_length' => strlen($systemContext),
    'elapsed_time' => $step2Time . 's'
], JSON_PRETTY_PRINT) . "\n\n";

// ==== PASO 3: Llamar a Gemini ====
echo json_encode(['step' => 3, 'message' => 'Llamando a Gemini API...'], JSON_PRETTY_PRINT) . "\n\n";
$step3Start = microtime(true);

$payload = [
    'contents' => [
        [
            'role' => 'user',
            'parts' => [
                ['text' => $systemContext . "\n\nSOLICITUD: {$userPrompt}"]
            ]
        ]
    ],
    'generationConfig' => [
        'temperature' => 0.4,
        'topK' => 20,
        'topP' => 0.8,
        'maxOutputTokens' => 4096,
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

$step3Time = round(microtime(true) - $step3Start, 2);

if ($response === false || $httpCode !== 200) {
    echo json_encode([
        'status' => 'error',
        'step' => 3,
        'message' => 'Error en Gemini: ' . $curlError,
        'http_code' => $httpCode,
        'elapsed_time' => $step3Time . 's'
    ], JSON_PRETTY_PRINT);
    exit;
}

$decoded = json_decode($response, true);
$geminiResponse = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '';

echo json_encode([
    'step' => 3,
    'status' => 'success',
    'elapsed_time' => $step3Time . 's',
    'response_length' => strlen($geminiResponse)
], JSON_PRETTY_PRINT) . "\n\n";

// ==== PASO 4: Extraer JSON de la respuesta ====
echo json_encode(['step' => 4, 'message' => 'Extrayendo JSON de respuesta...'], JSON_PRETTY_PRINT) . "\n\n";

$jsonPattern = '/```json\s*([\s\S]*?)\s*```/';
if (preg_match($jsonPattern, $geminiResponse, $matches)) {
    $jsonStr = $matches[1];
    $excelData = json_decode($jsonStr, true);
    
    if (json_last_error() === JSON_ERROR_NONE) {
        echo json_encode([
            'step' => 4,
            'status' => 'success',
            'json_valid' => true
        ], JSON_PRETTY_PRINT) . "\n\n";
    } else {
        echo json_encode([
            'step' => 4,
            'status' => 'error',
            'json_valid' => false,
            'json_error' => json_last_error_msg()
        ], JSON_PRETTY_PRINT) . "\n\n";
    }
} else {
    echo json_encode([
        'step' => 4,
        'status' => 'warning',
        'message' => 'No se encontró JSON en formato markdown'
    ], JSON_PRETTY_PRINT) . "\n\n";
    
    $excelData = json_decode($geminiResponse, true);
}

$totalTime = round(microtime(true) - $totalStartTime, 2);

// ==== RESUMEN FINAL ====
echo json_encode([
    'FINAL_RESULT' => [
        'status' => 'success',
        'total_time' => $totalTime . 's',
        'breakdown' => [
            'step_1_data_fetch' => $step1Time . 's',
            'step_2_context_prep' => $step2Time . 's',
            'step_3_gemini_call' => $step3Time . 's'
        ],
        'gemini_full_response' => $geminiResponse,
        'excel_structure' => $excelData
    ]
], JSON_PRETTY_PRINT);