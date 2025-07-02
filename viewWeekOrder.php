<?php
/**
 * viewWeekOrder.php - Weekly Orders Viewer
 * Solo usuarios autenticados pueden acceder (igual que view_order.php)
 */

require_once 'dao/users/auth_check.php';
require_once 'config.php';

// Check if user is authenticated
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    die('User not authenticated');
}

// Variables de usuario para el asistente
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
$userID = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
$plant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;

// Para compatibilidad con el resto del código
$userId = $userID;
$userName = $name;
$userEmail = $_SESSION['user']['email'] ?? '';
$userRole = $_SESSION['user']['role'] ?? '';
$userPlant = $plant;
$authorizationLevel = $nivel;

// --- Definir URLs desde config.php ---
$URLBASE = defined('URLPF') ? URLPF : 'https://grammermx.com/Jesus/PruebaDos/';
$URLM = defined('URLM') ? URLM : 'https://grammermx.com/Mailer/PFMailer/';
$URLPF_DOMAIN = defined('URL_PREMIUM_FREIGHT') ? URL_PREMIUM_FREIGHT : 'https://grammermx.com/PremiumFreight/';
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
    <?php if (isset($nivel) && $nivel > 0): ?>
        <!-- Virtual Assistant CSS -->
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>
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
            userPlant: <?php echo json_encode($userPlant); ?>,
            urls: {
                base: "<?php echo $URLBASE; ?>",
                mailer: "<?php echo $URLM; ?>",
                pf: "<?php echo $URLPF_DOMAIN; ?>"
            }
        };
    </script>

    <!-- Scripts de la aplicación -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script type="module" src="js/viewWeekorder.js"></script>
    <?php if (isset($nivel) && $nivel > 0): ?>
        <!-- Virtual Assistant JavaScript - Solo para usuarios autorizados -->
        <script src="js/assistant.js"></script>
    <?php endif; ?>

    <footer class="text-center py-3 mt-4 bg-light">
        <p class="mb-0">© 2025 Grammer. All rights reserved.</p>
    </footer>
</body>
</html>
