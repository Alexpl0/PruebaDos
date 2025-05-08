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
    <title>Recuperación de Contraseña</title>
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
                        <li class="nav__item"><a href="profile.php" class="nav__link">My Profile</a></li>                        
                        <li class="nav__item"><a href="newOrder.php" class="nav__link ">New Order</a></li>
                        <li class="nav__item"><a href="orders.php" class="nav__link ">Generated Orders</a></li>
                        <li class="nav__item"><a href="register.php" class="nav__link active">Add User</a></li>
                        <li class="nav__item"><a href="google.com" class="nav__link">Charts</a></li>
                        <li class="nav__item"><a href="  " class="nav__link">Manual</a></li>
                        <?php if (isset($_SESSION['user'])): ?>
                            <li class="nav__item"><a href="dao/users/logout.php" class="nav__link">Log Out</a></li>
                        <?php endif; ?>
                    </ul>
                </div>
            </div>
        </nav>
    </header>
    
    <div id="recoveryHome">
        <div class="container">
            <div class="row">
                <div>
                    <h1 id="title1">Recuperación de Contraseña</h1>
                </div>
            </div>
        </div>
        <div id="recoveryform-container">
            <div id="recovery">
                <div>
                    <form action="recoverPassword.php" method="post" id="recovery-form">
                        <div class="mb-3">
                            <label for="email" class="form-label">Correo Electrónico</label>
                            <input type="email" class="form-control" id="email" name="email" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Recuperar Contraseña</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>


    <!-- Archivos JS locales -->
    <script src="js/header.js"></script>
</body>
</html>