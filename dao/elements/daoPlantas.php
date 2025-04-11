<?php

// URL del archivo JSON que contiene la información de las plantas
$url = "https://grammermx.com/Programas/Trafico/Premium%20Freight/plant.json";

try {
    // Inicializa una sesión cURL para la URL especificada
    $ch = curl_init($url);

    // Configura cURL para devolver el resultado como una cadena en lugar de imprimirlo directamente
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

    // Ejecuta la solicitud cURL y almacena el resultado
    $result = curl_exec($ch);

    // Cierra la sesión cURL
    curl_close($ch);

    // Decodifica el resultado JSON en un array asociativo de PHP
    $json = json_decode($result, true);

} catch (Exception $e) {
    // Si ocurre un error, devuelve un código de respuesta HTTP 500 y un mensaje de error en formato JSON
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
    exit;
}
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
        <h1 class="text-center">Información de Plantas</h1>
        <table class="table table-bordered table-striped mt-4">
            <thead class="table-dark">
                <tr>
                    <th>ID</th>
                    <th>Planta</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($json)): ?>
                    <?php foreach ($json as $planta): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($planta['ID']); ?></td>
                            <td><?php echo htmlspecialchars($planta['PLANT']); ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="2" class="text-center">No se encontraron datos</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</body>
</html>