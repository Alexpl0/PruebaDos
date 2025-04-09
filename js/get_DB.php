<?php

include_once('dao/db/db.php');

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    $sql = "SELECT * FROM `Productos`"; //Aqui va la consulta que se necesite

    $stmt = $conex->prepare($sql); // Prepara la consulta SQL para su ejecución.

    if (!$stmt) { // Verifica si la preparación de la consulta fue exitosa.
        throw new Exception("Error en la preparación de la consulta: " . $conex->error); // Lanza una excepción si hay un error en la preparación.
    }

    $stmt->execute(); // Ejecuta la consulta preparada.
    $result = $stmt->get_result(); // Obtiene el resultado de la consulta.

    $productos = []; // Inicializa un array para almacenar los productos.
    while ($row = $result->fetch_assoc()) { // Itera sobre cada fila del resultado.
        $productos[] = $row; // Agrega la fila actual al array de productos.
    }

    // Verificar si se encontraron productos
    if (empty($productos)) {
        echo json_encode(["success" => false, "message" => "No se encontraron productos"]);
    } else {
        echo json_encode(["success" => true, "data" => $productos]);
    }

    $stmt->close();
    $conex->close();

    // Devolver respuesta JSON
    echo json_encode([ // Convierte el array en formato JSON.
        'status' => 'success', // Indica que la operación fue exitosa.
        'data' => $solicitudes // Los datos de las solicitudes obtenidas.
    ]);

} catch (Exception $e) { // Captura cualquier excepción que ocurra dentro del bloque try.
    echo json_encode([ // Convierte el array en formato JSON.
        'status' => 'error', // Indica que hubo un error.
        'message' => 'Error en la consulta: ' . $e->getMessage() // Mensaje de error.
    ]);
}
?>
