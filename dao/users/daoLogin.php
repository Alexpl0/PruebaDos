<?php
session_start();
include_once('../db/PFDB.php');
require_once('PasswordManager.php');
require_once __DIR__ . '/../db/cors_config.php';

// Manejar preflight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $action = $input['action'] ?? 'login';

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

            $verificationToken = bin2hex(random_bytes(32));
            $insertTokenSql = "INSERT INTO EmailVerificationTokens (user_id, token, created_at) VALUES (?, ?, NOW())";
            $stmtToken = $conex->prepare($insertTokenSql);
            $stmtToken->bind_param("is", $userId, $verificationToken);
            $stmtToken->execute();

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
    // Lógica de Login CON DEBUGGING MEJORADO
    // ==================================================================
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        throw new Exception('Email and password are required');
    }

    // DEBUG: Log información inicial
    $debugInfo = [
        'step' => 'initial',
        'password_length' => strlen($password),
        'password_appears_encrypted' => PasswordManager::isEncrypted($password),
        'password_sample' => substr($password, 0, 10) . '...' // Solo muestra inicio por seguridad
    ];

    // AQUÍ ESTÁ EL PROBLEMA: Estás encriptando la contraseña que viene del frontend
    // Pero en el frontend (index.js) ya NO la estás encriptando antes de enviar
    // Sin embargo, el PasswordManager::encrypt se está aplicando siempre
    
    // SOLUCIÓN: Verificar si la contraseña ya viene encriptada antes de encriptarla
    if (PasswordManager::isEncrypted($password)) {
        // La contraseña ya viene encriptada del frontend
        $encryptedPassword = $password;
        $debugInfo['encryption_step'] = 'already_encrypted';
    } else {
        // La contraseña viene en texto plano, necesita encriptación
        $encryptedPassword = PasswordManager::encrypt($password);
        $debugInfo['encryption_step'] = 'encrypted_here';
    }

    $debugInfo['encrypted_length'] = strlen($encryptedPassword);
    $debugInfo['encrypted_sample'] = substr($encryptedPassword, 0, 15) . '...';

    $stmt = $conex->prepare("SELECT * FROM `User` WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        $debugInfo['db_password_length'] = strlen($user['password']);
        $debugInfo['db_password_appears_encrypted'] = PasswordManager::isEncrypted($user['password']);
        
        // AQUÍ ESTÁ OTRO PROBLEMA POTENCIAL:
        // En la función verify, estás pasando $encryptedPassword (que puede estar doblemente encriptada)
        // en lugar de la contraseña original
        
        // SOLUCIÓN CORREGIDA:
        if (PasswordManager::isEncrypted($password)) {
            // Si la contraseña del frontend ya venía encriptada, compararla directamente
            $passwordMatch = ($password === $user['password']);
            $debugInfo['comparison_method'] = 'direct_encrypted_comparison';
        } else {
            // Si la contraseña del frontend venía en texto plano, usar verify normal
            $passwordMatch = PasswordManager::verify($password, $user['password']);
            $debugInfo['comparison_method'] = 'verify_method';
        }
        
        $debugInfo['password_match'] = $passwordMatch;
        
        // En caso de fallo, incluir debug info en la respuesta
        if (!$passwordMatch) {
            $debugInfo['step'] = 'password_mismatch';
            
            // Para debugging en desarrollo (remover en producción)
            if (isset($_GET['debug']) && $_GET['debug'] === 'true') {
                http_response_code(401);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Incorrect password',
                    'debug' => $debugInfo
                ]);
                $stmt->close();
                $conex->close();
                exit;
            }
        }
        
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