<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <title>Orders</title> <!-- Define el título que aparece en la pestaña o barra de título del navegador -->
    
    <!-- Incluye la biblioteca SweetAlert2 desde una CDN para mostrar alertas y mensajes bonitos -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Agregar Ionicons en el head con la versión más reciente -->
    <script type="module" src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.js"></script>
    
    
    <!-- Enlaza la hoja de estilos CSS de Bootstrap desde una CDN para aplicar estilos predefinidos -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    
    <!-- Archivos CSS locales -->
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
                            <th>Planta</th>
                            <th>Code Planta</th>
                            <th>Transport</th>
                            <th>In/Out Bound</th>
                            <th>Costo Euros</th>
                            <th>Description</th>
                            <th>Area</th>
                            <th>Int/Ext</th>
                            <th>Paid By</th>
                            <th>Category Cause</th>
                            <th>Project Status</th>
                            <th>Recovery</th>
                            <th>Weight</th>
                            <th>Measures</th>
                            <th>Products</th>
                            <th>Carrier</th>
                            <th>Quoted Cost</th>
                            <th>Reference</th>
                            <th>Reference Number</th>
                            <th>Company Name Ship</th>
                            <th>City Ship</th>
                            <th>State Ship</th>
                            <th>Zip Ship</th>
                            <th>Company Name Dest</th>
                            <th>City Dest</th>
                            <th>State Dest</th>
                            <th>Zip Dest</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyOrders">
                        <!-- Aquí se insertarán las filas dinámicamente con JS o PHP -->
                    </tbody>
                </table>
            </div>
    </div>
        <!-- ...existing code... -->


        
        <div class="card" style="width: 18rem;">
            <div class="card-body">
                <h5 class="card-title">Card title</h5>
                <h6 class="card-subtitle">Card subtitle</h6>
                <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                <button id="cardLink1" class="btn btn-primary">Card link</button>
                <button id="cardLink2" class="btn btn-secondary">Another link</button>
            </div>
        </div>

    </div>

       <!-- Archivos JS locales -->
    <script src="js/header.js"></script>
    <script src="js/orders.js"></script>

    <!-- Incluye la biblioteca jQuery desde una CDN. jQuery es necesario para Select2 y facilita la manipulación del DOM y eventos -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>

</body>
</html>