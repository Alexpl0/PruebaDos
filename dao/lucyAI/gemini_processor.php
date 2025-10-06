<?php
/**
 * gemini_processor.php - Cerebro del sistema con Gemini AI
 * Procesa las peticiones del chat, entiende qué necesita el usuario,
 * obtiene datos del backend y genera estructura para Excel
 */

// Activar reporte de errores para debugging (REMOVER en producción)
error_reporting(E_ALL);
ini_set('display_errors', 0); // No mostrar en pantalla
ini_set('log_errors', 1);

header('Content-Type: application/json');

// Iniciar sesión si no está iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verificar autenticación
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'User not authenticated']);
    exit;
}

// ==================== CONFIGURACIÓN ====================
define('GEMINI_API_KEY', 'AIzaSyA7ajOKqgm8CsnGg1tv3I_C2l7Rwxf-2tM');
define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2-flash-lite:generateContent');
// ==================== OBTENER DATOS DEL REQUEST ====================
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['message'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing message parameter']);
    exit;
}

$userMessage = $input['message'];
$conversationHistory = $input['history'] ?? [];
$currentFileId = $input['fileId'] ?? null; // ID del archivo Excel si ya existe

try {
    // ==================== OBTENER DATOS DEL BACKEND ====================
    error_log("LUCY DEBUG: Iniciando getPremiumFreightData()");
    $startTime = microtime(true);
    
    $premiumFreightData = getPremiumFreightData();
    
    $dataFetchTime = round(microtime(true) - $startTime, 2);
    error_log("LUCY DEBUG: Datos obtenidos en {$dataFetchTime}s");
    
    if (!$premiumFreightData || !isset($premiumFreightData['data'])) {
        throw new Exception('Error al obtener datos de Premium Freight. Verifica que daoPremiumFreight.php esté funcionando correctamente.');
    }

    $dataCount = count($premiumFreightData['data']);
    error_log("LUCY DEBUG: Total de registros: {$dataCount}");

    // ==================== PREPARAR CONTEXTO PARA GEMINI ====================
    error_log("LUCY DEBUG: Construyendo contexto para Gemini");
    $systemContext = buildSystemContext($premiumFreightData);
    $contextLength = strlen($systemContext);
    error_log("LUCY DEBUG: Contexto construido ({$contextLength} caracteres)");
    
    // ==================== LLAMAR A GEMINI ====================
    error_log("LUCY DEBUG: Llamando a Gemini API...");
    $geminiStartTime = microtime(true);
    
    $geminiResponse = callGeminiAPI($userMessage, $systemContext, $conversationHistory);
    
    $geminiTime = round(microtime(true) - $geminiStartTime, 2);
    error_log("LUCY DEBUG: Gemini respondió en {$geminiTime}s");
    
    // ==================== PROCESAR RESPUESTA DE GEMINI ====================
    error_log("LUCY DEBUG: Procesando respuesta de Gemini");
    $processedResponse = processGeminiResponse($geminiResponse, $premiumFreightData);
    
    $totalTime = round(microtime(true) - $startTime, 2);
    error_log("LUCY DEBUG: Proceso completado en {$totalTime}s total");
    
    // ==================== ENVIAR RESPUESTA ====================
    echo json_encode([
        'status' => 'success',
        'geminiResponse' => $processedResponse['message'],
        'excelData' => $processedResponse['excelData'],
        'action' => $processedResponse['action'], // 'create' o 'update'
        'fileId' => $currentFileId,
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

/**
 * Obtiene los datos de Premium Freight del endpoint existente
 */
function getPremiumFreightData() {
    // Construir URL absoluta correctamente
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    
    // Obtener el directorio base (removiendo /dao/lucyAI de la ruta actual)
    $scriptPath = dirname($_SERVER['PHP_SELF']);
    $baseUrl = str_replace('/dao/lucyAI', '', $scriptPath);
    
    $url = $protocol . '://' . $host . $baseUrl . '/dao/conections/daoPremiumFreight.php';
    
    // Usar file_get_contents con contexto de sesión
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => 'Cookie: ' . session_name() . '=' . session_id() . "\r\n"
        ]
    ];
    
    $context = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        // Si file_get_contents falla, intentar con curl
        return getPremiumFreightDataCurl($url);
    }
    
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE || !isset($data['status']) || $data['status'] !== 'success') {
        return null;
    }
    
    return $data;
}

/**
 * Fallback con CURL
 */
function getPremiumFreightDataCurl($url) {
    if (!function_exists('curl_init')) {
        return null;
    }
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Para desarrollo local
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($httpCode !== 200 || empty($response)) {
        error_log("Error fetching Premium Freight data: HTTP {$httpCode}, Error: {$error}");
        return null;
    }
    
    return json_decode($response, true);
}

/**
 * Construye el contexto del sistema para Gemini
 */
function buildSystemContext($data) {
    // IMPORTANTE: Limitar datos para que Gemini responda más rápido
    $totalRecords = count($data['data']);
    $sampleSize = min($totalRecords, 50); // Solo enviar muestra de 50 registros
    $sampleData = array_slice($data['data'], 0, $sampleSize);
    
    $dataStructure = analyzeDataStructure($sampleData);
    
    return "Eres Lucy, un asistente de IA especializado en análisis de datos y VISUALIZACIÓN de Premium Freight.

🎯 REGLA DE ORO: TODO dashboard DEBE incluir MÍNIMO 2 GRÁFICOS. Los dashboards son VISUALES, no solo tablas.

CONTEXTO DEL SISTEMA:
Tienes acceso a {$totalRecords} órdenes de Premium Freight. Muestra de campos disponibles:

CAMPOS PRINCIPALES:
" . $dataStructure . "

🚀 IMPORTANTE: RESPONDE RÁPIDO Y CONCISO
- Genera la estructura JSON inmediatamente
- No des explicaciones largas
- El JSON debe estar en un bloque ```json```
- Sé directo y eficiente

CAPACIDADES:
1. Crear dashboards VISUALES con gráficos impactantes (barras, líneas, pasteles, etc.)
2. Combinar múltiples visualizaciones en un solo dashboard
3. Filtrar, agrupar y analizar datos para crear insights visuales
4. Actualizar dashboards existentes con nuevas visualizaciones

📊 TIPOS DE GRÁFICOS DISPONIBLES:
- ColumnClustered: Barras verticales (ideal para comparar categorías)
- BarClustered: Barras horizontales (ideal para rankings)
- Line: Líneas (ideal para tendencias temporales)
- Pie: Pastel (ideal para proporciones/distribución)
- Area: Áreas (ideal para evolución acumulada)
- Scatter: Dispersión (ideal para correlaciones)

🎨 INSTRUCCIONES CRÍTICAS:
- SIEMPRE genera AL MENOS 2 gráficos diferentes por dashboard
- Cada gráfico debe comunicar un insight específico
- Usa colores y estilos para hacer los datos atractivos
- Combina gráficos con tablas resumidas (no tablas completas)
- Piensa como un analista de datos: ¿Qué historia cuentan estos datos?

ESTRUCTURA JSON REQUERIDA:
- Cuando el usuario pida un dashboard, SIEMPRE genera esta estructura:
  {
    \"action\": \"create\" o \"update\",
    \"worksheets\": [
      {
        \"name\": \"Nombre de la hoja\",
        \"data\": [Array de objetos con los datos FILTRADOS y AGRUPADOS],
        \"columns\": [Array con nombres de columnas],
        \"charts\": [
          {
            \"type\": \"ColumnClustered|Line|Pie|Bar|Area|Scatter\",
            \"dataRange\": \"A1:D10\",
            \"title\": \"Título descriptivo del insight\",
            \"position\": {\"row\": 0, \"column\": 6}
          },
          {
            \"type\": \"Pie\",
            \"dataRange\": \"A1:B10\",
            \"title\": \"Otro gráfico complementario\",
            \"position\": {\"row\": 15, \"column\": 6}
          }
        ],
        \"tables\": [
          {
            \"range\": \"A1:D10\",
            \"hasHeaders\": true,
            \"style\": \"TableStyleMedium2\"
          }
        ],
        \"formatting\": {
          \"headerRow\": {\"bold\": true, \"fill\": \"#4472C4\", \"fontColor\": \"white\"},
          \"freezePanes\": {\"row\": 1, \"column\": 0}
        }
      }
    ]
  }

📈 EJEMPLOS DE DASHBOARDS EFECTIVOS:

EJEMPLO 1 - Dashboard de Costos:
- Gráfico de barras: Top 10 transportistas por costo total
- Gráfico de pastel: Distribución de costos por categoría de causa
- Tabla resumen: Costos totales por planta (solo totales, no detalle)

EJEMPLO 2 - Dashboard de Performance Logístico:
- Gráfico de línea: Tendencia de órdenes por mes
- Gráfico de barras horizontales: Ranking de plantas por volumen
- Gráfico de pastel: Distribución INBOUND vs OUTBOUND
- Tabla: Top 5 rutas más frecuentes

EJEMPLO 3 - Dashboard de Transportistas:
- Gráfico de barras: Costo promedio por carrier
- Gráfico de pastel: Participación de mercado por carrier (% de órdenes)
- Gráfico de línea: Evolución de costos por carrier en el tiempo

🎯 REGLAS DE ORO:
1. NUNCA generes solo una tabla sin gráficos
2. Cada gráfico debe responder a una pregunta específica
3. Agrupa/filtra datos antes de graficar (no grafiques datos crudos)
4. Usa títulos descriptivos que expliquen el insight
5. Posiciona gráficos estratégicamente (lado derecho de las tablas)

- Sé conversacional y explica qué estás generando
- Si el usuario pide actualizaciones específicas, identifica qué celdas o rangos modificar
- Siempre valida que los campos solicitados existan en la estructura de datos

DATOS ACTUALES:
Total de registros: " . count($data['data']) . "
Usuario: Plant " . $data['user_info']['plant'] . ", Authorization Level " . $data['user_info']['authorization_level'];
}

/**
 * Analiza la estructura de datos para documentarla
 */
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

/**
 * Llama a la API de Gemini
 */
function callGeminiAPI($userMessage, $systemContext, $history) {
    if (empty(GEMINI_API_KEY) || GEMINI_API_KEY === 'TU_GEMINI_API_KEY_AQUI') {
        throw new Exception('Gemini API Key no configurada. Por favor configura GEMINI_API_KEY en gemini_processor.php');
    }
    
    $messages = [];
    
    // Agregar historial de conversación (solo los últimos 5 mensajes para rapidez)
    $recentHistory = array_slice($history, -5);
    foreach ($recentHistory as $msg) {
        $messages[] = [
            'role' => $msg['role'] === 'user' ? 'user' : 'model',
            'parts' => [['text' => $msg['content']]]
        ];
    }
    
    // Prompt optimizado para respuesta rápida
    $optimizedPrompt = $systemContext . "

SOLICITUD: {$userMessage}

⚡ INSTRUCCIÓN CRÍTICA: Responde SOLO con el JSON en formato markdown. Sin explicaciones adicionales.
El JSON debe tener esta estructura EXACTA:

```json
{
  \"action\": \"create\",
  \"worksheets\": [
    {
      \"name\": \"Dashboard\",
      \"data\": [...datos agrupados...],
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

Recuerda: MÍNIMO 2 gráficos. Responde SOLO con JSON.";
    
    // Agregar mensaje actual
    $messages[] = [
        'role' => 'user',
        'parts' => [['text' => $optimizedPrompt]]
    ];
    
    $payload = [
        'contents' => $messages,
        'generationConfig' => [
            'temperature' => 0.4, // Más bajo = más rápido y consistente
            'topK' => 20,
            'topP' => 0.8,
            'maxOutputTokens' => 4096, // Reducido para respuesta más rápida
        ]
    ];
    
    $ch = curl_init(GEMINI_API_URL . '?key=' . GEMINI_API_KEY);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Timeout de 30 segundos
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10); // 10 segundos para conectar
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($response === false) {
        throw new Exception('Error de conexión con Gemini (timeout o red): ' . $curlError);
    }
    
    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['error']['message'] ?? 'Unknown error';
        throw new Exception('Error en Gemini API (' . $httpCode . '): ' . $errorMsg);
    }
    
    $decoded = json_decode($response, true);
    
    if (!isset($decoded['candidates'][0]['content']['parts'][0]['text'])) {
        throw new Exception('Respuesta inválida de Gemini. Respuesta: ' . substr($response, 0, 200));
    }
    
    return $decoded['candidates'][0]['content']['parts'][0]['text'];
}

/**
 * Procesa la respuesta de Gemini y extrae datos estructurados
 */
function processGeminiResponse($geminiText, $premiumFreightData) {
    // Buscar JSON en la respuesta (puede estar en markdown code blocks)
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
    
    // Si no encontró JSON válido, intentar parsear toda la respuesta
    if (!$excelData) {
        $possibleJson = json_decode($geminiText, true);
        if (json_last_error() === JSON_ERROR_NONE && isset($possibleJson['worksheets'])) {
            $excelData = $possibleJson;
            $action = $excelData['action'] ?? 'create';
        }
    }
    
    // Si aún no hay estructura, generar una por defecto con todos los datos
    if (!$excelData) {
        $excelData = generateDefaultExcelStructure($premiumFreightData['data']);
        $action = 'create';
    }
    
    // Limpiar el mensaje de Gemini (sin código JSON)
    $cleanMessage = preg_replace($jsonPattern, '', $geminiText);
    $cleanMessage = trim($cleanMessage);
    
    return [
        'message' => $cleanMessage ?: 'He generado el archivo Excel con los datos solicitados.',
        'excelData' => $excelData,
        'action' => $action
    ];
}

/**
 * Genera estructura Excel por defecto con GRÁFICOS si Gemini no devuelve JSON
 */
function generateDefaultExcelStructure($data) {
    if (empty($data)) {
        return ['worksheets' => []];
    }
    
    // Preparar datos agrupados para gráficos
    $costsByCarrier = [];
    $ordersByPlant = [];
    $costsByCategory = [];
    
    foreach ($data as $record) {
        // Costos por transportista
        $carrier = $record['carrier'] ?? 'Unknown';
        if (!isset($costsByCarrier[$carrier])) {
            $costsByCarrier[$carrier] = 0;
        }
        $costsByCarrier[$carrier] += floatval($record['cost_euros'] ?? 0);
        
        // Órdenes por planta
        $plant = $record['planta'] ?? 'Unknown';
        if (!isset($ordersByPlant[$plant])) {
            $ordersByPlant[$plant] = 0;
        }
        $ordersByPlant[$plant]++;
        
        // Costos por categoría
        $category = $record['category_cause'] ?? 'Unknown';
        if (!isset($costsByCategory[$category])) {
            $costsByCategory[$category] = 0;
        }
        $costsByCategory[$category] += floatval($record['cost_euros'] ?? 0);
    }
    
    // Ordenar por valor descendente y tomar top 10
    arsort($costsByCarrier);
    $costsByCarrier = array_slice($costsByCarrier, 0, 10, true);
    
    arsort($ordersByPlant);
    $ordersByPlant = array_slice($ordersByPlant, 0, 10, true);
    
    arsort($costsByCategory);
    
    // Preparar datos para tabla de resumen por transportista
    $carrierData = [];
    foreach ($costsByCarrier as $carrier => $cost) {
        $carrierData[] = [
            'Transportista' => $carrier,
            'Costo Total (€)' => number_format($cost, 2)
        ];
    }
    
    // Preparar datos para tabla de categorías
    $categoryData = [];
    foreach ($costsByCategory as $category => $cost) {
        $categoryData[] = [
            'Categoría' => $category,
            'Costo Total (€)' => number_format($cost, 2)
        ];
    }
    
    return [
        'action' => 'create',
        'worksheets' => [
            [
                'name' => 'Dashboard General',
                'data' => $carrierData,
                'columns' => ['Transportista', 'Costo Total (€)'],
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
                ],
                'formatting' => [
                    'headerRow' => ['bold' => true, 'fill' => '#4472C4', 'fontColor' => 'white'],
                    'freezePanes' => ['row' => 1, 'column' => 0]
                ]
            ],
            [
                'name' => 'Análisis por Categoría',
                'data' => $categoryData,
                'columns' => ['Categoría', 'Costo Total (€)'],
                'charts' => [
                    [
                        'type' => 'BarClustered',
                        'dataRange' => 'A1:B' . (count($categoryData) + 1),
                        'title' => 'Costos por Categoría de Causa',
                        'position' => ['row' => 0, 'column' => 4]
                    ]
                ],
                'tables' => [
                    [
                        'range' => 'A1:B' . (count($categoryData) + 1),
                        'hasHeaders' => true,
                        'style' => 'TableStyleMedium9'
                    ]
                ],
                'formatting' => [
                    'headerRow' => ['bold' => true, 'fill' => '#70AD47', 'fontColor' => 'white'],
                    'freezePanes' => ['row' => 1, 'column' => 0]
                ]
            ]
        ]
    ];
}