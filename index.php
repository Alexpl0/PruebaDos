<?php
session_start();
require_once 'config.php'; // Include config.php to get URL constant
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
$userID = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
$plant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
include_once 'dao/users/auth_check.php';
?>
<script>
    window.authorizationLevel = <?php echo json_encode($nivel); ?>;
    window.userName = <?php echo json_encode($name); ?>;
    window.userID = <?php echo json_encode($userID); ?>;
    window.userPlant = <?php echo json_encode($plant); ?>;
    // Definimos la variable global de JavaScript con la URL base desde PHP
    const URLPF = '<?php echo URLPF; ?>'; 
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SPECIAL FREIGHT</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Enlace al CDN de Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  
    <!-- Archivos CSS locales -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    
</head>
<body>
    <div id="header-container"></div>
    
    <div id="home">
        <div class="container">
            <div class="row">
                <div>
                    <h1 id="title1">Bienvenido a SPECIAL FREIGHT2</h1>
                </div>
            </div>
            <div id="loginform-container">
                <div id="login">
                    <div>
                        <h2 class="text-center">Ingresar a mi Cuenta</h2>
                        <div class="row text-center">
                            <p class="text-center">Por favor ingresa tu usuario y contraseña</p>
                            <p class="text-center">Usuario: lunetra029@davomi.com</p>
                            <p class="text-center">Contraseña: pass123</p>
                            
                            <div id="loginform">
                                <input type="email" id="email" class="form-control" placeholder="Correo electrónico">
                                <div style="position: relative; display: block; width: 100%;">
                                    <input type="password" id="password" class="form-control" placeholder="Contraseña" style="padding-right: 45px;">
                                    <i id="togglePassword" class="fas fa-eye-slash"></i>
                                </div>
                                <button id="btnLogin" class="btn btn-primary" onclick="loginUsuario()">Iniciar Sesión</button>
                            </div>
                        </div>
                        <p class="text-center">¿No tienes cuenta? <a href="register.php" style="color: var(--first-color)">Registrate</a></p>
                        <p class="text-center">¿Olvidaste tu contraseña? <a href="recovery.php" style="color: var(--first-color)">Recuperar</a></p>
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
    <script src="js/index.js"></script>

</body>
</html>
