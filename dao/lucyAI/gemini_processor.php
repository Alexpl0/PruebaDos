<?php
/**
 * gemini_processor.php - Cerebro del sistema con Gemini AI
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'User not authenticated']);
    exit;
}

// ==================== CARGAR CONFIGURACIÓN ====================
require_once __DIR__ . '/config.php';

define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent');

// ==================== OBTENER DATOS DEL REQUEST ====================
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['message'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing message parameter']);
    exit;
}

$userMessage = $input['message'];
$conversationHistory = $input['history'] ?? [];
$currentFileId = $input['fileId'] ?? null;
$outputType = $input['outputType'] ?? 'excel'; // 'excel' o 'powerbi'

try {
    error_log("LUCY DEBUG: Iniciando getPremiumFreightData()");
    $startTime = microtime(true);
    
    $premiumFreightData = getPremiumFreightData();
    
    $dataFetchTime = round(microtime(true) - $startTime, 2);
    error_log("LUCY DEBUG: Datos obtenidos en {$dataFetchTime}s");
    
    if (!$premiumFreightData || !isset($premiumFreightData['data'])) {
        throw new Exception('Error al obtener datos de Premium Freight');
    }

    $dataCount = count($premiumFreightData['data']);
    error_log("LUCY DEBUG: Total de registros: {$dataCount}");

    error_log("LUCY DEBUG: Construyendo contexto para Gemini (Tipo: {$outputType})");
    $systemContext = buildSystemContext($premiumFreightData, $outputType);
    $contextLength = strlen($systemContext);
    error_log("LUCY DEBUG: Contexto construido ({$contextLength} caracteres)");
    
    error_log("LUCY DEBUG: Llamando a Gemini API...");
    $geminiStartTime = microtime(true);
    
    $geminiResponse = callGeminiAPI($userMessage, $systemContext, $conversationHistory, $outputType);
    
    $geminiTime = round(microtime(true) - $geminiStartTime, 2);
    error_log("LUCY DEBUG: Gemini respondió en {$geminiTime}s");
    
    error_log("LUCY DEBUG: Procesando respuesta de Gemini");
    $processedResponse = processGeminiResponse($geminiResponse, $premiumFreightData, $outputType);
    
    $totalTime = round(microtime(true) - $startTime, 2);
    error_log("LUCY DEBUG: Proceso completado en {$totalTime}s total");
    
    echo json_encode([
        'status' => 'success',
        'geminiResponse' => $processedResponse['message'],
        'excelData' => $processedResponse['excelData'],
        'action' => $processedResponse['action'],
        'fileId' => $currentFileId,
        'outputType' => $outputType,
        'debug' => [
            'dataFetchTime' => $dataFetchTime,
            'geminiTime' => $geminiTime,
            'totalTime' => $totalTime,
            'dataCount' => $dataCount
        ]
    ]);

} catch (Exception $e) {
    error_log("LUCY ERROR: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}

// ==================== FUNCIONES AUXILIARES ====================

function getPremiumFreightData() {
    try {
        $dbPath = dirname(dirname(__DIR__)) . '/dao/db/PFDB.php';
        
        if (!file_exists($dbPath)) {
            throw new Exception("No se encuentra PFDB.php en: {$dbPath}");
        }
        
        include_once($dbPath);
        
        $con = new LocalConector();
        $conex = $con->conectar();
        
        $userPlant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
        $userAuthLevel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
        
        $sql = "
            SELECT 
                pf.id,
                pf.date,
                pf.planta,
                pf.code_planta,
                pf.transport,
                pf.in_out_bound,
                pf.cost_euros,
                pf.category_cause,
                pf.area,
                pf.int_ext,
                pf.paid_by,
                pf.project_status,
                pf.recovery,
                pf.weight,
                p.productName AS products,
                no.Number AS reference_number,
                no.Name AS reference_name,
                u.name AS creator_name,
                u.plant AS creator_plant,
                lo_from.company_name AS origin_company_name,
                lo_from.city AS origin_city,
                lo_from.state AS origin_state,
                lo_to.company_name AS destiny_company_name,
                lo_to.city AS destiny_city,
                lo_to.state AS destiny_state,
                c.name AS carrier,
                st.name AS status_name
            FROM PremiumFreight pf
            LEFT JOIN Products p ON pf.products = p.id
            LEFT JOIN NumOrders no ON pf.reference_number = no.ID
            LEFT JOIN Carriers c ON pf.carrier_id = c.id
            LEFT JOIN User u ON pf.user_id = u.id
            LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
            LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
            LEFT JOIN Status st ON pf.status_id = st.id
        ";
        
        if ($userPlant !== null && $userPlant !== '') {
            $sql .= " WHERE u.plant = ?";
            $stmt = $conex->prepare($sql . " ORDER BY pf.id DESC LIMIT 500");
            $stmt->bind_param("s", $userPlant);
        } else {
            $stmt = $conex->prepare($sql . " ORDER BY pf.id DESC LIMIT 500");
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $datos = [];
        while ($row = $result->fetch_assoc()) {
            $datos[] = $row;
        }
        
        $stmt->close();
        $conex->close();
        
        return [
            'status' => 'success',
            'data' => $datos,
            'user_info' => [
                'plant' => $userPlant,
                'authorization_level' => $userAuthLevel
            ]
        ];
        
    } catch (Exception $e) {
        error_log("Error en getPremiumFreightData: " . $e->getMessage());
        return null;
    }
}

function buildSystemContext($data, $outputType) {
    $totalRecords = count($data['data']);
    $sampleSize = min($totalRecords, 50);
    $sampleData = array_slice($data['data'], 0, $sampleSize);
    
    $dataStructure = analyzeDataStructure($sampleData);
    
    $typeSpecificInstructions = '';
    
    if ($outputType === 'powerbi') {
        $typeSpecificInstructions = "
IMPORTANTE: Estás generando para Power BI, NO para Excel.

DIFERENCIAS CRÍTICAS CON POWER BI:
1. NO generes secciones 'charts' - Power BI crea visualizaciones automáticamente
2. NO generes secciones 'tables' - Power BI maneja esto automáticamente
3. NO generes secciones 'formatting' - Power BI tiene su propio formato
4. SOLO genera 'worksheets' con 'data' y 'columns'
5. Power BI creará automáticamente visualizaciones basadas en los datos

ESTRUCTURA JSON PARA POWER BI:
```json
{
  \"action\": \"create\",
  \"worksheets\": [
    {
      \"name\": \"Nombre_Tabla\",
      \"data\": [...datos agrupados y preparados...],
      \"columns\": [\"columna1\", \"columna2\", ...]
    }
  ]
}
```

REGLAS POWER BI:
- Nombres de tablas SIN espacios (usa guiones bajos o CamelCase)
- Agrupa y prepara los datos para análisis
- Power BI generará visualizaciones automáticamente
- Enfócate en preparar datasets limpios y bien estructurados
";
    } else {
        $typeSpecificInstructions = "
IMPORTANTE: Estás generando para Excel con visualizaciones.

REGLA DE ORO: TODO dashboard DEBE incluir MÍNIMO 2 GRÁFICOS.

TIPOS DE GRÁFICOS DISPONIBLES:
- ColumnClustered: Barras verticales
- BarClustered: Barras horizontales
- Line: Líneas
- Pie: Pastel
- Area: Áreas
- Scatter: Dispersión

ESTRUCTURA JSON PARA EXCEL:
```json
{
  \"action\": \"create\",
  \"worksheets\": [
    {
      \"name\": \"Dashboard_Principal\",
      \"data\": [...],
      \"columns\": [...],
      \"charts\": [
        {\"type\": \"ColumnClustered\", \"dataRange\": \"A1:B10\", \"title\": \"...\", \"position\": {\"row\": 0, \"column\": 4}},
        {\"type\": \"Pie\", \"dataRange\": \"A1:B6\", \"title\": \"...\", \"position\": {\"row\": 15, \"column\": 4}}
      ],
      \"tables\": [{\"range\": \"A1:B10\", \"hasHeaders\": true, \"style\": \"TableStyleMedium2\"}]
    }
  ]
}
```
";
    }
    
    return "Eres Lucy, un asistente de IA especializado en análisis de datos y visualización de Premium Freight.

" . $typeSpecificInstructions . "

CONTEXTO DEL SISTEMA:
Tienes acceso a {$totalRecords} órdenes de Premium Freight.

CAMPOS PRINCIPALES:
" . $dataStructure . "

RESPONDE RÁPIDO Y CONCISO:
- Genera la estructura JSON inmediatamente
- No des explicaciones largas
- El JSON debe estar en un bloque ```json```
- Sé directo y eficiente
- CRÍTICO: Los nombres NO pueden tener espacios, usa guiones bajos o CamelCase

DATOS ACTUALES:
Total de registros: " . count($data['data']) . "
Usuario: Plant " . $data['user_info']['plant'] . ", Authorization Level " . $data['user_info']['authorization_level'];
}

function analyzeDataStructure($data) {
    if (empty($data)) {
        return "No hay datos disponibles";
    }
    
    $firstRecord = $data[0];
    $structure = "";
    
    foreach ($firstRecord as $key => $value) {
        $type = gettype($value);
        if (is_array($value)) {
            $type = "Object/Array";
        }
        $structure .= "- {$key} ({$type})\n";
    }
    
    return $structure;
}

function callGeminiAPI($userMessage, $systemContext, $history, $outputType) {
    if (empty(GEMINI_API_KEY)) {
        throw new Exception('Gemini API Key no configurada en .env');
    }
    
    $messages = [];
    
    $recentHistory = array_slice($history, -5);
    foreach ($recentHistory as $msg) {
        $messages[] = [
            'role' => $msg['role'] === 'user' ? 'user' : 'model',
            'parts' => [['text' => $msg['content']]]
        ];
    }
    
    $outputFormat = $outputType === 'powerbi' ? 'Power BI' : 'Excel';
    
    $optimizedPrompt = $systemContext . "

SOLICITUD: {$userMessage}

FORMATO DE SALIDA: {$outputFormat}

REGLAS ESTRICTAS:
1. Responde SOLO con JSON en formato markdown
2. NO uses espacios en nombres - USA GUIONES BAJOS o CamelCase
3. " . ($outputType === 'excel' ? "MÍNIMO 2 gráficos por dashboard" : "NO generes secciones de charts/tables para Power BI") . "

RESPONDE SOLO CON JSON. SIN ESPACIOS EN NOMBRES.";
    
    $messages[] = [
        'role' => 'user',
        'parts' => [['text' => $optimizedPrompt]]
    ];
    
    $payload = [
        'contents' => $messages,
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
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($response === false) {
        throw new Exception('Error de conexión con Gemini: ' . $curlError);
    }
    
    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['error']['message'] ?? 'Unknown error';
        throw new Exception('Error en Gemini API (' . $httpCode . '): ' . $errorMsg);
    }
    
    $decoded = json_decode($response, true);
    
    if (!isset($decoded['candidates'][0]['content']['parts'][0]['text'])) {
        throw new Exception('Respuesta inválida de Gemini');
    }
    
    return $decoded['candidates'][0]['content']['parts'][0]['text'];
}

function processGeminiResponse($geminiText, $premiumFreightData, $outputType) {
    $jsonPattern = '/```json\s*([\s\S]*?)\s*```/';
    $excelData = null;
    $action = 'create';
    
    if (preg_match($jsonPattern, $geminiText, $matches)) {
        $jsonStr = $matches[1];
        $excelData = json_decode($jsonStr, true);
        
        if (json_last_error() === JSON_ERROR_NONE && isset($excelData['action'])) {
            $action = $excelData['action'];
        }
    }
    
    if (!$excelData) {
        $possibleJson = json_decode($geminiText, true);
        if (json_last_error() === JSON_ERROR_NONE && isset($possibleJson['worksheets'])) {
            $excelData = $possibleJson;
            $action = $excelData['action'] ?? 'create';
        }
    }
    
    if (!$excelData) {
        $excelData = generateDefaultStructure($premiumFreightData['data'], $outputType);
        $action = 'create';
    }
    
    $cleanMessage = preg_replace($jsonPattern, '', $geminiText);
    $cleanMessage = trim($cleanMessage);
    
    return [
        'message' => $cleanMessage ?: 'He generado el dashboard con los datos solicitados.',
        'excelData' => $excelData,
        'action' => $action
    ];
}

function generateDefaultStructure($data, $outputType) {
    if (empty($data)) {
        return ['worksheets' => []];
    }
    
    $costsByCarrier = [];
    $ordersByPlant = [];
    $costsByCategory = [];
    
    foreach ($data as $record) {
        $carrier = $record['carrier'] ?? 'Unknown';
        if (!isset($costsByCarrier[$carrier])) {
            $costsByCarrier[$carrier] = 0;
        }
        $costsByCarrier[$carrier] += floatval($record['cost_euros'] ?? 0);
        
        $plant = $record['planta'] ?? 'Unknown';
        if (!isset($ordersByPlant[$plant])) {
            $ordersByPlant[$plant] = 0;
        }
        $ordersByPlant[$plant]++;
        
        $category = $record['category_cause'] ?? 'Unknown';
        if (!isset($costsByCategory[$category])) {
            $costsByCategory[$category] = 0;
        }
        $costsByCategory[$category] += floatval($record['cost_euros'] ?? 0);
    }
    
    arsort($costsByCarrier);
    $costsByCarrier = array_slice($costsByCarrier, 0, 10, true);
    
    arsort($ordersByPlant);
    $ordersByPlant = array_slice($ordersByPlant, 0, 10, true);
    
    arsort($costsByCategory);
    
    $carrierData = [];
    foreach ($costsByCarrier as $carrier => $cost) {
        $carrierData[] = [
            'Transportista' => $carrier,
            'Costo_Total_Euros' => number_format($cost, 2)
        ];
    }
    
    $categoryData = [];
    foreach ($costsByCategory as $category => $cost) {
        $categoryData[] = [
            'Categoria' => $category,
            'Costo_Total_Euros' => number_format($cost, 2)
        ];
    }
    
    if ($outputType === 'powerbi') {
        return [
            'action' => 'create',
            'worksheets' => [
                [
                    'name' => 'Costos_Por_Transportista',
                    'data' => $carrierData,
                    'columns' => ['Transportista', 'Costo_Total_Euros']
                ],
                [
                    'name' => 'Costos_Por_Categoria',
                    'data' => $categoryData,
                    'columns' => ['Categoria', 'Costo_Total_Euros']
                ]
            ]
        ];
    } else {
        return [
            'action' => 'create',
            'worksheets' => [
                [
                    'name' => 'Dashboard_General',
                    'data' => $carrierData,
                    'columns' => ['Transportista', 'Costo_Total_Euros'],
                    'charts' => [
                        [
                            'type' => 'ColumnClustered',
                            'dataRange' => 'A1:B' . (count($carrierData) + 1),
                            'title' => 'Top 10 Transportistas por Costo Total',
                            'position' => ['row' => 0, 'column' => 4]
                        ],
                        [
                            'type' => 'Pie',
                            'dataRange' => 'A1:B' . min(6, count($carrierData) + 1),
                            'title' => 'Distribución de Costos - Top 5 Carriers',
                            'position' => ['row' => 18, 'column' => 4]
                        ]
                    ],
                    'tables' => [
                        [
                            'range' => 'A1:B' . (count($carrierData) + 1),
                            'hasHeaders' => true,
                            'style' => 'TableStyleMedium2'
                        ]
                    ]
                ]
            ]
        ];
    }
}