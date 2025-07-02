<?php
/**
 * weekOrders.php - Premium Freight Weekly Orders Viewer (Refactored)
 * Shows all pending orders for approval by the current user.
 * This version uses the centralized context injection system.
 */

// 1. Incluir el sistema de autenticación.
// Esto se asegura de que el usuario tenga una sesión válida y carga los datos en $_SESSION.
require_once 'dao/users/auth_check.php';

// 2. Incluir el inyector de contexto desde su nueva ubicación.
// Este script crea la variable $appContextForJS e imprime el objeto `window.APP_CONTEXT`.
// Se usa '/' en la ruta para máxima compatibilidad entre sistemas operativos (Windows, Linux, etc.).
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Orders - Premium Freight - Grammer AG</title>
    
    <!-- Favicon, SEO, Fonts, etc. -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <meta name="description" content="Premium Freight Order Management System - Grammer AG">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- External CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/view-order.css">
    <link rel="stylesheet" href="css/weekOrders.css">

    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
        // La etiqueta <script> con APP_CONTEXT ya ha sido generada por el inyector.
    ?>

    <!-- Incluir el módulo de configuración JS.
         Este script DEBE cargarse DESPUÉS del inyector y ANTES que cualquier otro script que lo necesite. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->

    <?php 
    // Carga condicional del CSS del asistente, usando la variable PHP generada por el inyector.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>
    
    <!-- External JS Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

</head>
<body>
    <div class="email-container fade-in">
        <!-- ===== PROFESSIONAL HEADER (sin cambios) ===== -->
        <div class="email-header">
            <div class="email-header-content">
                <div class="header-left">
                    <div class="company-logo">
                        <i class="fas fa-industry"></i>
                    </div>
                    <div class="order-info">
                        <h1 class="order-title-main">Weekly Orders</h1>
                        <p class="order-subtitle" id="orderCount">Loading orders...</p>
                    </div>
                </div>
                <div class="header-right">
                    <h2 class="company-name">GRAMMER AG</h2>
                    <p class="order-subtitle">PremiumFreight System</p>
                </div>
            </div>
        </div>

        <!-- ===== STATUS AND ACTIONS SECTION ===== -->
        <div class="status-section">
            <div class="approver-info">
                <div class="approver-avatar">
                    <!-- Usamos htmlspecialchars para seguridad -->
                    <?php echo strtoupper(substr(htmlspecialchars($appContextForJS['user']['name']), 0, 2)); ?>
                </div>
                <div class="approver-details">
                    <h4><?php echo htmlspecialchars($appContextForJS['user']['name']); ?></h4>
                    <p class="approver-role"><?php echo htmlspecialchars($appContextForJS['user']['role']); ?> - Level <?php echo $appContextForJS['user']['authorizationLevel']; ?></p>
                </div>
            </div>
            
            <div class="quick-actions">
                 <button class="action-btn-compact btn-back" onclick="goBack()">
                    <i class="fas fa-arrow-left"></i>
                    Back
                </button>
                
                <button class="action-btn-compact btn-approve-all hidden" onclick="handleApproveAll()">
                    <i class="fas fa-check-double"></i>
                    Approve All
                </button>
                
                <button class="action-btn-compact btn-download-all hidden" onclick="handleDownloadAll()">
                    <i class="fas fa-download"></i>
                    Download All
                </button>
            </div>
        </div>

        <!-- ===== ORDERS CONTAINER (sin cambios) ===== -->
        <div class="orders-container">
            <div class="loading-orders" id="loadingOrders">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    Loading your pending orders...
                </div>
            </div>
            <div id="ordersContent" class="hidden"></div>
        </div>
    </div>

    <!-- JS Libraries (jQuery, Bootstrap, DataTables, etc.) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- DataTables JS -->
    <script type="text/javascript" src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/dataTables.buttons.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.html5.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.print.min.js"></script>

    <!-- Custom scripts -->
    <script src="js/uploadFiles.js"></script>
    <script type="module" src="js/weekOrders.js"></script>
    
    <?php 
    // Carga condicional del JS del asistente.
    // La lógica para inicializar el asistente ahora está dentro de assistant.js
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>
