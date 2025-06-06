<?php
/**
 * view_order.php - Professional Order Viewer
 * Individual order view page with approval/rejection functionality
 * Version: 1.0 - Internal system integration
 */

// Start session to get user data
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}

// Check if order ID is provided
if (!isset($_GET['order']) || empty($_GET['order'])) {
    header('Location: orders.php');
    exit;
}

$orderId = intval($_GET['order']);

// Get user session data
$userId = $_SESSION['user_id'];
$userName = $_SESSION['name'];
$userEmail = $_SESSION['email'];
$userRole = $_SESSION['role'];
$userPlant = $_SESSION['plant'];
$authorizationLevel = $_SESSION['authorization_level'];

// Database connection
require_once 'dao/conections/LocalConector.php';

try {
    $con = new LocalConector();
    $db = $con->conectar();

    if (!$db) {
        throw new Exception('Could not connect to database');
    }

    // Get complete order details
    $orderSql = "SELECT 
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
                    st.name AS status_name
                FROM PremiumFreight pf
                LEFT JOIN Carriers c ON pf.carrier_id = c.id
                LEFT JOIN User u ON pf.user_id = u.id
                LEFT JOIN Location lo_from ON pf.origin_id = lo_from.id
                LEFT JOIN Location lo_to ON pf.destiny_id = lo_to.id
                LEFT JOIN Status st ON pf.status_id = st.id
                WHERE pf.id = ?";
    
    $orderStmt = $db->prepare($orderSql);
    if (!$orderStmt) {
        throw new Exception('Error preparing order query: ' . $db->error);
    }
    
    $orderStmt->bind_param("i", $orderId);
    $orderStmt->execute();
    $orderResult = $orderStmt->get_result();

    if ($orderResult->num_rows === 0) {
        throw new Exception('Order not found with ID: ' . $orderId);
    }

    $orderData = $orderResult->fetch_assoc();

    // Check if user has permission to view this order (same plant or global access)
    if ($userPlant !== null && $orderData['creator_plant'] !== $userPlant) {
        throw new Exception('You do not have permission to view this order from a different plant.');
    }

} catch (Exception $e) {
    $errorMsg = 'Error: ' . $e->getMessage();
    error_log("Error in view_order.php: " . $errorMsg);
    
    // Redirect back to orders page with error
    header('Location: orders.php?error=' . urlencode($errorMsg));
    exit;
}

// Define base URLs
$URLBASE = "https://grammermx.com/Jesus/PruebaDos/";
$URLM = "https://grammermx.com/Mailer/PFMailer/";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight Order #<?php echo $orderId; ?> - Grammer AG</title>
    
    <!-- SEO and Meta -->
    <meta name="description" content="Premium Freight Order Management System - Grammer AG">
    <meta name="author" content="Grammer AG">
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- External CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
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
            orderData: <?php echo json_encode($orderData); ?>,
            user: {
                id: <?php echo $userId; ?>,
                name: '<?php echo $userName; ?>',
                email: '<?php echo $userEmail; ?>',
                role: '<?php echo $userRole; ?>',
                plant: <?php echo $userPlant ? "'$userPlant'" : 'null'; ?>,
                authorizationLevel: <?php echo $authorizationLevel; ?>
            },
            orderId: <?php echo $orderId; ?>
        };
        
        // Legacy support for existing modules
        window.URL = window.PF_CONFIG.baseURL;
        window.URLM = window.PF_CONFIG.mailerURL;
        window.allOrders = [window.PF_CONFIG.orderData];
        window.originalOrders = [window.PF_CONFIG.orderData];
        window.authorizationLevel = window.PF_CONFIG.user.authorizationLevel;
        window.userName = window.PF_CONFIG.user.name;
        window.userID = window.PF_CONFIG.user.id;
        window.userPlant = window.PF_CONFIG.user.plant;
        
        // For session storage compatibility
        sessionStorage.setItem('selectedOrderId', window.PF_CONFIG.orderId);
    </script>
    
    <style>
        /* ===== CSS CUSTOM PROPERTIES ===== */
        :root {
            --primary-color: #1c4481;
            --secondary-color: #2c5aa0;
            --accent-color: #f8f9fa;
            --success-color: #28a745;
            --warning-color: #ffc107;
            --danger-color: #dc3545;
            --text-primary: #2c3e50;
            --text-secondary: #6c757d;
            --border-color: #e9ecef;
            --shadow-light: 0 2px 10px rgba(0,0,0,0.1);
            --shadow-medium: 0 4px 20px rgba(0,0,0,0.15);
            --border-radius: 12px;
            --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ===== BASE STYLES ===== */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            font-size: 16px;
            scroll-behavior: smooth;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }

        /* ===== EMAIL-STYLE LAYOUT ===== */
        .email-container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-medium);
            overflow: hidden;
            position: relative;
        }

        /* ===== COMPACT PROFESSIONAL HEADER ===== */
        .email-header {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            color: white;
            padding: 20px 30px;
            position: relative;
            overflow: hidden;
        }

        .email-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
            opacity: 0.3;
        }

        .email-header-content {
            position: relative;
            z-index: 2;
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 30px;
            align-items: center;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .company-logo {
            width: 50px;
            height: 50px;
            background: rgba(255,255,255,0.15);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
        }

        .company-logo i {
            font-size: 24px;
            color: white;
        }

        .company-name {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.5px;
        }

        .order-info {
            text-align: left;
        }

        .order-title-main {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 5px 0;
            letter-spacing: -0.5px;
        }

        .order-subtitle {
            font-size: 14px;
            opacity: 0.9;
            margin: 0;
        }

        .header-right {
            text-align: right;
        }

        /* ===== COMPACT STATUS SECTION ===== */
        .status-section {
            background: var(--accent-color);
            padding: 20px 30px;
            border-bottom: 1px solid var(--border-color);
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 20px;
            align-items: center;
        }

        .approver-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .approver-avatar {
            width: 45px;
            height: 45px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 16px;
        }

        .approver-details h4 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
        }

        .approver-role {
            margin: 0;
            font-size: 13px;
            color: var(--text-secondary);
        }

        .status-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-pending {
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
            color: #856404;
            animation: pulse-warning 2s infinite;
        }

        .status-completed {
            background: linear-gradient(135deg, #d4edda, #00b894);
            color: #155724;
        }

        @keyframes pulse-warning {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.9; }
        }

        /* ===== COMPACT ACTION BUTTONS ===== */
        .quick-actions {
            display: flex;
            gap: 12px;
        }

        .action-btn-compact {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: var(--transition-smooth);
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .action-btn-compact::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }

        .action-btn-compact:hover::before {
            left: 100%;
        }

        .action-btn-compact:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .btn-approve {
            background: linear-gradient(135deg, var(--success-color), #20c997);
            color: white;
        }

        .btn-approve:hover {
            background: linear-gradient(135deg, #218838, #1ea486);
        }

        .btn-reject {
            background: linear-gradient(135deg, var(--danger-color), #e74c3c);
            color: white;
        }

        .btn-reject:hover {
            background: linear-gradient(135deg, #c82333, #c0392b);
        }

        .btn-pdf {
            background: linear-gradient(135deg, #6f42c1, #8b5cf6);
            color: white;
        }

        .btn-pdf:hover {
            background: linear-gradient(135deg, #5a2d91, #7c3aed);
        }

        .btn-back {
            background: linear-gradient(135deg, #6c757d, #495057);
            color: white;
        }

        .btn-back:hover {
            background: linear-gradient(135deg, #5a6268, #3d4449);
        }

        /* ===== SVG CONTAINER ===== */
        .svg-container {
            padding: 30px;
            background: white;
            min-height: 600px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .svg-content {
            width: 100%;
            max-width: 800px;
            text-align: center;
        }

        .svg-content svg {
            max-width: 100%;
            height: auto;
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-light);
        }

        /* ===== LOADING STATES ===== */
        .loading-spinner {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: var(--text-secondary);
            font-size: 14px;
        }

        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--border-color);
            border-top: 2px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* ===== RESPONSIVE DESIGN ===== */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }

            .email-header-content {
                grid-template-columns: 1fr;
                text-align: center;
                gap: 15px;
            }

            .status-section {
                grid-template-columns: 1fr;
                text-align: center;
                gap: 15px;
            }

            .quick-actions {
                justify-content: center;
                flex-wrap: wrap;
            }

            .action-btn-compact {
                flex: 1;
                min-width: 120px;
            }

            .svg-container {
                padding: 20px;
            }
        }

        /* ===== ADDITIONAL UTILITY CLASSES ===== */
        .hidden {
            display: none !important;
        }

        .fade-in {
            animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
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
                
                <button class="action-btn-compact btn-pdf" onclick="generatePDF()">
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

    <!-- ===== APPLICATION LOGIC ===== -->
    <script type="module">
        import { loadAndPopulateSVG, generatePDF as svgGeneratePDF } from './js/svgOrders.js';
        import { handleApprove, handleReject } from './js/approval.js';

        // ===== INITIALIZATION =====
        document.addEventListener('DOMContentLoaded', function() {
            initializePage();
        });

        /**
         * Initialize the page
         */
        async function initializePage() {
            try {
                // Configure action buttons based on user authorization
                configureActionButtons();
                
                // Load and display SVG content
                await loadSVGContent();
                
                // Set up event listeners
                setupEventListeners();
                
            } catch (error) {
                console.error('Error initializing page:', error);
                showError('Failed to load order details');
            }
        }

        /**
         * Configure visibility of action buttons based on user permissions
         */
        function configureActionButtons() {
            const orderData = window.PF_CONFIG.orderData;
            const userAuthLevel = window.PF_CONFIG.user.authorizationLevel;
            const userPlant = window.PF_CONFIG.user.plant;
            
            const approveBtn = document.getElementById('approveBtn');
            const rejectBtn = document.getElementById('rejectBtn');
            
            // Check if user is the next approver and order is not rejected or fully approved
            const currentApprovalStatus = Number(orderData.approval_status);
            const requiredAuthLevel = Number(orderData.required_auth_level || 7);
            const isNextApprover = currentApprovalStatus === (userAuthLevel - 1);
            const isRejected = currentApprovalStatus === 99;
            const isFullyApproved = currentApprovalStatus >= requiredAuthLevel;
            
            // Check plant permission
            const hasPlantPermission = userPlant === null || userPlant === orderData.creator_plant;
            
            // Show buttons if user can approve/reject
            if (isNextApprover && !isRejected && !isFullyApproved && hasPlantPermission) {
                approveBtn.classList.remove('hidden');
                rejectBtn.classList.remove('hidden');
                
                // Update status badge
                updateStatusBadge('pending');
            } else {
                // Update status badge
                if (isRejected) {
                    updateStatusBadge('rejected');
                } else if (isFullyApproved) {
                    updateStatusBadge('approved');
                } else {
                    updateStatusBadge('waiting');
                }
            }
        }

        /**
         * Update status badge
         */
        function updateStatusBadge(status) {
            const statusSection = document.querySelector('.status-section');
            let badge = statusSection.querySelector('.status-badge');
            
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'status-badge';
                statusSection.appendChild(badge);
            }
            
            switch (status) {
                case 'pending':
                    badge.className = 'status-badge status-pending';
                    badge.textContent = 'Pending Your Approval';
                    break;
                case 'approved':
                    badge.className = 'status-badge status-completed';
                    badge.textContent = 'Fully Approved';
                    break;
                case 'rejected':
                    badge.className = 'status-badge';
                    badge.style.background = 'linear-gradient(135deg, #f8d7da, #e74c3c)';
                    badge.style.color = '#721c24';
                    badge.textContent = 'Rejected';
                    break;
                case 'waiting':
                    badge.className = 'status-badge';
                    badge.style.background = 'linear-gradient(135deg, #d1ecf1, #17a2b8)';
                    badge.style.color = '#0c5460';
                    badge.textContent = 'Pending Other Approval';
                    break;
            }
        }

        /**
         * Load SVG content
         */
        async function loadSVGContent() {
            const loadingSpinner = document.getElementById('loadingSpinner');
            const svgContent = document.getElementById('svgContent');
            
            try {
                // Show loading
                loadingSpinner.classList.remove('hidden');
                svgContent.classList.add('hidden');
                
                // Load SVG with order data
                const orderData = window.PF_CONFIG.orderData;
                await loadAndPopulateSVG(orderData, 'svgContent');
                
                // Hide loading and show content
                loadingSpinner.classList.add('hidden');
                svgContent.classList.remove('hidden');
                
            } catch (error) {
                console.error('Error loading SVG:', error);
                loadingSpinner.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed to load order details';
            }
        }

        /**
         * Set up event listeners
         */
        function setupEventListeners() {
            const approveBtn = document.getElementById('approveBtn');
            const rejectBtn = document.getElementById('rejectBtn');
            
            if (approveBtn) {
                approveBtn.addEventListener('click', handleApprovalClick);
            }
            
            if (rejectBtn) {
                rejectBtn.addEventListener('click', handleRejectionClick);
            }
        }

        /**
         * Handle approval click
         */
        async function handleApprovalClick() {
            try {
                await handleApprove();
                
                // Refresh page to show updated status
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                
            } catch (error) {
                console.error('Error approving order:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to approve order: ' + error.message
                });
            }
        }

        /**
         * Handle rejection click
         */
        async function handleRejectionClick() {
            try {
                await handleReject();
                
                // Refresh page to show updated status
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                
            } catch (error) {
                console.error('Error rejecting order:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to reject order: ' + error.message
                });
            }
        }

        /**
         * Generate PDF
         */
        window.generatePDF = async function() {
            try {
                const orderData = window.PF_CONFIG.orderData;
                await svgGeneratePDF(orderData, `PremiumFreight_Order_${orderData.id}.pdf`);
            } catch (error) {
                console.error('Error generating PDF:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to generate PDF: ' + error.message
                });
            }
        };

        /**
         * Go back to orders page
         */
        window.goBack = function() {
            window.location.href = 'orders.php';
        };

        /**
         * Show error message
         */
        function showError(message) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: message
            });
        }
    </script>
</body>
</html>