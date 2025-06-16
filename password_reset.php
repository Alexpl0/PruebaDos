<?php
session_start();
require_once 'config.php';
require_once 'mailer/PFMailer/PFDB.php';
// NUEVO: Agregar PasswordManager
require_once 'dao/users/PasswordManager.php';
include_once 'dao/users/auth_check.php';

// Verificar que se proporcione un token
if (!isset($_GET['token']) || empty($_GET['token'])) {
    header('Location: recovery.php?error=invalid_token');
    exit;
}

$token = trim($_GET['token']);
$tokenValid = false;
$tokenExpired = false;
$tokenUsed = false;
$userData = null;

// Verificar el token
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
        
        // Verificar si ya fue usado
        if ($tokenData['is_used']) {
            $tokenUsed = true;
        }
        // Verificar si expiró (24 horas)
        else if (strtotime($tokenData['created_at']) < strtotime('-24 hours')) {
            $tokenExpired = true;
        }
        // Token es válido
        else {
            $tokenValid = true;
            $userData = $tokenData;
        }
    }
    
    $db->close();
} catch (Exception $e) {
    error_log("Error verificando token de password reset: " . $e->getMessage());
}

// Si el token no es válido, redirigir
if (!$tokenValid) {
    $errorType = $tokenUsed ? 'token_used' : ($tokenExpired ? 'token_expired' : 'invalid_token');
    header('Location: recovery.php?error=' . $errorType);
    exit;
}
?>
<script>
    window.authorizationLevel = <?php echo json_encode(isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null); ?>;
    window.userName = <?php echo json_encode(isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null); ?>;
    window.userID = <?php echo json_encode(isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null); ?>;
    const URLPF = '<?php echo URLPF; ?>'; 
    const URLM = '<?php echo URLM; ?>'; 
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - Premium Freight</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div class="container-fluid vh-100">
        <div class="row h-100">
            <!-- Left side - Form -->
            <div class="col-md-6 d-flex align-items-center justify-content-center bg-light">
                <div class="reset-form-container" style="max-width: 400px; width: 100%;">
                    <div class="text-center mb-4">
                        <img src="assets/logo/logo.png" alt="Premium Freight Logo" class="login-logo" style="max-height: 60px;">
                        <h2 class="mt-3 mb-1">Reset Password</h2>
                        <p class="text-muted">Hello <?php echo htmlspecialchars($userData['name']); ?>, create your new password</p>
                    </div>
                    
                    <form id="reset-form" autocomplete="off">
                        <input type="hidden" id="reset-token" value="<?php echo htmlspecialchars($token); ?>">
                        <input type="hidden" id="user-id" value="<?php echo htmlspecialchars($userData['user_id']); ?>">
                        
                        <div class="mb-3">
                            <label for="new-password" class="form-label">
                                <i class="fas fa-lock me-2"></i>New Password
                            </label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="new-password" name="new-password" required>
                                <button class="btn btn-outline-secondary" type="button">
                                    <i class="fas fa-eye-slash toggle-password-icon" data-target="new-password"></i>
                                </button>
                            </div>
                            <!-- NUEVO: Indicador de fortaleza -->
                            <div id="password-strength-indicator" class="mt-2"></div>
                        </div>
                        
                        <div class="mb-3">
                            <label for="confirm-password" class="form-label">
                                <i class="fas fa-lock me-2"></i>Confirm New Password
                            </label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="confirm-password" name="confirm-password" required>
                                <button class="btn btn-outline-secondary" type="button">
                                    <i class="fas fa-eye-slash toggle-password-icon" data-target="confirm-password"></i>
                                </button>
                            </div>
                            <!-- NUEVO: Indicador de coincidencia -->
                            <div class="match-text mt-2"></div>
                        </div>
                        
                        <button type="submit" class="btn btn-success w-100 mb-3">
                            <i class="fas fa-check me-2"></i>Update Password
                        </button>
                        
                        <div class="text-center">
                            <p class="mb-0">Remember your password? <a href="index.php" class="text-decoration-none">Sign in here</a></p>
                        </div>
                        
                        <!-- NUEVO: Indicador de seguridad -->
                        <div class="text-center mt-3">
                            <small class="text-muted">
                                <i class="fas fa-shield-alt text-success"></i>
                                Your password will be encrypted securely
                            </small>
                        </div>
                        
                        <!-- Información del token -->
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
                    </form>
                </div>
            </div>
            
            <!-- Right side - Image/Branding -->
            <div class="col-md-6 d-none d-md-flex align-items-center justify-content-center bg-success">
                <div class="text-center text-white">
                    <i class="fas fa-shield-alt fa-5x mb-4"></i>
                    <h3>Secure Reset</h3>
                    <p class="lead">Your new password will be encrypted and protected</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <!-- NUEVO: Cargar PasswordManager -->
    <script src="js/PasswordManager.js"></script>
    <script src="js/password_reset.js"></script>
</body>
</html>