<?php
require_once __DIR__ . "/dao/db/db.php";
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
</head>
<body>
    <header class="header">
        <a href="#" class="header__logo">GRAMMER</a>
        <ion-icon name="menu-outline" class="header__toggle" id="nav-toggle"></ion-icon>
        <nav class="nav" id="nav-menu">
            <div class="nav__content bd-grid">
                <ion-icon name="close-outline" class="nav__close" id="nav-close"></ion-icon>
                <div class="nav__perfil">
                    <div class="nav__img">
                        <img src="assets/logo/logo.png" alt="logoGRAMMER">
                    </div>
                    <div>
                        <a href="#" class="nav__name">SPECIAL FREIGHT</a>
                    </div>
                </div> 
                <div class="nav__menu">
                    <ul class="nav__list">
                        <li class="nav__item"><a href="index.php" class="nav__link active">Home</a></li>
                        <li class="nav__item"><a href="newOrder.php" class="nav__link">Nueva Orden</a></li>
                        <li class="nav__item"><a href="orders.php" class="nav__link">Ordenes Generadas</a></li>
                        <li class="nav__item"><a href="register.php" class="nav__link">Agregar Usuario</a></li>
                        <li class="nav__item"><a href="google.com" class="nav__link">Graficas</a></li>
                        <li class="nav__item"><a href="  " class="nav__link">Manual</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    </header>
    
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
                                <input type="password" id="password" class="form-control" placeholder="Contraseña">
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

    <!-- Archivos JS locales -->
    <script src="js/header.js"></script>

    <script>
    // Lógica para enviar los datos del login por fetch a test_db.php

    function buscarUsuario() {
            const username = document.getElementById('user').value.trim();


            if (!username) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Por favor ingresa un nombre de usuario.'
                });
                return;
            }

            fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoUserget.php?username=' + encodeURIComponent(username))
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Usuario encontrado',
                            text: 'El usuario ha sido encontrado exitosamente.',
                            confirmButtonText: 'Aceptar'
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Usuario no encontrado',
                            text: 'No se encontró el usuario.',
                            confirmButtonText: 'Aceptar'
                        });
                    }
                })
                .catch(error => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Ocurrió un error al buscar el usuario.',
                        confirmButtonText: 'Aceptar'
                    });
                    console.error(error);
                });
        }
    
    function loginUsuario() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!email || !password) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Por favor ingresa tu correo y contraseña.'
            });
            return;
        }

        fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoUserLogin.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Guardar datos en sesión vía PHP
                fetch('https://grammermx.com/Jesus/PruebaDos/loginSession.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data.data)
                })
                .then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Bienvenido',
                        text: 'Inicio de sesión exitoso.'
                    }).then(() => {
                        console.log(data.data); // Muestra los datos del usuario en la consola
                        //window.location.href = 'orders.php'; // Redirige a tu página principal
                    });
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.mensaje || 'Credenciales incorrectas.'
                });
            }
        })
        .catch(error => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Ocurrió un error al iniciar sesión.'
            });
            console.error(error);
        });
    }
    </script>


</body>
</html>