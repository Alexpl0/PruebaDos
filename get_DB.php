<?php
header('Content-Type: text/html; charset=utf-8');
include_once('db/db.php');

echo '<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Productos Registrados</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        h1, h2 {
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
        section {
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        input[type="text"], 
        input[type="number"] {
            padding: 8px;
            margin: 5px;
            width: calc(100% - 22px);
            box-sizing: border-box;
        }
        button {
            padding: 8px 15px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px 0;
        }
        button:hover {
            background-color: #45a049;
        }
        footer {
            text-align: center;
            margin-top: 20px;
            padding: 10px;
            background-color: #f1f1f1;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <header>
        <h1>Productos Registrados</h1>
    </header>

    <main>
        <section>
            <h2>Registrar Producto</h2>
            <input type="text" id="txtNombre" placeholder="Nombre del Producto">
            <input type="text" id="txtMarca" placeholder="Marca del Producto">
            <input type="text" id="txtDescripcion" placeholder="Descripción del Producto">
            <button id="btnGuardar" onclick="guardarProducto()">Guardar</button>
        </section>

        <section class="users-table">
            <h2>Lista de Productos</h2>
            <button id="btnMostrar" onclick="mostrarProductos()">Mostrar Productos</button>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Marca</th>
                        <th>Descripción</th>
                        <th>Editar</th>
                        <th>Eliminar</th>
                    </tr>
                </thead>
                <tbody id="userTable">';

try {
    // Se crea una instancia de la clase LocalConector para manejar la conexión a la base de datos
    $con = new LocalConector();
    // Se llama al método conectar() para establecer la conexión a la base de datos
    $conex = $con->conectar();

    // Recuperar datos de la base de datos
    $stmt = $conex->prepare("SELECT * FROM `CUENTAS`");
    $stmt->execute();
    $result = $stmt->get_result();

    // Check if there are any records
    if ($result->num_rows > 0) {
        // Output data of each row
        while ($row = $result->fetch_assoc()) {
            echo "<tr>
                <td>" . htmlspecialchars($row['ID'] ?? 'N/A') . "</td>
                <td>" . htmlspecialchars($row['USUARIO'] ?? 'N/A') . "</td>
                <td>" . htmlspecialchars($row['ROL'] ?? 'N/A') . "</td>
                <td>" . htmlspecialchars($row['CORREO'] ?? 'N/A') . "</td>
                <td><button onclick=\"cargarDatosParaActualizar(" . $row['ID'] . ", '" . 
                    htmlspecialchars($row['USUARIO'] ?? '', ENT_QUOTES) . "', '" . 
                    htmlspecialchars($row['ROL'] ?? '', ENT_QUOTES) . "', '" . 
                    htmlspecialchars($row['CORREO'] ?? '', ENT_QUOTES) . "')\">Editar</button></td>
                <td><button onclick=\"eliminarDesdeLista(" . $row['ID'] . ")\">Eliminar</button></td>
            </tr>";
        }
    } else {
        echo "<tr><td colspan='6'>No hay registros disponibles</td></tr>";
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    echo '<tr><td colspan="6" class="error">Error: ' . htmlspecialchars($e->getMessage()) . '</td></tr>';
}

echo '</tbody>
            </table>
        </section>

        <section>
            <h2>Eliminar Producto</h2>
            <input type="text" id="txtEliminar" placeholder="ID del Producto a Eliminar">
            <button id="btnEliminar" onclick="eliminarProducto()">Eliminar</button>
        </section>

        <section>
            <h2>Actualizar Producto</h2>
            <input type="number" id="txtActualizar" placeholder="ID del Producto a Actualizar">
            <input type="text" id="txtNombreActualizar" placeholder="Nuevo Nombre">
            <input type="text" id="txtMarcaActualizar" placeholder="Nueva Marca">
            <input type="text" id="txtDescripcionActualizar" placeholder="Nueva Descripción">
            <button id="btnActualizar" onclick="actualizarProducto()">Actualizar</button>
        </section>
    </main>

    <footer>
        <p>Help</p>
    </footer>

    <script>
        function cargarDatosParaActualizar(id, nombre, marca, descripcion) {
            document.getElementById("txtActualizar").value = id;
            document.getElementById("txtNombreActualizar").value = nombre;
            document.getElementById("txtMarcaActualizar").value = marca;
            document.getElementById("txtDescripcionActualizar").value = descripcion;
        }

        function eliminarDesdeLista(id) {
            document.getElementById("txtEliminar").value = id;
            eliminarProducto();
        }

        function actualizarProducto(){
            const id = document.getElementById("txtActualizar").value;
            const nombre = document.getElementById("txtNombreActualizar").value;
            const marca = document.getElementById("txtMarcaActualizar").value;
            const descripcion = document.getElementById("txtDescripcionActualizar").value;

            const formData = new FormData();
            formData.append("id", id);
            formData.append("nombre", nombre);
            formData.append("marca", marca);
            formData.append("descripcion", descripcion);

            fetch("https://grammermx.com/Jesus/PruebaDos/js/update_Producto.php", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Se actualizó el producto");
                    location.reload(); // Recargar para ver los cambios
                } else {
                    alert("No se actualizó el producto");
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Error al actualizar el producto");
            });
        }

        function eliminarProducto(){
            const id = document.getElementById("txtEliminar").value;

            const formData = new FormData();
            formData.append("id", id);

            fetch("https://grammermx.com/Jesus/PruebaDos/js/del_Producto.php", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Se eliminó el producto");
                    location.reload(); // Recargar para ver los cambios
                } else {
                    alert("No se eliminó el producto");
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Error al eliminar el producto");
            });
        }

        function guardarProducto() {
            const nombre = document.getElementById("txtNombre").value;
            const marca = document.getElementById("txtMarca").value;
            const descripcion = document.getElementById("txtDescripcion").value;

            const formData = new FormData();
            formData.append("nombre", nombre);
            formData.append("marca", marca);
            formData.append("descripcion", descripcion);

            fetch("https://grammermx.com/Jesus/PruebaDos/dao/dao_Guardar.php", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Se guardó el producto");
                    location.reload(); // Recargar para ver los cambios
                } else {
                    alert("No se guardó el producto");
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Error al guardar el producto");
            });
        }

        function mostrarProductos() {
            // Ya estamos mostrando los productos directamente desde el PHP,
            // pero podríamos recargar la página para mostrar datos actualizados
            location.reload();
        }
    </script>
</body>
</html>';
?>