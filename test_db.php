<?php

include_once('dao/db/db.php');

try {
    // Se crea una instancia de la clase LocalConector para manejar la conexión a la base de datos
    $con = new LocalConector();
    // Se llama al método conectar() para establecer la conexión a la base de datos
    $conex = $con->conectar();

    // Verificar si se proporciona un usuario como parámetro
    if (isset($_GET['usuario']) && !empty($_GET['usuario'])) {
        $usuario = $_GET['usuario'];

        // Recuperar datos de la base de datos filtrando por usuario
        $stmt = $conex->prepare("SELECT * FROM `CUENTAS` WHERE `USUARIO` LIKE ?");
        $likeUsuario = "%$usuario%";
        $stmt->bind_param("s", $likeUsuario);
        $stmt->execute();
        $result = $stmt->get_result();

        $datos = [];
        while ($row = $result->fetch_assoc()) {
            $datos[] = $row;
        }

        // Enviar datos como JSON
        echo json_encode(['status' => 'success', 'data' => $datos]);

        $stmt->close(); // Cierra la declaración preparada.
    } else {
        // Si no se proporciona un usuario, devolver un error
        http_response_code(400);
        echo json_encode(["success" => false, "mensaje" => "El parámetro 'usuario' es requerido."]);
    }

    $conex->close(); // Cierra la conexión a la base de datos.

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}