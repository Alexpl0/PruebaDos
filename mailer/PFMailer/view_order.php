<?php
/**
 * view_order.php - Página temporal para mostrar SVG de órdenes desde emails
 */

require_once __DIR__ . '/config.php';
require_once 'PFDB.php';
require_once 'PFmailUtils.php';

// Verificar parámetros
if (!isset($_GET['order']) || !isset($_GET['token'])) {
    showError('Parámetros requeridos faltantes.');
    exit;
}

$orderId = intval($_GET['order']);
$token = $_GET['token'];

// Conectar a la base de datos
$con = new LocalConector();
$db = $con->conectar();

// Verificar que el token sea válido y obtener datos
$sql = "SELECT EAT.*, U.name as approver_name 
        FROM EmailActionTokens EAT 
        INNER JOIN User U ON EAT.user_id = U.id 
        WHERE EAT.token = ? AND EAT.order_id = ?";
$stmt = $db->prepare($sql);
$stmt->bind_param("si", $token, $orderId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    showError('Token inválido o expirado.');
    exit;
}

$tokenData = $result->fetch_assoc();

// Obtener detalles de la orden usando la MISMA consulta que funciona en la página principal
$orderSql = "SELECT 
                PF.id, PF.user_id, PF.planta, PF.code_planta, PF.date, PF.transport, 
                PF.in_out_bound, PF.cost_euros, PF.area, PF.int_ext, PF.paid_by, 
                PF.category_cause, PF.project_status, PF.recovery, PF.description, 
                PF.origin_company_name, PF.origin_city, PF.origin_state, PF.origin_zip,
                PF.destiny_company_name, PF.destiny_city, PF.destiny_state, PF.destiny_zip,
                PF.weight, PF.measures, PF.products, PF.carrier, PF.quoted_cost, 
                PF.moneda, PF.reference_number, PF.required_auth_level, PF.status_id,
                PF.recovery_file, PF.recovery_evidence,
                U.name as creator_name, U.email as creator_email,
                S.name as status_name,
                COALESCE(PFA.act_approv, 0) as approval_status
             FROM PremiumFreight PF
             LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id
             INNER JOIN User U ON PF.user_id = U.id
             LEFT JOIN Status S ON PF.status_id = S.id
             WHERE PF.id = ?";
$orderStmt = $db->prepare($orderSql);
$orderStmt->bind_param("i", $orderId);
$orderStmt->execute();
$orderResult = $orderStmt->get_result();

if ($orderResult->num_rows === 0) {
    showError('Orden no encontrada.');
    exit;
}

$orderData = $orderResult->fetch_assoc();

// URLs para las acciones
$approveUrl = URLM . "PFmailSingleAction.php?action=approve&token=" . urlencode($token);
$rejectUrl = URLM . "PFmailSingleAction.php?action=reject&token=" . urlencode($token);

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight Order #<?php echo $orderId; ?></title>
    
    <!-- Usar exactamente los mismos recursos que la página principal -->
    <link rel="stylesheet" href="<?php echo URLPF; ?>css/bootstrap.min.css">
    <link rel="stylesheet" href="<?php echo URLPF; ?>css/styles.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200">
    
    <!-- Scripts necesarios -->
    <script src="<?php echo URLPF; ?>js/html2canvas.min.js"></script>
    <script src="<?php echo URLPF; ?>js/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="<?php echo URLPF; ?>js/bootstrap.bundle.min.js"></script>
    
    <!-- Variable global URL necesaria para los scripts -->
    <script>
        // Definir variables globales que necesitan los módulos JS
        window.URL = '<?php echo URLPF; ?>';
        window.URLM = '<?php echo URLM; ?>';
        
        // Simular las variables que usa la página principal
        window.allOrders = [<?php echo json_encode($orderData); ?>];
        window.originalOrders = [<?php echo json_encode($orderData); ?>];
        window.authorizationLevel = <?php echo $tokenData['user_id']; ?>; // Nivel del aprobador
        window.userName = '<?php echo htmlspecialchars($tokenData['approver_name']); ?>';
    </script>
    
    <style>
        body {
            font-family: 'Merriweather', Georgia, serif;
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
        }
        .actions-container {
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
        }
        .action-btn {
            padding: 15px 30px;
            font-size: 1.1rem;
            font-weight: bold;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin: 10px;
            min-width: 150px;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        .btn-approve {
            background-color: #28a745;
            color: white;
        }
        .btn-approve:hover {
            background-color: #218838;
            transform: translateY(-2px);
            color: white;
            text-decoration: none;
        }
        .btn-reject {
            background-color: #dc3545;
            color: white;
        }
        .btn-reject:hover {
            background-color: #c82333;
            transform: translateY(-2px);
            color: white;
            text-decoration: none;
        }
        .btn-download {
            background-color: #17a2b8;
            color: white;
        }
        .btn-download:hover {
            background-color: #138496;
            transform: translateY(-2px);
            color: white;
            text-decoration: none;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: bold;
            margin-left: 15px;
        }
        .status-pending {
            background-color: #ffc107;
            color: #856404;
        }
        .status-approved {
            background-color: #28a745;
            color: white;
        }
        .status-rejected {
            background-color: #dc3545;
            color: white;
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
        
        /* Estilos para el SVG container */
        #svgContainer svg {
            max-width: 100%;
            height: auto;
        }
        
        /* Copiar estilos del modal de la página principal */
        .swal-on-top {
            z-index: 10000 !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header-card">
            <h1 class="order-title">Order #<?php echo $orderId; ?></h1>
            
            <div class="approver-info">
                <strong>Approver:</strong> <?php echo htmlspecialchars($tokenData['approver_name']); ?>
                <span class="status-badge status-pending">Pending Approval</span>
            </div>
        </div>

        <!-- SVG Container - usar exactamente el mismo ID que en la página principal -->
        <div class="svg-container">
            <div id="svgContainer" class="loading">
                Loading order details...
            </div>
        </div>

        <!-- Actions -->
        <?php if ($tokenData['is_used'] == 0): ?>
        <div class="actions-container">
            <h3 style="margin-bottom: 25px; color: #034C8C;">Action Required</h3>
            <p style="margin-bottom: 30px; color: #6c757d;">Please review the order details above and choose an action:</p>
            
            <a href="javascript:void(0)" class="action-btn btn-approve" onclick="confirmAction('approve')">
                ✓ Approve Order
            </a>
            <a href="javascript:void(0)" class="action-btn btn-reject" onclick="confirmAction('reject')">
                ✗ Reject Order
            </a>
            <a href="javascript:void(0)" class="action-btn btn-download" onclick="downloadPDF()">
                📄 Download PDF
            </a>
        </div>
        <?php else: ?>
        <div class="actions-container">
            <h3 style="color: #28a745;">✓ Action Already Completed</h3>
            <p style="color: #6c757d;">This order has already been processed.</p>
            <a href="javascript:void(0)" class="action-btn btn-download" onclick="downloadPDF()">
                📄 Download PDF
            </a>
        </div>
        <?php endif; ?>
    </div>

    <!-- Cargar los módulos exactamente como en la página principal -->
    <script type="module">
        // Importar exactamente los mismos módulos que usa la página principal
        import { loadAndPopulateSVG, generatePDF } from '<?php echo URLPF; ?>js/svgOrders.js';

        // URLs para las acciones
        window.approveUrl = '<?php echo $approveUrl; ?>';
        window.rejectUrl = '<?php echo $rejectUrl; ?>';

        // Cargar el SVG cuando la página esté lista - EXACTAMENTE como en la página principal
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                // Usar los mismos datos que están disponibles en window.allOrders
                const orderData = window.allOrders[0];
                
                console.log('Loading SVG with order data:', orderData);
                
                // Usar exactamente la misma función que funciona en la página principal
                await loadAndPopulateSVG(orderData, 'svgContainer');
                
                console.log('SVG loaded successfully');
            } catch (error) {
                console.error('Error loading SVG:', error);
                document.getElementById('svgContainer').innerHTML = 
                    '<div class="error">Error loading order details. Please try again later.</div>';
            }
        });

        // Función para confirmar acciones
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
                cancelButtonText: 'Cancel',
                customClass: { container: 'swal-on-top' }
            }).then((result) => {
                if (result.isConfirmed) {
                    const url = action === 'approve' ? window.approveUrl : window.rejectUrl;
                    
                    // Mostrar loading
                    Swal.fire({
                        title: 'Processing...',
                        text: 'Please wait while we process your request.',
                        allowOutsideClick: false,
                        customClass: { container: 'swal-on-top' },
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    
                    // Redirigir a la URL de acción
                    window.location.href = url;
                }
            });
        };

        // Función para descargar PDF - usar exactamente la misma que funciona
        window.downloadPDF = async function() {
            try {
                Swal.fire({
                    title: 'Generating PDF...',
                    text: 'Please wait while we prepare your document.',
                    allowOutsideClick: false,
                    customClass: { container: 'swal-on-top' },
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                // Usar exactamente los mismos datos que están en window.allOrders
                const orderData = window.allOrders[0];
                await generatePDF(orderData, `PF_Order_${orderData.id}`);
                
                Swal.close();
                
                Swal.fire({
                    icon: 'success',
                    title: 'PDF Downloaded!',
                    text: 'The PDF has been generated and downloaded successfully.',
                    timer: 3000,
                    timerProgressBar: true,
                    customClass: { container: 'swal-on-top' }
                });
                
            } catch (error) {
                console.error('Error generating PDF:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Could not generate PDF. Please try again later.',
                    customClass: { container: 'swal-on-top' }
                });
            }
        };
    </script>
</body>
</html>