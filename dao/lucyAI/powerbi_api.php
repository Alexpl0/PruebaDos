<?php
/**
 * powerbi_api.php - Manejador de Power BI API
 * Crea datasets, dashboards y gestiona visualizaciones en Power BI
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
define('POWERBI_CLIENT_ID', '07297fbf-6ba4-4fe3-99a1-87c93a5aaeb4');
define('POWERBI_CLIENT_SECRET', 'PDK8Q~F-ZLtKAYWVaOHVMDq63rccxXSZ2M4-pae3');
define('POWERBI_TENANT_ID', '1b76d39b-fc45-4afe-a05b-8d8f81f18a77');
define('POWERBI_WORKSPACE_ID', '959d9628-e3b1-4217-aaed-ea2c0d90dc8a'); // ID del workspace "Pruebas Grammer"


define('POWERBI_API_URL', 'https://api.powerbi.com/v1.0/myorg');

// ==================== OBTENER DATOS DEL REQUEST ====================
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? 'create';

try {
    switch ($action) {
        case 'create':
            $result = createPowerBIDashboard($input);
            break;
            
        case 'update':
            $result = updatePowerBIDashboard($input);
            break;
            
        case 'get':
            $result = getPowerBIDashboard($input['datasetId']);
            break;
            
        default:
            throw new Exception('Invalid action: ' . $action);
    }
    
    echo json_encode([
        'status' => 'success',
        'data' => $result
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
        'action' => $action
    ]);
}

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * Crea un nuevo dashboard en Power BI
 */
function createPowerBIDashboard($data) {
    $accessToken = getAccessToken();
    $datasetName = sanitizeName($data['fileName'] ?? 'Lucy_Dashboard_' . date('Y-m-d_His'));
    
    // PASO 1: Crear Dataset
    $dataset = createDataset($accessToken, $datasetName, $data['worksheets']);
    $datasetId = $dataset['id'];
    
    // PASO 2: Insertar datos en todas las tablas
    if (isset($data['worksheets']) && is_array($data['worksheets'])) {
        foreach ($data['worksheets'] as $worksheet) {
            if (isset($worksheet['data']) && is_array($worksheet['data'])) {
                $tableName = sanitizeName($worksheet['name']);
                insertDataToTable($accessToken, $datasetId, $tableName, $worksheet['data']);
            }
        }
    }
    
    // PASO 3: Obtener embed token y URL
    $embedInfo = getEmbedInfo($accessToken, $datasetId);
    
    return [
        'datasetId' => $datasetId,
        'embedUrl' => $embedInfo['embedUrl'],
        'embedToken' => $embedInfo['embedToken'],
        'datasetName' => $datasetName
    ];
}

/**
 * Actualiza un dashboard existente
 */
function updatePowerBIDashboard($data) {
    if (!isset($data['datasetId'])) {
        throw new Exception('Dataset ID is required for update');
    }
    
    $accessToken = getAccessToken();
    $datasetId = $data['datasetId'];
    
    // Actualizar datos en las tablas
    if (isset($data['worksheets']) && is_array($data['worksheets'])) {
        foreach ($data['worksheets'] as $worksheet) {
            if (isset($worksheet['data']) && is_array($worksheet['data'])) {
                $tableName = sanitizeName($worksheet['name']);
                
                // Limpiar tabla y reinsertar datos
                deleteRows($accessToken, $datasetId, $tableName);
                insertDataToTable($accessToken, $datasetId, $tableName, $worksheet['data']);
            }
        }
    }
    
    $embedInfo = getEmbedInfo($accessToken, $datasetId);
    
    return [
        'datasetId' => $datasetId,
        'embedUrl' => $embedInfo['embedUrl'],
        'embedToken' => $embedInfo['embedToken'],
        'updated' => true
    ];
}

/**
 * Obtiene información de un dashboard
 */
function getPowerBIDashboard($datasetId) {
    $accessToken = getAccessToken();
    $embedInfo = getEmbedInfo($accessToken, $datasetId);
    
    return [
        'datasetId' => $datasetId,
        'embedUrl' => $embedInfo['embedUrl'],
        'embedToken' => $embedInfo['embedToken']
    ];
}

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

/**
 * Obtiene access token de Power BI
 */
function getAccessToken() {
    if (POWERBI_CLIENT_ID === 'TU_CLIENT_ID_AQUI' || 
        POWERBI_CLIENT_SECRET === 'TU_CLIENT_SECRET_AQUI' || 
        POWERBI_TENANT_ID === 'TU_TENANT_ID_AQUI') {
        throw new Exception('Power BI credentials no configuradas. Por favor configura CLIENT_ID, CLIENT_SECRET y TENANT_ID en powerbi_api.php');
    }
    
    $tokenUrl = 'https://login.microsoftonline.com/' . POWERBI_TENANT_ID . '/oauth2/v2.0/token';
    
    $params = [
        'client_id' => POWERBI_CLIENT_ID,
        'client_secret' => POWERBI_CLIENT_SECRET,
        'scope' => 'https://analysis.windows.net/powerbi/api/.default',
        'grant_type' => 'client_credentials'
    ];
    
    $ch = curl_init($tokenUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['error_description'] ?? $errorData['error'] ?? 'Unknown error';
        throw new Exception('Error obteniendo access token (' . $httpCode . '): ' . $errorMsg);
    }
    
    $data = json_decode($response, true);
    
    if (!isset($data['access_token'])) {
        throw new Exception('No access token en respuesta');
    }
    
    return $data['access_token'];
}

// ==================== FUNCIONES DE POWER BI ====================

/**
 * Crea un dataset en Power BI
 */
function createDataset($accessToken, $datasetName, $worksheets) {
    $tables = [];
    
    foreach ($worksheets as $worksheet) {
        $tableName = sanitizeName($worksheet['name']);
        $columns = [];
        
        // Inferir columnas desde los datos
        if (isset($worksheet['data'][0])) {
            foreach ($worksheet['data'][0] as $key => $value) {
                $columns[] = [
                    'name' => $key,
                    'dataType' => inferDataType($value)
                ];
            }
        } elseif (isset($worksheet['columns'])) {
            foreach ($worksheet['columns'] as $col) {
                $columns[] = [
                    'name' => $col,
                    'dataType' => 'String'
                ];
            }
        }
        
        $tables[] = [
            'name' => $tableName,
            'columns' => $columns
        ];
    }
    
    $payload = [
        'name' => $datasetName,
        'tables' => $tables,
        'defaultMode' => 'Push'
    ];
    
    $url = POWERBI_API_URL . '/groups/' . POWERBI_WORKSPACE_ID . '/datasets';
    
    return powerBIRequest($accessToken, $url, 'POST', $payload);
}

/**
 * Inserta datos en una tabla del dataset
 */
function insertDataToTable($accessToken, $datasetId, $tableName, $data) {
    $url = POWERBI_API_URL . '/groups/' . POWERBI_WORKSPACE_ID . '/datasets/' . $datasetId . '/tables/' . $tableName . '/rows';
    
    $payload = [
        'rows' => $data
    ];
    
    return powerBIRequest($accessToken, $url, 'POST', $payload);
}

/**
 * Elimina filas de una tabla
 */
function deleteRows($accessToken, $datasetId, $tableName) {
    $url = POWERBI_API_URL . '/groups/' . POWERBI_WORKSPACE_ID . '/datasets/' . $datasetId . '/tables/' . $tableName . '/rows';
    
    return powerBIRequest($accessToken, $url, 'DELETE');
}

/**
 * Obtiene embed URL y token
 */
function getEmbedInfo($accessToken, $datasetId) {
    // Obtener reportes asociados al dataset
    $reportsUrl = POWERBI_API_URL . '/groups/' . POWERBI_WORKSPACE_ID . '/reports';
    $reports = powerBIRequest($accessToken, $reportsUrl, 'GET');
    
    $reportId = null;
    
    // Buscar reporte asociado a este dataset
    if (isset($reports['value'])) {
        foreach ($reports['value'] as $report) {
            if ($report['datasetId'] === $datasetId) {
                $reportId = $report['id'];
                break;
            }
        }
    }
    
    // Si no hay reporte, crear uno automático (auto-report)
    if (!$reportId) {
        // Power BI puede generar un reporte automático, pero necesitamos usar la web
        // Por ahora, devolvemos el dataset para que se pueda explorar en Power BI
        $embedUrl = "https://app.powerbi.com/groups/" . POWERBI_WORKSPACE_ID . "/datasets/" . $datasetId . "/details";
    } else {
        $embedUrl = "https://app.powerbi.com/reportEmbed?reportId=" . $reportId . "&groupId=" . POWERBI_WORKSPACE_ID;
    }
    
    // Generar embed token
    $tokenPayload = [
        'datasets' => [
            ['id' => $datasetId]
        ],
        'reports' => $reportId ? [['id' => $reportId]] : [],
        'targetWorkspaces' => [
            ['id' => POWERBI_WORKSPACE_ID]
        ]
    ];
    
    $tokenUrl = POWERBI_API_URL . '/GenerateToken';
    $tokenResponse = powerBIRequest($accessToken, $tokenUrl, 'POST', $tokenPayload);
    
    return [
        'embedUrl' => $embedUrl,
        'embedToken' => $tokenResponse['token'] ?? '',
        'reportId' => $reportId,
        'datasetId' => $datasetId
    ];
}

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Realiza petición a Power BI API
 */
function powerBIRequest($accessToken, $url, $method = 'GET', $payload = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $headers = [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($payload !== null && $method !== 'GET') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    error_log("Power BI API Request: {$method} {$url}");
    error_log("HTTP Code: {$httpCode}");
    error_log("Response: " . substr($response, 0, 500));
    
    if ($httpCode < 200 || $httpCode >= 300) {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['error']['message'] ?? $response;
        throw new Exception("Power BI API error ({$httpCode}): {$errorMsg}");
    }
    
    return $response ? json_decode($response, true) : [];
}

/**
 * Infiere el tipo de dato de Power BI
 */
function inferDataType($value) {
    if (is_int($value)) {
        return 'Int64';
    } elseif (is_float($value)) {
        return 'Double';
    } elseif (is_bool($value)) {
        return 'Boolean';
    } elseif (preg_match('/^\d{4}-\d{2}-\d{2}/', $value)) {
        return 'DateTime';
    } else {
        return 'String';
    }
}

/**
 * Sanitiza nombres para Power BI
 */
function sanitizeName($name) {
    // Power BI no permite ciertos caracteres
    $name = preg_replace('/[^a-zA-Z0-9_]/', '_', $name);
    return substr($name, 0, 100);
}
