<?php
/**
 * weekOrders.php - Premium Freight Weekly Orders Viewer
 * Shows all pending orders for approval by the current user
 * Version: 1.0 - Based on view_order.php structure
 */

// Use the auth_check system (this will block users with authorization_level 0)
require_once 'dao/users/auth_check.php';

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
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Orders - Premium Freight - Grammer AG</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- SEO and Meta -->
    <meta name="description" content="Premium Freight Order Management System - Grammer AG">
    <meta name="author" content="Grammer AG">
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- External CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/view-order.css">
    <link rel="stylesheet" href="css/weekOrders.css">
    
    <!-- External JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    
    <!-- Global Variables -->
    <script>
        // ===== GLOBAL CONFIGURATION =====
        window.PF_CONFIG = {
            baseURL: '<?php echo $URLBASE; ?>',
            mailerURL: '<?php echo $URLM; ?>',
            user: {
                id: <?php echo $userId; ?>,
                name: '<?php echo $userName; ?>',
                email: '<?php echo $userEmail; ?>',
                role: '<?php echo $userRole; ?>',
                plant: <?php echo $userPlant ? "'$userPlant'" : 'null'; ?>,
                authorizationLevel: <?php echo $authorizationLevel; ?>
            },
            pendingOrders: [] // Se cargará vía AJAX usando daoPremiumFreight.php
        };
        
        // Legacy support for existing modules
        window.PF_URL = window.PF_CONFIG.baseURL;
        window.URLM = window.PF_CONFIG.mailerURL;
        window.allOrders = [];
        window.originalOrders = [];
        window.authorizationLevel = window.PF_CONFIG.user.authorizationLevel;
        window.userName = window.PF_CONFIG.user.name;
        window.userID = window.PF_CONFIG.user.id;
        window.userPlant = window.PF_CONFIG.user.plant;
    </script>
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
                    <?php echo strtoupper(substr($userName, 0, 2)); ?>
                </div>
                <div class="approver-details">
                    <h4><?php echo htmlspecialchars($userName); ?></h4>
                    <p class="approver-role"><?php echo htmlspecialchars($userRole); ?> - Level <?php echo $authorizationLevel; ?></p>
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

        <!-- ===== ORDERS CONTAINER ===== -->
        <div class="orders-container">
            <!-- Loading spinner mientras cargan las órdenes -->
            <div class="loading-orders" id="loadingOrders">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    Loading your pending orders...
                </div>
            </div>
            
            <!-- Container para las órdenes que se generarán dinámicamente -->
            <div id="ordersContent" class="hidden"></div>
        </div>
    </div>

    <!-- PDF and Canvas Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
    
    <!-- jQuery and Bootstrap JS -->
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
</body>
</html>