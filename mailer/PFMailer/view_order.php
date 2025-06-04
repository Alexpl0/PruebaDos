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
    
    <!-- Preload critical resources -->
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" as="style">
    <link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" as="script">
    <link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" as="script">
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- External CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- External JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- PDF and Canvas Scripts - Primary CDN -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    
    <!-- Fallback Scripts - Local copies -->
    <script>
        // Check if libraries loaded from CDN, if not load local fallbacks
        if (typeof html2canvas === 'undefined') {
            console.log('Loading html2canvas from local fallback...');
            document.write('<script src="<?php echo URLPF; ?>js/html2canvas.min.js"><\/script>');
        }
        
        if (typeof window.jsPDF === 'undefined') {
            console.log('Loading jsPDF from local fallback...');
            document.write('<script src="<?php echo URLPF; ?>js/jspdf.umd.min.js"><\/script>');
        }
    </script>
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="<?php echo URLPF; ?>assets/favicon.ico">
    
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
        /* CSS Custom Properties */
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
            --border-radius: 12px;
            --border-radius-lg: 16px;
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

        /* Base Styles */
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

        /* Email-style Layout */
        .email-container {
            max-width: var(--max-width);
            margin: 0 auto;
            background: var(--white);
            min-height: 100vh;
            box-shadow: var(--shadow-xl);
        }

        /* Professional Header - Compact Version */
        .email-header {
            background: linear-gradient(135deg, var(--grammer-blue) 0%, var(--grammer-dark-blue) 100%);
            color: var(--white);
            padding: var(--spacing-lg) var(--spacing-xl);
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
            opacity: 0.3;
        }

        .email-header-content {
            position: relative;
            z-index: 1;
        }

        .company-logo {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-md);
        }

        .company-logo i {
            font-size: 1.5rem;
            opacity: 0.9;
        }

        .company-name {
            font-size: 1.25rem;
            font-weight: 600;
            letter-spacing: -0.025em;
        }

        .order-title-main {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: var(--spacing-xs);
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            letter-spacing: -0.025em;
        }

        .order-subtitle {
            font-size: 1rem;
            opacity: 0.9;
            font-weight: 400;
            margin-bottom: var(--spacing-md);
        }

        /* Compact Status Section */
        .status-section {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            margin-top: var(--spacing-md);
        }

        .approver-info {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-md);
        }

        .approver-avatar {
            width: 36px;
            height: 36px;
            background: var(--white);
            color: var(--grammer-blue);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            font-weight: 600;
            box-shadow: var(--shadow-md);
        }

        .approver-details h4 {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 0.125rem;
        }

        .approver-role {
            font-size: 0.8rem;
            opacity: 0.8;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: var(--spacing-xs);
            padding: var(--spacing-xs) var(--spacing-md);
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            transition: var(--transition-normal);
        }

        .status-pending {
            background: var(--warning);
            color: var(--white);
            box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2);
            animation: pulse-warning 2s infinite;
        }

        .status-completed {
            background: var(--success);
            color: var(--white);
        }

        @keyframes pulse-warning {
            0%, 100% { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2); }
            50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0.1); }
        }

        /* Professional Action Buttons */
        .actions-section {
            margin-top: var(--spacing-xl);
            padding-top: var(--spacing-lg);
            border-top: 1px solid rgba(255,255,255,0.2);
        }

        .actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--spacing-md);
            margin-top: var(--spacing-lg);
        }

        .action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--spacing-sm);
            padding: var(--spacing-lg);
            background: var(--white);
            color: var(--gray-700);
            border: 2px solid transparent;
            border-radius: var(--border-radius);
            font-size: 1rem;
            font-weight: 600;
            text-decoration: none;
            transition: var(--transition-normal);
            cursor: pointer;
            box-shadow: var(--shadow-md);
            position: relative;
            overflow: hidden;
        }

        .action-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: var(--transition-normal);
        }

        .action-btn:hover::before {
            left: 100%;
        }

        .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
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
            color: var(--danger);
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

        /* Email Body */
        .email-body {
            padding: var(--spacing-2xl);
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

        /* SVG Container */
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

        /* Loading States */
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

        /* Error States */
        .error-state {
            background: linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%);
            color: var(--danger);
            padding: var(--spacing-xl);
            border-radius: var(--border-radius);
            border-left: 4px solid var(--danger);
            margin: var(--spacing-lg) 0;
        }

        .error-state i {
            font-size: 1.5rem;
            margin-right: var(--spacing-md);
        }

        /* Professional Footer */
        .email-footer {
            background: var(--gray-100);
            padding: var(--spacing-xl);
            border-top: 1px solid var(--gray-200);
            text-align: center;
        }

        .footer-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--spacing-md);
            color: var(--gray-600);
        }

        .footer-logo {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--grammer-blue);
        }

        .footer-links {
            display: flex;
            gap: var(--spacing-lg);
            flex-wrap: wrap;
            justify-content: center;
        }

        .footer-link {
            color: var(--gray-500);
            text-decoration: none;
            font-size: 0.875rem;
            transition: var(--transition-fast);
        }

        .footer-link:hover {
            color: var(--grammer-blue);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .email-container {
                margin: 0;
                box-shadow: none;
            }

            .email-header {
                padding: var(--spacing-xl) var(--spacing-lg);
            }

            .order-title-main {
                font-size: 2rem;
            }

            .email-body {
                padding: var(--spacing-lg);
            }

            .actions-grid {
                grid-template-columns: 1fr;
            }

            .approver-info {
                flex-direction: column;
                text-align: center;
            }

            .section-header {
                flex-direction: column;
                text-align: center;
            }
        }

        @media (max-width: 480px) {
            .order-title-main {
                font-size: 1.75rem;
            }

            .company-name {
                font-size: 1.25rem;
            }

            .document-section {
                padding: var(--spacing-lg);
            }
        }

        /* Animation Classes */
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

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: var(--gray-100);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--gray-400);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--gray-500);
        }

        /* Print Styles */
        @media print {
            .email-header,
            .actions-section,
            .email-footer {
                display: none !important;
            }

            .email-container {
                box-shadow: none;
            }

            .email-body {
                padding: 0;
            }
        }

        /* Focus Styles for Accessibility */
        .action-btn:focus,
        .footer-link:focus {
            outline: 2px solid var(--grammer-blue);
            outline-offset: 2px;
        }

        /* High Contrast Mode Support */
        @media (prefers-contrast: high) {
            :root {
                --gray-100: #E0E0E0;
                --gray-200: #C0C0C0;
            }
        }

        /* Reduced Motion Support */
        @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }

        /* Enhanced SweetAlert2 Styles */
        .swal-professional {
            font-family: 'Inter', sans-serif !important;
        }
        
        .swal-btn-confirm {
            font-weight: 600 !important;
            padding: 0.75rem 1.5rem !important;
            border-radius: 0.5rem !important;
        }
        
        .swal-btn-cancel {
            font-weight: 500 !important;
            padding: 0.75rem 1.5rem !important;
            border-radius: 0.5rem !important;
        }
        
        .swal2-popup {
            border-radius: var(--border-radius-lg) !important;
            box-shadow: var(--shadow-xl) !important;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Professional Email Header -->
        <header class="email-header">
            <div class="email-header-content">
                <div class="company-logo fade-in">
                    <i class="fas fa-industry"></i>
                    <div class="company-name">Grammer AG</div>
                </div>
                
                <h1 class="order-title-main slide-up">Order #<?php echo $orderId; ?></h1>
                <p class="order-subtitle slide-up">Premium Freight Request Document</p>
                
                <div class="status-section slide-up">
                    <div class="approver-info">
                        <div class="approver-avatar">
                            <?php echo strtoupper(substr($tokenData['approver_name'], 0, 1)); ?>
                        </div>
                        <div class="approver-details">
                            <h4><?php echo htmlspecialchars($tokenData['approver_name']); ?></h4>
                            <div class="approver-role">Authorization Required</div>
                        </div>
                    </div>
                    
                    <?php if ($tokenData['is_used'] == 0): ?>
                        <div class="status-badge status-pending">
                            <i class="fas fa-clock"></i>
                            <span>Pending Review</span>
                        </div>
                    <?php else: ?>
                        <div class="status-badge status-completed">
                            <i class="fas fa-check-circle"></i>
                            <span>Action Completed</span>
                        </div>
                    <?php endif; ?>
                    
                    <?php if ($tokenData['is_used'] == 0 && ($approveToken || $rejectToken)): ?>
                    <div class="actions-section">
                        <h4 style="color: var(--white); margin-bottom: var(--spacing-lg); display: flex; align-items: center; gap: var(--spacing-sm);">
                            <i class="fas fa-tasks"></i>
                            Available Actions
                        </h4>
                        
                        <div class="actions-grid">
                            <?php if ($approveToken): ?>
                            <button class="action-btn btn-approve" onclick="confirmAction('approve')">
                                <i class="fas fa-check-circle"></i>
                                <span>Approve Order</span>
                            </button>
                            <?php endif; ?>
                            
                            <?php if ($rejectToken): ?>
                            <button class="action-btn btn-reject" onclick="confirmAction('reject')">
                                <i class="fas fa-times-circle"></i>
                                <span>Reject Order</span>
                            </button>
                            <?php endif; ?>
                            
                            <button class="action-btn btn-download" onclick="downloadPDF()">
                                <i class="fas fa-file-pdf"></i>
                                <span>Download PDF</span>
                            </button>
                        </div>
                    </div>
                    <?php else: ?>
                    <div class="actions-section">
                        <div class="actions-grid">
                            <button class="action-btn btn-download" onclick="downloadPDF()">
                                <i class="fas fa-file-pdf"></i>
                                <span>Download PDF</span>
                            </button>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </header>

        <!-- Email Body -->
        <main class="email-body">
            <div class="document-section fade-in">
                <div class="section-header">
                    <i class="fas fa-file-contract"></i>
                    <h2 class="section-title">Order Documentation</h2>
                </div>
                
                <div class="svg-container" id="svgContainer">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <div>Loading order details...</div>
                        <div class="loading-dots">
                            <div class="loading-dot"></div>
                            <div class="loading-dot"></div>
                            <div class="loading-dot"></div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Professional Footer -->
        <footer class="email-footer">
            <div class="footer-content">
                <div class="footer-logo">Grammer AG</div>
                <div class="footer-links">
                    <a href="#" class="footer-link">Privacy Policy</a>
                    <a href="#" class="footer-link">Terms of Service</a>
                    <a href="#" class="footer-link">Contact Support</a>
                </div>
                <p style="font-size: 0.75rem; color: var(--gray-500);">
                    © <?php echo date('Y'); ?> Grammer AG. All rights reserved. | This is an automated message.
                </p>
            </div>
        </footer>
    </div>

    <!-- Enhanced JavaScript Module -->
    <script type="module">
        // Wait for all dependencies to load
        async function waitForDependencies() {
            const maxAttempts = 50; // 5 seconds max wait
            let attempts = 0;
            
            while (attempts < maxAttempts) {
                if (typeof html2canvas !== 'undefined' && typeof window.jsPDF !== 'undefined') {
                    return true;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            throw new Error('Required libraries (html2canvas, jsPDF) failed to load');
        }

        // Import PDF generation module with dependency check
        async function initializeApp() {
            try {
                // Wait for dependencies
                await waitForDependencies();
                console.log('✅ All dependencies loaded successfully');
                
                // Import SVG module
                const { generatePDF, loadAndPopulateSVG } = await import('<?php echo URLPF; ?>js/svgOrders.js');
                
                // Make functions globally available
                window.generatePDF = generatePDF;
                window.loadAndPopulateSVG = loadAndPopulateSVG;
                
                // Initialize the application
                initializeOrderViewer();
                
            } catch (error) {
                console.error('❌ Failed to initialize application:', error);
                showDependencyError(error);
            }
        }

        // Show dependency error
        function showDependencyError(error) {
            const container = document.getElementById('svgContainer');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Application Error</strong>
                            <p style="margin-top: 0.5rem; font-size: 0.9rem;">
                                Required libraries failed to load. Please check your internet connection and try refreshing the page.
                            </p>
                            <div style="background: #FEF2F2; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--danger); text-align: left; margin: 1rem 0;">
                                <strong>Technical Details:</strong><br>
                                <code style="font-size: 0.8rem; color: var(--gray-600);">${error.message}</code>
                            </div>
                            <button class="action-btn btn-download" onclick="location.reload()" style="margin-top: 1rem;">
                                <i class="fas fa-refresh"></i>
                                <span>Retry</span>
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        // Enhanced SVG loading with better error handling
        async function loadOrderSVG() {
            const container = document.getElementById('svgContainer');
            
            try {
                console.log('🚀 Initializing order document...');
                
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
                
                // Check if loadAndPopulateSVG is available
                if (typeof window.loadAndPopulateSVG !== 'function') {
                    throw new Error('SVG module not loaded properly');
                }
                
                // Load SVG with order data
                await window.loadAndPopulateSVG(orderData, 'svgContainer');
                
                console.log('✅ Document loaded successfully');
                
                // Add success animation
                setTimeout(() => {
                    const svgElement = container.querySelector('svg');
                    if (svgElement) {
                        svgElement.style.animation = 'fadeIn 0.5s ease-out';
                    }
                }, 100);
                
            } catch (error) {
                console.error('❌ Error loading document:', error);
                
                container.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Unable to Load Document</strong>
                            <p style="margin-top: 0.5rem; font-size: 0.9rem;">
                                We encountered an issue while loading your order details. 
                                Please try refreshing the page or contact support if the problem persists.
                            </p>
                            <div style="background: #FEF2F2; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--danger); text-align: left; margin: 1rem 0;">
                                <strong>Error Details:</strong><br>
                                <code style="font-size: 0.8rem; color: var(--gray-600);">${error.message}</code>
                            </div>
                            <button class="action-btn btn-download" onclick="location.reload()" style="margin-top: 1rem;">
                                <i class="fas fa-refresh"></i>
                                <span>Retry</span>
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        // Enhanced PDF generation
        async function generateOrderPDF() {
            if (typeof window.generatePDF !== 'function') {
                throw new Error('PDF generation module not available');
            }
            
            const orderData = window.allOrders[0];
            const fileName = await window.generatePDF(orderData, `Grammer_PF_Order_${orderData.id}`);
            
            console.log('✅ PDF generated:', fileName);
            return fileName;
        }

        // Initialize the order viewer
        function initializeOrderViewer() {
            console.log('🎯 Premium Freight Order Viewer initialized');
            
            // Staggered animations
            const animatedElements = document.querySelectorAll('.fade-in, .slide-up');
            animatedElements.forEach((element, index) => {
                setTimeout(() => {
                    element.style.animationDelay = `${index * 0.1}s`;
                }, 50);
            });
            
            // Load order document
            loadOrderSVG();
            
            // Log system info for debugging (console only)
            console.group('🔧 System Information');
            console.log('🌐 URLs:', { URLPF: window.URL, URLM: window.URLM });
            console.log('📋 Order:', window.allOrders[0]);
            console.log('🔑 Tokens:', { approve: window.hasApproveToken, reject: window.hasRejectToken });
            console.log('📚 Libraries:', { 
                html2canvas: typeof html2canvas !== 'undefined', 
                jsPDF: typeof window.jsPDF !== 'undefined' 
            });
            console.groupEnd();
        }

        // Enhanced action confirmation
        window.confirmAction = function(action) {
            const actionText = action === 'approve' ? 'approve' : 'reject';
            const actionUrl = action === 'approve' ? window.approveUrl : window.rejectUrl;
            
            if (!actionUrl) {
                Swal.fire({
                    icon: 'error',
                    title: 'Action Unavailable',
                    html: `
                        <div style="text-align: center; padding: 1rem;">
                            <i class="fas fa-lock" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                            <p>The ${actionText} action is not available for this request.</p>
                            <small style="color: var(--gray-500);">This may be due to expired tokens or insufficient permissions.</small>
                        </div>
                    `,
                    confirmButtonColor: 'var(--grammer-blue)',
                    confirmButtonText: 'Understood'
                });
                return;
            }
            
            const config = {
                approve: {
                    color: 'var(--success)',
                    icon: 'success',
                    iconClass: 'check-circle'
                },
                reject: {
                    color: 'var(--danger)',
                    icon: 'warning',
                    iconClass: 'times-circle'
                }
            };
            
            Swal.fire({
                title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Order?`,
                html: `
                    <div style="text-align: left; background: var(--gray-50); padding: 1.5rem; border-radius: 0.5rem; margin: 1rem 0;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <strong style="color: var(--grammer-blue);">Order Details</strong>
                        </div>
                        <div style="display: grid; gap: 0.5rem; font-size: 0.9rem;">
                            <div><strong>Order ID:</strong> #<?php echo $orderId; ?></div>
                            <div><strong>Action:</strong> <span style="color: ${config[action].color}; font-weight: 600; text-transform: uppercase;">${actionText}</span></div>
                            <div><strong>Approver:</strong> <?php echo htmlspecialchars($tokenData['approver_name']); ?></div>
                            <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div style="background: #FEF3CD; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--warning);">
                        <i class="fas fa-exclamation-triangle" style="color: var(--warning); margin-right: 0.5rem;"></i>
                        <strong>Important:</strong> This action cannot be undone and will be recorded in the system.
                    </div>
                `,
                icon: config[action].icon,
                showCancelButton: true,
                confirmButtonColor: config[action].color,
                cancelButtonColor: 'var(--gray-500)',
                confirmButtonText: `<i class="fas fa-${config[action].iconClass}"></i> Confirm ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
                cancelButtonText: '<i class="fas fa-arrow-left"></i> Cancel',
                reverseButtons: true,
                focusCancel: true,
                width: '600px',
                customClass: {
                    popup: 'swal-professional',
                    confirmButton: 'swal-btn-confirm',
                    cancelButton: 'swal-btn-cancel'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Processing Request',
                        html: `
                            <div style="text-align: center; padding: 2rem;">
                                <div class="loading-spinner" style="margin: 0 auto 1.5rem auto;"></div>
                                <p style="font-weight: 600; margin-bottom: 0.5rem;">Processing your ${actionText} request</p>
                                <p style="color: var(--gray-500); font-size: 0.9rem;">Please do not close this window</p>
                            </div>
                        `,
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        showConfirmButton: false,
                        didOpen: () => Swal.showLoading()
                    });
                    
                    setTimeout(() => {
                        window.location.href = actionUrl;
                    }, 1500);
                }
            });
        };

        // Enhanced PDF download
        window.downloadPDF = async function() {
            try {
                // Check if dependencies are loaded
                if (typeof html2canvas === 'undefined' || typeof window.jsPDF === 'undefined') {
                    throw new Error('PDF generation libraries not loaded. Please refresh the page and try again.');
                }

                Swal.fire({
                    title: 'Generating Document',
                    html: `
                        <div style="text-align: center; padding: 2rem;">
                            <div class="loading-spinner" style="margin: 0 auto 1.5rem auto;"></div>
                            <p style="font-weight: 600; margin-bottom: 0.5rem;">Creating your PDF document</p>
                            <p style="color: var(--gray-500); font-size: 0.9rem;">This may take a few moments...</p>
                            <div class="loading-dots" style="justify-content: center; margin-top: 1rem;">
                                <div class="loading-dot"></div>
                                <div class="loading-dot"></div>
                                <div class="loading-dot"></div>
                            </div>
                        </div>
                    `,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    didOpen: () => Swal.showLoading()
                });

                const fileName = await generateOrderPDF();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Download Complete!',
                    html: `
                        <div style="text-align: center; padding: 1rem;">
                            <i class="fas fa-file-pdf" style="font-size: 4rem; color: var(--danger); margin-bottom: 1.5rem;"></i>
                            <p style="font-weight: 600; margin-bottom: 0.5rem;">Your document has been downloaded successfully</p>
                            <div style="background: var(--gray-50); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                                <small style="color: var(--gray-600); font-family: monospace;">${fileName}</small>
                            </div>
                            <p style="color: var(--gray-500); font-size: 0.9rem;">Check your Downloads folder</p>
                        </div>
                    `,
                    timer: 5000,
                    timerProgressBar: true,
                    confirmButtonColor: 'var(--grammer-blue)',
                    confirmButtonText: 'Great!'
                });
                
            } catch (error) {
                console.error('❌ PDF generation failed:', error);
                
                Swal.fire({
                    icon: 'error',
                    title: 'Download Failed',
                    html: `
                        <div style="text-align: center; padding: 1rem;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1.5rem;"></i>
                            <p style="margin-bottom: 1rem;">We couldn't generate your PDF document at this time.</p>
                            <div style="background: #FEF2F2; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--danger); text-align: left;">
                                <strong>Error Details:</strong><br>
                                <code style="font-size: 0.8rem; color: var(--gray-600);">${error.message}</code>
                            </div>
                            <p style="color: var(--gray-500); font-size: 0.9rem; margin-top: 1rem;">
                                Please try refreshing the page or contact IT support if the problem persists.
                            </p>
                        </div>
                    `,
                    confirmButtonColor: 'var(--danger)',
                    confirmButtonText: 'Refresh Page',
                    showCancelButton: true,
                    cancelButtonText: 'Contact Support'
                }).then((result) => {
                    if (result.isConfirmed) {
                        location.reload();
                    }
                });
            }
        };

        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', initializeApp);

        // Performance monitoring (console only)
        window.addEventListener('load', function() {
            const loadTime = performance.now();
            console.log(`⚡ Page loaded in ${Math.round(loadTime)}ms`);
        });
    </script>
</body>
</html>