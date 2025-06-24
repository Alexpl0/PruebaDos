<?php
session_start();
require_once 'config.php'; // Include config.php to get URL constant
include_once 'dao/users/auth_check.php';
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
$userID = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
$role = isset($_SESSION['user']['role']) ? $_SESSION['user']['role'] : null;
$plant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
?>
<script>
    window.authorizationLevel = <?php echo json_encode($nivel); ?>;
    window.userName = <?php echo json_encode($name); ?>;
    window.userID = <?php echo json_encode($userID); ?>;
    window.role = <?php echo json_encode($role); ?>;
    window.userPlant = <?php echo json_encode($plant); ?>;
    // Definimos la variable global de JavaScript con la URL base desde PHP
    const BASE_URL = '<?php echo URLPF; ?>'; 
    // También mantener URL para compatibilidad
    window.URL_BASE = '<?php echo URLPF; ?>';
    // Agregar esta línea para el mailer
    const URLM = '<?php echo URLM; ?>';
    
    // Crear objeto user con json_encode para evitar problemas de comillas
    const user = {
        name: <?php echo json_encode($name); ?>,
        id: <?php echo json_encode($userID); ?>,
        role: <?php echo json_encode($role); ?>,
        plant: <?php echo json_encode($plant); ?>,
        authorizationLevel: <?php echo json_encode($nivel); ?>
    };
</script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <title>Orders</title>
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    
    <!-- Local CSS files -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/orders.css">
    <link rel="stylesheet" href="css/dataTables.css">

    <!-- DataTables CSS -->
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/buttons/2.2.2/css/buttons.dataTables.min.css">
</head>
<body>
    <div id="header-container"></div>
    
    <div id="mainOrders">
        <h1 id="title1">Generated Orders History</h1>
        <h1 id="title2"></h1>
        
        <!-- Botones de Histórico -->
        <div class="buttons-container">
            <button type="button" class="btn btn-primary" onclick="window.location.href='weekly-orders-history.php'">
                <i class="fas fa-calendar-week"></i>  Weekly History
            </button>
            <button type="button" class="btn btn-success" onclick="window.location.href='total-orders-history.php'">
                <i class="fas fa-history"></i>  Total History
            </button>
        </div>
    </div>

    <main id="main"> 
        <div id="card"></div>
    </main>
    
    <!-- Modal -->
    <div id="myModal" class="modal">
        <div class="modal-content">
            <span id="closeModal" class="close-button">&times;</span>
            <div class="modal-buttons">
                <button id="savePdfBtn" class="save-pdf-button icon-only-btn" title="Save as PDF">
                    <span class="material-symbols-outlined">picture_as_pdf</span>
                </button>
                <button id="approveBtn" class="icon-only-btn" title="Approve Order">
                    <span class="material-symbols-outlined">check_circle</span>
                </button>
                <button id="rejectBtn" class="icon-only-btn" title="Reject Order">
                    <span class="material-symbols-outlined">cancel</span>
                </button>
            </div>
            <div id="svgPreview" class="svg-frame"></div>
        </div>
    </div>

    <footer class="text-center py-3">
        <p>© 2025 Grammer. All rights reserved.</p>
    </footer>

    <!-- PDF and Canvas Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
    
    <!-- jQuery and Bootstrap JS -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>

    <!-- DataTables JS -->
    <script type="text/javascript" src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/dataTables.buttons.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.html5.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.print.min.js"></script>

    <!-- Custom scripts -->
    <script src="js/header.js"></script>
    <script src="js/uploadFiles.js"></script>
    <script src="js/dataTables.js" type="module"></script>
    <script src="js/orders.js" type="module"></script>
</body>
</html>