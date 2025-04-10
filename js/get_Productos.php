<?php
include("db.php");
$con = connection();

// Consulta para obtener los datos de los productos
$sql = "SELECT * FROM users";
$query = mysqli_query($con, $sql);
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Productos Registrados</title>
</head>

<body>
    <header>
        <h1>Productos Registrados</h1>
    </header>

    <main>
        <section class="users-table">
            <h2>Lista de Productos</h2>
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
                <tbody>
                    <?php if (mysqli_num_rows($query) > 0): ?>
                        <?php while ($row = mysqli_fetch_assoc($query)): ?>
                            <tr>
                                <td><?= htmlspecialchars($row['id']) ?></td>
                                <td><?= htmlspecialchars($row['nombre']) ?></td>
                                <td><?= htmlspecialchars($row['marca']) ?></td>
                                <td><?= htmlspecialchars($row['descripcion']) ?></td>
                                <td><a href="editar.php?id=<?= urlencode($row['id']) ?>">Editar</a></td>
                                <td><a href="eliminar.php?id=<?= urlencode($row['id']) ?>" onclick="return confirm('¿Estás seguro de eliminar este producto?');">Eliminar</a></td>
                            </tr>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="6">No hay productos registrados.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </section>
    </main>

    <footer>
        <p>&copy; 2025 Productos CRUD</p>
    </footer>
</body>

</html>