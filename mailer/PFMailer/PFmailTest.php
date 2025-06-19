<?php
/**
 * PFmailTest.php - Sistema de pruebas para correos de verificación
 * 
 * Este archivo permite probar todas las funcionalidades del sistema de verificación
 * de manera sencilla y visual.
 */

require_once __DIR__ . '/config.php';
require_once 'PFmailer.php';
require_once 'PFDB.php';
require_once 'PFmailUtils.php';

// Función para mostrar resultados de prueba
function showTestResult($test, $result, $details = '') {
    $icon = $result ? '✅' : '❌';
    $status = $result ? 'ÉXITO' : 'ERROR';
    $color = $result ? '#10B981' : '#dc2626';
    
    echo "<div style='margin: 10px 0; padding: 15px; border-left: 4px solid {$color}; background: " . ($result ? '#f0fdf4' : '#fef2f2') . ";'>";
    echo "<strong>{$icon} {$test}: {$status}</strong>";
    if ($details) {
        echo "<br><small style='color: #6b7280;'>{$details}</small>";
    }
    echo "</div>";
}

// Función para crear usuario de prueba
function createTestUser($db) {
    $testEmail = 'test.verification@grammermx.com';
    $testName = 'Usuario Prueba Verificación';
    
    // Verificar si ya existe
    $checkSql = "SELECT id FROM User WHERE email = ?";
    $checkStmt = $db->prepare($checkSql);
    $checkStmt->bind_param("s", $testEmail);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        return $user['id'];
    }
    
    // Crear nuevo usuario
    $sql = "INSERT INTO User (name, email, password, plant, authorization_level, verified) VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $db->prepare($sql);
    $password = password_hash('test123', PASSWORD_DEFAULT);
    $plant = 'Test Plant';
    $authLevel = 0;
    $verified = 0;
    
    $stmt->bind_param("ssssii", $testName, $testEmail, $password, $plant, $authLevel, $verified);
    
    if ($stmt->execute()) {
        return $db->insert_id;
    }
    
    return false;
}

// Obtener acción de prueba
$action = $_GET['action'] ?? 'menu';

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight - Sistema de Pruebas de Verificación</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            background: linear-gradient(135deg, #034C8C 0%, #023b6a 100%);
            min-height: 100vh;
            font-family: 'Inter', sans-serif;
        }
        .test-container {
            max-width: 800px;
            margin: 30px auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #034C8C 0%, #023b6a 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .content {
            padding: 40px;
        }
        .test-button {
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            text-decoration: none;
            display: inline-block;
            margin: 5px;
            transition: all 0.3s ease;
        }
        .test-button:hover {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            transform: translateY(-2px);
            color: white;
        }
        .danger-button {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        }
        .danger-button:hover {
            background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
        }
        .info-button {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }
        .info-button:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        }
        .results-area {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            min-height: 200px;
        }
        .menu-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .menu-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            transition: all 0.3s ease;
        }
        .menu-card:hover {
            background: #e9ecef;
            transform: translateY(-5px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="test-container">
            <div class="header">
                <h1><i class="fas fa-flask"></i> Sistema de Pruebas</h1>
                <p class="mb-0">Premium Freight - Verificación de Correos</p>
            </div>
            
            <div class="content">
                <?php if ($action === 'menu'): ?>
                    <h3>Selecciona una prueba:</h3>
                    
                    <div class="menu-grid">
                        <div class="menu-card">
                            <i class="fas fa-envelope-circle-check fa-3x text-primary mb-3"></i>
                            <h5>Enviar Correo de Verificación</h5>
                            <p class="text-muted">Prueba el envío de correos de verificación</p>
                            <a href="?action=send_verification" class="test-button">
                                <i class="fas fa-paper-plane"></i> Probar Envío
                            </a>
                        </div>
                        
                        <div class="menu-card">
                            <i class="fas fa-database fa-3x text-info mb-3"></i>
                            <h5>Verificar Base de Datos</h5>
                            <p class="text-muted">Comprobar tablas y estructura de BD</p>
                            <a href="?action=check_db" class="test-button info-button">
                                <i class="fas fa-search"></i> Verificar BD
                            </a>
                        </div>
                        
                        <div class="menu-card">
                            <i class="fas fa-user-plus fa-3x text-success mb-3"></i>
                            <h5>Crear Usuario de Prueba</h5>
                            <p class="text-muted">Crear usuario para realizar pruebas</p>
                            <a href="?action=create_user" class="test-button">
                                <i class="fas fa-plus"></i> Crear Usuario
                            </a>
                        </div>
                        
                        <div class="menu-card">
                            <i class="fas fa-link fa-3x text-warning mb-3"></i>
                            <h5>Probar Token</h5>
                            <p class="text-muted">Generar y probar tokens de verificación</p>
                            <a href="?action=test_token" class="test-button">
                                <i class="fas fa-key"></i> Generar Token
                            </a>
                        </div>
                        
                        <div class="menu-card">
                            <i class="fas fa-trash fa-3x text-danger mb-3"></i>
                            <h5>Limpiar Datos de Prueba</h5>
                            <p class="text-muted">Eliminar usuarios y tokens de prueba</p>
                            <a href="?action=cleanup" class="test-button danger-button">
                                <i class="fas fa-broom"></i> Limpiar
                            </a>
                        </div>
                        
                        <div class="menu-card">
                            <i class="fas fa-cog fa-3x text-secondary mb-3"></i>
                            <h5>Probar Configuración</h5>
                            <p class="text-muted">Verificar configuración de correo</p>
                            <a href="?action=test_config" class="test-button">
                                <i class="fas fa-tools"></i> Probar Config
                            </a>
                        </div>
                    </div>
                    
                <?php else: ?>
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3>Resultados de la Prueba</h3>
                        <a href="?" class="btn btn-outline-primary">
                            <i class="fas fa-arrow-left"></i> Volver al Menú
                        </a>
                    </div>
                    
                    <div class="results-area">
                        <?php
                        try {
                            $con = new LocalConector();
                            $db = $con->conectar();
                            
                            switch ($action) {
                                case 'send_verification':
                                    echo "<h4><i class='fas fa-envelope'></i> Prueba de Envío de Correo</h4>";
                                    
                                    // Crear usuario de prueba si no existe
                                    $userId = createTestUser($db);
                                    if (!$userId) {
                                        showTestResult("Crear usuario de prueba", false, "No se pudo crear el usuario");
                                        break;
                                    }
                                    showTestResult("Crear usuario de prueba", true, "Usuario ID: {$userId}");
                                    
                                    // Probar envío de correo
                                    $mailer = new PFMailer();
                                    $result = $mailer->sendVerificationEmail($userId);
                                    showTestResult("Envío de correo de verificación", $result, 
                                        $result ? "Correo enviado exitosamente" : "Error al enviar correo");
                                    
                                    // Verificar token en BD
                                    $tokenSql = "SELECT * FROM EmailVerificationTokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1";
                                    $tokenStmt = $db->prepare($tokenSql);
                                    $tokenStmt->bind_param("i", $userId);
                                    $tokenStmt->execute();
                                    $tokenResult = $tokenStmt->get_result();
                                    
                                    if ($tokenResult->num_rows > 0) {
                                        $tokenData = $tokenResult->fetch_assoc();
                                        showTestResult("Token generado en BD", true, "Token: " . substr($tokenData['token'], 0, 10) . "...");
                                        
                                        // Mostrar enlace de verificación
                                        $verifyUrl = URLM . "PFmailVerification.php?token=" . $tokenData['token'] . "&user=" . $userId;
                                        echo "<div style='margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 8px;'>";
                                        echo "<strong>🔗 Enlace de verificación generado:</strong><br>";
                                        echo "<a href='{$verifyUrl}' target='_blank' style='word-break: break-all;'>{$verifyUrl}</a>";
                                        echo "</div>";
                                    } else {
                                        showTestResult("Token generado en BD", false, "No se encontró token en la base de datos");
                                    }
                                    break;
                                    
                                case 'check_db':
                                    echo "<h4><i class='fas fa-database'></i> Verificación de Base de Datos</h4>";
                                    
                                    // Verificar tabla User
                                    $userTableCheck = $db->query("SHOW COLUMNS FROM User LIKE 'verified'");
                                    showTestResult("Columna 'verified' en tabla User", 
                                        $userTableCheck->num_rows > 0, 
                                        $userTableCheck->num_rows > 0 ? "Columna existe" : "Ejecuta: ALTER TABLE User ADD COLUMN verified TINYINT(1) DEFAULT 0");
                                    
                                    // Verificar tabla EmailVerificationTokens
                                    $tokenTableCheck = $db->query("SHOW TABLES LIKE 'EmailVerificationTokens'");
                                    showTestResult("Tabla EmailVerificationTokens", 
                                        $tokenTableCheck->num_rows > 0,
                                        $tokenTableCheck->num_rows > 0 ? "Tabla existe" : "Se creará automáticamente al generar primer token");
                                    
                                    // Mostrar estadísticas
                                    $userCount = $db->query("SELECT COUNT(*) as count FROM User")->fetch_assoc()['count'];
                                    $verifiedCount = $db->query("SELECT COUNT(*) as count FROM User WHERE verified = 1")->fetch_assoc()['count'];
                                    $unverifiedCount = $userCount - $verifiedCount;
                                    
                                    echo "<div style='margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 8px;'>";
                                    echo "<strong>📊 Estadísticas de usuarios:</strong><br>";
                                    echo "Total de usuarios: {$userCount}<br>";
                                    echo "Usuarios verificados: {$verifiedCount}<br>";
                                    echo "Usuarios sin verificar: {$unverifiedCount}";
                                    echo "</div>";
                                    break;
                                    
                                case 'create_user':
                                    echo "<h4><i class='fas fa-user-plus'></i> Crear Usuario de Prueba</h4>";
                                    
                                    $userId = createTestUser($db);
                                    if ($userId) {
                                        showTestResult("Crear usuario de prueba", true, "Usuario creado con ID: {$userId}");
                                        
                                        // Mostrar datos del usuario
                                        $userSql = "SELECT * FROM User WHERE id = ?";
                                        $userStmt = $db->prepare($userSql);
                                        $userStmt->bind_param("i", $userId);
                                        $userStmt->execute();
                                        $userData = $userStmt->get_result()->fetch_assoc();
                                        
                                        echo "<div style='margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 8px;'>";
                                        echo "<strong>👤 Datos del usuario creado:</strong><br>";
                                        echo "ID: {$userData['id']}<br>";
                                        echo "Nombre: {$userData['name']}<br>";
                                        echo "Email: {$userData['email']}<br>";
                                        echo "Verificado: " . ($userData['verified'] ? 'Sí' : 'No') . "<br>";
                                        echo "Contraseña: test123";
                                        echo "</div>";
                                    } else {
                                        showTestResult("Crear usuario de prueba", false, "Error al crear usuario o ya existe");
                                    }
                                    break;
                                    
                                case 'test_token':
                                    echo "<h4><i class='fas fa-key'></i> Prueba de Tokens</h4>";
                                    
                                    $userId = createTestUser($db);
                                    if (!$userId) {
                                        showTestResult("Usuario requerido", false, "No se pudo obtener usuario de prueba");
                                        break;
                                    }
                                    
                                    $mailer = new PFMailer();
                                    $token = $mailer->createVerificationToken($userId);
                                    
                                    if ($token) {
                                        showTestResult("Generar token", true, "Token: " . substr($token, 0, 20) . "...");
                                        
                                        // Probar validación del token
                                        $validateSql = "SELECT * FROM EmailVerificationTokens WHERE token = ? AND user_id = ?";
                                        $validateStmt = $db->prepare($validateSql);
                                        $validateStmt->bind_param("si", $token, $userId);
                                        $validateStmt->execute();
                                        $validateResult = $validateStmt->get_result();
                                        
                                        showTestResult("Validar token en BD", $validateResult->num_rows > 0, 
                                            $validateResult->num_rows > 0 ? "Token válido" : "Token no encontrado");
                                        
                                        // Mostrar enlace de prueba
                                        $testUrl = URLM . "PFmailVerification.php?token={$token}&user={$userId}";
                                        echo "<div style='margin: 20px 0; padding: 15px; background: #fffbeb; border-radius: 8px;'>";
                                        echo "<strong>🧪 Enlace de prueba:</strong><br>";
                                        echo "<a href='{$testUrl}' target='_blank'>{$testUrl}</a>";
                                        echo "</div>";
                                    } else {
                                        showTestResult("Generar token", false, "Error al generar token");
                                    }
                                    break;
                                    
                                case 'cleanup':
                                    echo "<h4><i class='fas fa-broom'></i> Limpieza de Datos de Prueba</h4>";
                                    
                                    // Eliminar tokens de prueba
                                    $deleteTokens = $db->query("DELETE FROM EmailVerificationTokens WHERE user_id IN (SELECT id FROM User WHERE email LIKE '%test%' OR email LIKE '%prueba%')");
                                    showTestResult("Eliminar tokens de prueba", $deleteTokens, "Tokens eliminados");
                                    
                                    // Eliminar usuarios de prueba
                                    $deleteUsers = $db->query("DELETE FROM User WHERE email LIKE '%test%' OR email LIKE '%prueba%'");
                                    showTestResult("Eliminar usuarios de prueba", $deleteUsers, "Usuarios eliminados");
                                    
                                    echo "<div style='margin: 20px 0; padding: 15px; background: #fef2f2; border-radius: 8px;'>";
                                    echo "<strong>🧹 Limpieza completada</strong><br>";
                                    echo "Se han eliminado todos los usuarios y tokens de prueba.";
                                    echo "</div>";
                                    break;
                                    
                                case 'test_config':
                                    echo "<h4><i class='fas fa-cog'></i> Prueba de Configuración</h4>";
                                    
                                    // Verificar constantes
                                    showTestResult("Constante URL", defined('URL'), defined('URL') ? URL : "No definida");
                                    showTestResult("Constante URLPF", defined('URLPF'), defined('URLPF') ? URLPF : "No definida");
                                    
                                    // Probar conexión de base de datos
                                    showTestResult("Conexión a base de datos", $db instanceof mysqli, "Conexión establecida");
                                    
                                    // Probar PHPMailer
                                    try {
                                        $mailer = new PFMailer();
                                        showTestResult("Inicializar PFMailer", true, "Mailer inicializado correctamente");
                                    } catch (Exception $e) {
                                        showTestResult("Inicializar PFMailer", false, "Error: " . $e->getMessage());
                                    }
                                    
                                    // Verificar archivos necesarios
                                    $files = [
                                        'PFmailer.php' => file_exists(__DIR__ . '/PFmailer.php'),
                                        'PFEmailTemplates.php' => file_exists(__DIR__ . '/PFEmailTemplates.php'),
                                        'PFmailVerification.php' => file_exists(__DIR__ . '/PFmailVerification.php'),
                                        'config.php' => file_exists(__DIR__ . '/config.php')
                                    ];
                                    
                                    foreach ($files as $file => $exists) {
                                        showTestResult("Archivo {$file}", $exists, $exists ? "Existe" : "No encontrado");
                                    }
                                    break;
                                    
                                default:
                                    echo "<p>Acción no reconocida: {$action}</p>";
                            }
                            
                        } catch (Exception $e) {
                            showTestResult("Error general", false, $e->getMessage());
                        }
                        ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>