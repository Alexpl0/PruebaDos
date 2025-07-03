<?php
/**
 * register.php - User registration page (Corrected Refactor)
 * This version uses the centralized context injection system and includes auth_check.
 */

// 1. Manejar sesión y autenticación.
// auth_check.php redirigirá a un usuario logueado a profile.php.
// Si no hay sesión, continuará la ejecución de esta página.
require_once 'dao/users/auth_check.php';

// 2. Incluir el inyector de contexto.
// Para usuarios no logueados, proveerá un contexto de "invitado".
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Registration - Premium Freight</title>
    
    <!-- Favicon, Fonts, External CSS -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/register.css">

    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <!-- Incluir el módulo de configuración JS. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->
</head>
<body>
    <div id="header-container"></div>
    
    <div id="regHome">
        <div class="container">
            <div class="row">
                <div>
                    <h1 id="title1">Register New User</h1>
                </div>
            </div>
        </div>
        <div id="registerform-container">
            <div id="register">
                <div>
                    <div class="alert alert-info" role="alert" id="email-notification">
                        Please check your spam folder for an email from <strong>premium_freight@grammermx.com</strong> to verify your account.
                    </div>
                    <form id="register-form" autocomplete="off">
                        <div class="mb-3">
                            <label for="email" class="form-label">Email Address</label>
                            <input type="email" class="form-control" id="email" name="email" required>
                        </div>
                        
                        <div class="mb-3">
                            <label for="name" class="form-label">Complete Name</label>
                            <input type="text" class="form-control" id="name" name="name" required>
                        </div>
                        
                        <div class="mb-3">
                            <label for="plant" class="form-label">Plant</label>
                            <select class="form-select" id="plant" name="plant" required>
                                <option value="" disabled selected>Select a plant</option>
                                <option value="3310">3310 - Tetla</option>
                                <option value="3330">3330 - QRO</option>
                                <option value="1640">1640 - Tupelo Automotive</option>
                                <option value="3510">3510 - Delphos</option>
                            </select>
                        </div>
                        
                        <div id="passwordInput" class="mb-3">
                            <label for="password" class="form-label">Password</label>
                            <div style="position: relative; display: block; width: 100%;">
                                <input type="password" class="form-control" id="password" name="password" required style="padding-right: 45px;">
                                <i id="togglePassword" class="fas fa-eye-slash toggle-password-icon"></i>
                            </div>
                            <div id="passwordStrength" class="form-text mt-2">
                                <div class="progress">
                                    <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                                <small class="text-muted">Password should be at least 8 characters with letters and numbers</small>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">Register</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>
    
    <!-- JS files -->
    <script src="js/header.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/register.js"></script>
</body>
</html>
