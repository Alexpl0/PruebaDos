<?php
header('Content-Type: application/json');
require_once '../../config.php';

// Obtener datos del POST
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'mensaje' => 'Invalid input data']);
    exit;
}

$name = $input['name'] ?? '';
$email = $input['email'] ?? '';
$plant = $input['plant'] ?? '';
$password = $input['password'] ?? '';

// Validación básica
if (empty($name) || empty($email) || empty($plant) || empty($password)) {
    echo json_encode(['success' => false, 'mensaje' => 'All fields are required']);
    exit;
}

try {
    // Conectar a la base de datos
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Verificar si el email ya existe
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => false, 'mensaje' => 'Email already registered']);
        exit;
    }
    
    // Hash de la contraseña
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Generar token de verificación
    $verificationToken = bin2hex(random_bytes(32));
    
    // Insertar usuario en la base de datos
    $stmt = $pdo->prepare("INSERT INTO users (name, email, plant, password, verification_token, is_verified, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())");
    $stmt->execute([$name, $email, $plant, $hashedPassword, $verificationToken]);
    
    $userId = $pdo->lastInsertId();
    
    // Enviar correo de verificación
    $verificationLink = URLPF . "verify.php?token=" . $verificationToken;
    
    $emailSent = sendVerificationEmail($email, $name, $verificationLink);
    
    if ($emailSent) {
        echo json_encode([
            'success' => true, 
            'mensaje' => 'Registration successful! Please check your email (including spam folder) for verification.',
            'user_id' => $userId
        ]);
    } else {
        echo json_encode([
            'success' => true, 
            'mensaje' => 'Registration successful, but there was an issue sending the verification email. Please contact support.',
            'user_id' => $userId
        ]);
    }
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    echo json_encode(['success' => false, 'mensaje' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    echo json_encode(['success' => false, 'mensaje' => 'An error occurred during registration']);
}

/**
 * Envía el correo de verificación usando el endpoint de Mailer
 */
function sendVerificationEmail($email, $name, $verificationLink) {
    // URL de tu endpoint de Mailer (reemplaza con la URL real)
    $mailerEndpoint = 'https://tu-servidor-mailer.com/api/send-email';
    
    $emailData = [
        'to' => $email,
        'from' => 'premium_freight@grammermx.com',
        'subject' => 'Premium Freight - Account Verification',
        'html' => generateVerificationEmailHTML($name, $verificationLink),
        'text' => "Hello $name,\n\nPlease verify your Premium Freight account by clicking the following link:\n\n$verificationLink\n\nIf you didn't create this account, please ignore this email.\n\nBest regards,\nPremium Freight Team"
    ];
    
    // Configurar el contexto para la petición HTTP
    $options = [
        'http' => [
            'header' => [
                "Content-Type: application/json",
                "Authorization: Bearer YOUR_API_KEY" // Si tu endpoint requiere autenticación
            ],
            'method' => 'POST',
            'content' => json_encode($emailData),
            'timeout' => 30
        ]
    ];
    
    $context = stream_context_create($options);
    
    try {
        $result = file_get_contents($mailerEndpoint, false, $context);
        
        // Agrega esto después de intentar enviar el correo
        error_log("Attempting to send verification email to: $email");
        error_log("Mailer endpoint response: " . $result);
        
        if ($result === FALSE) {
            error_log("Failed to send verification email to: $email");
            return false;
        }
        
        $response = json_decode($result, true);
        
        // Ajusta esta condición según la respuesta de tu endpoint
        if (isset($response['success']) && $response['success']) {
            error_log("Verification email sent successfully to: $email");
            return true;
        } else {
            error_log("Mailer endpoint returned error: " . json_encode($response));
            return false;
        }
        
    } catch (Exception $e) {
        error_log("Exception sending email: " . $e->getMessage());
        return false;
    }
}

/**
 * Genera el HTML del correo de verificación
 */
function generateVerificationEmailHTML($name, $verificationLink) {
    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>Account Verification</title>
    </head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
        <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
            <h2 style='color: #2c5aa0;'>Welcome to Premium Freight!</h2>
            <p>Hello <strong>$name</strong>,</p>
            <p>Thank you for registering with Premium Freight. To complete your registration, please verify your email address by clicking the button below:</p>
            <div style='text-align: center; margin: 30px 0;'>
                <a href='$verificationLink' style='background-color: #2c5aa0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Verify Account</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style='word-break: break-all; background-color: #f4f4f4; padding: 10px; border-radius: 3px;'>$verificationLink</p>
            <p><strong>Note:</strong> This verification link will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
            <hr style='border: none; border-top: 1px solid #eee; margin: 30px 0;'>
            <p style='font-size: 12px; color: #666;'>Best regards,<br>Premium Freight Team</p>
        </div>
    </body>
    </html>
    ";
}
?>