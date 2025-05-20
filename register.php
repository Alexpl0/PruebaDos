<?php
session_start();
// Now you can use $_SESSION['user']
include_once 'dao/users/auth_check.php';
?>
<script>
    window.authorizationLevel = <?php echo json_encode(isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null); ?>;
    window.userName = <?php echo json_encode(isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null); ?>;
    window.userID = <?php echo json_encode(isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null); ?>;
</script></head>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Registration</title>
    <!-- Enlace al CDN de Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <!-- Bootstrap Icons -->
    <script type="module" src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.js"></script>
    
    <!-- Archivos CSS locales -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/register.css">
</head>
<body>
    <div id="header-container"></div>
    
    <div id="regHome">
        <div class="container">
            <div class="row">
                <div>
                    <h1 id="title1">Add New User</h1>
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
                            <label for="name" class="form-label">Complete Name</label>
                            <input type="text" class="form-control" id="name" name="name" required>
                        </div>
                        <div id="passwordInput" class="mb-3">
                            <label for="password" class="form-label">Password</label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="password" name="password" required>
                                <button class="btn btn-outline-secondary toggle-password" type="button">
                                    <ion-icon name="eye-outline"></ion-icon>
                                </button>
                            </div>
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