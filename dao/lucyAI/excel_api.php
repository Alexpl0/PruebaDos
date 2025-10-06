<?php
/**
 * excel_api.php - Manejador de Microsoft Graph API para Excel
 * Crea, actualiza y gestiona archivos Excel en OneDrive
 */

// Activar reporte de errores para debugging (REMOVER en producción)
error_reporting(E_ALL);
ini_set('display_errors', 0);
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
define('MICROSOFT_CLIENT_ID', '316d8718-9117-4db5-b5d2-79a92cd2f0a8');
define('MICROSOFT_CLIENT_SECRET', 'c2c8Q~DvtuQ1rzT2hlnifPrDdoNFYf04VY_2Wdq~');
define('MICROSOFT_TENANT_ID', '1b76d39b-fc45-4afe-a05b-8d8f81f18a77');
define('MICROSOFT_GRAPH_URL', 'https://graph.microsoft.com/v1.0');


// Usuario donde se guardarán los archivos Excel
// Puede ser un email (user@tudominio.com) o un User ID
define('ONEDRIVE_USER', 'j.alejandro.pl_gmail.com#EXT#@jalejandroplgmail.onmicrosoft.com');


// ==================== OBTENER DATOS DEL REQUEST ====================
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? 'create';

try {
    switch ($action) {
        case 'create':
            $result = createExcelFile($input);
            break;
            
        case 'update':
            $result = updateExcelFile($input);
            break;
            
        case 'get':
            $result = getExcelFile($input['fileId']);
            break;
            
        case 'download':
            $result = getDownloadUrl($input['fileId']);
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
 * Crea un nuevo archivo Excel en OneDrive
 */
function createExcelFile($data) {
    $accessToken = getAccessToken();
    $fileName = sanitizeFileName($data['fileName'] ?? 'Lucy_Dashboard_' . date('Y-m-d_His')) . '.xlsx';
    
    // Crear workbook vacío
    $fileId = createEmptyWorkbook($accessToken, $fileName);
    
    // Agregar worksheets y datos
    if (isset($data['worksheets']) && is_array($data['worksheets'])) {
        foreach ($data['worksheets'] as $index => $worksheet) {
            processWorksheet($accessToken, $fileId, $worksheet, $index);
        }
    }
    
    // Obtener URL de embed
    $embedUrl = getEmbedUrl($accessToken, $fileId);
    
    return [
        'fileId' => $fileId,
        'embedUrl' => $embedUrl,
        'fileName' => $fileName
    ];
}

/**
 * Actualiza un archivo Excel existente
 */
function updateExcelFile($data) {
    if (!isset($data['fileId'])) {
        throw new Exception('File ID is required for update');
    }
    
    $accessToken = getAccessToken();
    $fileId = $data['fileId'];
    
    // Actualizar worksheets
    if (isset($data['worksheets']) && is_array($data['worksheets'])) {
        foreach ($data['worksheets'] as $index => $worksheet) {
            updateWorksheet($accessToken, $fileId, $worksheet);
        }
    }
    
    // Actualizar celdas específicas si se proporcionan
    if (isset($data['cellUpdates']) && is_array($data['cellUpdates'])) {
        updateCells($accessToken, $fileId, $data['cellUpdates']);
    }
    
    $embedUrl = getEmbedUrl($accessToken, $fileId);
    
    return [
        'fileId' => $fileId,
        'embedUrl' => $embedUrl,
        'updated' => true
    ];
}

/**
 * Obtiene información de un archivo Excel
 */
function getExcelFile($fileId) {
    $accessToken = getAccessToken();
    $embedUrl = getEmbedUrl($accessToken, $fileId);
    
    return [
        'fileId' => $fileId,
        'embedUrl' => $embedUrl
    ];
}

/**
 * Obtiene URL de descarga del archivo
 */
function getDownloadUrl($fileId) {
    $accessToken = getAccessToken();
    
    $userPath = urlencode(ONEDRIVE_USER);
    $url = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/content";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken
    ]);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 302) {
        preg_match('/Location: (.*?)\r\n/', $response, $matches);
        $downloadUrl = trim($matches[1] ?? '');
        
        return ['downloadUrl' => $downloadUrl];
    }
    
    throw new Exception('Could not get download URL');
}

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

/**
 * Obtiene un access token de Microsoft Graph API
 */
function getAccessToken() {
    // Verificar que las credenciales estén configuradas
    if (MICROSOFT_CLIENT_ID === 'TU_CLIENT_ID_AQUI' || 
        MICROSOFT_CLIENT_SECRET === 'TU_CLIENT_SECRET_AQUI' || 
        MICROSOFT_TENANT_ID === 'TU_TENANT_ID_AQUI') {
        throw new Exception('Microsoft Graph credentials no configuradas. Por favor configura CLIENT_ID, CLIENT_SECRET y TENANT_ID en excel_api.php');
    }
    
    $tokenUrl = 'https://login.microsoftonline.com/' . MICROSOFT_TENANT_ID . '/oauth2/v2.0/token';
    
    $params = [
        'client_id' => MICROSOFT_CLIENT_ID,
        'client_secret' => MICROSOFT_CLIENT_SECRET,
        'scope' => 'https://graph.microsoft.com/.default',
        'grant_type' => 'client_credentials'
    ];
    
    $ch = curl_init($tokenUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Para desarrollo
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($response === false) {
        throw new Exception('Error de conexión al obtener token: ' . $curlError);
    }
    
    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['error_description'] ?? $errorData['error'] ?? 'Unknown error';
        throw new Exception('Error obteniendo access token (' . $httpCode . '): ' . $errorMsg . '. Verifica tus credenciales de Azure.');
    }
    
    $data = json_decode($response, true);
    
    if (!isset($data['access_token'])) {
        throw new Exception('No access token en respuesta. Response: ' . substr($response, 0, 200));
    }
    
    return $data['access_token'];
}

// ==================== FUNCIONES DE EXCEL ====================

/**
 * Crea un workbook vacío en OneDrive
 */
function createEmptyWorkbook($accessToken, $fileName) {
    // Crear archivo Excel vacío usando plantilla mínima
    $excelTemplate = createMinimalExcelFile();
    
    // Usar usuario específico en lugar de /me
    $userPath = urlencode(ONEDRIVE_USER);
    $url = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/root:/" . urlencode($fileName) . ":/content";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $excelTemplate);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200 && $httpCode !== 201) {
        throw new Exception('Error creating workbook: ' . $response);
    }
    
    $data = json_decode($response, true);
    return $data['id'];
}

/**
 * Crea un archivo Excel mínimo válido en formato XLSX
 */
function createMinimalExcelFile() {
    // Crear un archivo ZIP temporal (XLSX es un ZIP)
    $zip = new ZipArchive();
    $tempFile = tempnam(sys_get_temp_dir(), 'xlsx');
    
    if ($zip->open($tempFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        throw new Exception('Cannot create ZIP file');
    }
    
    // [Content_Types].xml
    $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>');
    
    // _rels/.rels
    $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>');
    
    // xl/_rels/workbook.xml.rels
    $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>');
    
    // xl/workbook.xml
    $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets>
        <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
    </sheets>
</workbook>');
    
    // xl/worksheets/sheet1.xml
    $zip->addFromString('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <sheetData/>
</worksheet>');
    
    $zip->close();
    
    $content = file_get_contents($tempFile);
    unlink($tempFile);
    
    return $content;
}

/**
 * Procesa y agrega datos a una worksheet
 */
function processWorksheet($accessToken, $fileId, $worksheet, $index) {
    $worksheetName = $worksheet['name'] ?? "Sheet" . ($index + 1);
    
    // Si es el primer worksheet, renombrar Sheet1, sino crear nueva
    if ($index === 0) {
        renameWorksheet($accessToken, $fileId, 'Sheet1', $worksheetName);
        $targetSheet = $worksheetName;
    } else {
        addWorksheet($accessToken, $fileId, $worksheetName);
        $targetSheet = $worksheetName;
    }
    
    // Agregar datos
    if (isset($worksheet['data']) && is_array($worksheet['data'])) {
        addDataToWorksheet($accessToken, $fileId, $targetSheet, $worksheet);
    }
    
    // Agregar tablas
    if (isset($worksheet['tables']) && is_array($worksheet['tables'])) {
        foreach ($worksheet['tables'] as $table) {
            addTable($accessToken, $fileId, $targetSheet, $table);
        }
    }
    
    // Agregar gráficos
    if (isset($worksheet['charts']) && is_array($worksheet['charts'])) {
        foreach ($worksheet['charts'] as $chart) {
            addChart($accessToken, $fileId, $targetSheet, $chart);
        }
    }
    
    // Aplicar formato
    if (isset($worksheet['formatting'])) {
        applyFormatting($accessToken, $fileId, $targetSheet, $worksheet['formatting']);
    }
}

/**
 * Renombra una worksheet
 */
function renameWorksheet($accessToken, $fileId, $oldName, $newName) {
    $userPath = urlencode(ONEDRIVE_USER);
    $url = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/worksheets('{$oldName}')";
    
    $payload = ['name' => $newName];
    
    graphApiRequest($accessToken, $url, 'PATCH', $payload);
}

/**
 * Agrega una nueva worksheet
 */
function addWorksheet($accessToken, $fileId, $name) {
    $userPath = urlencode(ONEDRIVE_USER);
    $url = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/worksheets/add";
    
    $payload = ['name' => $name];
    
    return graphApiRequest($accessToken, $url, 'POST', $payload);
}

/**
 * Agrega datos a una worksheet
 */
function addDataToWorksheet($accessToken, $fileId, $sheetName, $worksheet) {
    $data = $worksheet['data'];
    $columns = $worksheet['columns'] ?? array_keys($data[0] ?? []);
    
    // Preparar matriz de datos
    $values = [$columns]; // Headers
    foreach ($data as $row) {
        $rowValues = [];
        foreach ($columns as $col) {
            $rowValues[] = $row[$col] ?? '';
        }
        $values[] = $rowValues;
    }
    
    // Determinar rango
    $lastCol = chr(65 + count($columns) - 1);
    $lastRow = count($values);
    $range = "A1:{$lastCol}{$lastRow}";
    
    $userPath = urlencode(ONEDRIVE_USER);
    $url = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/worksheets('{$sheetName}')/range(address='{$range}')";
    
    $payload = ['values' => $values];
    
    return graphApiRequest($accessToken, $url, 'PATCH', $payload);
}

/**
 * Agrega una tabla a la worksheet
 */
function addTable($accessToken, $fileId, $sheetName, $tableConfig) {
    $userPath = urlencode(ONEDRIVE_USER);
    $url = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/worksheets('{$sheetName}')/tables/add";
    
    $payload = [
        'address' => $tableConfig['range'],
        'hasHeaders' => $tableConfig['hasHeaders'] ?? true
    ];
    
    $result = graphApiRequest($accessToken, $url, 'POST', $payload);
    
    // Aplicar estilo si se especifica
    if (isset($tableConfig['style']) && isset($result['id'])) {
        $styleUrl = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/tables('{$result['id']}')";
        graphApiRequest($accessToken, $styleUrl, 'PATCH', ['style' => $tableConfig['style']]);
    }
    
    return $result;
}

/**
 * Agrega un gráfico a la worksheet
 */
function addChart($accessToken, $fileId, $sheetName, $chartConfig) {
    $userPath = urlencode(ONEDRIVE_USER);
    $url = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/worksheets('{$sheetName}')/charts/add";
    
    $payload = [
        'type' => $chartConfig['type'],
        'sourceData' => $chartConfig['dataRange'],
        'seriesBy' => 'Auto'
    ];
    
    $result = graphApiRequest($accessToken, $url, 'POST', $payload);
    
    // Configurar título y posición
    if (isset($result['id'])) {
        $chartId = $result['id'];
        
        if (isset($chartConfig['title'])) {
            $titleUrl = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/worksheets('{$sheetName}')/charts('{$chartId}')/title";
            graphApiRequest($accessToken, $titleUrl, 'PATCH', ['text' => $chartConfig['title']]);
        }
        
        if (isset($chartConfig['position'])) {
            $posUrl = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/worksheets('{$sheetName}')/charts('{$chartId}')";
            graphApiRequest($accessToken, $posUrl, 'PATCH', [
                'top' => $chartConfig['position']['row'] * 20,
                'left' => $chartConfig['position']['column'] * 100
            ]);
        }
    }
    
    return $result;
}

/**
 * Aplica formato a la worksheet
 */
function applyFormatting($accessToken, $fileId, $sheetName, $formatting) {
    $userPath = urlencode(ONEDRIVE_USER);
    
    // Formato de header
    if (isset($formatting['headerRow'])) {
        $headerFormat = $formatting['headerRow'];
        $url = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/worksheets('{$sheetName}')/range(address='1:1')/format";
        
        $formatPayload = [];
        if (isset($headerFormat['bold'])) {
            $formatPayload['font'] = ['bold' => true];
        }
        if (isset($headerFormat['fill'])) {
            $formatPayload['fill'] = ['color' => $headerFormat['fill']];
        }
        if (isset($headerFormat['fontColor'])) {
            $formatPayload['font']['color'] = $headerFormat['fontColor'];
        }
        
        if (!empty($formatPayload)) {
            graphApiRequest($accessToken, $url, 'PATCH', $formatPayload);
        }
    }
    
    // Freeze panes
    if (isset($formatting['freezePanes'])) {
        $freezeUrl = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/worksheets('{$sheetName}')/freezePanes/freezeRows";
        graphApiRequest($accessToken, $freezeUrl, 'POST', ['count' => $formatting['freezePanes']['row']]);
    }
}

/**
 * Actualiza una worksheet existente
 */
function updateWorksheet($accessToken, $fileId, $worksheet) {
    $sheetName = $worksheet['name'];
    $userPath = urlencode(ONEDRIVE_USER);
    
    // Verificar si la hoja existe
    $sheetsUrl = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/worksheets";
    $sheets = graphApiRequest($accessToken, $sheetsUrl, 'GET');
    
    $sheetExists = false;
    foreach ($sheets['value'] as $sheet) {
        if ($sheet['name'] === $sheetName) {
            $sheetExists = true;
            break;
        }
    }
    
    if (!$sheetExists) {
        addWorksheet($accessToken, $fileId, $sheetName);
    }
    
    // Actualizar datos
    if (isset($worksheet['data'])) {
        addDataToWorksheet($accessToken, $fileId, $sheetName, $worksheet);
    }
}

/**
 * Actualiza celdas específicas
 */
function updateCells($accessToken, $fileId, $cellUpdates) {
    $userPath = urlencode(ONEDRIVE_USER);
    
    foreach ($cellUpdates as $update) {
        $sheetName = $update['sheet'];
        $range = $update['range'];
        $values = $update['values'];
        
        $url = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}/workbook/worksheets('{$sheetName}')/range(address='{$range}')";
        
        graphApiRequest($accessToken, $url, 'PATCH', ['values' => $values]);
    }
}

/**
 * Obtiene la URL de embed para el archivo
 */
function getEmbedUrl($accessToken, $fileId) {
    $userPath = urlencode(ONEDRIVE_USER);
    $url = MICROSOFT_GRAPH_URL . "/users/{$userPath}/drive/items/{$fileId}";
    
    $response = graphApiRequest($accessToken, $url, 'GET');
    
    if (isset($response['webUrl'])) {
        // Convertir webUrl a embedUrl
        $webUrl = $response['webUrl'];
        $embedUrl = str_replace('?web=1', '', $webUrl);
        $embedUrl .= '?action=embedview';
        
        return $embedUrl;
    }
    
    throw new Exception('Could not get embed URL');
}

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Realiza una petición a Graph API
 */
function graphApiRequest($accessToken, $url, $method = 'GET', $payload = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Para desarrollo
    
    $headers = [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($response === false) {
        throw new Exception("Graph API connection error: {$curlError}");
    }
    
    if ($httpCode < 200 || $httpCode >= 300) {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['error']['message'] ?? $response;
        throw new Exception("Graph API error ({$httpCode}) on {$method} {$url}: {$errorMsg}");
    }
    
    return json_decode($response, true);
}

/**
 * Sanitiza el nombre del archivo
 */
function sanitizeFileName($fileName) {
    $fileName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $fileName);
    return substr($fileName, 0, 100);
}
