<?php
session_start();
include_once('../db/PFDB.php');
require_once('PasswordManager.php');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $action = $input['action'] ?? 'login'; // Acción por defecto es 'login'

    $con = new LocalConector();
    $conex = $con->conectar();

    // ==================================================================
    // NUEVA LÓGICA: Reenviar correo de verificación
    // ==================================================================
    if ($action === 'resend_verification') {
        if (empty($email)) {
            throw new Exception('Email is required to resend verification.');
        }

        $stmt = $conex->prepare("SELECT id FROM `User` WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($user = $result->fetch_assoc()) {
            $userId = $user['id'];

            // Generar un nuevo token de verificación para invalidar los anteriores
            $verificationToken = bin2hex(random_bytes(32));
            $insertTokenSql = "INSERT INTO EmailVerificationTokens (user_id, token, created_at) VALUES (?, ?, NOW())";
            $stmtToken = $conex->prepare($insertTokenSql);
            $stmtToken->bind_param("is", $userId, $verificationToken);
            $stmtToken->execute();

            // Llamar al endpoint del mailer para enviar el correo
            $endpoint = 'https://grammermx.com/Mailer/PFMailer/PFmailVerification.php';
            $data = ['user_id' => $userId, 'action' => 'send'];
            $options = [
                'http' => [
                    'header'  => "Content-Type: application/json\r\n",
                    'method'  => 'POST',
                    'content' => json_encode($data),
                ],
            ];
            $context = stream_context_create($options);
            $response = file_get_contents($endpoint, false, $context);

            echo json_encode(['success' => true, 'message' => 'Verification email sent.']);

        } else {
            throw new Exception('User with that email not found.');
        }
        
        $stmt->close();
        $conex->close();
        exit;
    }

    // ==================================================================
    // Lógica de Login (existente con ajustes menores)
    // ==================================================================
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        throw new Exception('Email and password are required');
    }

    $encryptedPassword = PasswordManager::encrypt($password);
    $stmt = $conex->prepare("SELECT * FROM `User` WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        $passwordMatch = PasswordManager::verify($encryptedPassword, $user['password']);
        
        if ($passwordMatch) {
            if (isset($user['verified']) && $user['verified'] == 1) {
                $_SESSION['user'] = [
                    'id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'],
                    'plant' => $user['plant'], 'authorization_level' => $user['authorization_level'], 'role' => $user['role']
                ];
                unset($user['password']);
                echo json_encode(['success' => true, 'status' => 'success', 'user' => $user, 'message' => 'Login successful']);
            } else {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Account not verified. Please check your email to activate your account.']);
            }
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Incorrect password']);
        }
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    error_log("Login/Resend error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
