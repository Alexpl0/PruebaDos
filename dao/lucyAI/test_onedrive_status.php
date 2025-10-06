<?php
/**
 * test_onedrive_status.php - Verifica si OneDrive está provisionado
 * Guarda en: dao/lucyAI/test_onedrive_status.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Configuración (usa tus valores reales)
define('MICROSOFT_CLIENT_ID', 'TU_CLIENT_ID_AQUI');
define('MICROSOFT_CLIENT_SECRET', 'TU_CLIENT_SECRET_AQUI');
define('MICROSOFT_TENANT_ID', 'TU_TENANT_ID_AQUI');
define('ONEDRIVE_USER', 'jesusperez@alexdev043.onmicrosoft.com');

// Obtener token
function getAccessToken() {
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
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    return $data['access_token'] ?? null;
}

try {
    echo json_encode(['step' => 1, 'message' => 'Obteniendo access token...'], JSON_PRETTY_PRINT) . "\n\n";
    
    $token = getAccessToken();
    
    if (!$token) {
        echo json_encode(['status' => 'error', 'message' => 'No se pudo obtener token'], JSON_PRETTY_PRINT);
        exit;
    }
    
    echo json_encode(['step' => 1, 'status' => 'success'], JSON_PRETTY_PRINT) . "\n\n";
    
    // Test 1: Verificar usuario
    echo json_encode(['step' => 2, 'message' => 'Verificando usuario...'], JSON_PRETTY_PRINT) . "\n\n";
    
    $userUrl = 'https://graph.microsoft.com/v1.0/users/' . urlencode(ONEDRIVE_USER);
    
    $ch = curl_init($userUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $token
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        echo json_encode([
            'status' => 'error',
            'step' => 2,
            'message' => 'Usuario no encontrado',
            'http_code' => $httpCode,
            'response' => json_decode($response, true)
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    $userData = json_decode($response, true);
    echo json_encode([
        'step' => 2,
        'status' => 'success',
        'user' => [
            'displayName' => $userData['displayName'] ?? '',
            'mail' => $userData['mail'] ?? '',
            'userPrincipalName' => $userData['userPrincipalName'] ?? ''
        ]
    ], JSON_PRETTY_PRINT) . "\n\n";
    
    // Test 2: Verificar OneDrive
    echo json_encode(['step' => 3, 'message' => 'Verificando OneDrive...'], JSON_PRETTY_PRINT) . "\n\n";
    
    $driveUrl = 'https://graph.microsoft.com/v1.0/users/' . urlencode(ONEDRIVE_USER) . '/drive';
    
    $ch = curl_init($driveUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $token
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        echo json_encode([
            'status' => 'ERROR_ONEDRIVE_NOT_READY',
            'step' => 3,
            'message' => 'OneDrive NO está provisionado',
            'http_code' => $httpCode,
            'response' => json_decode($response, true),
            'ACCION_REQUERIDA' => [
                'paso_1' => 'Abre https://www.office.com con el usuario ' . ONEDRIVE_USER,
                'paso_2' => 'Click en OneDrive (ícono azul con nube)',
                'paso_3' => 'Espera a que cargue completamente',
                'paso_4' => 'Sube un archivo de prueba',
                'paso_5' => 'Espera 10-15 minutos',
                'paso_6' => 'Vuelve a ejecutar este test'
            ]
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    $driveData = json_decode($response, true);
    
    // Test 3: Intentar listar archivos
    echo json_encode(['step' => 4, 'message' => 'Listando archivos en OneDrive...'], JSON_PRETTY_PRINT) . "\n\n";
    
    $filesUrl = 'https://graph.microsoft.com/v1.0/users/' . urlencode(ONEDRIVE_USER) . '/drive/root/children';
    
    $ch = curl_init($filesUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $token
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $filesData = json_decode($response, true);
    $fileCount = isset($filesData['value']) ? count($filesData['value']) : 0;
    
    echo json_encode([
        'RESULTADO_FINAL' => 'SUCCESS',
        'onedrive_status' => 'PROVISIONADO Y LISTO',
        'drive_id' => $driveData['id'] ?? '',
        'drive_type' => $driveData['driveType'] ?? '',
        'files_count' => $fileCount,
        'message' => 'OneDrive está listo para usarse. Lucy debería funcionar ahora.'
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}