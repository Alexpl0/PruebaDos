<?php
require_once __DIR__ . '/dao/elements/daoPlantas.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plantas</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <!-- Select2 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
</head>
<body>
    <div class="container mt-5">
        <h1 class="text-center">Selecciona una Planta</h1>
        <form id="plant-form">
            <div class="mb-3">
                <label for="planta" class="form-label">Plantas disponibles:</label>
                <select name="planta" id="planta" class="form-select">
                    <?php if (!empty($json)): ?>
                        <?php foreach ($json as $planta): ?>
                            <option value="<?php echo htmlspecialchars($planta['ID']); ?>">
                                <?php echo htmlspecialchars($planta['PLANT']); ?>
                            </option>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <option value="" disabled>No se encontraron datos</option>
                    <?php endif; ?>
                </select>
            </div>
            <button onclick="enviar(event)">Enviar</button>
        </form>
    </div>

    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- Select2 JS -->
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script>
        // Inicializar Select2 en el elemento <select>
        $(document).ready(function() {
            $('#planta').select2({
                placeholder: "Busca una planta",
                allowClear: true
            });
        });

        function enviar(event) {
            event.preventDefault(); // Evita que la página se recargue
            const selectElement = document.getElementById('planta');
            const selectedPlantName = selectElement.options[selectElement.selectedIndex].text; // Obtiene el texto de la opción seleccionada
            console.log(selectedPlantName); // Muestra el nombre de la planta en la consola
        }
    </script>
</body>
</html>