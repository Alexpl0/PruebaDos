<?php
session_start();
require_once 'config.php';

// Redirect to newOrder if already logged in
if (isset($_SESSION['user'])) {
    header('Location: newOrder.php');
    exit;
}
?>
<script>
    // Definimos la variable global de JavaScript con la URL base desde PHP
    const URLPF = '<?php echo URLPF; ?>';
    
    window.authorizationLevel = null;
    window.userName = null;
    window.userID = null;
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Premium Freight</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    
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
                <div class="login-form-container">
                    <div class="text-center mb-4">
                        <img src="assets/logo/logo.png" alt="Premium Freight Logo" class="login-logo">
                        <h2 class="mt-3 mb-1">Welcome Back</h2>
                        <p class="text-muted">Sign in to your Premium Freight account</p>
                    </div>
                    
                    <form id="login-form" autocomplete="off">
                        <div class="mb-3">
                            <label for="email" class="form-label">
                                <i class="fas fa-envelope me-2"></i>Email Address
                            </label>
                            <input type="email" class="form-control" id="email" name="email" required>
                        </div>
                        
                        <div class="mb-3">
                            <label for="password" class="form-label">
                                <i class="fas fa-lock me-2"></i>Password
                            </label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="password" name="password" required>
                                <button class="btn btn-outline-secondary" type="button" id="togglePassword">
                                    <i class="fas fa-eye-slash"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="rememberMe">
                                <label class="form-check-label" for="rememberMe">
                                    Remember me
                                </label>
                            </div>
                            <a href="recovery.php" class="text-decoration-none">Forgot Password?</a>
                        </div>
                        
                        <button type="button" id="loginButton" class="btn btn-primary w-100 mb-3">
                            <i class="fas fa-sign-in-alt me-2"></i>Sign In
                        </button>
                        
                        <div class="text-center">
                            <p class="mb-0">Don't have an account? <a href="register.php" class="text-decoration-none">Sign up here</a></p>
                        </div>
                        
                        <!-- NUEVO: Indicador de seguridad -->
                        <div class="text-center mt-3">
                            <small class="text-muted">
                                <i class="fas fa-shield-alt text-success"></i>
                                Password encryption enabled
                            </small>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Right side - Image/Branding -->
            <div class="col-md-6 d-none d-md-flex align-items-center justify-content-center bg-primary">
                <div class="text-center text-white">
                    <i class="fas fa-truck fa-5x mb-4"></i>
                    <h3>Premium Freight</h3>
                    <p class="lead">Streamline your logistics operations</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <!-- NUEVO: Cargar PasswordManager -->
    <script src="js/PasswordManager.js"></script>
    <script src="js/index.js"></script>
</body>
</html>