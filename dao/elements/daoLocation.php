<?php

include_once('../db/db.php');

// Fuerza la codificación UTF-8 para evitar conflictos con acentos
header('Content-Type: application/json; charset=utf-8');

try{
    // Se crea una instancia de la clase LocalConector para manejar la conexión a la base de datos
    $con = new LocalConector();
    // Se llama al método conectar() para establecer la conexión a la base de datos
    $conex = $con->conectar();

    // Establece la codificación de la conexión a UTF-8
    $conex->set_charset("utf8mb4");

    // Recuperar datos de la base de datos
    $stmt = $conex->prepare("SELECT * FROM `Location`");
    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }

    // Enviar datos como JSON embellecido y sin conflictos de acentos
    echo json_encode(['status' => 'success', 'data' => $datos], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $stmt->close(); // Cierra la declaración preparada.
    $conex->close(); // Cierra la conexión a la base de datos.

} catch (Exception $e){
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}