<?php
session_start();
require_once 'config.php';
require_once 'dao/users/auth_check.php';

// Verificar que se haya proporcionado un ID de orden en la URL
if (!isset($_GET['order']) || !is_numeric($_GET['order'])) {
    // Redirigir o mostrar un error si no hay ID de orden
    header('Location: myorders.php');
    exit;
}

$orderId = intval($_GET['order']);

// Información del usuario de la sesión para pasar a JS
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
$userID = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
$plant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
$authorizationLevel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null; // Agregado
?>
 
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <title>Order #<?php echo $orderId; ?> Progress</title>
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Archivos CSS locales -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/myOrder.css"> <!-- CSS específico para esta página -->
</head>
<body>
    <div id="header-container"></div>

    <main class="container my-4">
        <div class="page-header">
            <h1>Order Progress</h1>
            <h2 id="order-title">Tracking Order #<?php echo htmlspecialchars($orderId); ?></h2>
        </div>

        <!-- Sección de la Línea de Progreso -->
        <section id="progressSection" class="progress-section mb-4">
            <div id="progress-container" class="progress-container">
                <div class="progress-track">
                    <div id="progress-bar" class="progress-bar"></div>
                    <div id="progress-truck" class="progress-truck">
                        <i class="fa-solid fa-truck"></i>
                    </div>
                </div>
                <div id="checkpoints-container" class="checkpoints-container">
                    <!-- Los checkpoints se generarán aquí con JS -->
                </div>
            </div>
            <div id="progress-error" class="alert alert-danger mt-3 d-none"></div>
        </section>

        <!-- Contenedor para la visualización de la orden (SVG) -->
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

    <!-- Configuración para JavaScript -->
    <script>
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
    </script>
    
    <!-- Scripts JS -->
    <script src="js/header.js"></script>
    <script src="js/myOrder.js" type="module"></script>
</body>
</html>
