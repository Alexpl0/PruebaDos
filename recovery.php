<?php
session_start();
require_once 'config.php';
include_once 'dao/users/auth_check.php';

// Verificar si hay errores de token en la URL
$error = $_GET['error'] ?? null;
$errorMessage = '';

switch ($error) {
    case 'invalid_token':
        $errorMessage = 'El enlace de recuperación no es válido.';
        break;
    case 'token_expired':
        $errorMessage = 'El enlace de recuperación ha expirado. Los enlaces son válidos por 24 horas.';
        break;
    case 'token_used':
        $errorMessage = 'Este enlace de recuperación ya ha sido utilizado.';
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
            title: 'Error',
            text: '<?php echo addslashes($errorMessage); ?>',
            confirmButtonText: 'Entendido'
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
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/recovery.css">
</head>
<body>
    <div id="header-container"></div>
    
    <div id="home">
        <div class="container">
            <div class="row">
                <div>
                    <h1 id="title1">Password Recovery</h1>
                </div>
            </div>
            <div id="loginform-container">
                <div id="recovery">
                    <div>
                        <h2 class="text-center">Recover Your Password</h2>
                        <div class="row text-center">
                            <p class="text-center">Enter your email address to receive a password reset link</p>
                            
                            <form id="recovery-form">
                                <div id="loginform">
                                    <input type="email" id="email" class="form-control" placeholder="Enter your email address" required>
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-paper-plane"></i> Send Recovery Email
                                    </button>
                                </div>
                            </form>
                        </div>
                        <p class="text-center">Remember your password? <a href="index.php" style="color: var(--first-color)">Sign In</a></p>
                        <p class="text-center">Don't have an account? <a href="register.php" style="color: var(--first-color)">Sign up</a></p>
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
    <script src="js/password_reset.js"></script>
</body>
</html>