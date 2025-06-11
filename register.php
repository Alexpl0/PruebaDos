<?php
session_start();
require_once 'config.php'; // Include config.php to get URL constant
// Now you can use $_SESSION['user']
include_once 'dao/users/auth_check.php';
?>
<script>
    window.authorizationLevel = <?php echo json_encode(isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null); ?>;
    window.userName = <?php echo json_encode(isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null); ?>;
    window.userID = <?php echo json_encode(isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null); ?>;
    // Definimos la variable global de JavaScript con la URL base desde PHP
    const URLPF = '<?php echo URLPF; ?>'; 
</script>

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
                        <div class="mb-3">
                            <label for="plant"  class="form-label">Plant</label>
                            <select class="form-select" id="plant" name="plant" required>
                                <option value="" disabled selected>Select a plant</option>
                                <option value="3310">3310 - Tetla</option>
                                <option value="3330">3330 - QRO</option>
                                <option value="1640">1640 - Tupelo Automotive</option>
                                <option value="3510">3510 - Delphos</option>
                            </select>
                        </div>
                        <div id="passwordInput" class="mb-3">
                            <label for="password" class="form-label">Password</label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="password" name="password" required>
                                <button class="btn btn-outline-secondary toggle-password" type="button">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <div id="passwordStrength" class="form-text mt-2">
                                <div class="progress">
                                    <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                                <small class="text-muted">Password should be at least 8 characters with letters and numbers</small>
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