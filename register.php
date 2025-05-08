<?php
session_start();
// Now you can use $_SESSION['user']
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Registration</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script type="module" src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.js"></script>
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
                            <li class="nav__item"><a href="logout.php" class="nav__link">Log Out</a></li>
                        <?php endif; ?>
                    </ul>
                </div>
            </div>
        </nav>
    </header>
    
    <div id="regHome">
        <div class="container">
            <div class="row">
                <div>
                    <h1 id="title1">User Registration</h1>
                </div>
            </div>
        </div>
        <div id="registerform-container">
            <div id="register">
                <div>
                    <form id="register-form" autocomplete="off">
                        <div class="mb-3">
                            <label for="email" class="form-label">Email Address</label>
                            <input type="email" class="form-control" id="email" name="email" required>
                        </div>
                        <div class="mb-3">
                            <label for="username" class="form-label">Username</label>
                            <input type="text" class="form-control" id="username" name="username" required>
                        </div>
                        <div class="mb-3">
                            <label for="password" class="form-label">Password</label>
                            <input type="password" class="form-control" id="password" name="password" required>
                        </div>
                        <div class="mb-3">
                            <label for="role" class="form-label">Role</label>
                            <input type="text" class="form-control" id="role" name="role" placeholder="Manager, Senior, etc." required>
                        </div>
                        <div class="mb-3">
                            <label for="authorization_level" class="form-label">Authorization Level</label>
                            <input type="number" class="form-control" id="authorization_level" name="authorization_level" required min="1" max="10">
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
    <script src="js/register.js"></script>
</body>
</html>