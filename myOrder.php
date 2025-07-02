<?php
session_start();
require_once 'config.php';
require_once 'dao/users/auth_check.php';

// Verificar que se haya proporcionado un ID de orden en la URL
if (!isset($_GET['order']) || !is_numeric($_GET['order'])) {
    // Redirigir o mostrar un error si no hay ID de orden
    header('Location: orders.php');
    exit;
}

$orderId = intval($_GET['order']);

// Información del usuario de la sesión para pasar a JS
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
$userID = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
$plant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <title>Order #<?php echo $orderId; ?> Progress</title>
    
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/myOrder.css">
    
    <?php if (isset($nivel) && $nivel > 0): ?>
        <!-- Virtual Assistant CSS - Solo para usuarios autorizados -->
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>
</head>
<body>
    <div id="header-container"></div>

    <main class="container my-4">
        <div class="page-header">
            <h1>Order Progress</h1>
            <h2 id="order-title">Tracking Order #<?php echo htmlspecialchars($orderId); ?></h2>
        </div>

        <section id="progressSection" class="progress-section mb-4">
            <div id="progress-container" class="progress-container">
                <div class="progress-track">
                    <div id="progress-bar" class="progress-bar"></div>
                    <div id="progress-truck" class="progress-truck">
                        <i class="fa-solid fa-truck"></i>
                    </div>
                </div>
                <div id="checkpoints-container" class="checkpoints-container">
                    </div>
            </div>
            <div id="progress-error" class="alert alert-danger mt-3 d-none"></div>
        </section>

        <section class="order-visualization">
             <div id="svgContent" class="svg-frame">
                 <div id="loadingSpinner" class="spinner-container">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading Order Details...</p>
                 </div>
             </div>
        </section>
    </main>
    
    <footer class="text-center py-3 mt-4">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <script>
        // Objeto de configuración principal para scripts modernos
        window.APP_CONFIG = {
            orderId: <?php echo json_encode($orderId); ?>,
            baseURL: '<?php echo URLPF; ?>',
            user: {
                id: <?php echo json_encode($userID); ?>,
                name: <?php echo json_encode($name); ?>,
                plant: <?php echo json_encode($plant); ?>,
                authorizationLevel: <?php echo json_encode($nivel); ?>
            }
        };

        // CORRECCIÓN: Se añaden las variables globales que header.js espera
        // para mantener la compatibilidad.
        window.authorizationLevel = window.APP_CONFIG.user.authorizationLevel;
        window.userName = window.APP_CONFIG.user.name;
    </script>
    
    <script src="js/header.js"></script>
    <script src="js/myOrder.js" type="module"></script>
    
    <?php if (isset($nivel) && $nivel > 0): ?>
        <!-- Virtual Assistant JavaScript - Solo para usuarios autorizados -->
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>
