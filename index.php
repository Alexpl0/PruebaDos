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
    <title>PREMIUM FREIGHT</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Enlace al CDN de Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  
    <!-- Archivos CSS locales -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/index.css">
    
</head>
<body>
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
                        
                        <!-- Indicador de seguridad -->
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

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <!-- Cargar PasswordManager -->
    <script src="js/PasswordManager.js"></script>
    <script src="js/index.js"></script>
</body>
</html>