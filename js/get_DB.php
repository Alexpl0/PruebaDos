<?php

include_once('dao/db/db.php');

// Leer los parámetros de la URL
$nombre = $_GET['nombre'];
$marca = $_GET['marca'];
$descripcion = $_GET['descripcion'];

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    $stmt = $conex->prepare("SELECT * FROM `Productos`");
    $stmt->bind_param("sss", $nombre, $marca, $descripcion);
    $stmt->execute();

    // Se obtienen los resultados de la consulta, get_result() devuelve un objeto de resultado
    $result = $stmt->get_result();

    // Se verifica si se obtuvieron resultados, $productos es un array que almacenara los resultados
    $productos = [];

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}
?>
