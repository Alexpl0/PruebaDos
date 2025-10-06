<?php
/**
 * gamma_api.php - Manejador de Gamma API
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

define('GAMMA_API_URL', 'https://public-api.gamma.app/v0.2/generations');

// ==================== OBTENER DATOS DEL REQUEST ====================
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? 'create';

try {
    switch ($action) {
        case 'create':
            $result = createGammaPresentation($input);
            break;
            
        case 'get':
            $result = getGammaPresentation($input['generationId']);
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
 * Crea una nueva presentación en Gamma
 */
function createGammaPresentation($data) {
    if (!isset($data['gammaConfig'])) {
        throw new Exception('Missing gammaConfig parameter');
    }
    
    $config = $data['gammaConfig'];
    
    // Validar que tenemos inputText
    if (!isset($config['inputText']) || empty($config['inputText'])) {
        throw new Exception('inputText is required');
    }
    
    error_log("GAMMA DEBUG: Creando presentación con config: " . json_encode($config));
    
    // Preparar payload para Gamma API
    $payload = buildGammaPayload($config);
    
    error_log("GAMMA DEBUG: Payload final: " . json_encode($payload));
    
    // Hacer POST a Gamma API
    $response = gammaApiRequest(GAMMA_API_URL, 'POST', $payload);
    
    if (!isset($response['generationId'])) {
        throw new Exception('No generationId received from Gamma API');
    }
    
    $generationId = $response['generationId'];
    error_log("GAMMA DEBUG: Generation ID recibido: {$generationId}");
    
    // Polling para obtener la presentación
    $maxAttempts = 60; // 60 intentos = 5 minutos máximo
    $attempt = 0;
    $waitTime = 5; // segundos entre intentos
    
    while ($attempt < $maxAttempts) {
        sleep($waitTime);
        $attempt++;
        
        error_log("GAMMA DEBUG: Intento {$attempt}/{$maxAttempts} - Consultando estado...");
        
        $status = gammaApiRequest(GAMMA_API_URL . '/' . $generationId, 'GET');
        
        error_log("GAMMA DEBUG: Estado actual: " . ($status['status'] ?? 'unknown'));
        
        if (isset($status['status'])) {
            if ($status['status'] === 'completed') {
                error_log("GAMMA DEBUG: ¡Presentación completada!");
                return [
                    'generationId' => $generationId,
                    'gammaUrl' => $status['gammaUrl'],
                    'embedUrl' => getEmbedUrl($status['gammaUrl']),
                    'credits' => $status['credits'] ?? []
                ];
            } elseif ($status['status'] === 'failed') {
                throw new Exception('Gamma generation failed: ' . ($status['message'] ?? 'Unknown error'));
            }
            // Si es 'pending', continuar esperando
        }
    }
    
    throw new Exception('Gamma generation timeout after ' . ($maxAttempts * $waitTime) . ' seconds');
}

/**
 * Obtiene una presentación existente
 */
function getGammaPresentation($generationId) {
    if (empty($generationId)) {
        throw new Exception('generationId is required');
    }
    
    $response = gammaApiRequest(GAMMA_API_URL . '/' . $generationId, 'GET');
    
    if (isset($response['status']) && $response['status'] === 'completed') {
        return [
            'generationId' => $generationId,
            'gammaUrl' => $response['gammaUrl'],
            'embedUrl' => getEmbedUrl($response['gammaUrl']),
            'credits' => $response['credits'] ?? []
        ];
    }
    
    return $response;
}

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Construye el payload para la API de Gamma
 */
function buildGammaPayload($config) {
    // Valores por defecto optimizados para análisis de datos
    $payload = [
        'inputText' => $config['inputText'],
        'textMode' => $config['textMode'] ?? 'generate',
        'format' => 'presentation',
        'themeName' => $config['themeName'] ?? 'Oasis',
        'numCards' => $config['numCards'] ?? 8, // Pocas diapositivas pero densas
        'cardSplit' => $config['cardSplit'] ?? 'auto',
        'additionalInstructions' => $config['additionalInstructions'] ?? 'Create a data analysis presentation with multiple charts and graphs. Focus on visual data representation. Make it concise but informative.',
    ];
    
    // Exportar como PDF si se solicita
    if (isset($config['exportAs'])) {
        $payload['exportAs'] = $config['exportAs'];
    }
    
    // Opciones de texto
    $payload['textOptions'] = [
        'amount' => $config['textOptions']['amount'] ?? 'medium',
        'tone' => $config['textOptions']['tone'] ?? 'professional, analytical',
        'audience' => $config['textOptions']['audience'] ?? 'data analysts, business stakeholders',
        'language' => $config['textOptions']['language'] ?? 'es'
    ];
    
    // Opciones de imagen - SOLO modelos permitidos
    $allowedModels = ['flux-1-quick', 'flux-kontext-fast', 'imagen-3-flash', 'luma-photon-flash-1'];
    $selectedModel = $config['imageOptions']['model'] ?? 'flux-1-quick';
    
    if (!in_array($selectedModel, $allowedModels)) {
        $selectedModel = 'flux-1-quick'; // Fallback
    }
    
    $payload['imageOptions'] = [
        'source' => 'aiGenerated',
        'model' => $selectedModel,
        'style' => $config['imageOptions']['style'] ?? 'professional, clean, data visualization, charts'
    ];
    
    // Opciones de tarjeta
    $payload['cardOptions'] = [
        'dimensions' => $config['cardOptions']['dimensions'] ?? '16x9'
    ];
    
    // Opciones de compartir
    $payload['sharingOptions'] = [
        'workspaceAccess' => $config['sharingOptions']['workspaceAccess'] ?? 'view',
        'externalAccess' => $config['sharingOptions']['externalAccess'] ?? 'view'
    ];
    
    return $payload;
}

/**
 * Realiza petición a Gamma API
 */
function gammaApiRequest($url, $method = 'GET', $payload = null) {
    if (empty(GAMMA_API_KEY)) {
        throw new Exception('Gamma API Key no configurada en .env');
    }
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $headers = [
        'accept: application/json',
        'Content-Type: application/json',
        'X-API-KEY: ' . GAMMA_API_KEY
    ];
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($payload !== null && $method === 'POST') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    error_log("GAMMA API Request: {$method} {$url}");
    error_log("HTTP Code: {$httpCode}");
    error_log("Response: " . substr($response, 0, 500));
    
    if ($response === false) {
        throw new Exception('Error de conexión con Gamma API: ' . $curlError);
    }
    
    if ($httpCode < 200 || $httpCode >= 300) {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['message'] ?? $response;
        throw new Exception("Gamma API error ({$httpCode}): {$errorMsg}");
    }
    
    return json_decode($response, true);
}

/**
 * Convierte URL de Gamma a URL de embed
 */
function getEmbedUrl($gammaUrl) {
    // Gamma URLs suelen ser: https://gamma.app/docs/xxxxx
    // Para embed agregamos parámetros o usamos el embed endpoint
    
    // Si ya es una URL válida, intentar convertirla a embed
    if (strpos($gammaUrl, 'gamma.app') !== false) {
        // Agregar modo embed
        $separator = (strpos($gammaUrl, '?') !== false) ? '&' : '?';
        return $gammaUrl . $separator . 'mode=embed';
    }
    
    return $gammaUrl;
}