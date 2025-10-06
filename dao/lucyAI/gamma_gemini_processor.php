<?php
/**
 * gamma_gemini_processor.php - Procesador específico para presentaciones Gamma
 * Procesa peticiones del usuario, obtiene datos y genera configuración para Gamma API
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

// ==================== CONFIGURACIÓN ====================
define('GEMINI_API_KEY', 'AIzaSyA7ajOKqgm8CsnGg1tv3I_C2l7Rwxf-2tM');
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
$currentGenerationId = $input['generationId'] ?? null;

try {
    error_log("GAMMA GEMINI DEBUG: Iniciando procesamiento");
    $startTime = microtime(true);
    
    // Obtener datos de Premium Freight
    $premiumFreightData = getPremiumFreightData();
    
    $dataFetchTime = round(microtime(true) - $startTime, 2);
    error_log("GAMMA GEMINI DEBUG: Datos obtenidos en {$dataFetchTime}s");
    
    if (!$premiumFreightData || !isset($premiumFreightData['data'])) {
        throw new Exception('Error al obtener datos de Premium Freight');
    }

    $dataCount = count($premiumFreightData['data']);
    error_log("GAMMA GEMINI DEBUG: Total de registros: {$dataCount}");

    // Construir contexto para Gemini
    $systemContext = buildGammaSystemContext($premiumFreightData);
    
    error_log("GAMMA GEMINI DEBUG: Llamando a Gemini API...");
    $geminiStartTime = microtime(true);
    
    $geminiResponse = callGeminiAPI($userMessage, $systemContext, $conversationHistory);
    
    $geminiTime = round(microtime(true) - $geminiStartTime, 2);
    error_log("GAMMA GEMINI DEBUG: Gemini respondió en {$geminiTime}s");
    
    // Procesar respuesta de Gemini
    $processedResponse = processGeminiResponse($geminiResponse, $premiumFreightData);
    
    $totalTime = round(microtime(true) - $startTime, 2);
    error_log("GAMMA GEMINI DEBUG: Proceso completado en {$totalTime}s total");
    
    echo json_encode([
        'status' => 'success',
        'geminiResponse' => $processedResponse['message'],
        'gammaConfig' => $processedResponse['gammaConfig'],
        'action' => $processedResponse['action'],
        'generationId' => $currentGenerationId,
        'debug' => [
            'dataFetchTime' => $dataFetchTime,
            'geminiTime' => $geminiTime,
            'totalTime' => $totalTime,
            'dataCount' => $dataCount
        ]
    ]);

} catch (Exception $e) {
    error_log("GAMMA GEMINI ERROR: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine());
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
                'plant' => $userPlant
            ]
        ];
        
    } catch (Exception $e) {
        error_log("Error en getPremiumFreightData: " . $e->getMessage());
        return null;
    }
}

function buildGammaSystemContext($data) {
    $totalRecords = count($data['data']);
    $sampleSize = min($totalRecords, 30);
    $sampleData = array_slice($data['data'], 0, $sampleSize);
    
    $dataStructure = analyzeDataStructure($sampleData);
    
    // Análisis estadístico rápido
    $stats = generateQuickStats($data['data']);
    
    return "Eres Lucy, un asistente de IA especializado en crear presentaciones de análisis de datos para Premium Freight usando Gamma.

CONTEXTO CRÍTICO - GAMMA PRESENTATION:
Estás generando una configuración JSON para crear una presentación en Gamma (NO Excel, NO Power BI).

OBJETIVO: Crear presentaciones DENSAS en información pero CONCISAS en número de diapositivas.
- Prioriza GRÁFICOS y VISUALIZACIONES sobre texto
- Cada diapositiva debe tener múltiples insights
- Usa la menor cantidad de diapositivas posible (típicamente 6-10)
- Enfócate en tendencias, comparaciones y análisis visual

ESTRUCTURA JSON REQUERIDA:
```json
{
  \"action\": \"create\",
  \"inputText\": \"Texto estructurado en markdown con datos para Gamma. Usa \\n---\\n para separar diapositivas. Incluye títulos, datos numéricos, y descripciones de gráficos que quieres ver.\",
  \"themeName\": \"Oasis\",
  \"numCards\": 8,
  \"additionalInstructions\": \"Instrucciones específicas sobre visualizaciones y enfoque\",
  \"textOptions\": {
    \"amount\": \"medium\",
    \"tone\": \"professional, analytical\",
    \"audience\": \"business stakeholders, data analysts\"
  },
  \"imageOptions\": {
    \"source\": \"noImages\"
  }
}
```

IMPORTANTE - NO IMÁGENES:
- Esta presentación NO tendrá imágenes decorativas generadas por AI
- Solo se usarán GRÁFICOS DE DATOS (charts) que Gamma genera automáticamente
- Enfócate 100% en visualizaciones de datos y análisis numérico

REGLAS PARA inputText:
1. Usa markdown: # para títulos principales, ## para subtítulos, * para listas
2. Separa diapositivas con \\n---\\n
3. Incluye datos numéricos específicos
4. Describe qué tipo de gráfico quieres en cada sección
5. Sé específico: \"Gráfico de barras comparando costos por carrier\"
6. Incluye insights y conclusiones clave

EJEMPLO DE inputText:
\"# Análisis de Costos Premium Freight Q4 2024
\\n---\\n
## Costos por Transportista
* Top 5 carriers representan 75% del gasto total
* DHL: €45,230 (30%)
* FedEx: €38,120 (25%)
* UPS: €29,850 (20%)
**Gráfico de barras**: Mostrar costos por carrier
\\n---\\n
## Tendencia Mensual
Incremento del 15% en costos durante octubre
**Gráfico de líneas**: Evolución mensual de costos\"

NOTA: NO uses términos como \"Visualización\" o \"Imagen\", usa \"Gráfico\" o \"Chart\"

DATOS DISPONIBLES:
Total de registros: {$totalRecords}
Campos principales:
{$dataStructure}

ESTADÍSTICAS RÁPIDAS:
{$stats}

IMPORTANTE:
- Responde SOLO con JSON válido en formato markdown ```json```
- El inputText debe ser texto estructurado, NO código
- Usa \\n para nuevas líneas y \\n---\\n para separar slides
- Se CONCISO pero INFORMATIVO
- Prioriza análisis visual sobre texto
- Menos diapositivas = mejor (6-10 ideal)";
}

function analyzeDataStructure($data) {
    if (empty($data)) {
        return "No hay datos disponibles";
    }
    
    $firstRecord = $data[0];
    $structure = "";
    
    $importantFields = ['cost_euros', 'carrier', 'planta', 'category_cause', 'date', 'transport', 'area'];
    
    foreach ($importantFields as $field) {
        if (isset($firstRecord[$field])) {
            $type = gettype($firstRecord[$field]);
            $structure .= "- {$field} ({$type})\n";
        }
    }
    
    return $structure;
}

function generateQuickStats($data) {
    $totalCost = 0;
    $carriers = [];
    $plants = [];
    $categories = [];
    
    foreach ($data as $record) {
        $totalCost += floatval($record['cost_euros'] ?? 0);
        
        $carrier = $record['carrier'] ?? 'Unknown';
        $carriers[$carrier] = ($carriers[$carrier] ?? 0) + 1;
        
        $plant = $record['planta'] ?? 'Unknown';
        $plants[$plant] = ($plants[$plant] ?? 0) + 1;
        
        $category = $record['category_cause'] ?? 'Unknown';
        $categories[$category] = ($categories[$category] ?? 0) + 1;
    }
    
    arsort($carriers);
    arsort($plants);
    arsort($categories);
    
    $topCarriers = array_slice($carriers, 0, 5, true);
    $topPlants = array_slice($plants, 0, 5, true);
    $topCategories = array_slice($categories, 0, 5, true);
    
    $stats = "Costo Total: €" . number_format($totalCost, 2) . "\n";
    $stats .= "Total Órdenes: " . count($data) . "\n";
    $stats .= "Top 5 Carriers: " . implode(', ', array_keys($topCarriers)) . "\n";
    $stats .= "Top 5 Plantas: " . implode(', ', array_keys($topPlants)) . "\n";
    $stats .= "Top 5 Categorías: " . implode(', ', array_keys($topCategories)) . "\n";
    
    return $stats;
}

function callGeminiAPI($userMessage, $systemContext, $history) {
    if (empty(GEMINI_API_KEY)) {
        throw new Exception('Gemini API Key no configurada');
    }
    
    $messages = [];
    
    // Historial reciente (últimos 3 mensajes)
    $recentHistory = array_slice($history, -3);
    foreach ($recentHistory as $msg) {
        $messages[] = [
            'role' => $msg['role'] === 'user' ? 'user' : 'model',
            'parts' => [['text' => $msg['content']]]
        ];
    }
    
    // Prompt optimizado para Gamma
    $optimizedPrompt = $systemContext . "

SOLICITUD DEL USUARIO: {$userMessage}

INSTRUCCIONES FINALES:
1. Genera un JSON válido para Gamma API
2. El inputText debe ser markdown estructurado con datos reales
3. Usa \\n---\\n para separar diapositivas
4. Incluye descripciones de gráficos que quieres ver
5. Sé específico con números y análisis
6. MENOS diapositivas pero MÁS densas en información
7. Prioriza visualizaciones sobre texto

RESPONDE SOLO CON JSON EN FORMATO:
```json
{
  \"action\": \"create\",
  \"inputText\": \"...\",
  \"themeName\": \"Oasis\",
  \"numCards\": 8,
  ...
}
```";
    
    $messages[] = [
        'role' => 'user',
        'parts' => [['text' => $optimizedPrompt]]
    ];
    
    $payload = [
        'contents' => $messages,
        'generationConfig' => [
            'temperature' => 0.3,
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
    curl_close($ch);
    
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

function processGeminiResponse($geminiText, $premiumFreightData) {
    $jsonPattern = '/```json\s*([\s\S]*?)\s*```/';
    $gammaConfig = null;
    $action = 'create';
    
    // Intentar extraer JSON
    if (preg_match($jsonPattern, $geminiText, $matches)) {
        $jsonStr = $matches[1];
        $gammaConfig = json_decode($jsonStr, true);
        
        if (json_last_error() === JSON_ERROR_NONE && isset($gammaConfig['inputText'])) {
            $action = $gammaConfig['action'] ?? 'create';
        }
    }
    
    // Si no se pudo extraer, intentar parsear todo el texto
    if (!$gammaConfig) {
        $possibleJson = json_decode($geminiText, true);
        if (json_last_error() === JSON_ERROR_NONE && isset($possibleJson['inputText'])) {
            $gammaConfig = $possibleJson;
            $action = $gammaConfig['action'] ?? 'create';
        }
    }
    
    // Si aún no hay config, generar una por defecto
    if (!$gammaConfig) {
        $gammaConfig = generateDefaultGammaConfig($premiumFreightData['data']);
        $action = 'create';
    }
    
    // Limpiar mensaje
    $cleanMessage = preg_replace($jsonPattern, '', $geminiText);
    $cleanMessage = trim($cleanMessage);
    
    return [
        'message' => $cleanMessage ?: 'He generado la configuración para tu presentación Gamma.',
        'gammaConfig' => $gammaConfig,
        'action' => $action
    ];
}

function generateDefaultGammaConfig($data) {
    // Análisis básico de datos
    $totalCost = 0;
    $carriers = [];
    $plants = [];
    $categories = [];
    
    foreach ($data as $record) {
        $totalCost += floatval($record['cost_euros'] ?? 0);
        
        $carrier = $record['carrier'] ?? 'Unknown';
        if (!isset($carriers[$carrier])) {
            $carriers[$carrier] = ['count' => 0, 'cost' => 0];
        }
        $carriers[$carrier]['count']++;
        $carriers[$carrier]['cost'] += floatval($record['cost_euros'] ?? 0);
        
        $plant = $record['planta'] ?? 'Unknown';
        $plants[$plant] = ($plants[$plant] ?? 0) + 1;
        
        $category = $record['category_cause'] ?? 'Unknown';
        if (!isset($categories[$category])) {
            $categories[$category] = 0;
        }
        $categories[$category] += floatval($record['cost_euros'] ?? 0);
    }
    
    // Ordenar
    uasort($carriers, function($a, $b) {
        return $b['cost'] - $a['cost'];
    });
    arsort($plants);
    arsort($categories);
    
    // Top 5
    $topCarriers = array_slice($carriers, 0, 5, true);
    $topPlants = array_slice($plants, 0, 5, true);
    $topCategories = array_slice($categories, 0, 5, true);
    
    // Construir inputText en markdown
    $inputText = "# Análisis de Premium Freight\n\n";
    $inputText .= "Resumen ejecutivo de costos y operaciones de transporte\n\n";
    $inputText .= "---\n\n";
    
    $inputText .= "## Resumen General\n\n";
    $inputText .= "* **Costo Total**: €" . number_format($totalCost, 2) . "\n";
    $inputText .= "* **Total de Órdenes**: " . count($data) . "\n";
    $inputText .= "* **Costo Promedio por Orden**: €" . number_format($totalCost / count($data), 2) . "\n\n";
    $inputText .= "**Visualización**: Tarjetas con métricas principales\n\n";
    $inputText .= "---\n\n";
    
    $inputText .= "## Top 5 Transportistas por Costo\n\n";
    foreach ($topCarriers as $carrier => $info) {
        $inputText .= "* **{$carrier}**: €" . number_format($info['cost'], 2) . " ({$info['count']} órdenes)\n";
    }
    $inputText .= "\n**Gráfico de barras horizontales**: Comparación de costos\n\n";
    $inputText .= "---\n\n";
    
    $inputText .= "## Distribución por Planta\n\n";
    foreach ($topPlants as $plant => $count) {
        $inputText .= "* **{$plant}**: {$count} órdenes\n";
    }
    $inputText .= "\n**Gráfico de pastel**: Distribución por planta\n\n";
    $inputText .= "---\n\n";
    
    $inputText .= "## Costos por Categoría\n\n";
    foreach ($topCategories as $category => $cost) {
        $inputText .= "* **{$category}**: €" . number_format($cost, 2) . "\n";
    }
    $inputText .= "\n**Gráfico de barras verticales**: Costos por categoría\n\n";
    $inputText .= "---\n\n";
    
    $inputText .= "## Conclusiones y Recomendaciones\n\n";
    $inputText .= "* Los top 5 transportistas concentran el mayor volumen de operaciones\n";
    $inputText .= "* Se identifican oportunidades de optimización en costos\n";
    $inputText .= "* Revisar contratos con carriers de mayor costo\n";
    
    return [
        'action' => 'create',
        'inputText' => $inputText,
        'themeName' => 'Oasis',
        'numCards' => 6,
        'cardSplit' => 'inputTextBreaks',
        'additionalInstructions' => 'Create a professional data analysis presentation with clear charts and graphs. Focus on visual representation of the data.',
        'textOptions' => [
            'amount' => 'medium',
            'tone' => 'professional, analytical',
            'audience' => 'business stakeholders, logistics managers',
            'language' => 'es'
        ],
        'imageOptions' => [
            'source' => 'noImages'
        ],
        'cardOptions' => [
            'dimensions' => '16x9'
        ],
        'sharingOptions' => [
            'workspaceAccess' => 'view',
            'externalAccess' => 'view'
        ]
    ];
}