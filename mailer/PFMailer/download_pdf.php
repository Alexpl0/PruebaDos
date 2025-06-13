<?php
/**
 * download_pdf.php - Endpoint para descargar PDF directamente desde emails
 */

require_once __DIR__ . '/config.php';
require_once 'PFDB.php';
require_once 'PFmailUtils.php';

// Verificar parámetros
if (!isset($_GET['order']) || !isset($_GET['token'])) {
    showError('Required parameters missing.');
    exit;
}

$orderId = intval($_GET['order']);
$token = $_GET['token'];

// Conectar a la base de datos
$con = new LocalConector();
$db = $con->conectar();

// Verificar que el token sea válido
$sql = "SELECT * FROM EmailActionTokens WHERE token = ? AND order_id = ?";
$stmt = $db->prepare($sql);
$stmt->bind_param("si", $token, $orderId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    showError('Invalid or expired token.');
    exit;
}

// Obtener detalles de la orden
$orderSql = "SELECT * FROM PremiumFreight WHERE id = ?";
$orderStmt = $db->prepare($orderSql);
$orderStmt->bind_param("i", $orderId);
$orderStmt->execute();
$orderResult = $orderStmt->get_result();

if ($orderResult->num_rows === 0) {
    showError('Order not found.');
    exit;
}

$orderData = $orderResult->fetch_assoc();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Downloading PDF - Order #<?php echo $orderId; ?></title>
    <script src="<?php echo URLPF; ?>js/html2canvas.min.js"></script>
    <script src="<?php echo URLPF; ?>js/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f8f9fa;
        }
        .loading-container {
            text-align: center;
            padding: 40px;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="loading-container">
        <h2>Preparing your PDF...</h2>
        <p>Please wait while we generate the document.</p>
    </div>

    <script type="module">
        import { generatePDF } from '<?php echo URLPF; ?>js/svgOrders.js';

        // Datos de la orden
        const orderData = <?php echo json_encode($orderData); ?>;

        // Generar PDF automáticamente al cargar la página
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                await generatePDF(orderData, `PF_Order_${orderData.id}`);
                
                // Mostrar mensaje de éxito y cerrar ventana
                Swal.fire({
                    icon: 'success',
                    title: 'PDF Downloaded!',
                    text: 'The document has been generated successfully.',
                    timer: 3000,
                    timerProgressBar: true
                }).then(() => {
                    window.close();
                });
                
            } catch (error) {
                console.error('Error generating PDF:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Could not generate PDF. Please try again later.',
                    confirmButtonText: 'Close'
                }).then(() => {
                    window.close();
                });
            }
        });
    </script>
</body>
</html>