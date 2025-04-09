<?php

include_once('db/db.php');

$nombre = $_POST['nombre'];
$marca = $_POST['marca'];
$descripcion = $_POST['descripcion'];

try {
    $con = new LocalConector();
    $conex=$con ->conectar();

    $stmt = $conex->prepare("INSERT INTO `Productos`(`Nombre`, `Marca`, `Descripcion`) VALUES (?,?,?,'1')");
    $stmt->bind_param("ss", $nombre, $marca, $descripcion);
    echo("Se ha registrado la informacion: " .$nombre . $marca . $descripcion);

    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Insert exitoso"]);
    } else {
        echo json_encode(["success" => false, "message" => "No se pudo insertar el registro"]);
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e){
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}
?>

