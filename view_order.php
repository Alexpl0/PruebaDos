<?php
/**
 * view_order.php - Professional Order Viewer
 * Individual order view page with approval/rejection functionality
 * Version: 1.0 - Internal system integration
 */

// Use the auth_check system (this will block users with authorization_level 0)
require_once 'dao/users/auth_check.php';

// Check if order ID is provided
if (!isset($_GET['order']) || empty($_GET['order'])) {
    header('Location: orders.php');
    exit;
}

$orderId = intval($_GET['order']);

// Get user session data from auth_check
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
$userID = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
$plant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
$userId = $userID;
$userName = $name;
$userEmail = $_SESSION['user']['email'] ?? '';
$userRole = $_SESSION['user']['role'] ?? '';
$userPlant = $plant;
$authorizationLevel = $nivel;

// Define base URLs
$URLBASE = "https://grammermx.com/Jesus/PruebaDos/";
$URLM = "https://grammermx.com/Mailer/PFMailer/";

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    die('User not authenticated');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight Order #<?php echo $orderId; ?> - Grammer AG</title>
    
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
    <?php if (isset($nivel) && $nivel > 0): ?>
        <!-- Virtual Assistant CSS -->
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>

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
            orderData: null, // Se cargará vía AJAX usando el endpoint existente
            user: {
                id: <?php echo json_encode($userID); ?>,
                name: <?php echo json_encode($name); ?>,
                email: <?php echo json_encode($userEmail); ?>,
                role: <?php echo json_encode($userRole); ?>,
                plant: <?php echo json_encode($plant); ?>,
                authorizationLevel: <?php echo json_encode($nivel); ?>
            },
            orderId: <?php echo json_encode($orderId); ?>
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
        
        // For session storage compatibility
        sessionStorage.setItem('selectedOrderId', window.PF_CONFIG.orderId);
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
                        <h1 class="order-title-main">Order #<?php echo $orderId; ?></h1>
                        <p class="order-subtitle">Premium Freight Authorization</p>
                    </div>
                </div>
                <div class="header-right">
                    <h2 class="company-name">GRAMMER AG</h2>
                    <p class="order-subtitle">Logistics Management System</p>
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
                
                <button class="action-btn-compact btn-pdf" onclick="handleGeneratePDF()">
                    <i class="fas fa-file-pdf"></i>
                    PDF
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

        <!-- ===== PROGRESS LINE SECTION ===== -->
        <div id="progressSection" class="progress-section hidden">
            <div class="progress-header">
                <h3 class="progress-title">Approval Progress</h3>
                <p class="progress-subtitle">Track your order through the approval process</p>
            </div>
            
            <div class="progress-line-container">
                <div class="progress-background-line"></div>
                <div class="progress-active-line" style="width: 0%"></div>
                
                <div class="progress-checkpoints">
                    <!-- Checkpoints will be populated by JavaScript -->
                </div>
                
                <div class="progress-truck moving" style="left: 0%">
                    <i class="fa-solid fa-truck-fast"></i>
                </div>
            </div>
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
    <script type="module" src="js/viewOrder.js"></script>
    <?php if (isset($nivel) && $nivel > 0): ?>
        <!-- Virtual Assistant JavaScript - Solo para usuarios autorizados -->
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>