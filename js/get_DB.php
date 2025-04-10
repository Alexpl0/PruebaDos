<?php

include_once('../dao/db/db.php');


try{
    // Se crea una instancia de la clase LocalConector para manejar la conexión a la base de datos
    $con = new LocalConector();
    // Se llama al método conectar() para establecer la conexión a la base de datos
    $conex=$con ->conectar();

    //Query para conectar a la tabla de la base datos. Se identifica la tabla y los campos, ademas los VALUES se dejan con ? para evitar inyecciones SQL
    $stmt = $conex->prepare("SELECT * FROM `Productos` WHERE 1");

    // Se ejecuta la consulta
    $stmt->execute();


    $result = $stmt->get_result(); // Obtiene el resultado de la consulta.

    $solicitudes = []; // Inicializa un array para almacenar las solicitudes.
    while ($row = $result->fetch_assoc()) { // Itera sobre cada fila del resultado.
        $solicitudes[] = $row; // Agrega la fila actual al array de solicitudes.
    }

    $stmt->close(); // Cierra la declaración preparada.
    $conex->close(); // Cierra la conexión a la base de datos.

    // Devolver respuesta JSON
    echo json_encode([ // Convierte el array en formato JSON.
        'status' => 'success', // Indica que la operación fue exitosa.
        'data' => $solicitudes // Los datos de las solicitudes obtenidas.
    ]);


    $stmt->close(); // Cierra la declaración preparada.
    $conex->close(); // Cierra la conexión a la base de datos.


} catch (Exception $e){
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}