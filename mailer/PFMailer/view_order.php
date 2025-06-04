<?php
/**
 * view_order.php - Professional Order Viewer
 * Corporate email-style interface for Premium Freight orders
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
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- External CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- External JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Global Variables -->
    <script>
        // Global variables for modules
        window.URL = '<?php echo URLPF; ?>';
        window.URLM = '<?php echo URLM; ?>';
        
        // Order data
        window.allOrders = [<?php echo json_encode($orderData); ?>];
        window.originalOrders = [<?php echo json_encode($orderData); ?>];
        window.authorizationLevel = <?php echo $tokenData['user_id']; ?>;
        window.userName = '<?php echo htmlspecialchars($tokenData['approver_name']); ?>';
        
        // Action URLs with specific tokens
        window.approveUrl = '<?php echo $approveUrl; ?>';
        window.rejectUrl = '<?php echo $rejectUrl; ?>';
        
        // Token states
        window.hasApproveToken = <?php echo $approveToken ? 'true' : 'false'; ?>;
        window.hasRejectToken = <?php echo $rejectToken ? 'true' : 'false'; ?>;
        window.tokenUsed = <?php echo $tokenData['is_used'] ? 'true' : 'false'; ?>;
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

        .footer-links {
            display: flex;
            gap: var(--spacing-md);
            flex-wrap: wrap;
            justify-content: center;
        }

        .footer-link {
            color: var(--gray-500);
            text-decoration: none;
            font-size: 0.8rem;
            transition: var(--transition-fast);
        }

        .footer-link:hover {
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

    <!-- ===== ENHANCED LIBRARY LOADING & APPLICATION LOGIC ===== -->
    <script>
        // ===== ENHANCED LIBRARY LOADING WITH ROBUST ERROR HANDLING =====
        function loadLibrary(url, checkFunction, fallbackUrl = null) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => {
                    // Enhanced timeout for library initialization
                    setTimeout(() => {
                        if (checkFunction()) {
                            console.log(`✅ Successfully loaded: ${url}`);
                            resolve();
                        } else if (fallbackUrl) {
                            console.log(`⚠️ Primary source failed, trying fallback: ${fallbackUrl}`);
                            loadLibrary(fallbackUrl, checkFunction)
                                .then(resolve)
                                .catch(reject);
                        } else {
                            reject(new Error(`Library not available after loading: ${url}`));
                        }
                    }, 500); // Increased timeout for better reliability
                };
                script.onerror = () => {
                    if (fallbackUrl) {
                        console.log(`❌ Failed to load ${url}, trying fallback: ${fallbackUrl}`);
                        loadLibrary(fallbackUrl, checkFunction)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        reject(new Error(`Failed to load script: ${url}`));
                    }
                };
                document.head.appendChild(script);
            });
        }

        // ===== ENHANCED APPLICATION INITIALIZATION =====
        async function initializeApp() {
            try {
                console.log('🚀 Initializing Premium Freight Order Viewer...');
                
                // Load html2canvas with enhanced error checking
                await loadLibrary(
                    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
                    () => typeof html2canvas !== 'undefined',
                    '<?php echo URLPF; ?>js/html2canvas.min.js'
                );
                
                // Load jsPDF with multiple fallback strategies
                await loadLibrary(
                    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                    () => {
                        // Enhanced jsPDF detection for multiple versions
                        return typeof window.jsPDF !== 'undefined' || 
                               (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') ||
                               typeof jsPDF !== 'undefined';
                    },
                    '<?php echo URLPF; ?>js/pdfmin/jspdf.min.js'
                );
                
                // Normalize jsPDF reference for cross-version compatibility
                if (typeof window.jsPDF === 'undefined' && typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
                    window.jsPDF = window.jspdf.jsPDF;
                }
                
                console.log('✅ All dependencies loaded successfully');
                console.log('📚 Library status check:', {
                    'html2canvas': typeof html2canvas !== 'undefined',
                    'window.jsPDF': typeof window.jsPDF !== 'undefined',
                    'window.jspdf.jsPDF': typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined'
                });
                
                // Import and initialize SVG module
                try {
                    const { generatePDF, loadAndPopulateSVG } = await import('<?php echo URLPF; ?>js/svgOrders.js');
                    
                    // Make functions globally available
                    window.generatePDF = generatePDF;
                    window.loadAndPopulateSVG = loadAndPopulateSVG;
                    
                    console.log('✅ SVG module imported successfully');
                } catch (moduleError) {
                    console.error('❌ Failed to import SVG module:', moduleError);
                    throw new Error(`SVG module import failed: ${moduleError.message}`);
                }
                
                // Initialize the application
                initializeOrderViewer();
                
            } catch (error) {
                console.error('❌ Application initialization failed:', error);
                showDependencyError(error);
            }
        }

        // ===== ENHANCED ERROR DISPLAY =====
        function showDependencyError(error) {
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
                                <button class="action-btn-compact btn-download" onclick="window.location.href = window.location.href.split('?')[0] + '?order=<?php echo $orderId; ?>&token=<?php echo $token; ?>&cache=' + Date.now()">
                                    <i class="fas fa-sync-alt"></i>
                                    <span>Force Reload</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        // ===== ENHANCED SVG LOADING =====
        async function loadOrderSVG() {
            const container = document.getElementById('svgContainer');
            
            try {
                console.log('🚀 Loading order document...');
                
                // Show enhanced loading state
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
                
                const orderData = window.allOrders[0];
                console.log('📦 Processing order data:', orderData);
                
                // Verify SVG loading function is available
                if (typeof window.loadAndPopulateSVG !== 'function') {
                    throw new Error('SVG loading module not properly initialized');
                }
                
                // Load and populate SVG
                await window.loadAndPopulateSVG(orderData, 'svgContainer');
                
                console.log('✅ Document loaded and rendered successfully');
                
                // Add subtle animation to the loaded SVG
                setTimeout(() => {
                    const svgElement = container.querySelector('svg');
                    if (svgElement) {
                        svgElement.style.animation = 'fadeIn 0.5s ease-out';
                        svgElement.style.animationFillMode = 'forwards';
                    }
                }, 100);
                
            } catch (error) {
                console.error('❌ Error loading order document:', error);
                
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
                            <button class="action-btn-compact btn-download" onclick="loadOrderSVG()" style="margin-top: 1rem;">
                                <i class="fas fa-refresh"></i>
                                <span>Retry Loading</span>
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        // ===== ORDER VIEWER INITIALIZATION =====
        function initializeOrderViewer() {
            console.log('🎯 Premium Freight Order Viewer initialized successfully');
            
            // Apply staggered animations to elements
            const animatedElements = document.querySelectorAll('.fade-in, .slide-up');
            animatedElements.forEach((element, index) => {
                setTimeout(() => {
                    element.style.animationDelay = `${index * 0.1}s`;
                    element.classList.add('animated');
                }, 50);
            });
            
            // Load the order SVG
            loadOrderSVG();
            
            // Enhanced system information logging
            console.group('🔧 System Information');
            console.log('🌐 URLs:', { 
                URLPF: window.URL, 
                URLM: window.URLM 
            });
            console.log('📋 Order Data:', window.allOrders[0]);
            console.log('🔑 Token Information:', { 
                hasApprove: window.hasApproveToken, 
                hasReject: window.hasRejectToken,
                tokenUsed: window.tokenUsed
            });
            console.log('📚 Library Status:', { 
                html2canvas: typeof html2canvas !== 'undefined', 
                jsPDF: typeof window.jsPDF !== 'undefined',
                svgModule: typeof window.loadAndPopulateSVG !== 'undefined'
            });
            console.log('👤 User Context:', {
                name: window.userName,
                authLevel: window.authorizationLevel
            });
            console.groupEnd();
        }

        // ===== ENHANCED ACTION CONFIRMATION =====
        window.confirmAction = function(action) {
            const actionText = action === 'approve' ? 'approve' : 'reject';
            const actionUrl = action === 'approve' ? window.approveUrl : window.rejectUrl;
            
            if (!actionUrl) {
                Swal.fire({
                    icon: 'error',
                    title: 'Action Unavailable',
                    text: `The ${actionText} action is not available for this request.`,
                    confirmButtonColor: 'var(--grammer-blue)',
                    customClass: {
                        popup: 'swal2-enhanced'
                    }
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
                        <div><strong>Order ID:</strong> #<?php echo $orderId; ?></div>
                        <div><strong>Action:</strong> <span style="color: ${config[action].color}; font-weight: 600;">${actionText.toUpperCase()}</span></div>
                        <div><strong>Approver:</strong> <?php echo htmlspecialchars($tokenData['approver_name']); ?></div>
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
                        customClass: {
                            popup: 'swal2-enhanced'
                        },
                        didOpen: () => Swal.showLoading()
                    });
                    
                    // Process action with slight delay for better UX
                    setTimeout(() => {
                        window.location.href = actionUrl;
                    }, 1500);
                }
            });
        };

        // ===== ENHANCED PDF DOWNLOAD =====
        window.downloadPDF = async function() {
            try {
                // Mostrar loading
                Swal.fire({
                    title: 'Generating PDF...',
                    text: 'Converting document to PDF format',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    customClass: {
                        popup: 'swal2-enhanced'
                    },
                    didOpen: () => Swal.showLoading()
                });

                // Obtener el SVG del contenedor
                const svgContainer = document.getElementById('svgContainer');
                const svgElement = svgContainer.querySelector('svg');
                
                if (!svgElement) {
                    throw new Error('No SVG document found to convert');
                }

                // Obtener dimensiones del SVG
                const svgRect = svgElement.getBoundingClientRect();
                const svgWidth = svgRect.width || 800;
                const svgHeight = svgRect.height || 600;

                // Convertir SVG a Canvas usando html2canvas
                const canvas = await html2canvas(svgElement, {
                    backgroundColor: '#ffffff',
                    scale: 2, // Mayor calidad
                    useCORS: true,
                    allowTaint: true,
                    width: svgWidth,
                    height: svgHeight
                });

                // Crear PDF con jsPDF
                const pdf = new window.jsPDF({
                    orientation: svgWidth > svgHeight ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [svgWidth, svgHeight]
                });

                // Agregar la imagen del canvas al PDF
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0, svgWidth, svgHeight);

                // Generar nombre del archivo
                const fileName = `PF_${<?php echo $orderId; ?>}.pdf`;

                // Descargar el PDF
                pdf.save(fileName);

                // Mostrar confirmación
                Swal.fire({
                    icon: 'success',
                    title: 'PDF Generated!',
                    text: `Document saved as: ${fileName}`,
                    confirmButtonColor: 'var(--grammer-blue)',
                    customClass: {
                        popup: 'swal2-enhanced'
                    }
                });

            } catch (error) {
                console.error('Error generating PDF:', error);
                
                Swal.fire({
                    icon: 'error',
                    title: 'PDF Generation Failed',
                    html: `
                        <div style="text-align: left;">
                            <p>Unable to generate PDF document.</p>
                            <div style="background: #FEF2F2; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem;">
                                <strong>Error:</strong><br>
                                <code style="font-size: 0.8rem;">${error.message}</code>
                            </div>
                        </div>
                    `,
                    confirmButtonColor: 'var(--grammer-blue)',
                    customClass: {
                        popup: 'swal2-enhanced'
                    }
                });
            }
        }

        // ===== GLOBAL ERROR HANDLER =====
        window.addEventListener('error', function(event) {
            console.error('💥 Global error caught:', event.error);
        });

        window.addEventListener('unhandledrejection', function(event) {
            console.error('💥 Unhandled promise rejection:', event.reason);
        });

        // ===== INITIALIZE APPLICATION WHEN DOM IS READY =====
        document.addEventListener('DOMContentLoaded', initializeApp);
    </script>
</body>
</html>