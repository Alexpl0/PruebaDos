<?php
/**
 * orders.php - Main orders dashboard (Refactored)
 * This version uses the centralized context injection system.
 */

// 1. Incluir el sistema de autenticación.
require_once 'dao/users/auth_check.php';

// 2. Incluir el inyector de contexto desde su ubicación central.
// Este script crea la variable $appContextForJS e imprime el objeto `window.APP_CONTEXT`.
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    <title>Orders - Premium Freight</title>
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" xintegrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    
    <!-- Local CSS files -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/orders.css">
    <link rel="stylesheet" href="css/dataTables.css">
    <link rel="stylesheet" href="css/tour-styles.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css"/>

    <!-- DataTables CSS -->
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/buttons/2.2.2/css/buttons.dataTables.min.css">
    
    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <!-- Incluir el módulo de configuración JS. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->

    <?php 
    // Carga condicional del CSS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>
</head>
<body>
    <div id="header-container"></div>
    
    <div id="mainOrders">
        <h1 id="title1">Generated Orders History</h1>
        <h1 id="title2"></h1>
        
        <!-- Botones de Acciones e Histórico -->
        <div class="buttons-container">
            <div class="btn-group" role="group" aria-label="Action Buttons">
                <button type="button" class="btn btn-warning" onclick="window.location.href='weekOrders.php'">
                    <i class="fas fa-clock"></i> Pending Approval
                </button>
                <button type="button" class="btn btn-primary" onclick="window.location.href='weekly-orders-history.php'">
                    <i class="fas fa-calendar-week"></i>  Weekly History
                </button>
                <button type="button" class="btn btn-success" onclick="window.location.href='total-orders-history.php'">
                    <i class="fas fa-history"></i>  Total History
                </button>
                <button type="button" id="filterWarningsBtn" class="btn btn-danger" title="Show orders that require attention">
                    <i class="fas fa-exclamation-triangle"></i> Show Warnings
                </button>
                <button type="button" id="clearFilterBtn" class="btn btn-info" style="display:none;" title="Return to the main list of all orders">
                    <i class="fas fa-list-ul"></i> Show All Orders
                </button>
            </div>
        </div>
    </div>

    <!-- =========== Contenedor para la Búsqueda =========== -->
    <div class="search-container">
        <div class="input-group mb-4">
            <span class="input-group-text" id="basic-addon1"><i class="fas fa-search"></i></span>
            <input type="text" id="searchInput" class="form-control" placeholder="Search by Order ID or Description..." aria-label="Search">
        </div>
    </div>

    <main id="main"> 
        <div id="card"></div>
    </main>

    <!-- =========== Contenedor para la Paginación =========== -->
    <nav aria-label="Page navigation">
        <ul id="pagination-container" class="pagination justify-content-center">
            <!-- Los botones de paginación se generarán aquí con JavaScript -->
        </ul>
    </nav>
    
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

    <!-- Driver.js para el tour -->
    <script src="https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.js.iife.js"></script>

    <!-- Custom scripts -->
    <script src="js/header.js" type="module"></script>
    <script src="js/uploadFiles.js"></script>
    <script src="js/dataTables.js" type="module"></script>
    <script src="js/orders.js" type="module"></script>
    
    <?php 
    // Carga condicional del JS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>
