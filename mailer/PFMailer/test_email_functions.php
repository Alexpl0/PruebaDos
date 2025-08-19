<?php
/**
 * test_email_functions.php - Endpoint UNIFICADO para probar funciones de correo.
 *
 * Este script actúa como un controlador que recibe acciones desde el frontend,
 * llama a los métodos correspondientes de la clase PFMailer y devuelve una
 * respuesta JSON estandarizada.
 *
 * @version 2.0
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
header('Access-Control-Allow-Methods: POST, OPTIONS');
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
    $response = ['success' => false, 'message' => $message];
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
    $response = ['success' => true, 'message' => $message];
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
    // 1. Validar método de la petición
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonError('Método no permitido. Solo se aceptan peticiones POST.', null, 405);
    }

    // 2. Obtener y decodificar el cuerpo de la petición
    $input = file_get_contents('php://input');
    if (empty($input)) {
        sendJsonError('No se recibieron datos en la petición.');
    }
    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonError('Error al decodificar el JSON: ' . json_last_error_msg());
    }

    // 3. Validar que la acción esté presente
    $action = $data['action'] ?? null;
    if (!$action) {
        sendJsonError('La acción no fue especificada.');
    }

    // 4. Cargar la clase PFMailer (sin modificarla)
    if (!file_exists(__DIR__ . '/PFmailer.php')) {
        sendJsonError('Archivo principal PFmailer.php no encontrado.', null, 500);
    }
    require_once __DIR__ . '/PFmailer.php';

    // 5. Instanciar el Mailer
    $mailer = new PFMailer();

    // 6. Procesar la acción solicitada
    switch ($action) {
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
            // Este es el resumen para aprobadores
            $result = $mailer->sendWeeklySummaryEmails(); // Cambiado para reflejar su propósito
            if (!empty($result['errors'])) {
                sendJsonError('Ocurrió un error al procesar el resumen para aprobadores.', $result);
            } else {
                sendJsonSuccess("Resumen para aprobadores procesado. Correos enviados: {$result['success']}", $result);
            }
            break;

        // ===== NUEVO CASE PARA EL REPORTE DE ESTADÍSTICAS =====
        case 'weekly_statistics_report':
            $result = $mailer->sendWeeklyStatisticsReport();
            if ($result['success']) {
                sendJsonSuccess($result['message'], $result);
            } else {
                sendJsonError($result['message'] ?? 'Ocurrió un error al generar el reporte de estadísticas.', $result);
            }
            break;

        case 'recovery_check':
            $result = $mailer->sendRecoveryCheckEmails(); // Este también devuelve un array estructurado
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

            // Lógica para generar y guardar el token de reseteo
            $db = $mailer->getDatabase(); // Usamos el método público para obtener la conexión
            
            // Buscar usuario
            $stmt = $db->prepare("SELECT id, name, email FROM User WHERE email = ? LIMIT 1");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $userResult = $stmt->get_result()->fetch_assoc();
            
            if (!$userResult) {
                sendJsonError("No se encontró un usuario con el correo electrónico proporcionado.");
            }

            // Generar y guardar token (simplificado, idealmente en una tabla dedicada)
            $token = bin2hex(random_bytes(32));
            // Aquí iría la lógica para guardar el token en tu DB, por ejemplo en una tabla 'PasswordResets'
            // $saveTokenStmt = $db->prepare("INSERT INTO PasswordResets (email, token, expires_at) VALUES (?, ?, NOW() + INTERVAL 1 HOUR)");
            // $saveTokenStmt->bind_param("ss", $email, $token);
            // $saveTokenStmt->execute();

            $result = $mailer->sendPasswordResetEmail($userResult, $token);

            if ($result) {
                sendJsonSuccess("Correo de recuperación enviado a {$email}. El token generado es: " . $token, ['token' => $token]);
            } else {
                sendJsonError("Fallo al enviar el correo de recuperación a {$email}.");
            }
            break;

        default:
            sendJsonError("Acción '{$action}' no reconocida.", ['available_actions' => ['approval_notification', 'status_notification', 'weekly_summary', 'recovery_check', 'verification', 'password_reset', 'weekly_statistics_report']]);
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
