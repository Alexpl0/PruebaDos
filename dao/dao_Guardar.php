<?php

include_once ('db/db.php');

$usuario = $_POST['usuario'];
$password = $_POST['password'];

try {
    $con = new LocalConector();
    $conex=$con ->conectar();

    $stmt = $conex->prepare("INSERT INTO `Usuarios`(`Nombre`, `Password`, `Estatus`) VALUES (?,?,'1')");
    $stmt->bind_param("ssi", $user, $password);

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