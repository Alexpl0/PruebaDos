<?php
/**
 * view_order.php - Professional Order Viewer (Refactored)
 * Individual order view page with approval/rejection functionality.
 * This version uses the centralized context injection system.
 */

// 1. Incluir el sistema de autenticación.
require_once 'dao/users/auth_check.php';

// 2. Validar que se haya proporcionado un ID de orden.
if (!isset($_GET['order']) || empty($_GET['order'])) {
    header('Location: orders.php');
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
    <title>Premium Freight Order #<?php echo $orderId; ?> - GRAMMER AMERICAS</title>
    
    <!-- Favicon, Meta, Fonts -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- External CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/view-order.css">
    <link rel="stylesheet" href="css/recovery-modal.css">
    <link rel="stylesheet" href="css/tour-styles.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css"/>
    <!-- NUEVO: Hoja de estilos para la línea de progreso -->
    <link rel="stylesheet" href="css/progress-line.css">

    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <script src="js/config.js"></script>
    <script>
        window.PF_CONFIG.orderId = <?php echo json_encode($orderId); ?>;
        sessionStorage.setItem('selectedOrderId', window.PF_CONFIG.orderId);
    </script>
    <!-- ==================================================================== -->

    <?php if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>

    <!-- External JS Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.js.iife.js"></script>
</head>
<body>
    <div class="email-container fade-in">
        <!-- ===== PROFESSIONAL HEADER ===== -->
        <div class="email-header">
            <!-- ... (contenido del header sin cambios) ... -->
        </div>

        <!-- ===== STATUS AND ACTIONS SECTION ===== -->
        <div class="status-section">
            <!-- ... (contenido de la sección de estado sin cambios) ... -->
        </div>

        <!-- ===== PROGRESS LINE SECTION (ACTUALIZADO) ===== -->
        <section id="progressSection" class="progress-section hidden">
            <div id="progress-container" class="progress-container">
                <div class="progress-track">
                    <div id="progress-bar" class="progress-bar"></div>
                    <div id="progress-truck" class="progress-truck">
                        <i class="fa-solid fa-truck"></i>
                    </div>
                </div>
                <div id="checkpoints-container" class="checkpoints-container">
                    <!-- Los checkpoints se llenarán con JS -->
                </div>
            </div>
            <div id="progress-error" class="alert alert-danger mt-3 d-none"></div>
        </section>

        <!-- ===== SVG CONTENT CONTAINER ===== -->
        <div class="svg-container">
            <!-- ... (contenido del SVG sin cambios) ... -->
        </div>
    </div>

    <!-- ===== RECOVERY FILES MODAL ===== -->
    <div id="recoveryModal" class="recovery-modal-overlay">
        <!-- ... (contenido del modal sin cambios) ... -->
    </div>

    <!-- jQuery and Bootstrap JS -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Custom scripts -->
    <script src="js/uploadFiles.js"></script>
    <script type="module" src="js/viewOrder.js"></script>
    
    <?php if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>
