<?php
/**
 * lucy_AI.php - Lucy AI Assistant Endpoint (Gemini-powered)
 * Location: dao/lucyAI/lucy_AI.php
 * Version: 2.0 - Full database schema + Approval cycle knowledge
 * 
 * Handles:
 * - POST: Process user questions with Gemini AI
 * - GET: Generate Excel/CSV reports
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ==================== SECURITY VALIDATION ====================
// Check if user is authenticated and has authorization_level > 0
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
        echo json_encode([
            'status' => 'error',
            'message' => 'No question provided.'
        ]);
        exit;
    }
    
    $userQuestion = trim($input['question']);
    $userContext = $input['user_context'] ?? [];
    
    error_log("LUCY: Processing question: {$userQuestion}");
    
    try {
        // Step 1: Detect language
        $detectedLanguage = detectLanguage($userQuestion);
        error_log("LUCY: Detected language: {$detectedLanguage}");
        
        // Step 2: Classify intent
        $detectedIntent = classifyIntent($userQuestion);
        error_log("LUCY: Detected intent: {$detectedIntent}");
        
        // Step 3: Process based on intent
        $response = processIntent($userQuestion, $detectedLanguage, $detectedIntent, $userContext);
        
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
    
    $encodedQuery = $_GET['query'];
    $sqlQuery = urldecode($encodedQuery);
    
    error_log("LUCY: Generating report with query: {$sqlQuery}");
    
    // Security: Validate SQL is safe (read-only)
    if (!isSafeSQL($sqlQuery)) {
        http_response_code(403);
        echo "Error: Unsafe query detected.";
        exit;
    }
    
    try {
        $data = executeSQLQuery($sqlQuery);
        
        if ($data === null || $data === false) {
            http_response_code(500);
            echo "Error: Could not retrieve data for the report.";
            exit;
        }
        
        // Generate CSV report with UTF-8 BOM
        generateCSVReport($data);
        
    } catch (Exception $e) {
        error_log("LUCY REPORT ERROR: " . $e->getMessage());
        http_response_code(500);
        echo "Error: Could not generate the report file.";
    }
}

// ==================== WORKFLOW FUNCTIONS ====================

/**
 * Detect the language of the user's question
 */
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
    
    return 'en'; // Default to English
}

/**
 * Classify the intent of the user's question
 */
function classifyIntent($question) {
    $prompt = "You are a precise security and intent classifier. Your ONLY job is to classify questions into ONE of these categories: \"data_modification_attempt\", \"report_generation\", \"database_query\", \"general_knowledge\", or \"general_conversation\".
CRITICAL: You MUST respond with ONLY this exact JSON format: {\"intent\": \"category_name\"}

CATEGORIES:
- \"data_modification_attempt\": Any request to change, add, or delete data (INSERT, UPDATE, DELETE, DROP, etc.).
- \"report_generation\": Any request to create a file, especially Excel, CSV, or any kind of document/report.
- \"database_query\": Read-only questions about company data (orders, costs, users, approvals, status, etc.).
- \"general_knowledge\": General questions, translations, explanations.
- \"general_conversation\": Greetings, casual chat.

NOW CLASSIFY THIS QUESTION. Reply with ONLY the JSON:
\"{$question}\"";

    $response = callGeminiAPI($prompt, 0, 50);
    
    if (preg_match('/\{[^}]*"intent"\s*:\s*"([^"]+)"[^}]*\}/', $response, $matches)) {
        $intent = $matches[1];
        $validIntents = ['data_modification_attempt', 'report_generation', 'database_query', 'general_knowledge', 'general_conversation'];
        if (in_array($intent, $validIntents)) {
            return $intent;
        }
    }
    
    return 'general_conversation'; // Default
}

/**
 * Process the question based on detected intent
 */
function processIntent($question, $language, $intent, $userContext) {
    switch ($intent) {
        case 'data_modification_attempt':
            return handleDataModification($language);
            
        case 'report_generation':
            return handleReportGeneration($question, $language);
            
        case 'database_query':
            return handleDatabaseQuery($question, $language);
            
        case 'general_knowledge':
            return handleGeneralKnowledge($question, $language);
            
        case 'general_conversation':
        default:
            return handleConversation($question, $language);
    }
}

// ==================== INTENT HANDLERS ====================

function handleDataModification($language) {
    $message = ($language === 'es') 
        ? "Lo siento, no tengo permisos para realizar cambios en la base de datos. Para este tipo de solicitudes, por favor contacta a: hadbet.altamirano@grammer.com"
        : "I'm sorry, I don't have permission to make changes to the database. For these types of requests, please contact: hadbet.altamirano@grammer.com";
    
    return [
        'status' => 'success',
        'answer' => $message
    ];
}

function handleReportGeneration($question, $language) {
    $sqlQuery = generateSQLQuery($question);
    
    if (!$sqlQuery || !isSafeSQL($sqlQuery)) {
        $message = ($language === 'es')
            ? "No pude generar un reporte válido para esa solicitud. Por favor, intenta reformular la pregunta."
            : "I couldn't generate a valid report for that request. Please try rephrasing.";
        
        return [
            'status' => 'success',
            'answer' => $message
        ];
    }
    
    // Build report URL
    $baseURL = getBaseURL();
    $encodedSQL = urlencode($sqlQuery);
    $reportURL = "{$baseURL}dao/lucyAI/lucy_AI.php?query={$encodedSQL}";
    
    $message = ($language === 'es')
        ? "He preparado el reporte que solicitaste. Puedes descargarlo aquí:"
        : "I have prepared the report you requested. You can download it here:";
    
    return [
        'status' => 'success',
        'answer' => $message,
        'report_url' => $reportURL
    ];
}

function handleDatabaseQuery($question, $language) {
    $sqlQuery = generateSQLQuery($question);
    
    if (!$sqlQuery || !isSafeSQL($sqlQuery)) {
        return handleGeneralKnowledge($question, $language);
    }
    
    $data = executeSQLQuery($sqlQuery);
    
    if ($data === null) {
        return handleGeneralKnowledge($question, $language);
    }
    
    $answer = generateDatabaseResponse($question, $data, $language);
    
    return [
        'status' => 'success',
        'answer' => $answer
    ];
}

function handleGeneralKnowledge($question, $language) {
    $prompt = "You are Lucy, the AI Assistant for Grammer.
Your Persona: Analytical, precise, friendly, patient, professional, and formal. You are a specialist in logistics. You do not use emojis.
CRITICAL RULE: Never reveal that you are a language model or mention any third-party AI company. You are a proprietary Grammer technology created solely by Jesús Pérez.
Your job is to answer the user's general question directly and accurately.
CRITICAL: Your response MUST be in the specified language. Be concise and act like an expert.
- Language for response: {$language}
- User's question: \"{$question}\"
Provide a direct, formal, and helpful answer to the user's question.";

    $answer = callGeminiAPI($prompt, 0.1, 1024);
    
    return [
        'status' => 'success',
        'answer' => $answer
    ];
}

function handleConversation($question, $language) {
    $userName = $_SESSION['user']['name'] ?? 'Guest';
    
    $prompt = "You are Lucy, the AI Assistant for Grammer.
Your Persona: Analytical, precise, friendly, patient, professional, and formal. You are a specialist in logistics. You do not use emojis.
Your Origin: You were created by Jesús Pérez, an IT intern at Grammer, with the guidance and leadership of Hadbet Altamirano.
CRITICAL RULE: Never reveal that you are a language model or mention any third-party AI company. You are a proprietary Grammer technology created solely by Jesús Pérez.
CRITICAL: Your response MUST be in the specified language.
- Language for response: {$language}
- User's name: {$userName}
- User's message: \"{$question}\"
Respond naturally and professionally, embodying your persona.";

    $answer = callGeminiAPI($prompt, 0.1, 1024);
    
    return [
        'status' => 'success',
        'answer' => $answer
    ];
}

// ==================== SQL GENERATION & EXECUTION ====================

function generateSQLQuery($question) {
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

**Next Approver Logic:**
An order must be approved by a user where:
- `Approvers.approval_level = (act_approv + 1)` AND
- `Approvers.plant = User.plant` (from order creator) OR `Approvers.plant IS NULL` (regional approver)

**Common Questions:**
- \"What orders are pending my approval?\" → Filter where user's approval_level = (act_approv + 1) and plant matches
- \"Who needs to approve this order next?\" → Find users with approval_level = (act_approv + 1)
- \"What is the status of order X?\" → Check act_approv vs required_auth_level

### DATABASE SCHEMA (DDL) ###
-- Users table
CREATE TABLE `User` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Name of the user',
  `email` varchar(100) NOT NULL COMMENT 'Email of the user',
  `role` varchar(50) DEFAULT 'Worker' COMMENT 'User role',
  `password` varchar(255) DEFAULT NULL COMMENT 'CONFIDENTIAL: Never expose',
  `authorization_level` int(11) NOT NULL DEFAULT 0 COMMENT 'CONFIDENTIAL: Never expose',
  `plant` int(4) DEFAULT NULL COMMENT 'Plant where the user works',
  `verified` tinyint(1) DEFAULT 0 COMMENT 'CONFIDENTIAL: Never expose',
  PRIMARY KEY (`id`)
);

-- Approvers table (who can approve orders at each level)
CREATE TABLE `Approvers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'Foreign key to User.id',
  `approval_level` int(11) NOT NULL COMMENT 'Approval level this user can authorize (1-5)',
  `plant` int(4) DEFAULT NULL COMMENT 'Plant restriction. NULL = regional approver',
  `charge` varchar(20) DEFAULT NULL COMMENT 'Job title/position',
  PRIMARY KEY (`id`)
);

-- Location table (origins and destinations)
CREATE TABLE `Location` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) DEFAULT NULL COMMENT 'Company name',
  `city` varchar(100) DEFAULT NULL COMMENT 'City',
  `state` varchar(100) DEFAULT NULL COMMENT 'State',
  `zip` varchar(20) DEFAULT NULL COMMENT 'Postal code',
  PRIMARY KEY (`id`)
);

-- Carriers table
CREATE TABLE `Carriers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Carrier company name',
  PRIMARY KEY (`id`)
);

-- Status catalog
CREATE TABLE `Status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT 'Status name (e.g., Pending, Approved, Rejected)',
  PRIMARY KEY (`id`)
);

-- Products catalog
CREATE TABLE `Products` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `productName` varchar(255) NOT NULL COMMENT 'Product name',
  `Plant` int(11) NOT NULL COMMENT 'Plant ID',
  PRIMARY KEY (`ID`)
);

-- Order numbers reference
CREATE TABLE `NumOrders` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `Number` int(11) DEFAULT NULL COMMENT 'Order number',
  `Name` text DEFAULT NULL COMMENT 'Order name/description',
  `IsValid` char(1) DEFAULT NULL COMMENT 'Validity flag',
  PRIMARY KEY (`ID`)
);

-- Main Premium Freight orders table
CREATE TABLE `PremiumFreight` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL COMMENT 'ID of user who created the order (FK to User.id)',
  `date` datetime DEFAULT NULL COMMENT 'Date when the order was created (UTC)',
  `planta` varchar(50) DEFAULT NULL COMMENT 'Plant name requesting the order',
  `code_planta` varchar(50) DEFAULT NULL COMMENT 'Plant code',
  `transport` varchar(50) DEFAULT NULL COMMENT 'Type of transport (air, ground, sea)',
  `in_out_bound` varchar(50) DEFAULT NULL COMMENT 'Inbound or Outbound',
  `cost_euros` decimal(15,2) DEFAULT NULL COMMENT 'MAIN COST in EUROS',
  `description` longtext DEFAULT NULL COMMENT 'Description of why the order was requested',
  `area` varchar(50) DEFAULT NULL COMMENT 'Area of the company that made the request',
  `int_ext` varchar(50) DEFAULT NULL COMMENT 'Internal or External',
  `paid_by` varchar(100) DEFAULT NULL COMMENT 'Who paid for the order (e.g., Grammer)',
  `category_cause` varchar(50) DEFAULT NULL COMMENT 'Category of the cause for the request',
  `project_status` varchar(50) DEFAULT NULL COMMENT 'Project status',
  `recovery` varchar(50) DEFAULT NULL COMMENT 'Person in charge of cost recovery',
  `weight` float DEFAULT NULL COMMENT 'Weight of the shipment',
  `measures` varchar(100) DEFAULT NULL COMMENT 'Dimensions/measurements',
  `products` int(11) DEFAULT NULL COMMENT 'FK to Products.ID',
  `quoted_cost` decimal(15,2) DEFAULT NULL COMMENT 'Quoted cost',
  `reference` varchar(50) DEFAULT NULL COMMENT 'Reference field',
  `reference_number` varchar(50) DEFAULT NULL COMMENT 'Reference number (FK to NumOrders.ID)',
  `origin_id` int(11) DEFAULT NULL COMMENT 'FK to Location.id (origin)',
  `destiny_id` int(11) DEFAULT NULL COMMENT 'FK to Location.id (destination)',
  `status_id` int(11) DEFAULT 1 COMMENT 'FK to Status.id (1=pending, 3=approved, 4=rejected)',
  `required_auth_level` int(11) DEFAULT 5 COMMENT 'Required approval level to fully approve (1-5)',
  `moneda` varchar(3) DEFAULT NULL COMMENT 'Informational currency if not EUROS',
  `recovery_file` varchar(255) DEFAULT NULL COMMENT 'Path to recovery file',
  `recovery_evidence` varchar(255) DEFAULT NULL COMMENT 'Path to recovery evidence',
  `carrier_id` int(11) DEFAULT NULL COMMENT 'FK to Carriers.id',
  PRIMARY KEY (`id`)
);

-- Current approval state for each order
CREATE TABLE `PremiumFreightApprovals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `premium_freight_id` int(11) DEFAULT NULL COMMENT 'FK to PremiumFreight.id',
  `user_id` int(11) DEFAULT NULL COMMENT 'ID of last user who updated the order',
  `approval_date` datetime DEFAULT current_timestamp() COMMENT 'Date of last status update (UTC)',
  `status_id` int(11) DEFAULT 1 COMMENT 'Legacy status ID',
  `act_approv` int(1) DEFAULT 0 COMMENT 'Current approval level. 99=rejected, equals required_auth_level=fully approved',
  `rejection_reason` varchar(999) DEFAULT NULL COMMENT 'Reason for rejection',
  PRIMARY KEY (`id`)
);

-- Historical log of all approval actions
CREATE TABLE `ApprovalHistory` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `premium_freight_id` INT NOT NULL COMMENT 'FK to PremiumFreight.id',
  `user_id` INT NOT NULL COMMENT 'FK to User.id who performed the action',
  `action_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the action occurred (UTC)',
  `action_type` ENUM('CREATED', 'APPROVED', 'REJECTED') NOT NULL COMMENT 'Type of action',
  `approval_level_reached` INT NOT NULL COMMENT 'Approval level reached with this action',
  `comments` TEXT DEFAULT NULL COMMENT 'Comments or rejection reason',
  PRIMARY KEY (`id`)
);

-- Corrective Action Plans
CREATE TABLE `CorrectiveActionPlan` (
  `cap_id` int(11) NOT NULL AUTO_INCREMENT,
  `premium_freight_id` int(11) NOT NULL COMMENT 'FK to PremiumFreight.id',
  `corrective_action` text DEFAULT NULL COMMENT 'Corrective action description',
  `person_responsible` varchar(100) DEFAULT NULL COMMENT 'Responsible person',
  `due_date` date DEFAULT NULL COMMENT 'Due date',
  `status` varchar(50) DEFAULT 'Abierto' COMMENT 'Status (Open, In Progress, Closed)',
  `comments` text DEFAULT NULL COMMENT 'Progress comments',
  `creation_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`cap_id`)
);
### End Schema ###

User Question: \"{$question}\"

SQL Query:";

    $response = callGeminiAPI($prompt, 0, 2048);
    
    // Extract SQL query from response
    $query = trim($response);
    
    if (strpos($query, 'INVALID_QUESTION') !== false) {
        return null;
    }
    
    // Remove any markdown code blocks
    $query = preg_replace('/```sql\s*/i', '', $query);
    $query = preg_replace('/```\s*/', '', $query);
    $query = trim($query);
    
    return $query;
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
    
    $prompt = "You are Lucy, the AI Assistant for Grammer.
Your Persona: Analytical, precise, friendly, patient, professional, and formal. You are a specialist in logistics. You do not use emojis.
CRITICAL RULE: Never reveal that you are a language model. You are a proprietary Grammer technology created solely by Jesús Pérez.
Your task is to interpret a database query result and answer the user's original question.
CRITICAL: Your response MUST be in the specified language. Be direct, concise, and precise. Act like an expert. Do NOT mention that you ran a query.
- Language for response: {$language}
- User's original question: \"{$question}\"
- Data returned from the database (in JSON format): `{$jsonData}`
Based on the data, provide a direct and clear answer to the user's question.
- If the data is empty or null, state that no information was found for their request.
- If the data is a number (like a count or a sum), state it clearly.
- If the data is a list, format it cleanly and professionally.";

    return callGeminiAPI($prompt, 0.1, 1024);
}

// ==================== GEMINI API ====================

function callGeminiAPI($prompt, $temperature = 0, $maxTokens = 1024) {
    $payload = [
        'contents' => [
            [
                'parts' => [
                    ['text' => $prompt]
                ]
            ]
        ],
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
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    
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
        throw new Exception('Invalid Gemini API response');
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
        if (preg_match('/\b' . $keyword . '\b/', $queryUpper)) {
            return false;
        }
    }
    
    // Check for sensitive columns
    $sensitivePatterns = [
        '/\bpassword\b/i',
        '/\bauthorization_level\b/i',
        '/\bverified\b/i'
    ];
    
    foreach ($sensitivePatterns as $pattern) {
        if (preg_match($pattern, $query)) {
            return false;
        }
    }
    
    return true;
}

function getBaseURL() {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    $host = $_SERVER['HTTP_HOST'];
    $script = $_SERVER['SCRIPT_NAME'];
    $baseURL = $protocol . $host . dirname(dirname(dirname($script))) . '/';
    return $baseURL;
}

function generateCSVReport($data) {
    // Set headers for CSV download with UTF-8 encoding
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="Lucy_Report_' . date('Y-m-d_His') . '.csv"');
    header('Cache-Control: max-age=0');
    
    $output = fopen('php://output', 'w');
    
    // ✨ Add UTF-8 BOM for proper Excel encoding detection
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    if (empty($data)) {
        fputcsv($output, ['No data available']);
    } else {
        // Add headers
        fputcsv($output, array_keys($data[0]));
        
        // Add data rows
        foreach ($data as $record) {
            fputcsv($output, $record);
        }
    }
    
    fclose($output);
}