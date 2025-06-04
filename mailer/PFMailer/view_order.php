<?php
/**
 * view_order.php - Página para mostrar SVG de órdenes desde emails
 * Versión actualizada con soporte para tokens separados de approve/reject
 */

// Activar reporte de errores para debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/view_order_errors.log');

try {
    // Cargar dependencias
    require_once __DIR__ . '/config.php';
    require_once 'PFDB.php';
    require_once 'PFmailUtils.php';

    // Verificar parámetros
    if (!isset($_GET['order']) || !isset($_GET['token'])) {
        if (function_exists('showError')) {
            showError('Parámetros requeridos faltantes. Se necesita order y token.');
        } else {
            die('Error: Parámetros requeridos faltantes. Se necesita order y token.');
        }
        exit;
    }

    $orderId = intval($_GET['order']);
    $token = $_GET['token'];

    // Validar parámetros básicos
    if ($orderId <= 0) {
        if (function_exists('showError')) {
            showError('ID de orden inválido.');
        } else {
            die('Error: ID de orden inválido.');
        }
        exit;
    }

    if (empty($token)) {
        if (function_exists('showError')) {
            showError('Token vacío.');
        } else {
            die('Error: Token vacío.');
        }
        exit;
    }

    // Conectar a la base de datos
    $con = new LocalConector();
    $db = $con->conectar();

    if (!$db) {
        throw new Exception('No se pudo conectar a la base de datos');
    }

    // Verificar que el token sea válido y obtener datos
    $sql = "SELECT EAT.*, U.name as approver_name 
            FROM EmailActionTokens EAT 
            INNER JOIN User U ON EAT.user_id = U.id 
            WHERE EAT.token = ? AND EAT.order_id = ?";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception('Error preparando consulta de token: ' . $db->error);
    }
    
    $stmt->bind_param("si", $token, $orderId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        if (function_exists('showError')) {
            showError('Token inválido o expirado para la orden especificada.');
        } else {
            die('Error: Token inválido o expirado para la orden especificada.');
        }
        exit;
    }

    $tokenData = $result->fetch_assoc();

    // Obtener AMBOS tokens (approve y reject) para esta orden y usuario
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

    // Obtener detalles de la orden - consulta completa para SVG
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
        throw new Exception('Error preparando consulta de orden: ' . $db->error);
    }
    
    $orderStmt->bind_param("i", $orderId);
    $orderStmt->execute();
    $orderResult = $orderStmt->get_result();

    if ($orderResult->num_rows === 0) {
        if (function_exists('showError')) {
            showError('Orden no encontrada con ID: ' . $orderId);
        } else {
            die('Error: Orden no encontrada con ID: ' . $orderId);
        }
        exit;
    }

    $orderData = $orderResult->fetch_assoc();

    // Verificar que las constantes necesarias estén definidas
    if (!defined('URLM')) {
        throw new Exception('URLM no está definida');
    }

    if (!defined('URLPF')) {
        throw new Exception('URLPF no está definida');
    }

    // URLs para las acciones con tokens específicos
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
    $errorMsg = 'Error fatal: ' . $e->getMessage();
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
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight Order #<?php echo $orderId; ?></title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome para iconos -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    
    <!-- Scripts necesarios -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Scripts de la aplicación -->
    <script src="<?php echo URLPF; ?>js/html2canvas.min.js"></script>
    <script src="<?php echo URLPF; ?>js/jspdf.umd.min.js"></script>
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="<?php echo URLPF; ?>assets/favicon.ico">
    
    <!-- Variables globales necesarias -->
    <script>
        // Definir variables globales que necesitan los módulos JS
        window.URL = '<?php echo URLPF; ?>';
        window.URLM = '<?php echo URLM; ?>';
        
        // Datos de la orden
        window.allOrders = [<?php echo json_encode($orderData); ?>];
        window.originalOrders = [<?php echo json_encode($orderData); ?>];
        window.authorizationLevel = <?php echo $tokenData['user_id']; ?>;
        window.userName = '<?php echo htmlspecialchars($tokenData['approver_name']); ?>';
        
        // URLs para acciones con tokens específicos
        window.approveUrl = '<?php echo $approveUrl; ?>';
        window.rejectUrl = '<?php echo $rejectUrl; ?>';
        
        // Estado de tokens
        window.hasApproveToken = <?php echo $approveToken ? 'true' : 'false'; ?>;
        window.hasRejectToken = <?php echo $rejectToken ? 'true' : 'false'; ?>;
        
        // Debug info
        console.log('🔍 Order Data:', window.allOrders[0]);
        console.log('📊 Order fields available:', Object.keys(window.allOrders[0]));
        console.log('🏢 Origin data:', {
            company: window.allOrders[0].origin_company_name,
            city: window.allOrders[0].origin_city,
            state: window.allOrders[0].origin_state,
            zip: window.allOrders[0].origin_zip
        });
        console.log('🏭 Destination data:', {
            company: window.allOrders[0].destiny_company_name,
            city: window.allOrders[0].destiny_city,
            state: window.allOrders[0].destiny_state,
            zip: window.allOrders[0].destiny_zip
        });
        console.log('🔑 Token Info:', {
            currentToken: '<?php echo substr($token, 0, 10) . "..."; ?>',
            currentAction: '<?php echo $tokenData['action']; ?>',
            hasApproveToken: window.hasApproveToken,
            hasRejectToken: window.hasRejectToken,
            tokenUsed: <?php echo $tokenData['is_used'] ? 'true' : 'false'; ?>
        });
    </script>
    
    <style>
        :root {
            --primary-blue: #034C8C;
            --secondary-blue: #0056b3;
            --success-green: #28a745;
            --danger-red: #dc3545;
            --warning-yellow: #ffc107;
            --info-cyan: #17a2b8;
            --light-gray: #f8f9fa;
            --dark-gray: #6c757d;
            --white: #ffffff;
            --shadow: 0 4px 15px rgba(0,0,0,0.1);
            --border-radius: 10px;
            --transition: all 0.3s ease;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, var(--light-gray) 0%, #e9ecef 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header-card {
            background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
            color: var(--white);
            padding: 40px;
            border-radius: var(--border-radius);
            margin-bottom: 30px;
            box-shadow: var(--shadow);
            position: relative;
            overflow: hidden;
        }

        .header-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
            pointer-events: none;
        }

        .order-title {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 15px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            position: relative;
            z-index: 1;
        }

        .approver-info {
            background-color: rgba(255,255,255,0.15);
            padding: 25px;
            border-radius: 12px;
            margin-top: 25px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            position: relative;
            z-index: 1;
        }

        .approver-info h3 {
            margin: 0 0 15px 0;
            font-size: 1.4rem;
            font-weight: 600;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 0.95rem;
            font-weight: 600;
            margin-left: 15px;
            background-color: var(--warning-yellow);
            color: #856404;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            transition: var(--transition);
        }

        .status-badge.completed {
            background-color: var(--success-green);
            color: var(--white);
        }

        .actions-section {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.2);
        }

        .actions-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 14px 28px;
            font-size: 1.1rem;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin: 8px;
            min-width: 160px;
            transition: var(--transition);
            text-decoration: none;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 2px solid transparent;
            position: relative;
            overflow: hidden;
        }

        .action-btn::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: width 0.3s ease, height 0.3s ease;
        }

        .action-btn:hover::before {
            width: 300px;
            height: 300px;
        }

        .action-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.25);
        }

        .btn-approve {
            background: linear-gradient(135deg, var(--success-green) 0%, #218838 100%);
            color: var(--white);
        }

        .btn-approve:hover {
            background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
            color: var(--white);
            text-decoration: none;
        }

        .btn-reject {
            background: linear-gradient(135deg, var(--danger-red) 0%, #c82333 100%);
            color: var(--white);
        }

        .btn-reject:hover {
            background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
            color: var(--white);
            text-decoration: none;
        }

        .btn-download {
            background: linear-gradient(135deg, var(--info-cyan) 0%, #138496 100%);
            color: var(--white);
        }

        .btn-download:hover {
            background: linear-gradient(135deg, #138496 0%, #117a8b 100%);
            color: var(--white);
            text-decoration: none;
        }

        .svg-container {
            background-color: var(--white);
            border-radius: var(--border-radius);
            padding: 40px;
            box-shadow: var(--shadow);
            margin-bottom: 30px;
            min-height: 500px;
            position: relative;
        }

        .svg-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent 49%, rgba(0,0,0,0.02) 50%, transparent 51%);
            pointer-events: none;
        }

        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            font-size: 1.3rem;
            color: var(--dark-gray);
            gap: 20px;
        }

        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid var(--primary-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error {
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            color: #721c24;
            padding: 30px;
            border-radius: var(--border-radius);
            margin-bottom: 20px;
            border-left: 5px solid var(--danger-red);
            box-shadow: var(--shadow);
        }

        .error i {
            margin-right: 10px;
            font-size: 1.2rem;
        }

        #svgContainer svg {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .debug-info {
            background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
            padding: 20px;
            border-radius: var(--border-radius);
            margin-bottom: 20px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.5;
            border-left: 4px solid var(--primary-blue);
            box-shadow: var(--shadow);
        }

        .debug-info strong {
            color: var(--primary-blue);
            font-size: 14px;
        }

        .completed-message {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--success-green);
            margin-bottom: 20px;
            padding: 15px;
            background-color: rgba(40, 167, 69, 0.1);
            border-radius: 8px;
            border-left: 4px solid var(--success-green);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .header-card {
                padding: 25px;
            }
            
            .order-title {
                font-size: 2.2rem;
            }
            
            .action-btn {
                display: block;
                margin: 10px 0;
                width: 100%;
                max-width: none;
            }
            
            .svg-container {
                padding: 20px;
            }
            
            .approver-info {
                padding: 20px;
            }
        }

        @media (max-width: 480px) {
            .order-title {
                font-size: 1.8rem;
            }
            
            .action-btn {
                font-size: 1rem;
                padding: 12px 20px;
            }
        }

        /* Animaciones */
        .fade-in {
            animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .pulse {
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(3, 76, 140, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(3, 76, 140, 0); }
            100% { box-shadow: 0 0 0 0 rgba(3, 76, 140, 0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Debug Info (comentar en producción) -->
        <div class="debug-info">
            <strong><i class="fas fa-bug"></i> Debug Information:</strong><br>
            <strong>Order ID:</strong> <?php echo $orderId; ?><br>
            <strong>Current Token:</strong> <?php echo substr($token, 0, 10) . '...'; ?> (<?php echo $tokenData['action']; ?>)<br>
            <strong>Approve Token:</strong> <?php echo $approveToken ? substr($approveToken, 0, 10) . '...' : 'N/A'; ?><br>
            <strong>Reject Token:</strong> <?php echo $rejectToken ? substr($rejectToken, 0, 10) . '...' : 'N/A'; ?><br>
            <strong>Creator:</strong> <?php echo htmlspecialchars($orderData['creator_name'] ?? 'N/A'); ?> (<?php echo htmlspecialchars($orderData['creator_role'] ?? 'N/A'); ?>)<br>
            <strong>Plant:</strong> <?php echo htmlspecialchars($orderData['creator_plant'] ?? 'N/A'); ?><br>
            <strong>Carrier:</strong> <?php echo htmlspecialchars($orderData['carrier'] ?? 'N/A'); ?><br>
            <strong>Status:</strong> <?php echo htmlspecialchars($orderData['status_name'] ?? 'N/A'); ?><br>
            <strong>Cost:</strong> €<?php echo number_format($orderData['cost_euros'] ?? 0, 2); ?><br>
            <strong>Origin:</strong> <?php echo htmlspecialchars($orderData['origin_company_name'] ?? 'N/A'); ?>, <?php echo htmlspecialchars($orderData['origin_city'] ?? 'N/A'); ?><br>
            <strong>Destination:</strong> <?php echo htmlspecialchars($orderData['destiny_company_name'] ?? 'N/A'); ?>, <?php echo htmlspecialchars($orderData['destiny_city'] ?? 'N/A'); ?><br>
            <strong>Approver:</strong> <?php echo htmlspecialchars($tokenData['approver_name']); ?><br>
            <strong>Token Used:</strong> <?php echo $tokenData['is_used'] ? 'Yes' : 'No'; ?><br>
            <strong>URLPF:</strong> <?php echo URLPF; ?><br>
            <strong>URLM:</strong> <?php echo URLM; ?>
        </div>

        <!-- Header -->
        <div class="header-card fade-in">
            <h1 class="order-title">
                <i class="fas fa-shipping-fast"></i>
                Order #<?php echo $orderId; ?>
            </h1>
            
            <div class="approver-info">
                <h3>
                    <i class="fas fa-user-check"></i>
                    Approver: <?php echo htmlspecialchars($tokenData['approver_name']); ?>
                </h3>
                
                <?php if ($tokenData['is_used'] == 0): ?>
                    <span class="status-badge pulse">
                        <i class="fas fa-clock"></i>
                        Pending Approval
                    </span>
                <?php else: ?>
                    <span class="status-badge completed">
                        <i class="fas fa-check-circle"></i>
                        Action Completed
                    </span>
                <?php endif; ?>
                
                <!-- Actions Section -->
                <div class="actions-section">
                    <?php if ($tokenData['is_used'] == 0): ?>
                        <div class="actions-title">
                            <i class="fas fa-exclamation-triangle"></i>
                            Action Required:
                        </div>
                        
                        <?php if ($approveToken): ?>
                            <a href="javascript:void(0)" class="action-btn btn-approve" onclick="confirmAction('approve')">
                                <i class="fas fa-check"></i>
                                Approve Order
                            </a>
                        <?php endif; ?>
                        
                        <?php if ($rejectToken): ?>
                            <a href="javascript:void(0)" class="action-btn btn-reject" onclick="confirmAction('reject')">
                                <i class="fas fa-times"></i>
                                Reject Order
                            </a>
                        <?php endif; ?>
                        
                        <a href="javascript:void(0)" class="action-btn btn-download" onclick="downloadPDF()">
                            <i class="fas fa-download"></i>
                            Download PDF
                        </a>
                    <?php else: ?>
                        <div class="completed-message">
                            <i class="fas fa-check-circle"></i>
                            Action has been completed successfully
                        </div>
                        
                        <a href="javascript:void(0)" class="action-btn btn-download" onclick="downloadPDF()">
                            <i class="fas fa-download"></i>
                            Download PDF
                        </a>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- SVG Container -->
        <div class="svg-container fade-in">
            <div id="svgContainer" class="loading">
                <div class="loading-spinner"></div>
                <div>Loading order details...</div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script type="module">
        // Función para cargar el SVG
        async function loadOrderSVG() {
            try {
                console.log('🚀 Starting SVG load...');
                
                // Intentar importar el módulo SVG
                const { loadAndPopulateSVG } = await import(window.URL + 'js/svgOrders.js');
                
                const orderData = window.allOrders[0];
                console.log('📦 Order data for SVG:', orderData);
                
                await loadAndPopulateSVG(orderData, 'svgContainer');
                console.log('✅ SVG loaded successfully');
                
            } catch (error) {
                console.error('❌ Error loading SVG:', error);
                document.getElementById('svgContainer').innerHTML = 
                    '<div class="error"><i class="fas fa-exclamation-triangle"></i><strong>Error loading order details:</strong> ' + error.message + '</div>';
            }
        }

        // Función para generar PDF
        async function generateOrderPDF() {
            try {
                // Use the global function instead of importing
                if (typeof window.generatePDF !== 'function') {
                    throw new Error('PDF generation module not loaded');
                }
                
                const orderData = window.allOrders[0];
                const doc = await window.generatePDF(orderData);
                
                // Download the PDF
                doc.save(`PF_Order_${orderData.id}.pdf`);
                
                return true;
            } catch (error) {
                console.error('❌ Error generating PDF:', error);
                throw error;
            }
        }

        // Funciones globales
        window.confirmAction = function(action) {
            const actionText = action === 'approve' ? 'approve' : 'reject';
            const actionColor = action === 'approve' ? '#28a745' : '#dc3545';
            const actionIcon = action === 'approve' ? 'success' : 'warning';
            
            // Verificar que tenemos la URL correspondiente
            const actionUrl = action === 'approve' ? window.approveUrl : window.rejectUrl;
            
            if (!actionUrl) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `No ${actionText} token available for this action.`,
                    confirmButtonColor: '#dc3545'
                });
                return;
            }
            
            Swal.fire({
                title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Order?`,
                html: `
                    <div style="text-align: left; margin: 20px 0;">
                        <p><strong>Order ID:</strong> #<?php echo $orderId; ?></p>
                        <p><strong>Action:</strong> ${actionText.toUpperCase()}</p>
                        <p><strong>Approver:</strong> <?php echo htmlspecialchars($tokenData['approver_name']); ?></p>
                    </div>
                    <p style="color: #666; font-size: 0.9rem;">This action cannot be undone.</p>
                `,
                icon: actionIcon,
                showCancelButton: true,
                confirmButtonColor: actionColor,
                cancelButtonColor: '#6c757d',
                confirmButtonText: `<i class="fas fa-${action === 'approve' ? 'check' : 'times'}"></i> Yes, ${actionText} it!`,
                cancelButtonText: '<i class="fas fa-arrow-left"></i> Cancel',
                reverseButtons: true,
                focusConfirm: false,
                focusCancel: true
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Processing...',
                        html: `
                            <div style="margin: 20px 0;">
                                <div class="loading-spinner" style="margin: 0 auto 15px auto;"></div>
                                <p>Please wait while we process your ${actionText} request.</p>
                            </div>
                        `,
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        showConfirmButton: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    
                    // Pequeño delay para mostrar el loading
                    setTimeout(() => {
                        window.location.href = actionUrl;
                    }, 500);
                }
            });
        };

        window.downloadPDF = async function() {
            try {
                Swal.fire({
                    title: 'Generating PDF...',
                    html: `
                        <div style="margin: 20px 0;">
                            <div class="loading-spinner" style="margin: 0 auto 15px auto;"></div>
                            <p>Please wait while we prepare your document.</p>
                        </div>
                    `,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                await generateOrderPDF();
                
                Swal.close();
                
                Swal.fire({
                    icon: 'success',
                    title: 'PDF Downloaded!',
                    html: `
                        <div style="margin: 15px 0;">
                            <i class="fas fa-file-pdf" style="font-size: 3rem; color: #dc3545; margin-bottom: 15px;"></i>
                            <p>The PDF has been generated and downloaded successfully.</p>
                        </div>
                    `,
                    timer: 3000,
                    timerProgressBar: true,
                    confirmButtonColor: '#17a2b8'
                });
                
            } catch (error) {
                console.error('❌ Error generating PDF:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'PDF Generation Error',
                    html: `
                        <div style="margin: 15px 0;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #dc3545; margin-bottom: 15px;"></i>
                            <p>Could not generate PDF. Please try again later.</p>
                            <small style="color: #666;">Error: ${error.message}</small>
                        </div>
                    `,
                    confirmButtonColor: '#dc3545'
                });
            }
        };

        // Cargar SVG cuando el DOM esté listo
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎯 DOM loaded, starting SVG load...');
            
            // Añadir clase de animación a elementos
            document.querySelectorAll('.fade-in').forEach((element, index) => {
                setTimeout(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }, index * 100);
            });
            
            // Cargar SVG
            loadOrderSVG();
        });

        // Mostrar información de conexión en consola
        console.log('🌐 Premium Freight Order Viewer Loaded');
        console.log('🔗 Connection URLs:', {
            URLPF: window.URL,
            URLM: window.URLM
        });
    </script>
</body>
</html>