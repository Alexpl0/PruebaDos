<?php
session_start();
require_once 'config.php'; // Include config.php to get URL constant
// Now you can use $_SESSION['user']
include_once 'dao/users/auth_check.php';
?>
<script>
    window.authorizationLevel = <?php echo json_encode(isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null); ?>;
    window.userName = <?php echo json_encode(isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null); ?>;
    window.userID = <?php echo json_encode(isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null); ?>;
    // Definimos la variable global de JavaScript con la URL base desde PHP
    const URLPF = '<?php echo URLPF; ?>'; 
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Registration - Premium Freight</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- Enlace al CDN de Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Archivos CSS locales -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
</head>
<body>
    <div class="container-fluid vh-100">
        <div class="row h-100">
            <!-- Left side - Form -->
            <div class="col-md-6 d-flex align-items-center justify-content-center bg-light">
                <div class="registration-form-container" style="max-width: 400px; width: 100%;">
                    <div class="text-center mb-4">
                        <img src="assets/logo/logo.png" alt="Premium Freight Logo" class="login-logo" style="max-height: 60px;">
                        <h2 class="mt-3 mb-1">Create Account</h2>
                        <p class="text-muted">Join Premium Freight today</p>
                    </div>
                    
                    <form id="register-form" autocomplete="off">
                        <div class="mb-3">
                            <label for="name" class="form-label">
                                <i class="fas fa-user me-2"></i>Full Name
                            </label>
                            <input type="text" class="form-control" id="name" name="name" required>
                        </div>
                        
                        <div class="mb-3">
                            <label for="email" class="form-label">
                                <i class="fas fa-envelope me-2"></i>Email Address
                            </label>
                            <input type="email" class="form-control" id="email" name="email" required>
                        </div>
                        
                        <div class="mb-3">
                            <label for="plant" class="form-label">
                                <i class="fas fa-building me-2"></i>Plant
                            </label>
                            <select class="form-control" id="plant" name="plant" required>
                                <option value="">Select Plant</option>
                                <option value="Plant A">Plant A</option>
                                <option value="Plant B">Plant B</option>
                                <option value="Plant C">Plant C</option>
                                <option value="Global">Global Access</option>
                            </select>
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
                            <!-- NUEVO: Indicador de fortaleza de contraseña -->
                            <div id="password-strength" class="mt-2"></div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary w-100 mb-3">
                            <i class="fas fa-user-plus me-2"></i>Create Account
                        </button>
                        
                        <div class="text-center">
                            <p class="mb-0">Already have an account? <a href="index.php" class="text-decoration-none">Sign in here</a></p>
                        </div>
                        
                        <!-- NUEVO: Indicador de seguridad -->
                        <div class="text-center mt-3">
                            <small class="text-muted">
                                <i class="fas fa-shield-alt text-success"></i>
                                Your password will be encrypted securely
                            </small>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Right side - Image/Branding -->
            <div class="col-md-6 d-none d-md-flex align-items-center justify-content-center bg-success">
                <div class="text-center text-white">
                    <i class="fas fa-user-plus fa-5x mb-4"></i>
                    <h3>Join Premium Freight</h3>
                    <p class="lead">Start managing your logistics efficiently</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <!-- NUEVO: Cargar PasswordManager -->
    <script src="js/PasswordManager.js"></script>
    <script src="js/register.js"></script>
</body>
</html>