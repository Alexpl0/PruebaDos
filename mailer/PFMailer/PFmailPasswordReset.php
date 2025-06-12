<?php
/**
 * PFmailPasswordReset.php - Endpoint para enviar correos de recuperación de contraseña
 * 
 * Este archivo maneja las solicitudes para enviar correos de recuperación
 * cuando un usuario olvida su contraseña.
 */

// Configurar manejo de errores
error_reporting(E_ALL);
ini_set('display_errors', 0); // No mostrar errores en pantalla en producción
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/password_reset_errors.log');

try {
    // Cargar dependencias
    require_once __DIR__ . '/config.php';
    require_once 'PFmailer.php';
    require_once 'PFDB.php';

    // Establecer headers
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    // Manejar preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }

    // Verificar método de solicitud
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Método no permitido. Utilice POST.'
        ]);
        exit;
    }

    // Obtener datos de la solicitud
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // Validar datos de entrada
    if (!$data || !isset($data['email']) || empty(trim($data['email']))) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Email es requerido'
        ]);
        exit;
    }

    $email = trim($data['email']);
    $token = trim($data['token']);

    // Validar formato de email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Formato de email inválido'
        ]);
        exit;
    }

    // Log de la solicitud
    logAction("Solicitud de recuperación de contraseña para: {$email}", 'PASSWORD_RESET_REQUEST');

    // Conectar a la base de datos
    $con = new LocalConector();
    $db = $con->conectar();

    if (!$db) {
        throw new Exception('No se pudo conectar a la base de datos');
    }

    // Buscar el usuario por email
    $userSql = "SELECT id, name, email FROM User WHERE email = ? LIMIT 1";
    $userStmt = $db->prepare($userSql);
    
    if (!$userStmt) {
        throw new Exception('Error preparando consulta de usuario: ' . $db->error);
    }

    $userStmt->bind_param("s", $email);
    $userStmt->execute();
    $userResult = $userStmt->get_result();

    // Por seguridad, siempre respondemos con éxito, aunque el email no existe
    if ($userResult->num_rows === 0) {
        logAction("Email no encontrado en sistema: {$email}", 'PASSWORD_RESET_REQUEST');
        echo json_encode([
            'success' => true,
            'message' => 'Si el email existe en nuestro sistema, se enviará un correo de recuperación'
        ]);
        exit;
    }

    $user = $userResult->fetch_assoc();
    logAction("Usuario encontrado para recuperación: ID {$user['id']}, Email: {$email}", 'PASSWORD_RESET_REQUEST');

    // Crear instancia del mailer
    $mailer = new PFMailer();

    // Enviar el correo de recuperación
    $emailSent = $mailer->sendPasswordResetEmail($user, $token);

    if ($emailSent) {
        logAction("Email de recuperación enviado exitosamente a: {$email}", 'PASSWORD_RESET_REQUEST');
        echo json_encode([
            'success' => true,
            'message' => 'Se ha enviado un correo de recuperación a su dirección de email'
        ]);
    } else {
        logAction("Error enviando email de recuperación a: {$email}", 'PASSWORD_RESET_REQUEST');
        // En producción, no revelar detalles específicos del error
        echo json_encode([
            'success' => false,
            'message' => 'Error interno del servidor. Por favor intente más tarde'
        ]);
    }

} catch (Exception $e) {
    // Log del error para debugging
    logAction("Excepción en PFmailPasswordReset: " . $e->getMessage(), 'PASSWORD_RESET_ERROR');
    
    // Responder con error genérico por seguridad
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error interno del servidor'
    ]);
}
?>