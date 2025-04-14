<?php
header('Content-Type: text/html; charset=utf-8');
include_once('db/db.php');

// HTML head section with styling
echo '<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lista de Cuentas</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        h1 {
            color: #333;
            text-align: center;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f1f1f1;
        }
        .error {
            color: red;
            text-align: center;
            padding: 20px;
        }
    </style>
</head>
<body>
    <h1>Lista de Cuentas</h1>';

try {
    // Se crea una instancia de la clase LocalConector para manejar la conexión a la base de datos
    $con = new LocalConector();
    // Se llama al método conectar() para establecer la conexión a la base de datos
    $conex = $con->conectar();

    // Recuperar datos de la base de datos basado en la estructura correcta de la tabla CUENTAS
    $stmt = $conex->prepare("SELECT * FROM `CUENTAS`");
    $stmt->execute();
    $result = $stmt->get_result();

    // Start table output
    echo '<table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Correo</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Verificación</th>
            </tr>
        </thead>
        <tbody>';

    // Check if there are any records
    if ($result->num_rows > 0) {
        // Output data of each row
        while ($row = $result->fetch_assoc()) {
            echo "<tr>
                <td>" . htmlspecialchars($row['ID'] ?? 'N/A') . "</td>
                <td>" . htmlspecialchars($row['CORREO'] ?? 'N/A') . "</td>
                <td>" . htmlspecialchars($row['USUARIO'] ?? 'N/A') . "</td>
                <td>" . htmlspecialchars($row['ROL'] ?? 'N/A') . "</td>
                <td>" . htmlspecialchars($row['VERIFICACION'] ?? 'N/A') . "</td>
            </tr>";
        }
    } else {
        echo "<tr><td colspan='5'>No hay cuentas registradas</td></tr>";
    }

    echo '</tbody>
    </table>';

    $stmt->close(); // Cierra la declaración preparada.
    $conex->close(); // Cierra la conexión a la base de datos.

} catch (Exception $e) {
    echo '<div class="error">Error: ' . htmlspecialchars($e->getMessage()) . '</div>';
}

// Close HTML document
echo '</body>
</html>';
?>