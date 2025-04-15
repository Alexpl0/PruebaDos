<?php

include_once('/dao/db/db.php');

$user=$_POST['user'];

try {
    $con = new LocalConector();
    $conex=$con ->conectar();

    $stmt = $conex->prepare("SELECT `IdUser`, `Username`, `Mail`, `Password`, `ROL` FROM `Usuarios` WHERE `Username` = ?;");
    $stmt->bind_param("s", $user);

    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }

    // Enviar datos como JSON
    echo json_encode(['status' => 'success', 'data' => $datos]);
    

    $stmt->close(); // Cierra la declaración preparada
    $conex->close(); // Cierra la conexión a la base de datos para evitar intrusos

} catch (Exception $e){
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}