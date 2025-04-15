<?php
// Incluye y ejecuta el archivo daoPlantas.php una sola vez.
// Este archivo contiene la lógica para conectarse a la base de datos y obtener la lista de plantas.
// La variable $json se espera que sea definida en daoPlantas.php y contenga los datos de las plantas.
require_once __DIR__ . '/dao/elements/daoPlantas.php';
require_once __DIR__ . '/dao/elements/daoCodePlants.php';
require_once __DIR__ . '/dao/elements/daoTransport.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
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
                        <li class="nav__item"><a href="index.php" class="nav__link ">Home</a></li>
                        <li class="nav__item"><a href="newOrden.php" class="nav__link active">Nueva Orden</a></li>
                        <li class="nav__item"><a href="orders.php" class="nav__link">Ordenes Generadas</a></li>
                        <li class="nav__item"><a href="register.php" class="nav__link">Agregar Usuario</a></li>
                        <li class="nav__item"><a href="google.com" class="nav__link">Graficas</a></li>
                        <li class="nav__item"><a href="  " class="nav__link">Manual</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    </header>
    <div class="container mt-5"> 
        <h1 class="text-center">Selecciona una Planta</h1> 
        <form id="plant-form"> 
            
            <div class="mb-3"> 
                <label for="planta" class="form-label">Rquesting Plant:</label> 
                <select name="planta" id="planta" class="form-select"> <!-- Elemento desplegable (select) con nombre 'planta', ID 'planta' y clase de Bootstrap 'form-select' -->
                    <?php if (!empty($jsonPlantas)): ?> <!-- Comienza un bloque PHP: verifica si la variable jsonPlantas (que contiene los datos de las plantas) no está vacía -->
                        <?php foreach ($jsonPlantas as $planta): ?> <!-- Itera sobre cada elemento (planta) dentro del array jsonPlantas -->
                            <!-- Crea una opción dentro del select. El atributo 'value' contendrá el ID de la planta -->
                            <!-- Se usa htmlspecialchars para prevenir ataques XSS al mostrar datos -->
                            <option value="<?php echo htmlspecialchars($planta['ID']); ?>">
                                <!-- El texto visible de la opción será el nombre de la planta ('PLANT') -->
                                <!-- Se usa htmlspecialchars para prevenir ataques XSS al mostrar datos -->
                                <?php echo htmlspecialchars($planta['PLANT']); ?>
                            </option> <!-- Fin de la opción -->
                        <?php endforeach; ?> <!-- Fin del bucle foreach -->
                    <?php else: ?> <!-- Si la variable $json está vacía -->
                        <!-- Muestra una opción deshabilitada indicando que no se encontraron datos -->
                        <option value="" disabled>No se encontraron datos, JSON_Plantas vacio</option>
                    <?php endif; ?>
                </select>
            </div> 

            <div class="mb-3">
                <label for="codeplanta" class="form-label">Plant Code:</label>
                <select name="codeplanta" id="codeplanta" class="form-select">
                    <?php if (!empty($jsonCodePlants)): ?>
                        <?php foreach ($jsonCodePlants as $codeplanta): ?>
                            <option value="<?php echo htmlspecialchars($codeplanta['ID']); ?>">
                                <?php echo htmlspecialchars($codeplanta['PLANT_CODE']); ?> 
                            </option>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <option value="" disabled>No se encontraron datos, jsonCodePlants vacio</option>
                    <?php endif; ?>
                </select>
            </div>

            <div class="mb-3">
                <label for="transport" class="form-label">Transport Mode:</label> 
                <select name="transport" id="transport" class="form-select">
                    <?php if (!empty($jsonTransport)): ?>
                        <?php foreach ($jsonTransport as $transport): ?>
                            <option value="<?php echo htmlspecialchars($transport['ID']); ?>">
                                <?php echo htmlspecialchars($transport['MODE']); ?> 
                            </option>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <option value="" disabled>No se encontraron datos, jsonCodePlants vacio</option>
                    <?php endif; ?>
                </select>
            </div>

            <!-- El atributo 'onclick' llama a la función JavaScript 'enviar' cuando se hace clic, pasando el objeto evento -->
            <button type="button" class="btn btn-primary" onclick="enviar(event)">Enviar</button>
        </form> 
    </div>

    <!-- Incluye la biblioteca jQuery desde una CDN. jQuery es necesario para Select2 y facilita la manipulación del DOM y eventos -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <!-- Incluye el archivo JavaScript de Select2 desde una CDN -->
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script> // Inicio de un bloque de código JavaScript
        // Ejecuta la función anónima cuando el documento HTML esté completamente cargado y listo
        $(document).ready(function() {
            // Selecciona el elemento con ID 'planta' usando jQuery y le aplica la funcionalidad de Select2
            $('#planta').select2({
                placeholder: "Plantas", // Define un texto de marcador de posición para el select
                allowClear: true // Permite que el usuario borre la selección actual
            });

            
            $('#codeplanta').select2({
                placeholder: "Codigos de Plantas", 
                allowClear: true 
            });

             
             $('#transport').select2({
                placeholder: "Tipo de Transporte", 
                allowClear: true 
            });
        });

        // Define una función JavaScript llamada 'enviar' que recibe un parámetro 'event'
        function enviar(event) {
            // Previene el comportamiento predeterminado del evento (en este caso, el envío del formulario que recargaría la página)
            event.preventDefault();

            // Obtiene la referencia al elemento <select> usando su ID
            const selectPlant = document.getElementById('planta');
            // Obtiene el texto visible de la opción que está actualmente seleccionada en el <select>
            const selectedPlantName = selectPlant.options[selectPlant.selectedIndex].text;

            const selectCodePlant = document.getElementById('codeplanta');
            const selectedCodePlant = selectCodePlant.options[selectCodePlant.selectedIndex].text;

            const selectTransport = document.getElementById('transport');
            const selectedTransport = selectTransport.options[selectTransport.selectedIndex].text;

            // Muestra el nombre de la planta seleccionada en la consola de desarrollador del navegador
            console.log('Planta seleccionada:', selectedPlantName);
            console.log('Código de planta seleccionado:', selectedCodePlant);
            console.log('Modo de Transporte: ', selectedTransport )
        }
    </script>
</body> 
</html>