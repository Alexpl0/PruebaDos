<?php
/**
 * weekOrders.php - Premium Freight Weekly Orders Viewer (Refactored)
 * Shows all pending orders for approval by the current user.
 * This version uses the centralized context injection system.
 */

// 1. Incluir el sistema de autenticación.
require_once 'dao/users/auth_check.php';

// 2. Incluir el inyector de contexto desde su nueva ubicación.
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
    <link rel="stylesheet" href="css/viewWeekorder.css">

    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->

    <?php 
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>
    
    <!-- External JS Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

</head>
<body>
    <div class="bulk-container">
        <!-- ===== PROFESSIONAL HEADER (SIMPLIFICADO) ===== -->
        <header class="bulk-header">
            <div class="bulk-header-content">
                <!-- SE ELIMINÓ .header-left PARA UN DISEÑO MÁS LIMPIO -->
                <div class="header-right">
                    <div class="bulk-actions-header">
                        <a href="orders.php" class="bulk-action-btn btn-back">
                            <i class="fas fa-arrow-left"></i>
                            Back
                        </a>
                        <button id="approve-all-btn" class="bulk-action-btn btn-approve-all">
                            <i class="fas fa-check-double"></i>
                            Approve All
                        </button>
                        <button id="reject-all-btn" class="bulk-action-btn btn-reject-all">
                            <i class="fas fa-times-circle"></i>
                            Reject All
                        </button>
                        <button id="download-all-btn" class="bulk-action-btn btn-download-all">
                            <i class="fas fa-download"></i>
                            Download All
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- ===== GRID PRINCIPAL DE ÓRDENES ===== -->
        <main class="orders-grid" id="orders-grid">
            <div class="loading-spinner-container">
                <div class="loading-spinner"></div>
                <p>Loading orders...</p>
            </div>
        </main>

        <!-- ===== PANEL FLOTANTE DE PROGRESO ===== -->
        <div class="floating-summary" id="floating-summary">
            <div class="summary-title">Progress Summary</div>
            <div class="summary-stats">
                <span>Pending: <span id="pending-count">0</span></span>
                <span>Processed: <span id="processed-count">0</span></span>
            </div>
        </div>
    </div>

    <!-- JS Libraries (jQuery, Bootstrap, etc.) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Custom scripts -->
    <script src="js/uploadFiles.js"></script>
    <script type="module" src="js/viewWeekorder.js"></script>
    
    <?php 
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>
