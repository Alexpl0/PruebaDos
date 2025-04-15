<?php

include_once('db/db.php');

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    $username = isset($_GET['username']) ? $_GET['username'] : '';

    if ($username !== '') {
        $stmt = $conex->prepare("SELECT * FROM `Usuarios` WHERE `Username` = ?");
        $stmt->bind_param("s", $username);
    } else {
        $stmt = $conex->prepare("SELECT * FROM `Usuarios`");
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }

    echo json_encode(['status' => 'success', 'data' => $datos]);

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}