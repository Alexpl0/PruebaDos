<?php
/**
 * PFmailVerification.php - Endpoint para verificación de cuentas de usuario
 */

require_once __DIR__ . '/config.php';
require_once 'PFmailer.php';
require_once 'PFDB.php';
require_once 'PFmailUtils.php';

// Función para registrar eventos en el archivo de log
function logEvent($message) {
    $logFile = __DIR__ . '/verification.log'; // Ruta del archivo de log
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message" . PHP_EOL, FILE_APPEND);
}

// Configurar headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Eliminar la validación del Referer
// Código eliminado:
// $allowedReferer = URLPF . 'PFmailVerification.php';
// if (!isset($_SERVER['HTTP_REFERER']) || strpos($_SERVER['HTTP_REFERER'], $allowedReferer) === false) {
//     logEvent('Unauthorized access attempt detected.');
//     showError('Unauthorized access. This endpoint can only be accessed via the verification email.');
//     exit;
// }

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    logEvent('Preflight request received.');
    exit(0);
}

try {
    logEvent("Request received: Method - {$_SERVER['REQUEST_METHOD']}");

    // Si es GET con token, procesar verificación
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['token']) && isset($_GET['user'])) {
        $token = $_GET['token'];
        $userId = intval($_GET['user']);
        logEvent("GET request: Token - $token, User ID - $userId");

        // Conectar a la base de datos
        $con = new LocalConector();
        $db = $con->conectar();
        logEvent('Database connection established.');

        // Verificar token
        $sql = "SELECT * FROM EmailVerificationTokens WHERE token = ? AND user_id = ? AND is_used = 0 AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)";
        $stmt = $db->prepare($sql);
        $stmt->bind_param("si", $token, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        logEvent('Token verification query executed.');

        if ($result->num_rows === 0) {
            logEvent('Invalid or expired token.');
            showError('Invalid or expired link. Please request a new verification email.');
            exit;
        }

        // Verificar usuario
        $updateSql = "UPDATE User SET verified = 1 WHERE id = ?";
        $updateStmt = $db->prepare($updateSql);
        $updateStmt->bind_param("i", $userId);

        if ($updateStmt->execute()) {
            logEvent("User ID $userId successfully verified.");

            // Marcar token como usado
            $markUsedSql = "UPDATE EmailVerificationTokens SET is_used = 1, used_at = NOW() WHERE token = ?";
            $markStmt = $db->prepare($markUsedSql);
            $markStmt->bind_param("s", $token);
            $markStmt->execute();
            logEvent("Token $token marked as used.");

            showSuccess(
                'Your account has been successfully verified! You can now use all Premium Freight features.',
                'Verification Completed',
                'Go to New Order',
                URLPF . 'newOrder.php'
            );
        } else {
            logEvent("Error verifying user ID $userId.");
            showError('Error verifying the account. Please contact the administrator.');
        }
        exit;
    }

    // Si es POST, procesar solicitud de envío
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        logEvent('POST request received with data: ' . json_encode($data));

        // Soporte para diferentes acciones
        $action = $data['action'] ?? 'send';

        if ($action === 'send' && isset($data['user_id'])) {
            $userId = intval($data['user_id']);
            logEvent("Send action initiated for User ID $userId.");

            // Verificar que el usuario existe y no está verificado
            $con = new LocalConector();
            $db = $con->conectar();
            logEvent('Database connection established.');

            $userSql = "SELECT id, name, email, verified FROM User WHERE id = ?";
            $userStmt = $db->prepare($userSql);
            $userStmt->bind_param("i", $userId);
            $userStmt->execute();
            $userResult = $userStmt->get_result();
            logEvent('User verification query executed.');

            if ($userResult->num_rows === 0) {
                logEvent("User ID $userId not found.");
                echo json_encode([
                    'success' => false, 
                    'message' => 'User not found'
                ]);
                exit;
            }

            $user = $userResult->fetch_assoc();

            if ($user['verified'] == 1) {
                logEvent("User ID $userId already verified.");
                echo json_encode([
                    'success' => true, 
                    'message' => 'User already verified'
                ]);
                exit;
            }

            // Enviar correo de verificación
            $mailer = new PFMailer();
            $result = $mailer->sendVerificationEmail($userId);
            logEvent("Verification email sent to User ID $userId: " . ($result ? 'Success' : 'Failure'));

            echo json_encode([
                'success' => $result,
                'message' => $result ? 'Verification email sent successfully' : 'Error sending verification email'
            ]);
        } elseif ($action === 'resend' && isset($data['user_id'])) {
            $userId = intval($data['user_id']);
            logEvent("Resend action initiated for User ID $userId.");

            $mailer = new PFMailer();
            $result = $mailer->sendVerificationEmail($userId);
            logEvent("Verification email resent to User ID $userId: " . ($result ? 'Success' : 'Failure'));

            echo json_encode([
                'success' => $result,
                'message' => $result ? 'Verification email resent successfully' : 'Error resending verification email'
            ]);
        } else {
            logEvent('Invalid request parameters.');
            echo json_encode([
                'success' => false, 
                'message' => 'Invalid request parameters'
            ]);
        }
        exit;
    }
} catch (Exception $e) {
    logEvent('Exception occurred: ' . $e->getMessage());
    error_log("Error in PFmailVerification: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error'
    ]);
}
?>