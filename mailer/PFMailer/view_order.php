<?php
/**
 * view_order.php - Professional Order Viewer
 * Corporate email-style interface for Premium Freight orders
 * Version: 2.0 - Enhanced with robust PDF generation
 */

// Error handling and logging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/view_order_errors.log');

try {
    // Load dependencies
    require_once __DIR__ . '/config.php';
    require_once 'PFDB.php';
    require_once 'PFmailUtils.php';

    // Verify parameters
    if (!isset($_GET['order']) || !isset($_GET['token'])) {
        if (function_exists('showError')) {
            showError('Required parameters missing. Order ID and token are required.');
        } else {
            die('Error: Required parameters missing. Order ID and token are required.');
        }
        exit;
    }

    $orderId = intval($_GET['order']);
    $token = $_GET['token'];

    // Validate basic parameters
    if ($orderId <= 0) {
        if (function_exists('showError')) {
            showError('Invalid order ID.');
        } else {
            die('Error: Invalid order ID.');
        }
        exit;
    }

    if (empty($token)) {
        if (function_exists('showError')) {
            showError('Empty token.');
        } else {
            die('Error: Empty token.');
        }
        exit;
    }

    // Database connection
    $con = new LocalConector();
    $db = $con->conectar();

    if (!$db) {
        throw new Exception('Could not connect to database');
    }

    // Verify token and get data
    $sql = "SELECT EAT.*, U.name as approver_name 
            FROM EmailActionTokens EAT 
            INNER JOIN User U ON EAT.user_id = U.id 
            WHERE EAT.token = ? AND EAT.order_id = ?";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception('Error preparing token query: ' . $db->error);
    }
    
    $stmt->bind_param("si", $token, $orderId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        if (function_exists('showError')) {
            showError('Invalid or expired token for the specified order.');
        } else {
            die('Error: Invalid or expired token for the specified order.');
        }
        exit;
    }

    $tokenData = $result->fetch_assoc();

    // Get BOTH tokens (approve and reject) for this order and user
    $tokensSQL = "SELECT * FROM EmailActionTokens 
                  WHERE order_id = ? AND user_id = ? AND is_used = 0 
                  ORDER BY action";
    
    $tokensStmt = $db->prepare($tokensSQL);
    $tokensStmt->bind_param("ii", $orderId, $tokenData['user_id']);
    $tokensStmt->execute();
    $tokensResult = $tokensStmt->get_result();
    
    $approveToken = null;
    $rejectToken = null;
    
    while ($row = $tokensResult->fetch_assoc()) {
        if ($row['action'] === 'approve') {
            $approveToken = $row['token'];
        } elseif ($row['action'] === 'reject') {
            $rejectToken = $row['token'];
        }
    }

    // Get complete order details for SVG
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
                WHERE pf.id = ?";
    
    $orderStmt = $db->prepare($orderSql);
    if (!$orderStmt) {
        throw new Exception('Error preparing order query: ' . $db->error);
    }
    
    $orderStmt->bind_param("i", $orderId);
    $orderStmt->execute();
    $orderResult = $orderStmt->get_result();

    if ($orderResult->num_rows === 0) {
        if (function_exists('showError')) {
            showError('Order not found with ID: ' . $orderId);
        } else {
            die('Error: Order not found with ID: ' . $orderId);
        }
        exit;
    }

    $orderData = $orderResult->fetch_assoc();

    // Verify required constants
    if (!defined('URLM')) {
        throw new Exception('URLM is not defined');
    }

    if (!defined('URLPF')) {
        throw new Exception('URLPF is not defined');
    }

    // URLs for actions with specific tokens
    $approveUrl = $approveToken ? URLM . "PFmailSingleAction.php?action=approve&token=" . urlencode($approveToken) : null;
    $rejectUrl = $rejectToken ? URLM . "PFmailSingleAction.php?action=reject&token=" . urlencode($rejectToken) : null;

} catch (Exception $e) {
    $errorMsg = 'Error: ' . $e->getMessage();
    error_log("Error in view_order.php: " . $errorMsg);
    
    if (function_exists('showError')) {
        showError($errorMsg);
    } else {
        die($errorMsg);
    }
    exit;
} catch (Error $e) {
    $errorMsg = 'Fatal error: ' . $e->getMessage();
    error_log("Fatal error in view_order.php: " . $errorMsg);
    
    if (function_exists('showError')) {
        showError($errorMsg);
    } else {
        die($errorMsg);
    }
    exit;
}
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
        // ===== GLOBAL CONFIGURATION =====
        window.PF_CONFIG = {
            // URLs
            URLPF: '<?php echo URLPF; ?>',
            URLM: '<?php echo URLM; ?>',
            
            // Order data
            orderData: <?php echo json_encode($orderData); ?>,
            orderId: <?php echo $orderId; ?>,
            
            // User context
            user: {
                id: <?php echo $tokenData['user_id']; ?>,
                name: '<?php echo htmlspecialchars($tokenData['approver_name']); ?>',
                tokenUsed: <?php echo $tokenData['is_used'] ? 'true' : 'false'; ?>
            },
            
            // Action URLs
            actions: {
                approve: '<?php echo $approveUrl; ?>',
                reject: '<?php echo $rejectUrl; ?>',
                hasApprove: <?php echo $approveToken ? 'true' : 'false'; ?>,
                hasReject: <?php echo $rejectToken ? 'true' : 'false'; ?>
            }
        };
        
        // Legacy support
        window.URL = window.PF_CONFIG.URLPF;
        window.URLM = window.PF_CONFIG.URLM;
        window.allOrders = [window.PF_CONFIG.orderData];
        window.originalOrders = [window.PF_CONFIG.orderData];
        window.authorizationLevel = window.PF_CONFIG.user.id;
        window.userName = window.PF_CONFIG.user.name;
        window.approveUrl = window.PF_CONFIG.actions.approve;
        window.rejectUrl = window.PF_CONFIG.actions.reject;
        window.hasApproveToken = window.PF_CONFIG.actions.hasApprove;
        window.hasRejectToken = window.PF_CONFIG.actions.hasReject;
        window.tokenUsed = window.PF_CONFIG.user.tokenUsed;
    </script>
    
    <style>
        /* ===== CSS CUSTOM PROPERTIES ===== */
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
            --max-width: 1200px;
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

        /* ===== BASE STYLES ===== */
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

        /* ===== EMAIL-STYLE LAYOUT ===== */
        .email-container {
            max-width: var(--max-width);
            margin: 0 auto;
            background: var(--white);
            min-height: 100vh;
            box-shadow: var(--shadow-xl);
            position: relative;
            overflow: hidden;
        }

        /* ===== COMPACT PROFESSIONAL HEADER ===== */
        .email-header {
            background: linear-gradient(135deg, var(--grammer-blue) 0%, var(--grammer-dark-blue) 100%);
            color: var(--white);
            padding: var(--spacing-sm) var(--spacing-xl);
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
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
            opacity: 0.2;
        }

        .email-header-content {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--spacing-md);
            min-height: 60px;
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
            font-size: 1.25rem;
            opacity: 0.9;
        }

        .company-name {
            font-size: 1rem;
            font-weight: 600;
            letter-spacing: -0.025em;
        }

        .order-info {
            display: flex;
            flex-direction: column;
        }

        .order-title-main {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.125rem;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            letter-spacing: -0.025em;
            line-height: 1.2;
        }

        .order-subtitle {
            font-size: 0.8rem;
            opacity: 0.8;
            font-weight: 400;
            line-height: 1;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
        }

        /* ===== COMPACT STATUS SECTION ===== */
        .status-section {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: var(--border-radius);
            padding: var(--spacing-xs) var(--spacing-sm);
        }

        .approver-info {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
        }

        .approver-avatar {
            width: 28px;
            height: 28px;
            background: var(--white);
            color: var(--grammer-blue);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 600;
            box-shadow: var(--shadow-sm);
        }

        .approver-details h4 {
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 0;
            line-height: 1.2;
        }

        .approver-role {
            font-size: 0.7rem;
            opacity: 0.8;
            line-height: 1;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: var(--spacing-xs);
            padding: var(--spacing-xs) var(--spacing-sm);
            border-radius: 9999px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            transition: var(--transition-normal);
        }

        .status-pending {
            background: var(--warning);
            color: var(--white);
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
            animation: pulse-warning 2s infinite;
        }

        .status-completed {
            background: var(--success);
            color: var(--white);
        }

        @keyframes pulse-warning {
            0%, 100% { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2); }
            50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.1); }
        }

        /* ===== COMPACT ACTION BUTTONS ===== */
        .quick-actions {
            display: flex;
            gap: var(--spacing-xs);
        }

        .action-btn-compact {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--spacing-xs);
            padding: var(--spacing-xs) var(--spacing-sm);
            background: var(--white);
            color: var(--gray-700);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: var(--border-radius);
            font-size: 0.75rem;
            font-weight: 500;
            text-decoration: none;
            transition: var(--transition-normal);
            cursor: pointer;
            box-shadow: var(--shadow-sm);
            min-width: 70px;
            height: 32px;
            position: relative;
            overflow: hidden;
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
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }

        .btn-approve {
            border-color: var(--success);
            color: var(--success);
        }

        .btn-approve:hover {
            background: var(--success);
            color: var(--white);
        }

        .btn-reject {
            border-color: var(--danger);
            color: var,--danger;
        }

        .btn-reject:hover {
            background: var(--danger);
            color: var(--white);
        }

        .btn-download {
            border-color: var(--info);
            color: var(--info);
        }

        .btn-download:hover {
            background: var(--info);
            color: var(--white);
        }

        /* ===== EMAIL BODY ===== */
        .email-body {
            padding: var(--spacing-xl);
        }

        .document-section {
            background: var(--white);
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-lg);
            padding: var(--spacing-xl);
            margin-bottom: var(--spacing-xl);
            border: 1px solid var(--gray-200);
            position: relative;
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            margin-bottom: var(--spacing-xl);
            padding-bottom: var(--spacing-lg);
            border-bottom: 2px solid var(--gray-100);
        }

        .section-header i {
            font-size: 1.5rem;
            color: var(--grammer-blue);
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--gray-800);
            margin: 0;
        }

        /* ===== SVG CONTAINER ===== */
        .svg-container {
            background: var(--white);
            border: 2px dashed var(--gray-200);
            border-radius: var(--border-radius-lg);
            padding: var(--spacing-xl);
            min-height: 600px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            transition: var(--transition-normal);
        }

        .svg-container:hover {
            border-color: var(--grammer-light-blue);
            background: var(--gray-50);
        }

        .svg-container svg {
            max-width: 100%;
            height: auto;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-md);
            transition: var(--transition-normal);
        }

        .svg-container:hover svg {
            transform: scale(1.02);
        }

        /* ===== LOADING STATES ===== */
        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--spacing-lg);
            color: var(--gray-500);
            font-size: 1.1rem;
        }

        .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid var(--gray-200);
            border-top: 4px solid var(--grammer-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .loading-dots {
            display: flex;
            gap: var(--spacing-xs);
        }

        .loading-dot {
            width: 8px;
            height: 8px;
            background: var(--grammer-blue);
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
        }

        .loading-dot:nth-child(1) { animation-delay: -0.32s; }
        .loading-dot:nth-child(2) { animation-delay: -0.16s; }
        .loading-dot:nth-child(3) { animation-delay: 0s; }

        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }

        /* ===== ERROR STATES ===== */
        .error-state {
            background: linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%);
            color: var(--danger);
            padding: var(--spacing-xl);
            border-radius: var(--border-radius);
            border-left: 4px solid var(--danger);
            margin: var(--spacing-lg) 0;
            text-align: center;
        }

        .error-state i {
            font-size: 1.5rem;
            margin-right: var(--spacing-md);
        }

        /* ===== PROFESSIONAL FOOTER ===== */
        .email-footer {
            background: var(--gray-100);
            padding: var(--spacing-lg);
            border-top: 1px solid var(--gray-200);
            text-align: center;
        }

        .footer-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--spacing-sm);
            color: var(--gray-600);
        }

        .footer-logo {
            font-size: 1rem;
            font-weight: 600;
            color: var(--grammer-blue);
        }

        /* ===== RESPONSIVE DESIGN ===== */
        @media (max-width: 768px) {
            .email-container {
                margin: 0;
                box-shadow: none;
            }

            .email-header {
                padding: var(--spacing-sm);
            }

            .email-header-content {
                flex-direction: column;
                align-items: flex-start;
                gap: var(--spacing-sm);
                min-height: auto;
            }

            .header-left {
                gap: var(--spacing-md);
            }

            .order-title-main {
                font-size: 1.25rem;
            }

            .header-right {
                width: 100%;
                justify-content: space-between;
            }

            .status-section {
                flex: 1;
                justify-content: center;
            }

            .quick-actions {
                flex-shrink: 0;
            }

            .email-body {
                padding: var(--spacing-lg);
            }

            .section-header {
                flex-direction: column;
                text-align: center;
            }

            .action-btn-compact {
                min-width: 60px;
                font-size: 0.7rem;
            }
        }

        /* ===== ANIMATION CLASSES ===== */
        .fade-in {
            animation: fadeIn 0.6s ease-out forwards;
        }

        .slide-up {
            animation: slideUp 0.6s ease-out forwards;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* ===== ACCESSIBILITY ===== */
        .action-btn-compact:focus,
        .footer-link:focus {
            outline: 2px solid var(--grammer-blue);
            outline-offset: 2px;
        }

        /* ===== SWEETALERT2 CUSTOMIZATION ===== */
        .swal2-popup {
            border-radius: var(--border-radius-lg) !important;
            box-shadow: var(--shadow-xl) !important;
        }

        .swal2-title {
            color: var(--gray-800) !important;
        }

        .swal2-html-container {
            color: var(--gray-600) !important;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- ===== COMPACT PROFESSIONAL EMAIL HEADER ===== -->
        <header class="email-header">
            <div class="email-header-content">
                <div class="header-left">
                    <div class="company-logo fade-in">
                        <i class="fas fa-industry"></i>
                        <div class="company-name">Grammer AG</div>
                    </div>
                    
                    <div class="order-info slide-up">
                        <h1 class="order-title-main">Order #<?php echo $orderId; ?></h1>
                        <p class="order-subtitle">Premium Freight Request</p>
                    </div>
                </div>
                
                <div class="header-right slide-up">
                    <div class="status-section">
                        <div class="approver-info">
                            <div class="approver-avatar">
                                <?php echo strtoupper(substr($tokenData['approver_name'], 0, 1)); ?>
                            </div>
                            <div class="approver-details">
                                <h4><?php echo htmlspecialchars($tokenData['approver_name']); ?></h4>
                                <div class="approver-role">Reviewer</div>
                            </div>
                        </div>
                        
                        <?php if ($tokenData['is_used'] == 0): ?>
                            <div class="status-badge status-pending">
                                <i class="fas fa-clock"></i>
                                <span>Pending</span>
                            </div>
                        <?php else: ?>
                            <div class="status-badge status-completed">
                                <i class="fas fa-check-circle"></i>
                                <span>Complete</span>
                            </div>
                        <?php endif; ?>
                    </div>
                    
                    <div class="quick-actions">
                        <?php if ($tokenData['is_used'] == 0 && $approveToken): ?>
                        <button class="action-btn-compact btn-approve" onclick="confirmAction('approve')">
                            <i class="fas fa-check"></i>
                            <span>Approve</span>
                        </button>
                        <?php endif; ?>
                        
                        <?php if ($tokenData['is_used'] == 0 && $rejectToken): ?>
                        <button class="action-btn-compact btn-reject" onclick="confirmAction('reject')">
                            <i class="fas fa-times"></i>
                            <span>Reject</span>
                        </button>
                        <?php endif; ?>
                        
                        <button class="action-btn-compact btn-download" onclick="downloadPDF()">
                            <i class="fas fa-download"></i>
                            <span>PDF</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- ===== EMAIL BODY ===== -->
        <main class="email-body">
            <div class="document-section fade-in">
                <div class="section-header">
                    <i class="fas fa-file-contract"></i>
                    <h2 class="section-title">Order Documentation</h2>
                </div>
                
                <div class="svg-container" id="svgContainer">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <div style="font-weight: 600;">Processing Document</div>
                        <div style="font-size: 0.9rem; opacity: 0.8;">Please wait while we prepare your order details</div>
                        <div class="loading-dots">
                            <div class="loading-dot"></div>
                            <div class="loading-dot"></div>
                            <div class="loading-dot"></div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- ===== PROFESSIONAL FOOTER ===== -->
        <footer class="email-footer">
            <div class="footer-content">
                <div class="footer-logo">Grammer AG</div>
                <p style="font-size: 0.7rem; color: var(--gray-500);">
                    © <?php echo date('Y'); ?> Grammer AG. All rights reserved.
                </p>
            </div>
        </footer>
    </div>

    <!-- ===== ENHANCED APPLICATION LOGIC ===== -->
    <script>
        // ===== LIBRARY MANAGEMENT SYSTEM =====
        class LibraryManager {
            constructor() {
                this.loadedLibraries = new Set();
                this.loadingPromises = new Map();
            }

            async loadLibrary(url, checkFunction, fallbackUrl = null) {
                if (this.loadedLibraries.has(url)) {
                    return Promise.resolve();
                }

                if (this.loadingPromises.has(url)) {
                    return this.loadingPromises.get(url);
                }

                const promise = this._loadScript(url, checkFunction, fallbackUrl);
                this.loadingPromises.set(url, promise);
                
                try {
                    await promise;
                    this.loadedLibraries.add(url);
                    console.log(`✅ Successfully loaded: ${url}`);
                } catch (error) {
                    this.loadingPromises.delete(url);
                    throw error;
                }

                return promise;
            }

            _loadScript(url, checkFunction, fallbackUrl = null) {
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = url;
                    script.async = true;
                    
                    script.onload = () => {
                        setTimeout(() => {
                            if (checkFunction()) {
                                resolve();
                            } else if (fallbackUrl) {
                                console.log(`⚠️ Primary source failed, trying fallback: ${fallbackUrl}`);
                                this._loadScript(fallbackUrl, checkFunction)
                                    .then(resolve)
                                    .catch(reject);
                            } else {
                                reject(new Error(`Library not available after loading: ${url}`));
                            }
                        }, 500);
                    };
                    
                    script.onerror = () => {
                        if (fallbackUrl) {
                            console.log(`❌ Failed to load ${url}, trying fallback: ${fallbackUrl}`);
                            this._loadScript(fallbackUrl, checkFunction)
                                .then(resolve)
                                .catch(reject);
                        } else {
                            reject(new Error(`Failed to load script: ${url}`));
                        }
                    };
                    
                    document.head.appendChild(script);
                });
            }
        }

        // ===== APPLICATION INITIALIZATION =====
        class PremiumFreightViewer {
            constructor() {
                this.libraryManager = new LibraryManager();
                this.isInitialized = false;
            }

            async initialize() {
                if (this.isInitialized) return;

                try {
                    console.log('🚀 Initializing Premium Freight Order Viewer v2.0...');
                    
                    await this.loadDependencies();
                    await this.loadSVGModule();
                    
                    this.setupEventHandlers();
                    this.applyAnimations();
                    await this.loadOrderDocument();
                    
                    this.isInitialized = true;
                    this.logSystemInfo();
                    
                    console.log('✅ Premium Freight Order Viewer initialized successfully');
                    
                } catch (error) {
                    console.error('❌ Application initialization failed:', error);
                    this.showError(error);
                }
            }

            async loadDependencies() {
                const dependencies = [
                    {
                        url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
                        check: () => typeof html2canvas !== 'undefined',
                        fallback: `${window.PF_CONFIG.URLPF}js/html2canvas.min.js`
                    },
                    {
                        url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                        check: () => typeof window.jsPDF !== 'undefined' || 
                                    (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') ||
                                    typeof jsPDF !== 'undefined',
                        fallback: `${window.PF_CONFIG.URLPF}js/pdfmin/jspdf.min.js`
                    }
                ];

                for (const dep of dependencies) {
                    await this.libraryManager.loadLibrary(dep.url, dep.check, dep.fallback);
                }

                // Normalize jsPDF reference
                if (typeof window.jsPDF === 'undefined' && typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
                    window.jsPDF = window.jspdf.jsPDF;
                }
            }

            async loadSVGModule() {
                try {
                    const { generatePDF, loadAndPopulateSVG } = await import(`${window.PF_CONFIG.URLPF}js/svgOrders.js`);
                    
                    window.generatePDF = generatePDF;
                    window.loadAndPopulateSVG = loadAndPopulateSVG;
                    
                    console.log('✅ SVG module imported successfully');
                } catch (error) {
                    throw new Error(`SVG module import failed: ${error.message}`);
                }
            }

            setupEventHandlers() {
                // Global error handlers
                window.addEventListener('error', (event) => {
                    console.error('💥 Global error caught:', event.error);
                });

                window.addEventListener('unhandledrejection', (event) => {
                    console.error('💥 Unhandled promise rejection:', event.reason);
                });

                // Make functions globally available
                window.confirmAction = this.confirmAction.bind(this);
                window.downloadPDF = this.downloadPDF.bind(this);
                window.loadOrderSVG = this.loadOrderDocument.bind(this);
            }

            applyAnimations() {
                const animatedElements = document.querySelectorAll('.fade-in, .slide-up');
                animatedElements.forEach((element, index) => {
                    setTimeout(() => {
                        element.style.animationDelay = `${index * 0.1}s`;
                        element.classList.add('animated');
                    }, 50);
                });
            }

            async loadOrderDocument() {
                const container = document.getElementById('svgContainer');
                
                try {
                    console.log('🚀 Loading order document...');
                    
                    this.showLoadingState(container);
                    
                    if (typeof window.loadAndPopulateSVG !== 'function') {
                        throw new Error('SVG loading module not properly initialized');
                    }
                    
                    await window.loadAndPopulateSVG(window.PF_CONFIG.orderData, 'svgContainer');
                    
                    console.log('✅ Document loaded and rendered successfully');
                    
                    // Add animation to loaded SVG
                    setTimeout(() => {
                        const svgElement = container.querySelector('svg');
                        if (svgElement) {
                            svgElement.style.animation = 'fadeIn 0.5s ease-out';
                            svgElement.style.animationFillMode = 'forwards';
                        }
                    }, 100);
                    
                } catch (error) {
                    console.error('❌ Error loading order document:', error);
                    this.showDocumentError(container, error);
                }
            }

            showLoadingState(container) {
                container.innerHTML = `
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <div style="font-weight: 600;">Processing Document</div>
                        <div style="font-size: 0.9rem; opacity: 0.8;">Please wait while we prepare your order details</div>
                        <div class="loading-dots">
                            <div class="loading-dot"></div>
                            <div class="loading-dot"></div>
                            <div class="loading-dot"></div>
                        </div>
                    </div>
                `;
            }

            showDocumentError(container, error) {
                container.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Unable to Load Document</strong>
                            <p style="margin-top: 0.5rem; font-size: 0.9rem;">
                                We encountered an issue while loading your order details.
                            </p>
                            <div style="background: #FEF2F2; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--danger); text-align: left; margin: 1rem 0;">
                                <strong>Error Details:</strong><br>
                                <code style="font-size: 0.8rem; color: var(--gray-600);">${error.message}</code>
                            </div>
                            <button class="action-btn-compact btn-download" onclick="pfViewer.loadOrderDocument()" style="margin-top: 1rem;">
                                <i class="fas fa-refresh"></i>
                                <span>Retry Loading</span>
                            </button>
                        </div>
                    </div>
                `;
            }

            showError(error) {
                const container = document.getElementById('svgContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="error-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>
                                <strong>Application Error</strong>
                                <p style="margin-top: 0.5rem; font-size: 0.9rem;">
                                    Required libraries failed to load. This may be due to network issues or content blockers.
                                </p>
                                <div style="background: #FEF2F2; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--danger); text-align: left; margin: 1rem 0;">
                                    <strong>Technical Details:</strong><br>
                                    <code style="font-size: 0.8rem; color: var(--gray-600);">${error.message}</code>
                                </div>
                                <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                                    <button class="action-btn-compact btn-download" onclick="location.reload()">
                                        <i class="fas fa-refresh"></i>
                                        <span>Retry</span>
                                    </button>
                                    <button class="action-btn-compact btn-download" onclick="window.location.href = window.location.href.split('?')[0] + '?order=${window.PF_CONFIG.orderId}&token=' + new URLSearchParams(window.location.search).get('token') + '&cache=' + Date.now()">
                                        <i class="fas fa-sync-alt"></i>
                                        <span>Force Reload</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }

            confirmAction(action) {
                const actionText = action === 'approve' ? 'approve' : 'reject';
                const actionUrl = action === 'approve' ? window.PF_CONFIG.actions.approve : window.PF_CONFIG.actions.reject;
                
                if (!actionUrl) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Action Unavailable',
                        text: `The ${actionText} action is not available for this request.`,
                        confirmButtonColor: 'var(--grammer-blue)',
                        customClass: { popup: 'swal2-enhanced' }
                    });
                    return;
                }
                
                const config = {
                    approve: { color: 'var(--success)', icon: 'success' },
                    reject: { color: 'var(--danger)', icon: 'warning' }
                };
                
                Swal.fire({
                    title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Order?`,
                    html: `
                        <div style="text-align: left; background: var(--gray-50); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                            <div><strong>Order ID:</strong> #${window.PF_CONFIG.orderId}</div>
                            <div><strong>Action:</strong> <span style="color: ${config[action].color}; font-weight: 600;">${actionText.toUpperCase()}</span></div>
                            <div><strong>Approver:</strong> ${window.PF_CONFIG.user.name}</div>
                            <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
                        </div>
                        <div style="background: #FEF3CD; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--warning);">
                            <strong>⚠️ Important:</strong> This action cannot be undone and will be permanently recorded.
                        </div>
                    `,
                    icon: config[action].icon,
                    showCancelButton: true,
                    confirmButtonColor: config[action].color,
                    cancelButtonColor: 'var(--gray-500)',
                    confirmButtonText: `✓ Confirm ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
                    cancelButtonText: '✕ Cancel',
                    customClass: {
                        popup: 'swal2-enhanced',
                        confirmButton: 'swal2-confirm-enhanced',
                        cancelButton: 'swal2-cancel-enhanced'
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        Swal.fire({
                            title: 'Processing Request...',
                            text: `Processing your ${actionText} request`,
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            customClass: { popup: 'swal2-enhanced' },
                            didOpen: () => Swal.showLoading()
                        });
                        
                        setTimeout(() => {
                            window.location.href = actionUrl;
                        }, 1500);
                    }
                });
            }

            async downloadPDF() {
                try {
                    Swal.fire({
                        title: 'Generating PDF...',
                        text: 'Converting document to PDF format',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        customClass: { popup: 'swal2-enhanced' },
                        didOpen: () => Swal.showLoading()
                    });

                    const svgContainer = document.getElementById('svgContainer');
                    const svgElement = svgContainer.querySelector('svg');
                    
                    if (!svgElement) {
                        throw new Error('No SVG document found to convert');
                    }

                    const svgRect = svgElement.getBoundingClientRect();
                    const svgWidth = svgRect.width || 800;
                    const svgHeight = svgRect.height || 600;

                    // Method 1: Try html2canvas
                    try {
                        const canvas = await html2canvas(svgContainer, {
                            backgroundColor: '#ffffff',
                            scale: 2,
                            useCORS: true,
                            allowTaint: true,
                            width: svgWidth,
                            height: svgHeight,
                            scrollX: 0,
                            scrollY: 0,
                            windowWidth: svgWidth,
                            windowHeight: svgHeight
                        });

                        const pdf = new window.jsPDF({
                            orientation: svgWidth > svgHeight ? 'landscape' : 'portrait',
                            unit: 'px',
                            format: [svgWidth, svgHeight]
                        });

                        const imgData = canvas.toDataURL('image/png', 1.0);
                        pdf.addImage(imgData, 'PNG', 0, 0, svgWidth, svgHeight);

                        const fileName = `PF_${window.PF_CONFIG.orderId}.pdf`;
                        pdf.save(fileName);

                        Swal.fire({
                            icon: 'success',
                            title: 'PDF Generated!',
                            text: `Document saved as: ${fileName}`,
                            confirmButtonColor: 'var(--grammer-blue)',
                            customClass: { popup: 'swal2-enhanced' }
                        });

                    } catch (canvasError) {
                        console.log('html2canvas failed, trying alternative method...', canvasError);
                        throw canvasError;
                    }

                } catch (error) {
                    console.error('Error generating PDF:', error);
                    
                    // Alternative method: Print dialog
                    try {
                        const svgContainer = document.getElementById('svgContainer');
                        const svgElement = svgContainer.querySelector('svg');
                        
                        if (!svgElement) {
                            throw new Error('No SVG found for alternative method');
                        }

                        const printWindow = window.open('', '_blank');
                        printWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>PF_${window.PF_CONFIG.orderId}</title>
                                <style>
                                    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                                    svg { max-width: 100%; height: auto; }
                                    @media print {
                                        body { margin: 0; padding: 0; }
                                    }
                                </style>
                            </head>
                            <body>
                                ${svgElement.outerHTML}
                                <script>
                                    window.onload = function() {
                                        window.print();
                                        setTimeout(() => window.close(), 1000);
                                    }
                                <\/script>
                            </body>
                            </html>
                        `);
                        printWindow.document.close();

                        Swal.fire({
                            icon: 'info',
                            title: 'Print Dialog Opened',
                            html: `
                                <div style="text-align: left;">
                                    <p>A print dialog has been opened in a new window.</p>
                                    <p><strong>To save as PDF:</strong></p>
                                    <ol style="text-align: left; margin: 1rem 0;">
                                        <li>In the print dialog, select "Save as PDF" as destination</li>
                                        <li>Choose your preferred settings</li>
                                        <li>Click "Save" to download the PDF</li>
                                    </ol>
                                </div>
                            `,
                            confirmButtonColor: 'var(--grammer-blue)',
                            customClass: { popup: 'swal2-enhanced' }
                        });

                    } catch (altError) {
                        console.error('Alternative method also failed:', altError);
                        
                        Swal.fire({
                            icon: 'error',
                            title: 'PDF Generation Failed',
                            html: `
                                <div style="text-align: left;">
                                    <p>Unable to generate PDF document automatically.</p>
                                    <div style="background: #FEF2F2; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                                        <strong>Primary Error:</strong><br>
                                        <code style="font-size: 0.8rem;">${error.message}</code>
                                    </div>
                                    <div style="background: #F0F9FF; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--info);">
                                        <strong>💡 Manual Solution:</strong><br>
                                        <p style="margin: 0.5rem 0;">Use your browser's print function:</p>
                                        <ol style="margin: 0.5rem 0; padding-left: 1.5rem;">
                                            <li>Press <kbd>Ctrl+P</kbd> (or Cmd+P on Mac)</li>
                                            <li>Select "Save as PDF" as destination</li>
                                            <li>Click "Save"</li>
                                        </ol>
                                    </div>
                                </div>
                            `,
                            confirmButtonColor: 'var(--grammer-blue)',
                            customClass: { popup: 'swal2-enhanced' }
                        });
                    }
                }
            }

            logSystemInfo() {
                console.group('🔧 System Information');
                console.log('🌐 URLs:', { 
                    URLPF: window.PF_CONFIG.URLPF, 
                    URLM: window.PF_CONFIG.URLM 
                });
                console.log('📋 Order Data:', window.PF_CONFIG.orderData);
                console.log('🔑 Token Information:', window.PF_CONFIG.actions);
                console.log('📚 Library Status:', { 
                    html2canvas: typeof html2canvas !== 'undefined', 
                    jsPDF: typeof window.jsPDF !== 'undefined',
                    svgModule: typeof window.loadAndPopulateSVG !== 'undefined'
                });
                console.log('👤 User Context:', window.PF_CONFIG.user);
                console.groupEnd();
            }
        }

        // ===== INITIALIZE APPLICATION =====
        const pfViewer = new PremiumFreightViewer();

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => pfViewer.initialize());
        } else {
            pfViewer.initialize();
        }

        // Make instance globally available for debugging
        window.pfViewer = pfViewer;

        // Global function shortcuts for compatibility
        function confirmAction(action) {
            return pfViewer.confirmAction(action);
        }

        function downloadPDF() {
            return pfViewer.downloadPDF();
        }
    </script>
</body>
</html>