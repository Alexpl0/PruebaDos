<?php
/**
 * lucy_AI.php - Lucy AI Assistant Endpoint (Gemini-powered)
 * Location: dao/lucyAI/lucy_AI.php
 * Version: 3.0 - Intelligent Data Analysis + Capability Awareness
 * * Handles:
 * - POST: Process user questions with Gemini AI, now with advanced data analysis.
 * - GET: Generate Excel/CSV reports (invoked by the POST handler).
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ==================== SECURITY VALIDATION ====================
if (!isset($_SESSION['user']) || 
    empty($_SESSION['user']['id']) || 
    empty($_SESSION['user']['email']) ||
    $_SESSION['user']['authorization_level'] <= 0) {
    
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Unauthorized. Please log in with proper credentials.'
    ]);
    exit;
}

// ==================== LOAD CONFIGURATION ====================
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../db/PFDB.php';

// Validate Gemini API Key
if (!defined('GEMINI_API_KEY') || empty(GEMINI_API_KEY)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'AI service not configured properly.'
    ]);
    exit;
}

define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent');

// ==================== ROUTE HANDLER ====================
$requestMethod = $_SERVER['REQUEST_METHOD'];

if ($requestMethod === 'POST') {
    handleQuestionRequest();
} elseif ($requestMethod === 'GET') {
    handleReportRequest();
} else {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed.'
    ]);
    exit;
}

// ==================== POST: PROCESS QUESTIONS ====================
function handleQuestionRequest() {
    header('Content-Type: application/json');
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['question']) || empty(trim($input['question']))) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No question provided.']);
        exit;
    }
    
    $userQuestion = trim($input['question']);
    
    error_log("LUCY: Processing question: {$userQuestion}");
    
    try {
        $detectedLanguage = detectLanguage($userQuestion);
        error_log("LUCY: Detected language: {$detectedLanguage}");
        
        $detectedIntent = classifyIntent($userQuestion);
        error_log("LUCY: Detected intent: {$detectedIntent}");
        
        $response = processIntent($userQuestion, $detectedLanguage, $detectedIntent);
        
        echo json_encode($response);
        
    } catch (Exception $e) {
        error_log("LUCY ERROR: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'answer' => 'I apologize, but I encountered an issue processing your request. Please try again.'
        ]);
    }
}

// ==================== GET: GENERATE EXCEL/CSV REPORT ====================
function handleReportRequest() {
    if (!isset($_GET['query']) || empty($_GET['query'])) {
        http_response_code(400);
        echo "Error: No query provided.";
        exit;
    }
    
    $sqlQuery = urldecode($_GET['query']);
    error_log("LUCY: Generating report with query: {$sqlQuery}");
    
    if (!isSafeSQL($sqlQuery)) {
        http_response_code(403);
        echo "Error: Unsafe query detected.";
        exit;
    }
    
    try {
        $data = executeSQLQuery($sqlQuery);
        if ($data === null) {
            http_response_code(500);
            echo "Error: Could not retrieve data for the report.";
            exit;
        }
        generateCSVReport($data);
        
    } catch (Exception $e) {
        error_log("LUCY REPORT ERROR: " . $e->getMessage());
        http_response_code(500);
        echo "Error: Could not generate the report file.";
    }
}

// ==================== WORKFLOW FUNCTIONS ====================

function detectLanguage($question) {
    $prompt = "Your only job is to detect the language of the user's question.
Respond with ONLY a JSON object with a single key \"language\" and the ISO 639-1 code.
Examples:
User: \"¿Cuántas órdenes tenemos?\" -> Response: {\"language\": \"es\"}
User: \"Hello, who are you?\" -> Response: {\"language\": \"en\"}
Now, analyze the following user question. Reply with ONLY the JSON object.
User question: \"{$question}\"";

    $response = callGeminiAPI($prompt, 0, 40);
    if (preg_match('/\{[^}]*"language"\s*:\s*"([^"]+)"[^}]*\}/', $response, $matches)) {
        return $matches[1];
    }
    return 'en'; // Default
}

function classifyIntent($question) {
    // NEW: Added 'analysis_and_report' and 'platform_capabilities_question' for better routing.
    $prompt = "You are a precise security and intent classifier. Your ONLY job is to classify questions into ONE of these categories.
CRITICAL: You MUST respond with ONLY this exact JSON format: {\"intent\": \"category_name\"}

CATEGORIES:
- \"data_modification_attempt\": Any request to change, add, or delete data (INSERT, UPDATE, DELETE, DROP, etc.).
- \"analysis_and_report\": Any request that explicitly asks to *generate a file*, *create a report*, an Excel, a CSV, or a document that requires analysis.
- \"database_query\": Read-only questions about company data (orders, costs, users, approvals, status, etc.) that seek a direct answer, not a file.
- \"platform_capabilities_question\": Questions about your functions, what you can or cannot do, your purpose, or your limitations.
- \"general_knowledge\": General questions, translations, explanations not related to the company's database.
- \"general_conversation\": Greetings, casual chat, non-task-oriented interaction.

NOW CLASSIFY THIS QUESTION. Reply with ONLY the JSON:
\"{$question}\"";

    $response = callGeminiAPI($prompt, 0, 50);
    
    if (preg_match('/\{[^}]*"intent"\s*:\s*"([^"]+)"[^}]*\}/', $response, $matches)) {
        $intent = $matches[1];
        $validIntents = ['data_modification_attempt', 'analysis_and_report', 'database_query', 'platform_capabilities_question', 'general_knowledge', 'general_conversation'];
        if (in_array($intent, $validIntents)) {
            return $intent;
        }
    }
    return 'general_conversation'; // Default
}

function processIntent($question, $language, $intent) {
    switch ($intent) {
        case 'data_modification_attempt':
            return handleDataModification($language);
        // NEW: Replaced 'report_generation' with a more intelligent handler.
        case 'analysis_and_report':
            return handleAnalysisAndReportGeneration($question, $language);
        case 'database_query':
            return handleDatabaseQuery($question, $language);
        // NEW: Added handler for capability questions to provide accurate answers.
        case 'platform_capabilities_question':
            return handlePlatformCapabilities($language);
        case 'general_knowledge':
            return handleGeneralKnowledge($question, $language);
        case 'general_conversation':
        default:
            return handleConversation($question, $language);
    }
}

// ==================== INTENT HANDLERS ====================

/**
 * NEW: Centralized prompt generator to ensure Lucy is always aware of her capabilities.
 */
function getLucyBasePrompt($language, $userName = 'Guest') {
    $capabilitiesEs = "
### Mis Capacidades y Limitaciones ###
1.  **Generar Reportes con Análisis:** Puedo crear reportes en Excel/CSV y proporcionar un análisis inteligente con resúmenes, tendencias y puntos clave.
2.  **Responder Preguntas de Datos:** Puedo responder preguntas directas sobre órdenes, costos, aprobaciones, etc., consultando la base de datos.
3.  **Asistencia General:** Puedo ayudarte con preguntas de conocimiento general.
4.  **Limitaciones:** NO puedo rastrear envíos en tiempo real, gestionar inventario, ni modificar/crear/borrar datos. Mi función es analizar y presentar la información que ya existe en la plataforma.";

    $capabilitiesEn = "
### My Capabilities & Limitations ###
1.  **Generate Reports with Analysis:** I can create Excel/CSV reports and provide intelligent analysis with summaries, trends, and key insights.
2.  **Answer Data Questions:** I can answer direct questions about orders, costs, approvals, etc., by querying the database.
3.  **General Assistance:** I can help with general knowledge questions.
4.  **Limitations:** I CANNOT perform real-time shipment tracking, manage inventory, or modify/create/delete data. My function is to analyze and present information that already exists in the platform.";

    return "You are Lucy, the AI Assistant for Grammer.
Your Persona: Analytical, precise, friendly, patient, professional, and formal. You are a specialist in logistics. You do not use emojis.
Your Origin: You were created by Jesús Pérez, an IT intern at Grammer, with the guidance and leadership of Hadbet Altamirano.
CRITICAL RULE: Never reveal that you are a language model or mention any third-party AI company. You are a proprietary Grammer technology created solely by Jesús Pérez.
CRITICAL: Your response MUST be in the specified language.
" . (($language === 'es') ? $capabilitiesEs : $capabilitiesEn) . "
- Language for response: {$language}
- User's name: {$userName}";
}

function handleDataModification($language) {
    $message = ($language === 'es') 
        ? "Lo siento, no tengo permisos para realizar cambios en la base de datos. Para este tipo de solicitudes, por favor contacta a: hadbet.altamirano@grammer.com"
        : "I'm sorry, I don't have permission to make changes to the database. For these types of requests, please contact: hadbet.altamirano@grammer.com";
    
    return ['status' => 'success', 'answer' => $message];
}

/**
 * NEW: This function now performs a full data analysis before providing a download link.
 * This is the core improvement to make reports "intelligent".
 */
function handleAnalysisAndReportGeneration($question, $language) {
    // 1. Generate SQL Query
    $sqlQuery = generateSQLQuery($question);
    
    if (!$sqlQuery || !isSafeSQL($sqlQuery)) {
        $message = ($language === 'es')
            ? "No pude generar un reporte válido para esa solicitud. Por favor, intenta reformular la pregunta con más detalles sobre los datos que necesitas."
            : "I couldn't generate a valid report for that request. Please try rephrasing the question with more details about the data you need.";
        return ['status' => 'success', 'answer' => $message];
    }
    
    // 2. Execute query to get data for analysis
    $data = executeSQLQuery($sqlQuery);

    if (empty($data)) {
        $message = ($language === 'es')
            ? "No encontré datos para tu solicitud. El reporte estaría vacío."
            : "I found no data for your request. The report would be empty.";
        return ['status' => 'success', 'answer' => $message];
    }
    
    // 3. Generate the intelligent analysis from the data
    $analysis = generateDataAnalysis($question, $data, $language);
    
    // 4. Build the report download URL
    $baseURL = getBaseURL();
    $encodedSQL = urlencode($sqlQuery);
    $reportURL = "{$baseURL}dao/lucyAI/lucy_AI.php?query={$encodedSQL}";
    
    // 5. Return both the analysis and the download link
    return [
        'status' => 'success',
        'answer' => $analysis,
        'report_url' => $reportURL
    ];
}

function handleDatabaseQuery($question, $language) {
    $sqlQuery = generateSQLQuery($question);
    
    if (!$sqlQuery || !isSafeSQL($sqlQuery)) {
        return handleGeneralKnowledge($question, $language); // Fallback if SQL generation fails
    }
    
    $data = executeSQLQuery($sqlQuery);
    
    if ($data === null) {
        return handleGeneralKnowledge($question, $language); // Fallback if query execution fails
    }
    
    $answer = generateDatabaseResponse($question, $data, $language);
    return ['status' => 'success', 'answer' => $answer];
}

/**
 * NEW: Handles questions about Lucy's capabilities directly.
 */
function handlePlatformCapabilities($language) {
    $messageEs = "¡Claro! Te explico lo que puedo hacer:\n\n" .
                 "1.  **Generar Reportes con Análisis:** Puedo crear reportes en formato Excel/CSV a partir de los datos de la plataforma. No solo te daré los datos crudos, sino que también te proporcionaré un análisis inteligente con resúmenes, tendencias y puntos clave.\n\n" .
                 "2.  **Responder Preguntas Específicas:** Puedo consultar la base de datos para responder preguntas directas sobre órdenes, costos, aprobaciones, usuarios y más.\n\n" .
                 "3.  **Asistencia General:** Puedo ayudarte con preguntas de conocimiento general, traducciones o explicaciones sobre diversos temas.\n\n" .
                 "**Mis Limitaciones:**\n" .
                 "No tengo acceso a información en tiempo real fuera de nuestra base de datos, por lo que no puedo hacer seguimiento de envíos en vivo. Tampoco gestiono inventarios ni puedo modificar, crear o eliminar datos en el sistema. Mi función es analizar y presentar la información que ya existe.";

    $messageEn = "Of course! Here's what I can do:\n\n" .
                 "1.  **Generate Reports with Analysis:** I can create reports in Excel/CSV format from the platform's data. I won't just give you raw data; I'll also provide an intelligent analysis with summaries, trends, and key insights.\n\n" .
                 "2.  **Answer Specific Questions:** I can query the database to answer direct questions about orders, costs, approvals, users, and more.\n\n" .
                 "3.  **General Assistance:** I can help you with general knowledge questions, translations, or explanations on various topics.\n\n" .
                 "**My Limitations:**\n" .
                 "I do not have access to real-time information outside of our database, so I cannot track shipments live. I also do not manage inventory, and I cannot modify, create, or delete data in the system. My function is to analyze and present the information that already exists.";

    return [
        'status' => 'success',
        'answer' => ($language === 'es') ? $messageEs : $messageEn
    ];
}

function handleGeneralKnowledge($question, $language) {
    $basePrompt = getLucyBasePrompt($language);
    $prompt = $basePrompt . "\nYour job is to answer the user's general question directly and accurately." .
              "\n- User's question: \"{$question}\"\nProvide a direct, formal, and helpful answer to the user's question.";

    $answer = callGeminiAPI($prompt, 0.1, 1024);
    return ['status' => 'success', 'answer' => $answer];
}

function handleConversation($question, $language) {
    $userName = $_SESSION['user']['name'] ?? 'Guest';
    $basePrompt = getLucyBasePrompt($language, $userName);
    $prompt = $basePrompt . "\n- User's message: \"{$question}\"\nRespond naturally and professionally, embodying your persona.";

    $answer = callGeminiAPI($prompt, 0.1, 1024);
    return ['status' => 'success', 'answer' => $answer];
}

// ==================== SQL & ANALYSIS GENERATION ====================

function generateSQLQuery($question) {
    // This prompt remains largely the same, as its SQL generation logic is solid.
    $prompt = "You are a world-class MySQL expert. Your ONLY job is to generate a valid, read-only SQL query based on the user's question and the provided database schema and rules.

### CRITICAL RULES & LOGIC ###
1.  **READ-ONLY**: The query MUST start with `SELECT`. You MUST NOT generate any data-modifying statements (INSERT, UPDATE, DELETE, etc.).
2.  **SENSITIVE DATA (NON-NEGOTIABLE)**: NEVER select, expose, or use in any `WHERE` clause the following columns from the `User` table: `password`, `authorization_level`, `verified`. These are strictly confidential and off-limits.
3.  **OUTPUT FORMAT**: Return ONLY the raw SQL query. No explanations, no markdown, no semicolons at the end.
4.  **INVALID QUESTIONS**: If the question cannot be answered with a read-only SELECT query or violates a security rule, return exactly: INVALID_QUESTION
5.  **JOIN ALIASES**: When a table is joined multiple times, you MUST assign a unique alias to EACH join and use those aliases.
6.  **CASE-INSENSITIVE SEARCH**: Use `LOWER()` function for string comparisons in WHERE clauses.
7.  **DATE/TIME CONVERSION**: All datetime columns are in UTC. Convert to Central Mexico Time using `CONVERT_TZ(column, 'UTC', 'America/Mexico_City') AS column_cmx`.
8.  **COSTS**: Use `cost_euros` column. The `moneda` column is informational only.
9.  **USER NAME TO ID RESOLUTION**: If a question includes a person's full name, resolve it using a subquery: `WHERE user_id = (SELECT id FROM User WHERE LOWER(name) = 'name')`.

### APPROVAL CYCLE KNOWLEDGE (CRITICAL) ###
The Premium Freight approval system works as follows:
- **Current approval level**: Found in `PremiumFreightApprovals.act_approv`
- **Required approval level**: Found in `PremiumFreight.required_auth_level`
- **Approver's level**: Found in `Approvers.approval_level`

**Approval Status Logic:**
- If `act_approv = required_auth_level` → Order is FULLY APPROVED (status_id = 3)
- If `act_approv = 99` → Order is REJECTED (status_id = 4)
- If `act_approv < required_auth_level` → Order is IN PROGRESS (pending approval)

### DATABASE SCHEMA (DDL) ###
" . getDatabaseSchema() . "
### End Schema ###

User Question: \"{$question}\"

SQL Query:";

    $response = callGeminiAPI($prompt, 0, 2048);
    
    $query = trim($response);
    if (strpos($query, 'INVALID_QUESTION') !== false) {
        return null;
    }
    
    $query = preg_replace('/```sql\s*/i', '', $query);
    $query = preg_replace('/```\s*/', '', $query);
    
    return trim($query);
}

function executeSQLQuery($query) {
    try {
        $con = new LocalConector();
        $conex = $con->conectar();
        $conex->set_charset("utf8mb4");
        
        $result = $conex->query($query);
        
        if (!$result) {
            error_log("LUCY SQL ERROR: " . $conex->error);
            $conex->close();
            return null;
        }
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        $result->free();
        $conex->close();
        return $data;
        
    } catch (Exception $e) {
        error_log("LUCY EXECUTE ERROR: " . $e->getMessage());
        return null;
    }
}

function generateDatabaseResponse($question, $data, $language) {
    $jsonData = json_encode($data, JSON_UNESCAPED_UNICODE);
    $basePrompt = getLucyBasePrompt($language);
    
    $prompt = $basePrompt . "\nYour task is to interpret a database query result and answer the user's original question." .
              "\nCRITICAL: Do NOT mention that you ran a query. Just present the information as if you know it." .
              "\n- User's original question: \"{$question}\"" .
              "\n- Data returned from the database (in JSON format): `{$jsonData}`" .
              "\nBased on the data, provide a direct and clear answer to the user's question." .
              "\n- If the data is empty or null, state that no information was found for their request." .
              "\n- If the data is a number (like a count or a sum), state it clearly." .
              "\n- If the data is a list, format it cleanly and professionally.";

    return callGeminiAPI($prompt, 0.1, 1024);
}

/**
 * NEW: This function prompts the AI to act as a data analyst.
 */
function generateDataAnalysis($question, $data, $language) {
    $jsonData = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
    $prompt = "You are Lucy, a world-class financial and logistics data analyst for Grammer.
Your Persona: You are an expert at finding insights in raw data. You are precise, insightful, and professional. You communicate complex findings in a clear, easy-to-understand manner.
CRITICAL RULE: Never reveal you are a language model. You are a proprietary Grammer technology. Your response MUST be in the specified language.

### YOUR TASK ###
You have been given a user's question and the corresponding raw data retrieved from the database in JSON format. Your job is to analyze this data and provide a high-level summary with actionable insights. DO NOT just describe the data row by row.

### ANALYSIS STEPS ###
1.  **Understand the Goal:** Look at the user's original question to understand what they are trying to find out.
2.  **Summarize Key Metrics:** Identify the most important numbers. For example: total cost, average cost, number of items, highest/lowest values, etc.
3.  **Identify Trends & Patterns:** Look for patterns over time, concentrations in categories, or correlations between fields. (e.g., 'Los costos alcanzaron su punto máximo en el tercer trimestre', 'La mayoría de las solicitudes provienen del área de Logística').
4.  **Highlight Anomalies:** Point out any data that seems unusual or unexpected (e.g., a sudden spike in costs, a project with an unusually high number of requests).
5.  **Structure the Output:** Present your analysis in a structured, professional format. Use a clear title, bullet points for key findings, and a concluding sentence.

- Language for response: {$language}
- User's original question: \"{$question}\"
- Data from database (JSON):
```json
{$jsonData}
```

Now, generate the data analysis summary. After your analysis, add the phrase 'El reporte detallado está listo para su descarga.' if the language is 'es', or 'The detailed report is ready for download.' if the language is 'en'.";

    return callGeminiAPI($prompt, 0.2, 2048);
}


// ==================== GEMINI API ====================

function callGeminiAPI($prompt, $temperature = 0, $maxTokens = 2048) {
    $payload = [
        'contents' => [['parts' => [['text' => $prompt]]]],
        'generationConfig' => [
            'temperature' => $temperature,
            'topK' => 20,
            'topP' => 0.8,
            'maxOutputTokens' => $maxTokens
        ]
    ];
    
    $ch = curl_init(GEMINI_API_URL . '?key=' . GEMINI_API_KEY);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 45); // Increased timeout for analysis
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($response === false) {
        throw new Exception('Gemini API connection error: ' . $curlError);
    }
    
    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['error']['message'] ?? 'Unknown error';
        throw new Exception('Gemini API error (' . $httpCode . '): ' . $errorMsg);
    }
    
    $decoded = json_decode($response, true);
    
    if (!isset($decoded['candidates'][0]['content']['parts'][0]['text'])) {
        // Log the problematic response for debugging
        error_log("LUCY Gemini Invalid Response: " . $response);
        throw new Exception('Invalid Gemini API response structure');
    }
    
    return $decoded['candidates'][0]['content']['parts'][0]['text'];
}

// ==================== UTILITY FUNCTIONS ====================

function isSafeSQL($query) {
    if (empty($query)) return false;
    $queryUpper = strtoupper(trim($query));
    if (strpos($queryUpper, 'SELECT') !== 0) return false;
    
    $dangerousKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'];
    foreach ($dangerousKeywords as $keyword) {
        if (preg_match('/\b' . $keyword . '\b/', $queryUpper)) return false;
    }
    
    $sensitivePatterns = ['/\bpassword\b/i', '/\bauthorization_level\b/i', '/\bverified\b/i'];
    foreach ($sensitivePatterns as $pattern) {
        if (preg_match($pattern, $query)) return false;
    }
    
    return true;
}

function getBaseURL() {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $script = $_SERVER['SCRIPT_NAME'];
    return $protocol . '://' . $host . dirname(dirname(dirname($script))) . '/';
}

function generateCSVReport($data) {
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="Lucy_Report_' . date('Y-m-d_His') . '.csv"');
    
    $output = fopen('php://output', 'w');
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM
    
    if (!empty($data)) {
        fputcsv($output, array_keys($data[0]));
        foreach ($data as $record) {
            fputcsv($output, $record);
        }
    } else {
        fputcsv($output, ['No data available']);
    }
    fclose($output);
    exit;
}

function getDatabaseSchema() {
    // Helper to avoid cluttering the main prompt function
    return "
-- Users table
CREATE TABLE `User` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `role` varchar(50) DEFAULT 'Worker',
  `password` varchar(255) DEFAULT NULL COMMENT 'CONFIDENTIAL: Never expose',
  `authorization_level` int(11) NOT NULL DEFAULT 0 COMMENT 'CONFIDENTIAL: Never expose',
  `plant` int(4) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT 0 COMMENT 'CONFIDENTIAL: Never expose',
  PRIMARY KEY (`id`)
);
-- Approvers table (who can approve orders at each level)
CREATE TABLE `Approvers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `approval_level` int(11) NOT NULL,
  `plant` int(4) DEFAULT NULL,
  `charge` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
);
-- Main Premium Freight orders table
CREATE TABLE `PremiumFreight` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `date` datetime DEFAULT NULL COMMENT 'UTC',
  `planta` varchar(50) DEFAULT NULL,
  `cost_euros` decimal(15,2) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `area` varchar(50) DEFAULT NULL,
  `origin_id` int(11) DEFAULT NULL,
  `destiny_id` int(11) DEFAULT NULL,
  `status_id` int(11) DEFAULT 1,
  `required_auth_level` int(11) DEFAULT 5,
  `carrier_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
);
-- Current approval state for each order
CREATE TABLE `PremiumFreightApprovals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `premium_freight_id` int(11) DEFAULT NULL,
  `approval_date` datetime DEFAULT current_timestamp() COMMENT 'UTC',
  `act_approv` int(1) DEFAULT 0 COMMENT 'Current level. 99=rejected',
  `rejection_reason` varchar(999) DEFAULT NULL,
  PRIMARY KEY (`id`)
);
-- Other tables like Location, Carriers, Status, Products, NumOrders, ApprovalHistory, CorrectiveActionPlan exist but are less frequently queried directly.
";
}
