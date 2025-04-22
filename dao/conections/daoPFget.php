<?php

include_once('../db/db.php');


try{
    // Se crea una instancia de la clase LocalConector para manejar la conexión a la base de datos
    $con = new LocalConector();
    // Se llama al método conectar() para establecer la conexión a la base de datos
    $conex=$con ->conectar();

    // Recuperar datos de la base de datos
    $stmt = $conex->prepare("SELECT * FROM `PremiumFreight`");
    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }

// Enviar datos como JSON
    echo json_encode(['status' => 'success', 'data' => $datos]);

    $stmt->close(); // Cierra la declaración preparada.
    $conex->close(); // Cierra la conexión a la base de datos.


} catch (Exception $e){
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}