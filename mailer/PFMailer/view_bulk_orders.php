<?php
/**
 * view_bulk_orders.php - Visualizador de múltiples órdenes para aprobación
 * Interfaz para revisar y procesar múltiples órdenes desde correos semanales
 * Version: 1.0
 */

// Error handling and logging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/view_bulk_orders_errors.log');

try {
    // Load dependencies
    require_once __DIR__ . '/config.php';
    require_once 'PFDB.php';
    require_once 'PFmailUtils.php';

    // Verificar parámetros básicos
    if (!isset($_GET['user']) || !isset($_GET['token'])) {
        showError('Required parameters missing. User ID and token are required.');
        exit;
    }

    $userId = intval($_GET['user']);
    $token = $_GET['token'];
    $specificOrderId = isset($_GET['order']) ? intval($_GET['order']) : null;

    // Validar parámetros
    if ($userId <= 0) {
        showError('Invalid user ID.');
        exit;
    }

    if (empty($token)) {
        showError('Empty token.');
        exit;
    }

    // Database connection
    $con = new LocalConector();
    $db = $con->conectar();

    if (!$db) {
        throw new Exception('Could not connect to database');
    }

    // Verificar token (puede ser individual o bulk)
    $tokenValid = false;
    $orderIds = [];

    // Primero intentar como token individual
    if ($specificOrderId) {
        $sql = "SELECT order_id FROM EmailActionTokens WHERE token = ? AND user_id = ? AND order_id = ?";
        $stmt = $db->prepare($sql);
        $stmt->bind_param("sii", $token, $userId, $specificOrderId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $tokenValid = true;
            $orderIds = [$specificOrderId];
        }
    }

    // Si no es token individual, intentar como token bulk
    if (!$tokenValid) {
        $sql = "SELECT order_ids FROM EmailBulkActionTokens WHERE token = ? AND user_id = ?";
        $stmt = $db->prepare($sql);
        $stmt->bind_param("si", $token, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $orderIds = json_decode($row['order_ids'], true);
            $tokenValid = true;
            
            // Si se especificó una orden específica, filtrar
            if ($specificOrderId && in_array($specificOrderId, $orderIds)) {
                $orderIds = [$specificOrderId];
            }
        }
    }

    if (!$tokenValid) {
        showError('Invalid or expired token.');
        exit;
    }

    // Obtener información del usuario
    $userSql = "SELECT name, email FROM User WHERE id = ?";
    $userStmt = $db->prepare($userSql);
    $userStmt->bind_param("i", $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    
    if ($userResult->num_rows === 0) {
        showError('User not found.');
        exit;
    }
    
    $userData = $userResult->fetch_assoc();

    // Obtener detalles de las órdenes
    $ordersData = [];
    $placeholders = str_repeat('?,', count($orderIds) - 1) . '?';
    
    $ordersSql = "SELECT 
                    pf.*,
                    u.name AS creator_name,
                    u.email AS creator_email,
                    u.role AS creator_role,
                    u.plant AS creator_plant,
                    lo_from.company_name AS origin_company_name,
                    lo_from.city AS origin_city,
                    lo_from.state AS origin_state,
                    lo_from.zip AS origin_zip,
                    lo_to.company_name AS destiny_company_name,
                    lo_to.city AS destiny_city,
                    lo_to.state AS destiny_state,
                    lo_to.zip AS destiny_zip,
                    c.name AS carrier,
                    st.id AS statusid,
                    st.name AS status_name,
                    pfa.id AS approval_id,
                    pfa.approval_date,
                    pfa.act_approv AS approval_status,
                    u_approver.name AS approver_name,
                    u_approver.email AS approver_email,
                    u_approver.role AS approver_role
                FROM PremiumFreight pf
                LEFT JOIN Carriers c ON pf.carrier_id = c.id
                LEFT JOIN User u ON pf.user_id = u.id
                LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
                LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
                LEFT JOIN Status st ON pf.status_id = st.id
                LEFT JOIN PremiumFreightApprovals pfa ON pf.id = pfa.premium_freight_id
                LEFT JOIN User u_approver ON pfa.user_id = u_approver.id
                WHERE pf.id IN ($placeholders)";
    
    $ordersStmt = $db->prepare($ordersSql);
    $ordersStmt->bind_param(str_repeat('i', count($orderIds)), ...$orderIds);
    $ordersStmt->execute();
    $ordersResult = $ordersStmt->get_result();

    while ($row = $ordersResult->fetch_assoc()) {
        $ordersData[] = $row;
    }

    if (empty($ordersData)) {
        showError('No orders found.');
        exit;
    }

    // Generar tokens para acciones
    $services = new PFEmailServices();
    $tokensData = [];
    
    foreach ($ordersData as $order) {
        $approveToken = $services->generateActionToken($order['id'], $userId, 'approve');
        $rejectToken = $services->generateActionToken($order['id'], $userId, 'reject');
        
        $tokensData[$order['id']] = [
            'approve' => $approveToken,
            'reject' => $rejectToken
        ];
    }

    // Verificar constantes requeridas
    if (!defined('URLM')) {
        throw new Exception('URLM is not defined');
    }

    if (!defined('URLPF')) {
        throw new Exception('URLPF is not defined');
    }

} catch (Exception $e) {
    $errorMsg = 'Error: ' . $e->getMessage();
    error_log("Error in view_bulk_orders.php: " . $errorMsg);
    showError($errorMsg);
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight Orders - <?php echo count($ordersData); ?> Orders - Grammer AG</title>
    
    <!-- SEO and Meta -->
    <meta name="description" content="Premium Freight Order Management System - Grammer AG">
    <meta name="author" content="Grammer AG">
    <meta name="robots" content="noindex, nofollow">
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- External CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- External JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Global Variables -->
    <script>
        window.PF_BULK_CONFIG = {
            userId: <?php echo $userId; ?>,
            userName: '<?php echo addslashes($userData['name']); ?>',
            token: '<?php echo addslashes($token); ?>',
            orders: <?php echo json_encode($ordersData); ?>,
            tokens: <?php echo json_encode($tokensData); ?>,
            urls: {
                base: '<?php echo URLM; ?>',
                pf: '<?php echo URLPF; ?>',
                singleAction: '<?php echo URLM; ?>PFmailSingleAction.php'
            },
            totalOrders: <?php echo count($ordersData); ?>,
            isSpecificOrder: <?php echo $specificOrderId ? 'true' : 'false'; ?>,
            specificOrderId: <?php echo $specificOrderId ?: 'null'; ?>
        };
    </script>
    
    <style>
        /* CSS CUSTOM PROPERTIES */
        :root {
            /* Grammer Corporate Colors */
            --grammer-blue: #034C8C;
            --grammer-light-blue: #4A90D9;
            --grammer-dark-blue: #002856;
            --grammer-accent: #00A3E0;
            
            /* Semantic Colors */
            --success: #10B981;
            --warning: #F59E0B;
            --danger: #EF4444;
            --info: #3B82F6;
            
            /* Neutrals */
            --white: #FFFFFF;
            --gray-50: #F9FAFB;
            --gray-100: #F3F4F6;
            --gray-200: #E5E7EB;
            --gray-300: #D1D5DB;
            --gray-400: #9CA3AF;
            --gray-500: #6B7280;
            --gray-600: #4B5563;
            --gray-700: #374151;
            --gray-800: #1F2937;
            --gray-900: #111827;
            
            /* Layout */
            --max-width: 1400px;
            --border-radius: 8px;
            --border-radius-lg: 12px;
            --spacing-xs: 0.25rem;
            --spacing-sm: 0.5rem;
            --spacing-md: 1rem;
            --spacing-lg: 1.5rem;
            --spacing-xl: 2rem;
            --spacing-2xl: 3rem;
            
            /* Shadows */
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            
            /* Transitions */
            --transition-fast: 0.15s ease-in-out;
            --transition-normal: 0.3s ease-in-out;
            --transition-slow: 0.5s ease-in-out;
        }

        /* BASE STYLES */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html {
            font-size: 16px;
            scroll-behavior: smooth;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--gray-800);
            background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* BULK CONTAINER */
        .bulk-container {
            max-width: var(--max-width);
            margin: 0 auto;
            background: var(--white);
            min-height: 100vh;
            box-shadow: var(--shadow-xl);
            position: relative;
            overflow: hidden;
        }

        /* BULK HEADER */
        .bulk-header {
            background: linear-gradient(135deg, var(--grammer-blue) 0%, var(--grammer-dark-blue) 100%);
            color: var(--white);
            padding: var(--spacing-lg) var(--spacing-xl);
            position: relative;
            overflow: hidden;
        }

        .bulk-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
            opacity: 0.2;
        }

        .bulk-header-content {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--spacing-md);
            min-height: 80px;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: var(--spacing-lg);
        }

        .company-logo {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }

        .company-logo i {
            font-size: 1.5rem;
            opacity: 0.9;
        }

        .company-name {
            font-size: 1.1rem;
            font-weight: 600;
            letter-spacing: -0.025em;
        }

        .orders-info {
            display: flex;
            flex-direction: column;
        }

        .orders-title-main {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            letter-spacing: -0.025em;
            line-height: 1.2;
        }

        .orders-subtitle {
            font-size: 0.9rem;
            opacity: 0.8;
            font-weight: 400;
            line-height: 1;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
        }

        /* BULK ACTIONS HEADER */
        .bulk-actions-header {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: var(--border-radius);
            padding: var(--spacing-sm) var(--spacing-md);
        }

        .bulk-action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--spacing-xs);
            padding: var(--spacing-sm) var(--spacing-md);
            background: var(--white);
            color: var(--gray-700);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: var(--border-radius);
            font-size: 0.8rem;
            font-weight: 600;
            text-decoration: none;
            transition: var(--transition-normal);
            cursor: pointer;
            box-shadow: var(--shadow-sm);
            min-width: 90px;
            height: 36px;
        }

        .bulk-action-btn:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }

        .btn-approve-all {
            background: var(--success);
            color: var(--white);
        }

        .btn-approve-all:hover {
            background: #059669;
            color: var(--white);
        }

        .btn-reject-all {
            background: var(--danger);
            color: var(--white);
        }

        .btn-reject-all:hover {
            background: #dc2626;
            color: var(--white);
        }

        .btn-download-all {
            background: var(--grammer-accent);
            color: var(--white);
        }

        .btn-download-all:hover {
            background: #0891b2;
            color: var(--white);
        }

        /* ORDERS GRID */
        .orders-grid {
            padding: var(--spacing-xl);
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
            gap: var(--spacing-xl);
        }

        /* ORDER CARD */
        .order-card {
            background: var(--white);
            border: 1px solid var(--gray-200);
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-md);
            overflow: hidden;
            transition: var(--transition-normal);
            opacity: 1;
            transform: scale(1);
        }

        .order-card:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-2px);
        }

        .order-card.processed {
            opacity: 0.6;
            transform: scale(0.98);
            filter: grayscale(0.3);
        }

        .order-card.hidden {
            display: none;
        }

        /* ORDER HEADER */
        .order-header {
            background: linear-gradient(90deg, var(--grammer-blue), var(--grammer-light-blue));
            color: var(--white);
            padding: var(--spacing-md) var(--spacing-lg);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .order-title {
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0;
        }

        .order-actions {
            display: flex;
            gap: var(--spacing-xs);
        }

        .order-action-btn {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            padding: var(--spacing-xs) var(--spacing-sm);
            font-size: 0.75rem;
            font-weight: 500;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: var(--border-radius);
            background: rgba(255,255,255,0.1);
            color: var(--white);
            text-decoration: none;
            transition: var(--transition-fast);
            cursor: pointer;
        }

        .order-action-btn:hover {
            background: rgba(255,255,255,0.2);
            color: var(--white);
        }

        .btn-approve-order {
            background: var(--success);
            border-color: var(--success);
        }

        .btn-approve-order:hover {
            background: #059669;
            border-color: #059669;
            color: var(--white);
        }

        .btn-reject-order {
            background: var(--danger);
            border-color: var(--danger);
        }

        .btn-reject-order:hover {
            background: #dc2626;
            border-color: #dc2626;
            color: var(--white);
        }

        .btn-download-order {
            background: var(--grammer-accent);
            border-color: var(--grammer-accent);
        }

        .btn-download-order:hover {
            background: #0891b2;
            border-color: #0891b2;
            color: var(--white);
        }

        /* ORDER CONTENT */
        .order-content {
            padding: var(--spacing-lg);
        }

        .order-svg-container {
            background: var(--gray-50);
            border: 1px solid var(--gray-200);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            margin-bottom: var(--spacing-lg);
            min-height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition-normal);
        }

        .order-svg-container:hover {
            background: var(--white);
            box-shadow: var(--shadow-sm);
        }

        .order-svg-container svg {
            width: 100%;
            height: auto;
            max-height: 400px;
            transition: var(--transition-normal);
        }

        /* STATUS INDICATORS */
        .status-indicator {
            position: absolute;
            top: var(--spacing-sm);
            right: var(--spacing-sm);
            padding: var(--spacing-xs) var(--spacing-sm);
            border-radius: 9999px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .status-approved {
            background: var(--success);
            color: var(--white);
        }

        .status-rejected {
            background: var(--danger);
            color: var(--white);
        }

        .status-pending {
            background: var(--warning);
            color: var(--white);
        }

        /* FLOATING ACTION PANEL */
        .floating-summary {
            position: fixed;
            bottom: var(--spacing-lg);
            right: var(--spacing-lg);
            background: var(--white);
            border: 1px solid var(--gray-200);
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-xl);
            padding: var(--spacing-md);
            min-width: 250px;
            z-index: 1000;
        }

        .summary-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--gray-800);
            margin-bottom: var(--spacing-sm);
        }

        .summary-stats {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            color: var(--gray-600);
        }

        /* LOADING STATE */
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--gray-200);
            border-top: 4px solid var(--grammer-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
            .orders-grid {
                grid-template-columns: 1fr;
                padding: var(--spacing-md);
            }
            
            .bulk-header-content {
                flex-direction: column;
                align-items: flex-start;
                gap: var(--spacing-sm);
            }
            
            .bulk-actions-header {
                flex-wrap: wrap;
            }
            
            .floating-summary {
                position: relative;
                bottom: auto;
                right: auto;
                margin: var(--spacing-md);
            }
        }
    </style>
</head>
<body>
    <div class="bulk-container">
        <!-- BULK HEADER -->
        <header class="bulk-header">
            <div class="bulk-header-content">
                <div class="header-left">
                    <div class="company-logo">
                        <i class="fas fa-truck-fast"></i>
                        <span class="company-name">Grammer AG</span>
                    </div>
                    <div class="orders-info">
                        <h1 class="orders-title-main">Premium Freight Orders</h1>
                        <p class="orders-subtitle"><?php echo count($ordersData); ?> orders pending approval by <?php echo htmlspecialchars($userData['name']); ?></p>
                    </div>
                </div>
                <div class="header-right">
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

        <!-- ORDERS GRID -->
        <main class="orders-grid" id="orders-grid">
            <?php foreach ($ordersData as $order): ?>
            <div class="order-card" data-order-id="<?php echo $order['id']; ?>">
                <div class="order-header">
                    <h2 class="order-title">Order #<?php echo $order['id']; ?></h2>
                    <div class="order-actions">
                        <button class="order-action-btn btn-approve-order" 
                                data-order-id="<?php echo $order['id']; ?>"
                                data-token="<?php echo $tokensData[$order['id']]['approve']; ?>">
                            <i class="fas fa-check"></i>
                            Approve
                        </button>
                        <button class="order-action-btn btn-reject-order"
                                data-order-id="<?php echo $order['id']; ?>"
                                data-token="<?php echo $tokensData[$order['id']]['reject']; ?>">
                            <i class="fas fa-times"></i>
                            Reject
                        </button>
                        <button class="order-action-btn btn-download-order"
                                data-order-id="<?php echo $order['id']; ?>">
                            <i class="fas fa-download"></i>
                            PDF
                        </button>
                    </div>
                </div>
                <div class="order-content">
                    <div class="order-svg-container" id="svg-container-<?php echo $order['id']; ?>">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </main>

        <!-- FLOATING SUMMARY -->
        <div class="floating-summary" id="floating-summary">
            <div class="summary-title">Progress Summary</div>
            <div class="summary-stats">
                <span>Pending: <span id="pending-count"><?php echo count($ordersData); ?></span></span>
                <span>Processed: <span id="processed-count">0</span></span>
            </div>
        </div>
    </div>

    <!-- APPLICATION LOGIC -->
    <script type="module">
        import { generateOrderSVG, generatePDF } from '<?php echo URLPF; ?>js/svgOrders.js';

        class BulkOrdersViewer {
            constructor() {
                this.config = window.PF_BULK_CONFIG;
                this.processedOrders = new Set();
                this.initialize();
            }

            async initialize() {
                console.log('Initializing Bulk Orders Viewer:', this.config);
                
                // Load SVGs for all orders
                await this.loadAllOrderSVGs();
                
                // Setup event listeners
                this.setupEventListeners();
                
                // Update summary
                this.updateSummary();
            }

            async loadAllOrderSVGs() {
                const promises = this.config.orders.map(order => this.loadOrderSVG(order));
                await Promise.all(promises);
            }

            async loadOrderSVG(orderData) {
                try {
                    const container = document.getElementById(`svg-container-${orderData.id}`);
                    if (!container) return;

                    // Generate SVG
                    const svgElement = await generateOrderSVG(orderData);
                    
                    // Replace loading spinner with SVG
                    container.innerHTML = '';
                    container.appendChild(svgElement);
                    
                    console.log(`SVG loaded for order ${orderData.id}`);
                } catch (error) {
                    console.error(`Error loading SVG for order ${orderData.id}:`, error);
                    
                    const container = document.getElementById(`svg-container-${orderData.id}`);
                    if (container) {
                        container.innerHTML = `
                            <div style="text-align: center; color: #ef4444;">
                                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                                <p>Error loading order visualization</p>
                            </div>
                        `;
                    }
                }
            }

            setupEventListeners() {
                // Individual order actions
                document.querySelectorAll('.btn-approve-order').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handleIndividualAction(e, 'approve'));
                });

                document.querySelectorAll('.btn-reject-order').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handleIndividualAction(e, 'reject'));
                });

                document.querySelectorAll('.btn-download-order').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handleDownloadOrder(e));
                });

                // Bulk actions
                document.getElementById('approve-all-btn').addEventListener('click', () => this.handleBulkAction('approve'));
                document.getElementById('reject-all-btn').addEventListener('click', () => this.handleBulkAction('reject'));
                document.getElementById('download-all-btn').addEventListener('click', () => this.handleDownloadAll());
            }

            async handleIndividualAction(event, action) {
                const btn = event.target.closest('.order-action-btn');
                const orderId = btn.getAttribute('data-order-id');
                const token = btn.getAttribute('data-token');

                if (this.processedOrders.has(orderId)) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Already Processed',
                        text: `Order #${orderId} has already been ${action}d.`
                    });
                    return;
                }

                const result = await Swal.fire({
                    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Order #${orderId}?`,
                    text: `Are you sure you want to ${action} this order?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
                    confirmButtonText: `Yes, ${action}!`,
                    cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                    await this.processAction(token, action, orderId);
                }
            }

            async handleBulkAction(action) {
                const pendingOrders = this.config.orders.filter(order => !this.processedOrders.has(order.id.toString()));
                
                if (pendingOrders.length === 0) {
                    Swal.fire({
                        icon: 'info',
                        title: 'No Pending Orders',
                        text: 'All orders have been processed already.'
                    });
                    return;
                }

                const result = await Swal.fire({
                    title: `${action.charAt(0).toUpperCase() + action.slice(1)} All Orders?`,
                    text: `This will ${action} ${pendingOrders.length} pending orders. This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
                    confirmButtonText: `Yes, ${action} all!`,
                    cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                    // TODO: Implement bulk action processing
                    // For now, process each individually
                    for (const order of pendingOrders) {
                        const token = this.config.tokens[order.id][action];
                        await this.processAction(token, action, order.id);
                    }
                }
            }

            async processAction(token, action, orderId) {
                try {
                    const url = `${this.config.urls.singleAction}?action=${action}&token=${token}`;
                    
                    // Show loading
                    Swal.fire({
                        title: 'Processing...',
                        text: `${action.charAt(0).toUpperCase() + action.slice(1)}ing order #${orderId}`,
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    const response = await fetch(url, { method: 'GET' });
                    
                    if (response.ok) {
                        // Mark as processed
                        this.processedOrders.add(orderId.toString());
                        
                        // Update UI
                        this.markOrderAsProcessed(orderId, action);
                        this.updateSummary();
                        
                        Swal.fire({
                            icon: 'success',
                            title: 'Success!',
                            text: `Order #${orderId} has been ${action}d successfully.`,
                            timer: 2000,
                            timerProgressBar: true
                        });
                    } else {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                } catch (error) {
                    console.error('Error processing action:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: `Failed to ${action} order #${orderId}. Please try again.`
                    });
                }
            }

            markOrderAsProcessed(orderId, action) {
                const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
                if (orderCard) {
                    orderCard.classList.add('processed');
                    
                    // Add status indicator
                    const orderHeader = orderCard.querySelector('.order-header');
                    const statusIndicator = document.createElement('div');
                    statusIndicator.className = `status-indicator status-${action}d`;
                    statusIndicator.textContent = action === 'approve' ? 'APPROVED' : 'REJECTED';
                    orderHeader.appendChild(statusIndicator);
                    
                    // Optionally hide the order after a delay
                    setTimeout(() => {
                        if (confirm(`Hide processed order #${orderId}?`)) {
                            orderCard.classList.add('hidden');
                        }
                    }, 3000);
                }
            }

            async handleDownloadOrder(event) {
                const btn = event.target.closest('.order-action-btn');
                const orderId = btn.getAttribute('data-order-id');
                const orderData = this.config.orders.find(o => o.id == orderId);
                
                if (!orderData) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Order data not found.'
                    });
                    return;
                }

                try {
                    await generatePDF(orderData, `PF_Order_${orderId}`);
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'PDF Downloaded!',
                        text: `Order #${orderId} has been downloaded successfully.`,
                        timer: 2000,
                        timerProgressBar: true
                    });
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to generate PDF. Please try again.'
                    });
                }
            }

            async handleDownloadAll() {
                const result = await Swal.fire({
                    title: 'Download All Orders?',
                    text: `This will generate PDFs for ${this.config.orders.length} orders. This may take a few moments.`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#034C8C',
                    confirmButtonText: 'Yes, download all!',
                    cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                    try {
                        Swal.fire({
                            title: 'Generating PDFs...',
                            text: 'Please wait while we generate all PDFs.',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        });

                        for (let i = 0; i < this.config.orders.length; i++) {
                            const order = this.config.orders[i];
                            await generatePDF(order, `PF_Order_${order.id}`);
                            
                            // Update progress
                            const progress = ((i + 1) / this.config.orders.length) * 100;
                            Swal.update({
                                text: `Generated ${i + 1} of ${this.config.orders.length} PDFs (${Math.round(progress)}%)`
                            });
                        }

                        Swal.fire({
                            icon: 'success',
                            title: 'All PDFs Downloaded!',
                            text: `Successfully generated ${this.config.orders.length} PDF files.`,
                            timer: 3000,
                            timerProgressBar: true
                        });
                    } catch (error) {
                        console.error('Error generating PDFs:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to generate some PDFs. Please try again.'
                        });
                    }
                }
            }

            updateSummary() {
                const pendingCount = this.config.orders.length - this.processedOrders.size;
                const processedCount = this.processedOrders.size;
                
                document.getElementById('pending-count').textContent = pendingCount;
                document.getElementById('processed-count').textContent = processedCount;
            }
        }

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new BulkOrdersViewer());
        } else {
            new BulkOrdersViewer();
        }
    </script>
</body>
</html>