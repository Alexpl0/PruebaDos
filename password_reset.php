<?php
/**
 * password_reset.php - Page to reset a user's password (Refactored)
 * This version uses the centralized context injection system.
 */

// 1. Manejar sesión y autenticación.
// auth_check.php redirigirá a profile.php si ya hay una sesión activa.
require_once 'dao/users/auth_check.php';

// Otros requires necesarios para la lógica de esta página
require_once 'mailer/PFMailer/PFDB.php';
require_once 'dao/users/PasswordManager.php';

// 2. Incluir el inyector de contexto.
require_once 'dao/users/context_injector.php';


// --- Lógica específica de la página para validar el token ---
if (!isset($_GET['token']) || empty($_GET['token'])) {
    // Usamos la URL del inyector para la redirección
    header('Location: ' . $appContextForJS['app']['baseURL'] . 'recovery.php?error=invalid_token');
    exit;
}

$token = trim($_GET['token']);
$tokenValid = false;
$tokenExpired = false;
$tokenUsed = false;
$userData = null;

try {
    $con = new LocalConector();
    $db = $con->conectar();
    
    $sql = "SELECT pt.*, u.name, u.email 
            FROM EmailPasswordTokens pt 
            JOIN User u ON pt.user_id = u.id 
            WHERE pt.token = ? LIMIT 1";
    
    $stmt = $db->prepare($sql);
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $tokenData = $result->fetch_assoc();
        if ($tokenData['is_used']) {
            $tokenUsed = true;
        } elseif (strtotime($tokenData['created_at']) < strtotime('-24 hours')) {
            $tokenExpired = true;
        } else {
            $tokenValid = true;
            $userData = $tokenData;
        }
    }
    $db->close();
} catch (Exception $e) {
    error_log("Error verifying password reset token: " . $e->getMessage());
}

if (!$tokenValid) {
    $errorType = $tokenUsed ? 'token_used' : ($tokenExpired ? 'token_expired' : 'invalid_token');
    header('Location: ' . $appContextForJS['app']['baseURL'] . 'recovery.php?error=' . $errorType);
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - Premium Freight</title>
    
    <!-- Favicon, Bootstrap, Font Awesome -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" xintegrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/password_reset.css">
    
    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <!-- 1. Incluir el módulo de configuración JS. -->
    <script src="js/config.js"></script>
    
    <!-- 2. Añadir datos específicos de la página (token, etc.) -->
    <script>
        window.PF_CONFIG.resetToken = <?php echo json_encode($token); ?>;
        window.PF_CONFIG.resetUserId = <?php echo json_encode($userData['user_id']); ?>;
    </script>
    <!-- ==================================================================== -->
</head>
<body>
    <div id="header-container"></div>
    
    <div id="home">
        <div class="container">
            <div class="row">
                <div>
                    <h1 id="title1">Reset Your Password</h1>
                </div>
            </div>
            <div id="loginform-container">
                <div id="reset">
                    <div>
                        <h2 class="text-center">Create New Password</h2>
                        <p class="text-center">Hello <strong><?php echo htmlspecialchars($userData['name']); ?></strong>, enter your new password below</p>
                        
                        <form id="reset-form">
                            <div id="loginform">
                                <div class="mb-3">
                                    <div style="position: relative; display: block; width: 100%;">
                                        <input type="password" id="new-password" class="form-control" placeholder="New Password" style="padding-right: 45px;" required>
                                        <i class="fas fa-eye-slash toggle-password-icon" data-target="new-password"></i>
                                    </div>
                                    <div class="password-strength mt-2">
                                        <div class="progress">
                                            <div class="progress-bar strength-fill" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                        </div>
                                        <small class="strength-text text-muted">Password strength: <span class="strength-level">Weak</span></small>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div style="position: relative; display: block; width: 100%;">
                                        <input type="password" id="confirm-password" class="form-control" placeholder="Confirm New Password" style="padding-right: 45px;" required>
                                        <i class="fas fa-eye-slash toggle-password-icon" data-target="confirm-password"></i>
                                    </div>
                                    <div class="match-indicator mt-1">
                                        <small class="match-text"></small>
                                    </div>
                                </div>
                                <button type="submit" id="reset-btn" class="btn btn-primary">
                                    <i class="fas fa-key"></i> Reset Password
                                </button>
                            </div>
                        </form>
                    </div>
                    <p class="text-center">Remember your password? <a href="index.php" style="color: var(--first-color)"><i class="fas fa-arrow-left"></i> Back to Login</a></p>
                    <div class="alert alert-info mt-3" role="alert">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Reset Information:</strong>
                        <ul class="mb-0">
                            <li>Password must be at least 8 characters</li>
                            <li>Include letters and numbers for strength</li>
                            <li>Your password will be encrypted automatically</li>
                            <li>This reset link will expire soon</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- Scripts -->
        <script src="js/header.js" type="module"></script>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/PasswordManager.js"></script>
    <script src="js/password_reset.js"></script>
</body>
</html>
