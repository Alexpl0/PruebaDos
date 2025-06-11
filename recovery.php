<?php
session_start();
require_once 'config.php';

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

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Recovery | Premium Freight</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/password_reset.css">
    
    <script>
        const URLPF = '<?php echo URLPF; ?>';
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
</head>
<body>
    <div class="reset-container">
        <div class="reset-card">
            <!-- Header -->
            <div class="reset-header">
                <img src="assets/logo/logo.png" alt="GRAMMER" class="logo">
                <h1>Recover Your Password</h1>
                <p class="subtitle">Enter your email address to receive a password reset link</p>
            </div>
            
            <!-- Form -->
            <form id="recovery-form" class="reset-form">
                <div class="form-group">
                    <label for="email" class="form-label">
                        <i class="fas fa-envelope"></i> Email Address
                    </label>
                    <input type="email" id="email" class="form-control" placeholder="Enter your email address" required>
                </div>
                
                <div class="form-group">
                    <button type="submit" class="btn btn-reset">
                        <i class="fas fa-paper-plane"></i> Send Recovery Email
                    </button>
                </div>
                
                <div class="form-footer">
                    <p><a href="index.php"><i class="fas fa-arrow-left"></i> Back to Login</a></p>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Scripts -->
    <script src="js/password_reset.js"></script>
</body>
</html>