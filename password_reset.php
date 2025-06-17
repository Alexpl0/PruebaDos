<?php
session_start();
require_once 'config.php';
require_once 'mailer/PFMailer/PFDB.php';
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
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - Premium Freight</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/password_reset.css">
    
    <!-- Variables JavaScript -->
    <script>
        window.authorizationLevel = <?php echo json_encode(isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null); ?>;
        window.userName = <?php echo json_encode(isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null); ?>;
        window.userID = <?php echo json_encode(isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null); ?>;
        window.resetToken = '<?php echo htmlspecialchars($token, ENT_QUOTES); ?>';
        window.userId = <?php echo $userData['user_id']; ?>;
        window.resetUserName = '<?php echo htmlspecialchars($userData['name'], ENT_QUOTES); ?>';
        const URLPF = '<?php echo URLPF; ?>'; 
        const URLM = '<?php echo URLM; ?>'; 
    </script>
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
                        <div class="row text-center">
                            <p class="text-center">Hello <strong><?php echo htmlspecialchars($userData['name']); ?></strong>, enter your new password below</p>
                            
                            <form id="reset-form">
                                <input type="hidden" id="reset-token" value="<?php echo htmlspecialchars($token); ?>">
                                <input type="hidden" id="user-id" value="<?php echo htmlspecialchars($userData['user_id']); ?>">
                                
                                <div id="loginform">
                                    <!-- New Password -->
                                    <div class="mb-3">
                                        <div style="position: relative; display: block; width: 100%;">
                                            <input type="password" id="new-password" class="form-control" placeholder="New Password" style="padding-right: 45px;" required>
                                            <i class="fas fa-eye-slash toggle-password-icon" data-target="new-password"></i>
                                        </div>
                                        <!-- Password Strength Indicator -->
                                        <div class="password-strength mt-2">
                                            <div class="progress">
                                                <div class="progress-bar strength-fill" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                            </div>
                                            <small class="strength-text text-muted">Password strength: <span class="strength-level">Weak</span></small>
                                        </div>
                                    </div>
                                    
                                    <!-- Confirm Password -->
                                    <div class="mb-3">
                                        <div style="position: relative; display: block; width: 100%;">
                                            <input type="password" id="confirm-password" class="form-control" placeholder="Confirm New Password" style="padding-right: 45px;" required>
                                            <i class="fas fa-eye-slash toggle-password-icon" data-target="confirm-password"></i>
                                        </div>
                                        <!-- Password Match Indicator -->
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
                    </div>
                </div>
            </div>
        </div>
    </div>

    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- Scripts -->
    <script src="js/header.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/PasswordManager.js"></script>
    <script src="js/password_reset.js"></script>
</body>
</html>