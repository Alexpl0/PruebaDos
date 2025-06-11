<?php
session_start();
require_once 'config.php';
require_once 'mailer/PFMailer/PFDB.php';

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
            INNER JOIN User u ON pt.user_id = u.id 
            WHERE pt.token = ? 
            LIMIT 1";
    
    $stmt = $db->prepare($sql);
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $tokenData = $result->fetch_assoc();
        
        // Verificar si ya fue usado
        if ($tokenData['is_used'] == 1) {
            $tokenUsed = true;
        } else {
            // Verificar expiración (24 horas)
            $createdTime = strtotime($tokenData['created_at']);
            $currentTime = time();
            $timeDiff = $currentTime - $createdTime;
            
            if ($timeDiff > 86400) { // 24 horas = 86400 segundos
                $tokenExpired = true;
            } else {
                $tokenValid = true;
                $userData = $tokenData;
            }
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
    <title>Reset Password | Premium Freight</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/password_reset.css">
    
    <script>
        // Datos del token y usuario
        window.resetToken = '<?php echo htmlspecialchars($token, ENT_QUOTES); ?>';
        window.userId = <?php echo $userData['user_id']; ?>;
        window.userName = '<?php echo htmlspecialchars($userData['name'], ENT_QUOTES); ?>';
        const URLPF = '<?php echo URLPF; ?>';
    </script>
</head>
<body>
    <div class="reset-container">
        <div class="reset-card">
            <!-- Header -->
            <div class="reset-header">
                <img src="assets/logo/logo.png" alt="GRAMMER" class="logo">
                <h1>Reset Your Password</h1>
                <p class="subtitle">Hello <?php echo htmlspecialchars($userData['name']); ?>, enter your new password below</p>
            </div>
            
            <!-- Form -->
            <form id="reset-form" class="reset-form">
                <input type="hidden" id="reset-token" value="<?php echo htmlspecialchars($token); ?>">
                <input type="hidden" id="user-id" value="<?php echo $userData['user_id']; ?>">
                
                <div class="form-group">
                    <label for="new-password" class="form-label">
                        <i class="fas fa-lock"></i> New Password
                    </label>
                    <div class="password-wrapper">
                        <input type="password" id="new-password" class="form-control" required>
                        <button type="button" class="password-toggle" data-target="new-password">
                            <i class="fas fa-eye-slash"></i>
                        </button>
                    </div>
                    <div class="password-strength">
                        <div class="strength-bar">
                            <div class="strength-fill"></div>
                        </div>
                        <small class="strength-text">Password strength: <span class="strength-level">Weak</span></small>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="confirm-password" class="form-label">
                        <i class="fas fa-lock"></i> Confirm New Password
                    </label>
                    <div class="password-wrapper">
                        <input type="password" id="confirm-password" class="form-control" required>
                        <button type="button" class="password-toggle" data-target="confirm-password">
                            <i class="fas fa-eye-slash"></i>
                        </button>
                    </div>
                    <div class="match-indicator">
                        <small class="match-text"></small>
                    </div>
                </div>
                
                <div class="form-group">
                    <button type="submit" id="reset-btn" class="btn btn-reset">
                        <i class="fas fa-key"></i> Reset Password
                    </button>
                </div>
                
                <div class="form-footer">
                    <p><a href="index.php"><i class="fas fa-arrow-left"></i> Back to Login</a></p>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Scripts -->
    <script src="js/password_reset.js"></script>
</body>
</html>