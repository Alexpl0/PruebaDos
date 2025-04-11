<?php
// filepath: c:\Users\Ex-Perez-J\OneDrive - GRAMMER AG\Desktop\SPECIAL FREIGHT\index.php
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transport Order</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Agregar Ionicons en el head con la versión más reciente -->
    <script type="module" src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.2.2/dist/ionicons/ionicons.js"></script>
    
    <!-- Archivos CSS locales -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
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
                        <li class="nav__item"><a href="index.php" class="nav__link active">Home</a></li>
                        <li class="nav__item"><a href="scanQr.php" class="nav__link">Nueva Orden</a></li>
                        <li class="nav__item"><a href="salas.php" class="nav__link">Ordenes Generadas</a></li>
                        <li class="nav__item"><a href="newQR.php" class="nav__link">Agregar Usuario</a></li>
                        <li class="nav__item"><a href="ExcelToJson.php" class="nav__link">Graficas</a></li>
                        <li class="nav__item"><a href="#" class="nav__link">Manual</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    </header>
    
    <section class="text-center">
        <!-- Background image -->
        <div class="p-5 bg-image" style="height: 100px;"></div>
        <!-- Background image -->

        <div class="card mx-4 mx-md-5 shadow-5-strong" style="margin-top: -100px; background: hsla(0, 0%, 100%, 0.8); backdrop-filter: blur(30px);">
            <div class="card-body py-5 px-md-5">
                <form action="/submit-order" method="post" id="order-form">
                    <div class="row d-flex justify-content-center">
                        <div class="col-lg-8">
                            <h3 class="fw-bold mb-2">SPECIAL FREIGHT AUTHORISATION</h3>
                            <h4>Transport Order</h4>
                        </div>
                    </div>
                    <div class="d-flex flex-wrap justify-content-center mt-5">
                        <div class="form-group mb-4">
                            <label for="plant">Requesting Plant</label>
                            <select name="PLANT" id="plant" class="form-control">
                                <option value="Plant1">Plant 1</option>
                                <option value="Plant2">Plant 2</option>
                            </select>
                        </div>
                        <div class="form-group mb-4 ms-0 ms-sm-5">
                            <label for="code">Plant Code</label>
                            <select name="PLANT_CODE" id="code" class="form-control">
                                <option value="Code1">Code 1</option>
                                <option value="Code2">Code 2</option>
                            </select>
                        </div>
                    </div>
                    <div class="d-flex flex-wrap justify-content-center mt-4">
                        <div class="form-group mb-4">
                            <label for="MODE">Transport Mode</label>
                            <select name="MODE" id="MODE" class="form-control">
                                <option value="Air">Air</option>
                                <option value="Sea">Sea</option>
                                <option value="Land">Land</option>
                            </select>
                        </div>
                        <div class="form-group mb-4 ms-0 ms-sm-5">
                            <label for="InOut">In-/Outbound</label>
                            <select name="IN_OUT" id="InOut" class="form-control">
                                <option value="Inbound">Inbound</option>
                                <option value="Outbound">Outbound</option>
                            </select>
                        </div>
                        <div class="form-group mb-3 ms-0 ms-sm-5">
                            <label for="cost">Costs in €</label>
                            <input type="text" name="COST" id="cost" class="form-control" placeholder="Costs in €" disabled>
                        </div>
                    </div>
                    <div class="d-flex flex-wrap justify-content-center mt-4">
                        <div class="form-group mb-4">
                            <label for="RESPONSIBILITY">Area of Responsibility</label>
                            <select name="RESPONSIBILITY" id="RESPONSIBILITY" class="form-control">
                                <option value="Area1">Area 1</option>
                                <option value="Area2">Area 2</option>
                            </select>
                        </div>
                        <div class="form-group mb-4 ms-0 ms-sm-5">
                            <label for="IN_EXT">Internal/External</label>
                            <select name="IN_EXT" id="IN_EXT" class="form-control">
                                <option value="Internal">Internal</option>
                                <option value="External">External</option>
                            </select>
                        </div>
                        <div class="form-group mb-3 ms-0 ms-sm-5">
                            <label for="costsPaid">Costs paid by</label>
                            <input type="text" name="COSTS_PAID" id="costsPaid" class="form-control" placeholder="Costs paid by" disabled>
                        </div>
                    </div>
                    <div class="d-flex flex-wrap justify-content-center mt-4">
                        <button type="submit" class="btn btn-success">Submit</button>
                    </div>
                </form>
            </div>
        </div>
    </section>
</body>
</html>