<?php
session_start();
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
?>
<script>
    window.authorizationLevel = <?php echo json_encode($nivel); ?>;
    window.userName = <?php echo json_encode($name); ?>;
    console.log("Auth Level: " + window.authorizationLevel);
    console.log("UserName: " + window.userName);
</script>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <title>Orders</title>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script type="module" src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/orders.css">
</head>
<body>
    <header class="header">
        <a href="#" class="header__logo">GRAMMER</a>
        <ion-icon name="menu-outline" class="header__toggle" id="nav-toggle"></ion-icon>
        <nav class="nav" id="nav-menu">
            <div class="nav__content bd-grid">
                <ion-icon name="close-outline" class="nav__close" id="nav-close"></ion-icon>
                <div class="nav__perfil">
                    <div class="nav__img">
                        <img src="assets/logo/logo.png" alt="logoGRAMMER">
                    </div>
                    <div>
                        <a href="#" class="nav__name">SPECIAL FREIGHT</a>
                    </div>
                </div> 
                <div class="nav__menu">
                    <ul class="nav__list">
                        <li class="nav__item"><a href="index.php" class="nav__link ">Home</a></li>
                        <li class="nav__item"><a href="newOrder.php" class="nav__link ">Nueva Orden</a></li>
                        <li class="nav__item"><a href="orders.php" class="nav__link active">Ordenes Generadas</a></li>
                        <li class="nav__item"><a href="register.php" class="nav__link">Agregar Usuario</a></li>
                        <li class="nav__item"><a href="google.com" class="nav__link">Graficas</a></li>
                        <li class="nav__item"><a href="  " class="nav__link">Manual</a></li>
                        <?php if (isset($_SESSION['user'])): ?>
                            <li class="nav__item"><a href="logout.php" class="nav__link">Cerrar sesión</a></li>
                        <?php endif; ?>
                    </ul>
                </div>
            </div>
        </nav>
    </header>

    <div id="mainOrders">
            <h1 id="title1">Historial de Ordenes Generadas</h1>
            <h1 id="title2"></h1>
        
            <div class="table-responsive">
            <table class="table table-striped table-bordered" id="ordersTable">
                <thead>
                    <tr>
                        <!--INFO PLANT -->
                        <th>Plant</th>
                        <th>Plant Code</th>
                        <th>Transport Mode</th>
                        <th>In/Out Bound</th>
                        <th>Cost in Euros (€)</th>
                        <th>Area of Responsibility</th>
                        <th>Internal/External Service</th>
                        <th>Costs Paid By</th>
                        <th>Category Cause</th>
                        <th>Project Status</th>
                        <th>Recovery</th>
                        <th>Description and Root Cause</th>
                        <!-- SHIP FROM -->
                        <th>Company Name (Ship From)</th>
                        <th>City (Ship From)</th>
                        <th>State (Ship From)</th>
                        <th>ZIP (Ship From)</th>
                        <!-- DESTINATION -->
                        <th>Company Name (Destination)</th>
                        <th>City (Destination)</th>
                        <th>State (Destination)</th>
                        <th>ZIP (Destination)</th>
                        <!-- ORDER -->
                        <th>Weight</th>
                        <th>Measures</th>
                        <th>Products</th>
                        <!-- CARRIER -->
                        <th>Carrier</th>
                        <th>Quoted Cost</th>
                        <th>Reference</th>
                        <th>Reference Number</th>
                    </tr>
                </thead>
                <tbody id="tbodyOrders">
                    <!-- Rows will be dynamically added via JavaScript -->
                </tbody>
            </table>
        </div>
    </div>

    <main id="main">
       <div id="card"> 
        </div>
    </main>
    <!-- Modal -->
    <div id="myModal" class="modal">
      <div class="modal-content">
        <span id="closeModal" class="close-button">&times;</span>
        <div class="modal-buttons">
        <button id="savePdfBtn" class="save-pdf-button">Guardar PDF</button>
        <button id="approveBtn">Aprobar</button>
        <button id="rejectBtn">Rechazar</button>
    </div>

        <div id="svgPreview" class="svg-frame"></div>
      </div>
    </div>

    <!-- Scripts necesarios -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="js/header.js"></script>
    <script src="js/orders.js"></script>
</body>
</html>