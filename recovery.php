<?php
/**
 * recovery.php - Password recovery page (Refactored)
 * This version uses the centralized context injection system.
 */

// 1. Cargar configuración de la aplicación (URLs, etc.)
require_once 'config.php';

// 2. Manejar sesión y autenticación.
// auth_check.php redirigirá a profile.php si ya hay una sesión activa.
require_once 'dao/users/auth_check.php';

// 3. Incluir el inyector de contexto.
// Para usuarios no logueados, proveerá un contexto de "invitado".
require_once 'dao/users/context_injector.php';

// 4. Lógica para manejar errores de la URL (para tokens inválidos, etc.)
$error = $_GET['error'] ?? null;
$errorMessage = '';

switch ($error) {
    case 'invalid_token':
        $errorMessage = 'The recovery link is not valid.';
        break;
    case 'token_expired':
        $errorMessage = 'The recovery link has expired. Links are valid for 24 hours.';
        break;
    case 'token_used':
        $errorMessage = 'This recovery link has already been used.';
        break;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Recovery - Premium Freight</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" xintegrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/recovery.css">

    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <!-- Incluir el módulo de configuración JS. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->

    <?php if ($errorMessage): ?>
    <script>
        // Disparar alerta de error si existe un mensaje en la URL
        document.addEventListener('DOMContentLoaded', function() {
            Swal.fire({
                icon: 'error',
                title: 'Recovery Link Error',
                text: '<?php echo addslashes($errorMessage); ?>',
                confirmButtonText: 'Understood'
            });
        });
    </script>
    <?php endif; ?>
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
        <script src="js/header.js" type="module"></script>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/password_reset.js"></script>
</body>
</html>
