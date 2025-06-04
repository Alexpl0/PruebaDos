<?php
/**
 * view_order.php - Página para mostrar SVG de órdenes desde emails
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

    // URLs para las acciones
    $approveUrl = URLM . "PFmailSingleAction.php?action=approve&token=" . urlencode($token);
    $rejectUrl = URLM . "PFmailSingleAction.php?action=reject&token=" . urlencode($token);

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
    
    <!-- Bootstrap CSS básico para evitar problemas -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Scripts necesarios -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Scripts de la aplicación -->
    <script src="<?php echo URLPF; ?>js/html2canvas.min.js"></script>
    <script src="<?php echo URLPF; ?>js/jspdf.umd.min.js"></script>
    
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
        
        // URLs para acciones
        window.approveUrl = '<?php echo $approveUrl; ?>';
        window.rejectUrl = '<?php echo $rejectUrl; ?>';
        
        // Debug info
        console.log('Order Data:', window.allOrders[0]);
        console.log('Order fields available:', Object.keys(window.allOrders[0]));
        console.log('Origin data:', {
            company: window.allOrders[0].origin_company_name,
            city: window.allOrders[0].origin_city,
            state: window.allOrders[0].origin_state
        });
        console.log('Destination data:', {
            company: window.allOrders[0].destiny_company_name,
            city: window.allOrders[0].destiny_city,
            state: window.allOrders[0].destiny_state
        });
    </script>
    
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header-card {
            background: linear-gradient(135deg, #034C8C 0%, #0056b3 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .order-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .approver-info {
            background-color: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .svg-container {
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            min-height: 400px;
        }
        .actions-container {
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
        }
        .action-btn {
            padding: 12px 24px; /* Un poco más pequeños para el header */
            font-size: 1rem; /* Tamaño de fuente reducido */
            font-weight: bold;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin: 5px;
            min-width: 130px; /* Ancho mínimo reducido */
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        .btn-approve {
            background-color: #28a745;
            color: white;
            border: 2px solid rgba(255,255,255,0.3); /* Borde sutil para el header */
        }
        .btn-approve:hover {
            background-color: #218838;
            transform: translateY(-2px);
            color: white;
            text-decoration: none;
            border-color: rgba(255,255,255,0.5);
        }
        .btn-reject {
            background-color: #dc3545;
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
        }
        .btn-reject:hover {
            background-color: #c82333;
            transform: translateY(-2px);
            color: white;
            text-decoration: none;
            border-color: rgba(255,255,255,0.5);
        }
        .btn-download {
            background-color: #17a2b8;
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
        }
        .btn-download:hover {
            background-color: #138496;
            transform: translateY(-2px);
            color: white;
            text-decoration: none;
            border-color: rgba(255,255,255,0.5);
        }
        /* Estilos responsivos para el header */
        @media (max-width: 768px) {
            .action-btn {
                display: block;
                margin: 5px 0;
                width: 100%;
            }
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: bold;
            margin-left: 15px;
            background-color: #ffc107;
            color: #856404;
        }
        .loading {
            text-align: center;
            padding: 50px;
            font-size: 1.2rem;
            color: #6c757d;
        }
        .error {
            background-color: #f8d7da;
            color: #721c24;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        #svgContainer svg {
            max-width: 100%;
            height: auto;
        }
        .debug-info {
            background-color: #e9ecef;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Debug Info (solo para desarrollo) -->
        <div class="debug-info">
            <strong>Debug Info:</strong><br>
            Order ID: <?php echo $orderId; ?><br>
            Token: <?php echo substr($token, 0, 10) . '...'; ?><br>
            Creator: <?php echo htmlspecialchars($orderData['creator_name'] ?? 'N/A'); ?><br>
            Plant: <?php echo htmlspecialchars($orderData['creator_plant'] ?? 'N/A'); ?><br>
            Carrier: <?php echo htmlspecialchars($orderData['carrier'] ?? 'N/A'); ?><br>
            Status: <?php echo htmlspecialchars($orderData['status_name'] ?? 'N/A'); ?><br>
            Origin: <?php echo htmlspecialchars($orderData['origin_company_name'] ?? 'N/A'); ?><br>
            Destination: <?php echo htmlspecialchars($orderData['destiny_company_name'] ?? 'N/A'); ?><br>
            Approver: <?php echo htmlspecialchars($tokenData['approver_name']); ?><br>
            Token Used: <?php echo $tokenData['is_used'] ? 'Yes' : 'No'; ?><br>
            URLPF: <?php echo URLPF; ?><br>
            URLM: <?php echo URLM; ?>
        </div>

        <!-- Header -->
        <div class="header-card">
            <h1 class="order-title">Order #<?php echo $orderId; ?></h1>
            
            <div class="approver-info">
                <strong>Approver:</strong> <?php echo htmlspecialchars($tokenData['approver_name']); ?>
                <span class="status-badge">Pending Approval</span>
                
                <!-- Actions dentro del header -->
                <div style="margin-top: 20px;">
                    <?php if ($tokenData['is_used'] == 0): ?>
                        <p style="margin-bottom: 15px; font-weight: bold;">Action Required:</p>
                        <a href="javascript:void(0)" class="action-btn btn-approve" onclick="confirmAction('approve')" style="margin-right: 10px;">
                            ✓ Approve Order
                        </a>
                        <a href="javascript:void(0)" class="action-btn btn-reject" onclick="confirmAction('reject')" style="margin-right: 10px;">
                            ✗ Reject Order
                        </a>
                        <a href="javascript:void(0)" class="action-btn btn-download" onclick="downloadPDF()">
                            📄 Download PDF
                        </a>
                    <?php else: ?>
                        <p style="margin-bottom: 15px; color: #28a745; font-weight: bold;">✓ Action Already Completed</p>
                        <a href="javascript:void(0)" class="action-btn btn-download" onclick="downloadPDF()">
                            📄 Download PDF
                        </a>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- SVG Container -->
        <div class="svg-container">
            <div id="svgContainer" class="loading">
                Loading order details...
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script type="module">
        // Función para cargar el SVG
        async function loadOrderSVG() {
            try {
                console.log('Starting SVG load...');
                
                // Intentar importar el módulo SVG
                const { loadAndPopulateSVG } = await import(window.URL + 'js/svgOrders.js');
                
                const orderData = window.allOrders[0];
                console.log('Order data for SVG:', orderData);
                
                await loadAndPopulateSVG(orderData, 'svgContainer');
                console.log('SVG loaded successfully');
                
            } catch (error) {
                console.error('Error loading SVG:', error);
                document.getElementById('svgContainer').innerHTML = 
                    '<div class="error">Error loading order details: ' + error.message + '</div>';
            }
        }

        // Función para generar PDF
        async function generateOrderPDF() {
            try {
                const { generatePDF } = await import(window.URL + 'js/createPDF.js');
                const orderData = window.allOrders[0];
                await generatePDF(orderData, `PF_Order_${orderData.id}`);
                return true;
            } catch (error) {
                console.error('Error generating PDF:', error);
                throw error;
            }
        }

        // Funciones globales
        window.confirmAction = function(action) {
            const actionText = action === 'approve' ? 'approve' : 'reject';
            const actionColor = action === 'approve' ? '#28a745' : '#dc3545';
            
            Swal.fire({
                title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Order?`,
                text: `Are you sure you want to ${actionText} order #<?php echo $orderId; ?>?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: actionColor,
                cancelButtonColor: '#6c757d',
                confirmButtonText: `Yes, ${actionText} it!`,
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    const url = action === 'approve' ? window.approveUrl : window.rejectUrl;
                    
                    Swal.fire({
                        title: 'Processing...',
                        text: 'Please wait while we process your request.',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    
                    window.location.href = url;
                }
            });
        };

        window.downloadPDF = async function() {
            try {
                Swal.fire({
                    title: 'Generating PDF...',
                    text: 'Please wait while we prepare your document.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                await generateOrderPDF();
                
                Swal.close();
                
                Swal.fire({
                    icon: 'success',
                    title: 'PDF Downloaded!',
                    text: 'The PDF has been generated and downloaded successfully.',
                    timer: 3000,
                    timerProgressBar: true
                });
                
            } catch (error) {
                console.error('Error generating PDF:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Could not generate PDF. Please try again later.'
                });
            }
        };

        // Cargar SVG cuando el DOM esté listo
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, starting SVG load...');
            loadOrderSVG();
        });
    </script>
</body>
</html>