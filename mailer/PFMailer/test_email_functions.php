<?php
/**
 * test_email_functions.php - Endpoint UNIFICADO COMPLETO para probar funciones de correo.
 *
 * ✅ ACTUALIZADO: Incluye todas las funcionalidades de testing
 * ✅ Sistema original de correos + Sistema multi-planta 
 * ✅ Endpoint centralizado para todas las pruebas
 * ✅ Compatibilidad total con interfaces existentes
 *
 * @version 3.0 - Unificado y Completo
 */

// --- CONFIGURACIÓN INICIAL Y MANEJO DE ERRORES ---

ob_start(); // Iniciar buffer de salida para evitar output inesperado

// Configurar manejo de errores para retornar JSON limpio en caso de fallo
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/_test_errors.log');

// Headers de la respuesta
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar solicitudes OPTIONS (pre-flight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// --- FUNCIONES HELPER PARA RESPUESTAS JSON ---

/**
 * Envía una respuesta JSON de error y termina el script.
 * @param string $message Mensaje de error principal.
 * @param mixed|null $details Detalles técnicos o datos adicionales.
 * @param int $httpCode Código de estado HTTP.
 */
function sendJsonError($message, $details = null, $httpCode = 400) {
    ob_clean(); // Limpiar buffer por si hay errores no capturados
    http_response_code($httpCode);
    $response = ['success' => false, 'message' => $message, 'timestamp' => date('Y-m-d H:i:s')];
    if ($details !== null) {
        $response['details'] = $details;
    }
    echo json_encode($response);
    exit;
}

/**
 * Envía una respuesta JSON de éxito y termina el script.
 * @param string $message Mensaje de éxito.
 * @param mixed|null $data Datos a devolver al frontend.
 */
function sendJsonSuccess($message, $data = null) {
    ob_clean();
    http_response_code(200);
    $response = ['success' => true, 'message' => $message, 'timestamp' => date('Y-m-d H:i:s')];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response);
    exit;
}

// Registrar un manejador para errores fatales que no son capturados por try-catch
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        // Si los headers no se han enviado, intenta enviar un JSON de error
        if (!headers_sent()) {
            sendJsonError(
                'Ocurrió un error fatal en el servidor.',
                [
                    'type' => 'FATAL_ERROR',
                    'message' => $error['message'],
                    'file' => basename($error['file']),
                    'line' => $error['line'],
                ],
                500
            );
        }
    }
    ob_end_flush(); // Enviar el contenido del buffer
});

// --- LÓGICA PRINCIPAL DEL SCRIPT ---

try {
    // 1. Determinar método y acción
    $method = $_SERVER['REQUEST_METHOD'];
    $action = null;
    $data = [];

    if ($method === 'GET') {
        $action = $_GET['action'] ?? null;
        $data = $_GET;
    } elseif ($method === 'POST') {
        $input = file_get_contents('php://input');
        if (!empty($input)) {
            $data = json_decode($input, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                sendJsonError('Error al decodificar el JSON: ' . json_last_error_msg());
            }
        }
        $action = $data['action'] ?? null;
    } else {
        sendJsonError('Método no permitido. Solo se aceptan GET y POST.', null, 405);
    }

    // 2. Validar que la acción esté presente
    if (!$action) {
        sendJsonError('La acción no fue especificada.');
    }

    // 3. Cargar la clase PFMailer
    if (!file_exists(__DIR__ . '/PFmailer.php')) {
        sendJsonError('Archivo principal PFmailer.php no encontrado.', null, 500);
    }
    require_once __DIR__ . '/PFmailer.php';

    // 4. Instanciar el Mailer
    $mailer = new PFMailer();

    // =========================================================================
    // PROCESAR ACCIONES - SISTEMA UNIFICADO
    // =========================================================================

    switch ($action) {

        // =====================================================================
        // FUNCIONES ORIGINALES DEL SISTEMA DE CORREOS
        // =====================================================================

        case 'approval_notification':
            $orderId = filter_var($data['orderId'] ?? null, FILTER_VALIDATE_INT);
            if (!$orderId) sendJsonError('El parámetro "orderId" es inválido o no fue proporcionado.');
            
            $result = $mailer->sendApprovalNotification($orderId);
            if ($result) {
                sendJsonSuccess("Notificación de aprobación enviada para la orden #{$orderId}.");
            } else {
                sendJsonError("Fallo al enviar la notificación de aprobación para la orden #{$orderId}. Revisa los logs para más detalles.");
            }
            break;

        case 'status_notification':
            $orderId = filter_var($data['orderId'] ?? null, FILTER_VALIDATE_INT);
            $status = $data['status'] ?? null;
            if (!$orderId) sendJsonError('El parámetro "orderId" es inválido.');
            if (!in_array($status, ['approved', 'rejected'])) sendJsonError('El parámetro "status" debe ser "approved" o "rejected".');
            
            $result = $mailer->sendStatusNotification($orderId, $status);
            if ($result) {
                sendJsonSuccess("Notificación de estado '{$status}' enviada para la orden #{$orderId}.");
            } else {
                sendJsonError("Fallo al enviar la notificación de estado para la orden #{$orderId}.");
            }
            break;

        case 'weekly_summary':
            $result = $mailer->sendWeeklySummaryEmails();
            if (!empty($result['errors'])) {
                sendJsonError('Ocurrió un error al procesar el resumen para aprobadores.', $result);
            } else {
                sendJsonSuccess("Resumen para aprobadores procesado. Correos enviados: {$result['success']}", $result);
            }
            break;

        case 'weekly_statistics_report':
            $result = $mailer->sendWeeklyStatisticsReport();
            if ($result['success']) {
                sendJsonSuccess($result['message'], $result);
            } else {
                sendJsonError($result['message'] ?? 'Ocurrió un error al generar el reporte de estadísticas.', $result);
            }
            break;

        case 'recovery_check':
            $result = $mailer->sendRecoveryCheckEmails();
            if ($result['success']) {
                sendJsonSuccess($result['message'], $result['data']);
            } else {
                sendJsonError($result['message'] ?? 'Ocurrió un error al procesar la verificación de recovery.', $result);
            }
            break;

        case 'verification':
            $userId = filter_var($data['userId'] ?? null, FILTER_VALIDATE_INT);
            if (!$userId) sendJsonError('El parámetro "userId" es inválido o no fue proporcionado.');
            
            $result = $mailer->sendVerificationEmail($userId);
            if ($result) {
                sendJsonSuccess("Correo de verificación enviado al usuario #{$userId}.");
            } else {
                sendJsonError("Fallo al enviar el correo de verificación para el usuario #{$userId}. El usuario podría no existir o ya estar verificado.");
            }
            break;

        case 'password_reset':
            $email = filter_var($data['email'] ?? null, FILTER_VALIDATE_EMAIL);
            if (!$email) sendJsonError('El formato del correo electrónico no es válido.');

            $db = $mailer->getDatabase();
            
            // Buscar usuario
            $stmt = $db->prepare("SELECT id, name, email FROM User WHERE email = ? LIMIT 1");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $userResult = $stmt->get_result()->fetch_assoc();
            
            if (!$userResult) {
                sendJsonError("No se encontró un usuario con el correo electrónico proporcionado.");
            }

            // Generar token
            $token = bin2hex(random_bytes(32));
            
            $result = $mailer->sendPasswordResetEmail($userResult, $token);

            if ($result) {
                sendJsonSuccess("Correo de recuperación enviado a {$email}. El token generado es: " . $token, ['token' => $token]);
            } else {
                sendJsonError("Fallo al enviar el correo de recuperación a {$email}.");
            }
            break;

        // =====================================================================
        // ✅ NUEVAS FUNCIONES DEL SISTEMA MULTI-PLANTA
        // =====================================================================

        case 'check_smtp_configs':
            // ✅ Verificar configuraciones SMTP disponibles
            try {
                if (!defined('SMTP_CONFIGS')) {
                    sendJsonError('Configuraciones SMTP no cargadas. Verificar smtp_config.php');
                }

                $configs = SMTP_CONFIGS;
                $configSummary = [];
                
                foreach ($configs as $plantCode => $config) {
                    $configSummary[$plantCode] = [
                        'plant_name' => $config['plant_name'],
                        'username' => $config['username'],
                        'from_name' => $config['from_name'],
                        'host' => $config['host'],
                        'port' => $config['port'],
                        'has_password' => !empty($config['password']),
                        'password_length' => strlen($config['password']),
                        'is_valid' => function_exists('isPlantConfigValid') ? isPlantConfigValid($plantCode) : true
                    ];
                }
                
                sendJsonSuccess('Configuraciones SMTP verificadas exitosamente', [
                    'environment' => APP_ENVIRONMENT,
                    'test_mode' => TEST_MODE,
                    'total_configs' => count($configs),
                    'configs' => $configSummary
                ]);

            } catch (Exception $e) {
                sendJsonError('Error verificando configuraciones SMTP: ' . $e->getMessage());
            }
            break;

        case 'test_plant_detection':
            // ✅ Probar detección de planta por diferentes emails
            try {
                $testEmails = [
                    'test.queretaro@grammer.com',
                    'test.tetla@grammer.com', 
                    'test.regional@grammer.com',
                    'nonexistent@grammer.com',
                    'extern.jesus.perez@grammer.com'
                ];
                
                $detectionResults = [];
                
                foreach ($testEmails as $email) {
                    try {
                        // ✅ USAR MÉTODOS PÚBLICOS EN LUGAR DE REFLEXIÓN
                        $detectedPlant = $mailer->testDeterminePlantConfig($email, null);
                        $userData = $mailer->testGetUserByEmail($email);
                        
                        $detectionResults[] = [
                            'email' => $email,
                            'detected_plant' => $detectedPlant,
                            'user_exists' => !empty($userData),
                            'user_plant' => $userData['plant'] ?? null,
                            'user_name' => $userData['name'] ?? null,
                            // ✅ CORREGIDO: Mostrar las cuentas REALES que se usan
                            'expected_config' => $detectedPlant === 'default' ? 'premiumfreight@grammermx.com' : 
                                               ($detectedPlant === '3330' ? 'specialfreight@grammermx.com' : 'premium_freight@grammermx.com')
                        ];
                        
                    } catch (Exception $e) {
                        $detectionResults[] = [
                            'email' => $email,
                            'error' => $e->getMessage(),
                            'detected_plant' => 'error'
                        ];
                    }
                }
                
                sendJsonSuccess('Prueba de detección de planta completada', [
                    'test_results' => $detectionResults,
                    'total_tests' => count($detectionResults),
                    'logic_explanation' => [
                        'step_1' => 'Buscar email en tabla User',
                        'step_2' => 'Si User.plant = 3330 → Querétaro',
                        'step_3' => 'Si User.plant = 3310 → Tetla', 
                        'step_4' => 'Si no existe o plant = NULL → default'
                    ]
                ]);

            } catch (Exception $e) {
                sendJsonError('Error en prueba de detección: ' . $e->getMessage());
            }
            break;

        case 'check_test_users':
            // ✅ Verificar usuarios de prueba en la base de datos
            try {
                $db = $mailer->getDatabase();
                
                if (!$db) {
                    sendJsonError('No se pudo conectar a la base de datos');
                }
                
                // Buscar usuarios por planta
                $sql = "SELECT id, name, email, plant, authorization_level 
                        FROM User 
                        WHERE plant IN ('3330', '3310') OR plant IS NULL 
                        ORDER BY plant, name 
                        LIMIT 20";
                
                $result = $db->query($sql);
                $users = $result->fetch_all(MYSQLI_ASSOC);
                
                $plantStats = ['3330' => 0, '3310' => 0, 'null' => 0];
                foreach ($users as $user) {
                    if ($user['plant'] === '3330') $plantStats['3330']++;
                    elseif ($user['plant'] === '3310') $plantStats['3310']++;
                    else $plantStats['null']++;
                }
                
                sendJsonSuccess('Usuarios de prueba encontrados', [
                    'users' => $users,
                    'plant_statistics' => $plantStats,
                    'total_users' => count($users),
                    'recommendations' => [
                        'queretaro_users' => $plantStats['3330'],
                        'tetla_users' => $plantStats['3310'],
                        'without_plant' => $plantStats['null']
                    ]
                ]);

            } catch (Exception $e) {
                sendJsonError('Error verificando usuarios de prueba: ' . $e->getMessage());
            }
            break;

        case 'create_test_users':
            // ✅ Crear usuarios de prueba para testing
            try {
                $db = $mailer->getDatabase();
                
                if (!$db) {
                    sendJsonError('No se pudo conectar a la base de datos');
                }
                
                $testUsers = [
                    [
                        'name' => 'Test Usuario Querétaro',
                        'email' => 'test.queretaro@grammer.com',
                        'plant' => '3330',
                        'authorization_level' => 1
                    ],
                    [
                        'name' => 'Test Usuario Tetla',
                        'email' => 'test.tetla@grammer.com',
                        'plant' => '3310',
                        'authorization_level' => 1
                    ],
                    [
                        'name' => 'Test Usuario Regional',
                        'email' => 'test.regional@grammer.com',
                        'plant' => null,
                        'authorization_level' => 2
                    ]
                ];
                
                $created = [];
                $errors = [];
                
                foreach ($testUsers as $user) {
                    try {
                        // Verificar si ya existe
                        $checkSql = "SELECT id FROM User WHERE email = ?";
                        $checkStmt = $db->prepare($checkSql);
                        $checkStmt->bind_param("s", $user['email']);
                        $checkStmt->execute();
                        $exists = $checkStmt->get_result()->num_rows > 0;
                        
                        if ($exists) {
                            $errors[] = "Usuario {$user['email']} ya existe";
                            continue;
                        }
                        
                        // Crear usuario
                        $insertSql = "INSERT INTO User (name, email, plant, authorization_level, verified) 
                                     VALUES (?, ?, ?, ?, 1)";
                        $insertStmt = $db->prepare($insertSql);
                        $insertStmt->bind_param("sssi", 
                            $user['name'], 
                            $user['email'], 
                            $user['plant'], 
                            $user['authorization_level']
                        );
                        
                        if ($insertStmt->execute()) {
                            $user['id'] = $db->insert_id;
                            $created[] = $user;
                        } else {
                            $errors[] = "Error creando {$user['email']}: " . $insertStmt->error;
                        }
                        
                    } catch (Exception $e) {
                        $errors[] = "Excepción creando {$user['email']}: " . $e->getMessage();
                    }
                }
                
                sendJsonSuccess('Proceso de creación de usuarios completado', [
                    'created_users' => $created,
                    'errors' => $errors,
                    'total_created' => count($created),
                    'total_errors' => count($errors)
                ]);

            } catch (Exception $e) {
                sendJsonError('Error creando usuarios de prueba: ' . $e->getMessage());
            }
            break;

        case 'test_email_to_specific_user':
            // ✅ Enviar email a usuario específico y verificar configuración SMTP usada
            try {
                $recipientEmail = $data['recipient_email'] ?? null;
                $testMessage = $data['message'] ?? 'Email de prueba del sistema simplificado multi-planta.';
                
                if (!$recipientEmail) {
                    sendJsonError('Email del destinatario requerido');
                }
                
                // Verificar datos del destinatario antes del envío
                $userData = $mailer->testGetUserByEmail($recipientEmail);
                
                if (!$userData) {
                    sendJsonError("Usuario no encontrado para email: {$recipientEmail}", [
                        'suggestion' => 'Usar la acción create_test_users para crear usuarios de prueba'
                    ]);
                }
                
                // Determinar qué configuración se usará
                $expectedPlant = $mailer->testDeterminePlantConfig($recipientEmail, null);
                
                // Configurar destinatario
                $mailer->testSetEmailRecipients($recipientEmail, $userData['name'], null);
                
                // Obtener configuración actual usada
                $currentConfig = $mailer->getCurrentPlantInfo();
                
                // ✅ USAR MÉTODOS PÚBLICOS PARA CONFIGURAR EMAIL
                $mailer->setSubject("🧪 Test Unificado - Planta {$currentConfig['plant_name']}");
                $mailer->setBody("
                    <html>
                    <head><title>Test Email Unificado</title></head>
                    <body style='font-family: Arial, sans-serif; margin: 20px;'>
                        <h2 style='color: #034C8C;'>🧪 Test del Sistema Unificado Multi-Planta</h2>
                        
                        <div style='background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0;'>
                            <h3>✅ Endpoint Unificado Funcionando:</h3>
                            <ul>
                                <li><strong>Email destinatario:</strong> {$recipientEmail}</li>
                                <li><strong>Usuario en BD:</strong> {$userData['name']} (ID: {$userData['id']})</li>
                                <li><strong>Planta del usuario:</strong> {$userData['plant']}</li>
                                <li><strong>Configuración usada:</strong> {$expectedPlant}</li>
                                <li><strong>Enviado desde:</strong> {$currentConfig['username']}</li>
                                <li><strong>Nombre remitente:</strong> {$currentConfig['from_name']}</li>
                            </ul>
                        </div>
                        
                        <div style='background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;'>
                            <h3>📧 Mensaje de Prueba:</h3>
                            <p>{$testMessage}</p>
                        </div>
                        
                        <div style='background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;'>
                            <h3>🔍 Verificar:</h3>
                            <p>Este email debería llegar desde <strong>{$currentConfig['username']}</strong></p>
                            <p>Endpoint usado: <strong>test_email_functions.php</strong> (Unificado)</p>
                        </div>
                        
                        <hr>
                        <p style='font-size: 12px; color: #666;'>
                            Email generado por endpoint unificado multi-planta<br>
                            Fecha: " . date('Y-m-d H:i:s') . "<br>
                            Entorno: " . APP_ENVIRONMENT . "<br>
                            Test Mode: " . (TEST_MODE ? 'SÍ' : 'NO') . "
                        </p>
                    </body>
                    </html>
                ");
                
                // Enviar email
                $sent = $mailer->send();
                
                if ($sent) {
                    sendJsonSuccess("Email de prueba enviado exitosamente", [
                        'recipient' => [
                            'email' => $recipientEmail,
                            'name' => $userData['name'],
                            'plant' => $userData['plant']
                        ],
                        'smtp_config_used' => [
                            'plant_code' => $expectedPlant,
                            'plant_name' => $currentConfig['plant_name'],
                            'smtp_username' => $currentConfig['username'],
                            'from_name' => $currentConfig['from_name']
                        ],
                        'logic_flow' => [
                            'step_1' => "Buscó email '{$recipientEmail}' en tabla User",
                            'step_2' => "Encontró usuario: {$userData['name']} con plant = '{$userData['plant']}'",
                            'step_3' => "Determinó configuración: {$expectedPlant}",
                            'step_4' => "Configuró SMTP: {$currentConfig['username']}", 
                            'step_5' => "Envió email exitosamente"
                        ],
                        'test_mode' => TEST_MODE,
                        'environment' => APP_ENVIRONMENT
                    ]);
                } else {
                    sendJsonError("Error enviando email: " . $mailer->getLastError());
                }

            } catch (Exception $e) {
                sendJsonError("Excepción durante envío: " . $e->getMessage());
            }
            break;

        case 'test_all_plant_configs':
            // ✅ Probar envío a usuarios de todas las plantas configuradas
            try {
                $testEmails = [
                    'test.queretaro@grammer.com',  // Debería usar 3330
                    'test.tetla@grammer.com',      // Debería usar 3310
                    'test.regional@grammer.com',   // Debería usar default
                    'nonexistent@grammer.com'      // Debería usar default
                ];
                
                $results = [];
                
                foreach ($testEmails as $email) {
                    try {
                        $tempMailer = new PFMailer();
                        
                        // ✅ USAR MÉTODOS PÚBLICOS
                        $userData = $tempMailer->testGetUserByEmail($email);
                        
                        if (!$userData && $email !== 'nonexistent@grammer.com') {
                            $results[] = [
                                'email' => $email,
                                'status' => 'skipped',
                                'reason' => 'Usuario no existe (crear primero con create_test_users)'
                            ];
                            continue;
                        }
                        
                        // Determinar configuración
                        $expectedPlant = $tempMailer->testDeterminePlantConfig($email, null);
                        
                        // Configurar y enviar
                        $tempMailer->testSetEmailRecipients($email, $userData['name'] ?? 'Usuario No Encontrado', null);
                        
                        $currentConfig = $tempMailer->getCurrentPlantInfo();
                        
                        $tempMailer->setSubject("🌐 Test Masivo Unificado - {$currentConfig['plant_name']}");
                        $tempMailer->setBody("
                            <h2>🌐 Test Masivo del Endpoint Unificado</h2>
                            <p>Email enviado a: {$email}</p>
                            <p>Configuración usada: {$currentConfig['plant_name']} ({$expectedPlant})</p>
                            <p>Enviado desde: {$currentConfig['username']}</p>
                            <p>Endpoint: test_email_functions.php (Unificado)</p>
                            <p>Timestamp: " . date('Y-m-d H:i:s') . "</p>
                        ");
                        
                        $sent = $tempMailer->send();
                        
                        $results[] = [
                            'email' => $email,
                            'status' => $sent ? 'sent' : 'failed',
                            'plant_detected' => $expectedPlant,
                            'smtp_username' => $currentConfig['username'],
                            'plant_name' => $currentConfig['plant_name'],
                            'user_exists' => !empty($userData),
                            'user_plant' => $userData['plant'] ?? 'N/A',
                            'error' => $sent ? null : $tempMailer->getLastError()
                        ];
                        
                        // Pausa entre envíos
                        sleep(1);
                        
                    } catch (Exception $e) {
                        $results[] = [
                            'email' => $email,
                            'status' => 'error',
                            'error' => $e->getMessage()
                        ];
                    }
                }
                
                $successCount = count(array_filter($results, function($r) { return $r['status'] === 'sent'; }));
                
                sendJsonSuccess("Test masivo completado: {$successCount}/" . count($results) . " exitosos", [
                    'results' => $results,
                    'summary' => [
                        'total_attempts' => count($results),
                        'successful_sends' => $successCount,
                        'failed_sends' => count($results) - $successCount,
                        'expected_behavior' => [
                            'test.queretaro@grammer.com' => 'queretaro@grammermx.com',
                            'test.tetla@grammer.com' => 'tetla@grammermx.com',
                            'test.regional@grammer.com' => 'specialfreight@grammermx.com',
                            'nonexistent@grammer.com' => 'specialfreight@grammermx.com'
                        ]
                    ]
                ]);

            } catch (Exception $e) {
                sendJsonError("Error en test masivo: " . $e->getMessage());
            }
            break;

        // =====================================================================
        // ACCIÓN DEFAULT - MOSTRAR AYUDA
        // =====================================================================

        default:
            sendJsonError("Acción '{$action}' no reconocida.", [
                'available_actions' => [
                    // Funciones originales
                    'approval_notification' => 'Enviar notificación de aprobación',
                    'status_notification' => 'Enviar notificación de estado',
                    'weekly_summary' => 'Enviar resumen semanal a aprobadores',
                    'weekly_statistics_report' => 'Enviar reporte de estadísticas',
                    'recovery_check' => 'Verificar recuperaciones pendientes',
                    'verification' => 'Enviar email de verificación',
                    'password_reset' => 'Enviar email de recuperación de contraseña',
                    
                    // Funciones del sistema multi-planta
                    'check_smtp_configs' => 'Verificar configuraciones SMTP',
                    'test_plant_detection' => 'Probar detección de plantas',
                    'check_test_users' => 'Verificar usuarios de prueba',
                    'create_test_users' => 'Crear usuarios de prueba',
                    'test_email_to_specific_user' => 'Enviar email a usuario específico',
                    'test_all_plant_configs' => 'Probar todas las configuraciones de planta'
                ],
                'usage_examples' => [
                    'GET' => [
                        'check_smtp_configs' => '?action=check_smtp_configs',
                        'test_plant_detection' => '?action=test_plant_detection',
                        'check_test_users' => '?action=check_test_users'
                    ],
                    'POST' => [
                        'approval_notification' => '{"action": "approval_notification", "orderId": 123}',
                        'test_email_to_specific_user' => '{"action": "test_email_to_specific_user", "recipient_email": "test@grammer.com"}'
                    ]
                ]
            ]);
    }

} catch (Exception $e) {
    // Captura cualquier otra excepción no esperada
    sendJsonError(
        'Ocurrió una excepción inesperada en el servidor.',
        [
            'type' => 'EXCEPTION',
            'message' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
        ],
        500
    );
}
?>