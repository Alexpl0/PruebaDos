<?php
session_start();
require_once 'config.php';
include_once 'dao/users/auth_check.php';

// Verificar si hay errores de token en la URL
$error = $_GET['error'] ?? null;
$errorMessage = '';

switch ($error) {
    case 'invalid_token':
        $errorMessage = 'The password reset link is invalid or has expired.';
        break;
    case 'token_expired':
        $errorMessage = 'The password reset link has expired. Please request a new one.';
        break;
    case 'token_used':
        $errorMessage = 'This password reset link has already been used. Please request a new one if needed.';
        break;
} 
?>
<script>
    window.authorizationLevel = <?php echo json_encode(isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null); ?>;
    window.userName = <?php echo json_encode(isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null); ?>;
    window.userID = <?php echo json_encode(isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null); ?>;
    // Definimos la variable global de JavaScript con la URL base desde PHP
    const URLPF = '<?php echo URLPF; ?>'; 
    const URLM = '<?php echo URLM; ?>'; 
    
    <?php if ($errorMessage): ?>
    document.addEventListener('DOMContentLoaded', function() {
        Swal.fire({
            icon: 'error',
            title: 'Password Reset Error',
            text: '<?php echo addslashes($errorMessage); ?>',
            confirmButtonText: 'Request New Reset'
        });
    });
    <?php endif; ?>
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Recovery - Premium Freight</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    
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
                <div class="recovery-form-container" style="max-width: 400px; width: 100%;">
                    <div class="text-center mb-4">
                        <img src="assets/logo/logo.png" alt="Premium Freight Logo" class="login-logo" style="max-height: 60px;">
                        <h2 class="mt-3 mb-1">Password Recovery</h2>
                        <p class="text-muted">Enter your email to reset your password</p>
                    </div>
                    
                    <form id="recovery-form" autocomplete="off">
                        <div class="mb-3">
                            <label for="email" class="form-label">
                                <i class="fas fa-envelope me-2"></i>Email Address
                            </label>
                            <input type="email" class="form-control" id="email" name="email" required 
                                   placeholder="Enter your registered email">
                        </div>
                        
                        <button type="submit" class="btn btn-primary w-100 mb-3">
                            <i class="fas fa-paper-plane me-2"></i>Send Recovery Email
                        </button>
                        
                        <div class="text-center">
                            <p class="mb-0">Remember your password? <a href="index.php" class="text-decoration-none">Sign in here</a></p>
                        </div>
                        
                        <!-- NUEVO: Indicador de seguridad -->
                        <div class="text-center mt-3">
                            <small class="text-muted">
                                <i class="fas fa-shield-alt text-success"></i>
                                Your new password will be encrypted automatically
                            </small>
                        </div>
                        
                        <!-- Información adicional -->
                        <div class="alert alert-info mt-3" role="alert">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Recovery Instructions:</strong>
                            <ul class="mb-0">
                                <li>Enter your registered email address</li>
                                <li>Check your inbox for the reset link</li>
                                <li>Reset link expires in 24 hours</li>
                                <li>Your new password will be encrypted securely</li>
                            </ul>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Right side - Image/Branding -->
            <div class="col-md-6 d-none d-md-flex align-items-center justify-content-center bg-warning">
                <div class="text-center text-dark">
                    <i class="fas fa-key fa-5x mb-4"></i>
                    <h3>Forgot Your Password?</h3>
                    <p class="lead">No worries! We'll help you get back in</p>
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