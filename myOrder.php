<?php
/**
 * myOrder.php - Displays the progress of a specific order (Refactored)
 * This version uses the centralized context injection system.
 */

// 1. Manejar sesión y autenticación.
require_once 'dao/users/auth_check.php';

// 2. Verificar que se haya proporcionado un ID de orden válido.
if (!isset($_GET['order']) || !is_numeric($_GET['order'])) {
    // Si no hay ID, redirigir a la página principal de órdenes.
    // Usamos la URL del inyector para una redirección segura.
    require_once 'dao/users/context_injector.php';
    header('Location: ' . $appContextForJS['app']['baseURL'] . 'orders.php');
    exit;
}
$orderId = intval($_GET['order']);

// 3. Incluir el inyector de contexto.
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <title>Order #<?php echo $orderId; ?> Progress</title>
    
    <!-- External CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <!-- <link rel="stylesheet" href="css/header.css"> -->
    <link rel="stylesheet" href="css/myOrder.css">
    
    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <!-- 1. Incluir el módulo de configuración JS. -->
    <script src="js/config.js"></script>
    
    <!-- 2. Añadir datos específicos de la página al objeto de configuración global. -->
    <script>
        window.PF_CONFIG.orderId = <?php echo json_encode($orderId); ?>;
    </script>
    <!-- ==================================================================== -->

    <?php 
    // Carga condicional del CSS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
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
                    <!-- Checkpoints se llenarán con JS -->
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

    <!-- External JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Custom Scripts -->
    <script src="js/header.js"></script>
    <script src="js/myOrder.js" type="module"></script>
    
    <?php 
    // Carga condicional del JS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>
