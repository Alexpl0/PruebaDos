<?php
/**
 * index.php - Main login page (Refactored)
 * This is the entry point for unauthenticated users.
 */

// 1. Manejar sesión y autenticación.
// auth_check.php redirigirá a un usuario logueado a su perfil o dashboard.
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
    <title>PREMIUM FREIGHT</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- Bootstrap & Font Awesome -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" xintegrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/index.css">
    <link rel="stylesheet" href="css/tour-styles.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css"/>

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
    
    <div id="home">
        <div class="container">
            <div class="row">
                <div>
                    <h1 id="title1">Welcome to PREMIUM FREIGHT</h1>
                </div>
            </div>
            <div id="loginform-container">
                <div id="login">
                    <div>
                        <h2 class="text-center">Sign In to My Account</h2>
                        <div class="row text-center">
                            <p class="text-center">Please enter your username and password</p>
                            
                            <div id="loginform">
                                <input type="email" id="email" class="form-control" placeholder="Email address">
                                <div style="position: relative; display: block; width: 100%;">
                                    <input type="password" id="password" class="form-control" placeholder="Password" style="padding-right: 45px;">
                                    <i id="togglePassword" class="fas fa-eye-slash"></i>
                                </div>
                                <button id="btnLogin" class="btn btn-primary" onclick="loginUsuario()">Sign In</button>
                            </div>
                        </div>
                        <p class="text-center">Don't have an account? <a href="register.php" style="color: var(--first-color)">Sign up</a></p>
                        <p class="text-center">Forgot your password? <a href="recovery.php" style="color: var(--first-color)">Recover</a></p>
                        
                        <div class="text-center mt-3">
                            <small class="text-muted">
                                <i class="fas fa-shield-alt text-success"></i>
                                Password encryption enabled
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- Archivos JS locales -->
    <script src="js/header.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/PasswordManager.js"></script>
    <script src="js/index.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.js.iife.js"></script>
</body>
</html>
