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
</head>
<body>
    <div class="container mt-5">
        <h1 class="text-center">Selecciona una Planta</h1>
        <form action="procesarSeleccion.php" method="POST" class="mt-4">
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
            <button type="submit" class="btn btn-primary">Enviar</button>
        </form>
    </div>
</body>
</html>