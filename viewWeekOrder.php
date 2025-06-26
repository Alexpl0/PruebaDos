<?php
/**
 * viewWeekOrder.php - Weekly Orders Viewer
 * Solo usuarios autenticados pueden acceder (igual que view_order.php)
 */

require_once 'dao/users/auth_check.php';

// Check if user is authenticated
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    die('User not authenticated');
}

// Get user session data from auth_check
$userId = $user_id;
$userName = $user_name;
$userEmail = $_SESSION['user']['email'] ?? '';
$userRole = $_SESSION['user']['role'] ?? '';
$userPlant = $user_plant;
$authorizationLevel = $auth_level;

// Define base URLs
$URLBASE = "https://grammermx.com/Jesus/PruebaDos/";
$URLM = "https://grammermx.com/Mailer/PFMailer/";
$URLPF = "https://grammermx.com/PremiumFreight/";

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight Weekly - Grammer PF</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- SEO and Meta -->
    <meta name="description" content="Premium Freight Order Management System - Grammer AG">
    <meta name="author" content="Grammer AG">
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
    
    <!-- External CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/viewWeekorder.css">
</head>
<body>
    <div class="bulk-container">
        <!-- ===== HEADER PRINCIPAL CON INFORMACIÓN Y ACCIONES ===== -->
        <header class="bulk-header">
            <div class="bulk-header-content">
                <div class="header-left">
                    <!-- Logo y nombre de la compañía -->
                    <div class="company-logo">
                        <i class="fas fa-truck-fast"></i>
                        <span class="company-name">Grammer AG</span>
                    </div>
                    <!-- Información de las órdenes -->
                    <div class="orders-info">
                        <h1 class="orders-title-main">Premium Freight Orders</h1>
                        <p class="orders-subtitle">
                            Orders pending approval by <?php echo htmlspecialchars($userName); ?>
                        </p>
                    </div>
                </div>
                <div class="header-right">
                    <!-- Panel de acciones bulk -->
                    <div class="bulk-actions-header">
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
            <!-- Las tarjetas de orden se generarán aquí por JS -->
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

    <!-- ===== SCRIPT DE CONFIGURACIÓN ===== -->
    <!-- Este bloque pasa las variables de PHP a JavaScript de forma segura -->
    <script>
        window.APP_CONFIG = {
            userId: <?php echo json_encode($userId); ?>,
            authorizationLevel: <?php echo json_encode($authorizationLevel); ?>,
            urls: {
                base: "<?php echo $URLBASE; ?>",
                mailer: "<?php echo $URLM; ?>",
                pf: "<?php echo $URLPF; ?>"
            }
        };
    </script>

    <!-- PDF and Canvas Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
    
    <!-- jQuery and Bootstrap JS -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Scripts de la aplicación -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    
    <!-- Custom scripts -->
    <script src="js/header.js"></script>
    <script src="js/uploadFiles.js"></script>
    <script type="module" src="js/viewWeekorder.js"></script>

    <footer class="text-center py-3 mt-4 bg-light">
        <p class="mb-0">© 2025 Grammer. All rights reserved.</p>
    </footer>
</body>
</html>
