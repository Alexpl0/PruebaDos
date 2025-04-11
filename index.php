<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inicio de Sesión</title>
</head>
<body>
    <h2>Inicio de Sesión</h2>
    <?php
    if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $usuario = $_POST['usuario'];
        $contraseña = $_POST['contraseña'];

        // Credenciales simples codificadas para demostración
        $usuarioValido = "admin";
        $contraseñaValida = "admin";

        if ($usuario === $usuarioValido && $contraseña === $contraseñaValida) {
            echo "<p>¡Bienvenido, $usuario!</p>";
        } else {
            echo "<p style='color: red;'>Usuario o contraseña inválidos.</p>";
        }
    }
    ?>
    <form method="POST" action="">
        <label for="usuario">Usuario:</label><br>
        <input type="text" id="usuario" name="usuario" required><br><br>
        <label for="contraseña">Contraseña:</label><br>
        <input type="password" id="contraseña" name="contraseña" required><br><br>
        <button type="submit">Iniciar Sesión</button>
    </form>
</body>
</html>