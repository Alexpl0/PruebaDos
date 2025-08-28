<?php
/**
 * generate_hash.php
 * Endpoint para generar hashes PHP reales compatibles con password_verify()
 * 
 * PROPÓSITO:
 * - Generar hashes PHP reales usando password_hash()
 * - Proporcionar endpoint para el HTML de administración
 * - Asegurar compatibilidad con el sistema de login existente
 */

// Configurar headers para CORS y JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Solo aceptar peticiones POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Solo se permiten peticiones POST'
    ]);
    exit;
}

try {
    // Obtener datos JSON de la petición
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Se requiere el campo password'
        ]);
        exit;
    }
    
    $password = $input['password'];
    
    // Validar que la contraseña no esté vacía
    if (empty(trim($password))) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'La contraseña no puede estar vacía'
        ]);
        exit;
    }
    
    // Validar longitud mínima
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'La contraseña debe tener al menos 6 caracteres'
        ]);
        exit;
    }
    
    // ✅ GENERAR HASH PHP REAL usando password_hash()
    // Este es el método correcto que será compatible con password_verify()
    $hash = password_hash($password, PASSWORD_DEFAULT);
    
    if (!$hash) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Error al generar el hash'
        ]);
        exit;
    }
    
    // Verificar que el hash funciona (test automático)
    if (!password_verify($password, $hash)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Error: el hash generado no es válido'
        ]);
        exit;
    }
    
    // Log de seguridad (opcional)
    error_log("Hash generado para contraseña de longitud: " . strlen($password));
    
    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'hash' => $hash,
        'algorithm' => 'PASSWORD_DEFAULT',
        'compatible_with' => 'password_verify()',
        'length' => strlen($hash),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno: ' . $e->getMessage()
    ]);
}
?>