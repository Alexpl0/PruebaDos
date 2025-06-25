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
    <title>Premium Freight Weekly<?php echo $orderId; ?> - Grammer PF</title>
    
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
    
    <!-- External JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.2/d3.min.js"></script> <!-- Para manipulación avanzada de SVGs -->
    <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script> <!-- Para utilidades JS -->
    <script>
        window.PF_WEEK_CONFIG = {
            userId: <?php echo $userId; ?>,
            userName: '<?php echo addslashes($userName); ?>',
            userEmail: '<?php echo addslashes($userEmail); ?>',
            userRole: '<?php echo addslashes($userRole); ?>',
            userPlant: '<?php echo addslashes($userPlant); ?>',
            authorizationLevel: <?php echo $authorizationLevel; ?>,
            urls: {
                base: '<?php echo $URLBASE; ?>',
                mailer: '<?php echo $URLM; ?>',
                pf: '<?php echo $URLPF; ?>'
            }
        };
    </script>
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
                            <?php 
                            echo isset($ordersData) && count($ordersData) > 0 
                                ? count($ordersData) . ' orders pending approval by ' . htmlspecialchars($userName) 
                                : 'No orders available'; 
                            ?>
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
            <?php foreach ($ordersData as $order): ?>
            <!-- Tarjeta individual para cada orden -->
            <div class="order-card" data-order-id="<?php echo $order['id']; ?>">
                <div class="order-header">
                    <h2 class="order-title">Order #<?php echo $order['id']; ?></h2>
                    <div class="order-actions">
                        <!-- Botón de aprobación con token único -->
                        <button class="order-action-btn btn-approve-order" 
                                data-order-id="<?php echo $order['id']; ?>"
                                data-token="<?php echo $tokensData[$order['id']]['approve']; ?>">
                            <i class="fas fa-check"></i>
                            Approve
                        </button>
                        <!-- Botón de rechazo con token único -->
                        <button class="order-action-btn btn-reject-order"
                                data-order-id="<?php echo $order['id']; ?>"
                                data-token="<?php echo $tokensData[$order['id']]['reject']; ?>">
                            <i class="fas fa-times"></i>
                            Reject
                        </button>
                        <!-- Botón de descarga PDF -->
                        <button class="order-action-btn btn-download-order"
                                data-order-id="<?php echo $order['id']; ?>">
                            <i class="fas fa-download"></i>
                            PDF
                        </button>
                    </div>
                </div>
                <div class="order-content">
                    <!-- Contenedor para SVG que será populado por JavaScript -->
                    <div class="order-svg-container" id="svg-container-<?php echo $order['id']; ?>">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </main>

        <!-- ===== PANEL FLOTANTE DE PROGRESO ===== -->
        <div class="floating-summary" id="floating-summary">
            <div class="summary-title">Progress Summary</div>
            <div class="summary-stats">
                <span>Pending: <span id="pending-count"><?php echo count($ordersData); ?></span></span>
                <span>Processed: <span id="processed-count">0</span></span>
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
    <script type="module" src="js/viewWeekorder.js"></script>

    <script>console.log('User Plant:', window.userPlant);</script>

    <footer class="text-center py-3 mt-4 bg-light">
        <p class="mb-0">© 2025 Grammer. All rights reserved.</p>
    </footer>

</body>
</html>