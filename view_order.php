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
    echo 'Order ID not provided.';
    exit;
}
$orderId = intval($_GET['order']);
echo 'Order ID: ' . $orderId; // Verificar el ID recibido

// 3. Incluir el inyector de contexto desde su ubicación central.
// Este script crea la variable $appContextForJS e imprime el objeto `window.APP_CONTEXT`.
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
    <meta name="description" content="Premium Freight Order Management System - GRAMMER AMERICAS">
    <meta name="author" content="GRAMMER AMERICAS">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- External CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/view-order.css">
    <link rel="stylesheet" href="css/corrective-action-plan.css">
    <link rel="stylesheet" href="css/recovery-modal.css">
    <link rel="stylesheet" href="css/tour-styles.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css"/>
    <!-- NUEVO: Hoja de estilos para la línea de progreso -->
    <link rel="stylesheet" href="css/progress-line.css">
    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <!-- 1. Incluir el módulo de configuración JS. -->
    <script src="js/config.js"></script>
    
    <!-- 2. Añadir datos específicos de la página al objeto de configuración global. -->
    <script>
        window.PF_CONFIG.orderId = <?php echo json_encode($orderId); ?>;
        // Para compatibilidad con módulos que usan sessionStorage
        sessionStorage.setItem('selectedOrderId', window.PF_CONFIG.orderId);
    </script>
    <!-- ==================================================================== -->

    <?php 
    // Carga condicional del CSS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
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
            <div class="email-header-content">
                <div class="header-left">
                    <div class="company-logo">
                        <i class="fas fa-industry"></i>
                    </div>
                    <div class="order-info">
                        <h1 class="order-title-main">Order #<?php echo $orderId; ?></h1>
                        <p class="order-subtitle">Premium Freight Authorization</p>
                    </div>
                </div>
                <div class="header-right">
                    <h2 class="company-name">GRAMMER AMERICAS</h2>
                    <p class="order-subtitle">Logistics Management System</p>
                </div>
            </div>
        </div>

        <!-- ===== STATUS AND ACTIONS SECTION ===== -->
        <div class="status-section">
            <div class="approver-info">
                <div class="approver-avatar">
                    <?php echo strtoupper(substr(htmlspecialchars($appContextForJS['user']['name']), 0, 2)); ?>
                </div>
                <div class="approver-details">
                    <h4><?php echo htmlspecialchars($appContextForJS['user']['name']); ?></h4>
                    <p class="approver-role"><?php echo htmlspecialchars($appContextForJS['user']['role']); ?> - Level <?php echo $appContextForJS['user']['authorizationLevel']; ?></p>
                </div>
            </div>
            
            <div class="quick-actions">
                <button class="action-btn-compact btn-back">
                    <i class="fas fa-arrow-left"></i>
                    Back
                </button>
                
                <button class="action-btn-compact btn-pdf">
                    <i class="fas fa-file-pdf"></i>
                    PDF
                </button>

                <!-- New button for recovery files -->
                <button id="recoveryFilesBtn" class="action-btn-compact btn-info hidden">
                    <i class="fas fa-folder-open"></i>
                    Recovery Files
                </button>
                
                <button id="approveBtn" class="action-btn-compact btn-approve hidden">
                    <i class="fas fa-check-circle"></i>
                    Approve
                </button>
                
                <button id="rejectBtn" class="action-btn-compact btn-reject hidden">
                    <i class="fas fa-times-circle"></i>
                    Reject
                </button>
            </div>
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

        <!-- ===== NUEVA SECCIÓN: CORRECTIVE ACTION PLAN ===== -->
        <div id="correctiveActionContainer">
            <!-- El contenido se llenará con JavaScript -->
        </div>

        <!-- ===== SVG CONTENT CONTAINER ===== -->
        <div class="svg-container">
            <div class="svg-content">
                <div class="loading-spinner" id="loadingSpinner">
                    <div class="spinner"></div>
                    Loading order details...
                </div>
                <div id="svgContent" class="hidden"></div>
            </div>
        </div>
    </div>

    <!-- ===== RECOVERY FILES MODAL ===== -->
    <div id="recoveryModal" class="recovery-modal-overlay">
        <div class="recovery-modal-content">
            <div class="recovery-modal-header">
                <h3 class="recovery-modal-title">Recovery Files</h3>
                <button id="closeRecoveryModalBtn" class="recovery-modal-close-btn">&times;</button>
            </div>
            <div id="recoveryModalAlertContainer"></div>
            <div id="recoveryModalBody" class="recovery-modal-body">
                <!-- PDF viewers will be injected here by JavaScript -->
            </div>
        </div>
    </div>

    <!-- jQuery and Bootstrap JS -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Custom scripts -->
    <script src="js/uploadFiles.js"></script>
    <script src="js/correctiveActionPlan.js"></script>
    <script type="module" src="js/viewOrder.js"></script>
    
    <?php 
    // Carga condicional del JS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>
