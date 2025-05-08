<?php
session_start();
// Ahora puedes usar $_SESSION['user']
include_once 'dao/users/auth_check.php';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Agregar Ionicons en el head con la versión más reciente -->
    <script type="module" src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.js"></script>
    
    <!-- Archivos CSS locales -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/index.css">
    
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
                        <p class="text-center">Usuario: jesus@example.com</p>
                        <p class="text-center">Contraseña: pass123</p>
                        
                            <div id="loginform">
                                <input type="email" id="email" class="form-control" placeholder="Correo electrónico">
                                <div style="position: relative;">
                                    <input type="password" id="password" class="form-control" placeholder="Contraseña">
                                    <ion-icon id="togglePassword" name="eye-off-outline" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer;"></ion-icon>
                                </div>
                                <button id="btnLogin" class="btn btn-primary" onclick="loginUsuario()">Iniciar Sesión</button>
                            </div>
                        </div>
                        <p class="text-center">¿No tienes cuenta? <a href="register.php">Registrate</a></p>
                        <p class="text-center">¿Olvidaste tu contraseña? <a href="recovery.php">Recuperar</a></p>
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
