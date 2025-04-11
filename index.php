<?php
// filepath: c:\Users\Ex-Perez-J\OneDrive - GRAMMER AG\Desktop\SPECIAL FREIGHT\index.php
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
                        <li class="nav__item"><a href="scanQr.php" class="nav__link">Nueva Orden</a></li>
                        <li class="nav__item"><a href="salas.php" class="nav__link">Ordenes Generadas</a></li>
                        <li class="nav__item"><a href="newQR.php" class="nav__link">Agregar Usuario</a></li>
                        <li class="nav__item"><a href="ExcelToJson.php" class="nav__link">Graficas</a></li>
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
            <div id="login">
                <div>
                    <h2 class="text-center">Ingresar a mi Cuenta</h2>
                    <div class="row text-center">
                        <p class="text-center">Por favor ingresa tu usuario y contraseña</p>
                        <div id="loginform-container">
                            <div id="loginform">
                                <input type="text" id="usuario" class="form-control" placeholder="Usuario">
                                <input type="password" id="password" class="form-control" placeholder="Contraseña">
                                <button id="btnLogin" class="btn btn-primary">Iniciar Sesión</button>
                            </div>
                        </div>
                        <p class="text-center">¿No tienes cuenta? <a href="newQR.php">Registrate</a></p>
                        <p class="text-center">¿Olvidaste tu contraseña? <a href="#">Recuperar</a></p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Archivos JS locales -->
    <script src="js/header.js"></script>

    <!-- Librería QR Code -->
    <script is:inline src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" integrity="sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
</body>
</html>