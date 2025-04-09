<?php

include_once('dao/db/db.php');

// Leer los parámetros de la URL
$nombre = $_GET['nombre'];
$marca = $_GET['marca'];
$descripcion = $_GET['descripcion'];

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    $stmt = $conex->prepare("SELECT * FROM `Productos` WHERE `Nombre` = ? AND `Marca` = ? AND `Descripcion` = ?");
    $stmt->bind_param("sss", $nombre, $marca, $descripcion);
    $stmt->execute();


    // Obtener los resultados
    $result = $stmt->get_result();
    $productos = $result->fetch_all(MYSQLI_ASSOC);

    // Verificar si se encontraron productos
    if (empty($productos)) {
        echo json_encode(["success" => false, "message" => "No se encontraron productos"]);
    } else {
        echo json_encode(["success" => true, "data" => $productos]);
    }
    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}
?>
