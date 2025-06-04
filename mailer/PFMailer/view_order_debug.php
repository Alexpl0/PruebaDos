<?php
// Activar reporte de errores
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/view_order_errors.log');

try {
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

    // Consulta completa para obtener todos los detalles de la orden
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

} catch (Exception $e) {
    error_log("Error in view_order.php: " . $e->getMessage());
    showError('Error interno del servidor: ' . $e->getMessage());
    exit;
} catch (Error $e) {
    error_log("Fatal error in view_order.php: " . $e->getMessage());
    showError('Error fatal del servidor: ' . $e->getMessage());
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight Order #<?php echo $orderId; ?></title>
    
    <!-- Bootstrap CSS básico -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
            padding: 20px;
        }
        .header-card {
            background: linear-gradient(135deg, #034C8C 0%, #0056b3 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .content-card {
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .action-btn {
            padding: 15px 30px;
            font-size: 1.1rem;
            font-weight: bold;
            border: none;
            border-radius: 8px;
            margin: 10px;
            text-decoration: none;
            display: inline-block;
        }
        .btn-approve { background-color: #28a745; color: white; }
        .btn-reject { background-color: #dc3545; color: white; }
        .btn-download { background-color: #17a2b8; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header-card">
            <h1>Order #<?php echo $orderId; ?></h1>
            <p><strong>Approver:</strong> <?php echo htmlspecialchars($tokenData['approver_name']); ?></p>
            
            <!-- Actions dentro del header -->
            <?php if ($tokenData['is_used'] == 0): ?>
                <div class="mt-3">
                    <p class="mb-2"><strong>Action Required:</strong></p>
                    <a href="<?php echo $approveUrl; ?>" class="action-btn btn-approve">
                        ✓ Approve Order
                    </a>
                    <a href="<?php echo $rejectUrl; ?>" class="action-btn btn-reject">
                        ✗ Reject Order
                    </a>
                </div>
            <?php else: ?>
                <div class="mt-3">
                    <p class="mb-0"><strong>Status:</strong> ✓ Action Already Completed</p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Order Details -->
        <div class="content-card">
            <h3>Order Details</h3>
            <p><strong>Description:</strong> <?php echo htmlspecialchars($orderData['description'] ?? 'N/A'); ?></p>
            <p><strong>Created by:</strong> <?php echo htmlspecialchars($orderData['creator_name']); ?></p>
            <p><strong>Cost:</strong> €<?php echo number_format($orderData['cost_euros'] ?? 0, 2); ?></p>
            <p><strong>Date:</strong> <?php echo $orderData['date'] ?? 'N/A'; ?></p>
            
            <h4>Ship From</h4>
            <p>Company: <?php echo htmlspecialchars($orderData['origin_company_name'] ?? 'N/A'); ?></p>
            <p>City: <?php echo htmlspecialchars($orderData['origin_city'] ?? 'N/A'); ?></p>
            <p>State: <?php echo htmlspecialchars($orderData['origin_state'] ?? 'N/A'); ?></p>
            <p>ZIP: <?php echo htmlspecialchars($orderData['origin_zip'] ?? 'N/A'); ?></p>
            
            <h4>Destination</h4>
            <p>Company: <?php echo htmlspecialchars($orderData['destiny_company_name'] ?? 'N/A'); ?></p>
            <p>City: <?php echo htmlspecialchars($orderData['destiny_city'] ?? 'N/A'); ?></p>
            <p>State: <?php echo htmlspecialchars($orderData['destiny_state'] ?? 'N/A'); ?></p>
            <p>ZIP: <?php echo htmlspecialchars($orderData['destiny_zip'] ?? 'N/A'); ?></p>
        </div>
    </div>
</body>
</html>