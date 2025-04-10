<?php
    include_once('dao/db/db.php');
    $con = connection();


    try{
        // Se crea una instancia de la clase LocalConector para manejar la conexión a la base de datos
        $con = new LocalConector();
        // Se llama al método conectar() para establecer la conexión a la base de datos
        $conex=$con ->conectar();

        $stmt = $conex->prepare("SELECT * FROM `Productos`");

        if (!$stmt) { // Verifica si la preparación de la consulta fue exitosa.
            throw new Exception("Error en la preparación de la consulta: " . $conex->error); // Lanza una excepción si hay un error en la preparación.
        }

        // Se ejecuta la consulta
        $stmt->execute();
        $result = $stmt->get_result(); // Obtiene el resultado de la consulta.

        $productos = []; // Inicializa un array para almacenar las solicitudes.
        while ($row = $result->fetch_assoc()) { // Itera sobre cada fila del resultado.
            $productos[] = $row; // Agrega la fila actual al array de solicitudes.
        }

        $stmt->close(); // Cierra la declaración preparada.
        $conex->close(); // Cierra la conexión a la base de datos.

        // Devolver respuesta JSON
        echo json_encode([ // Convierte el array en formato JSON.
            'status' => 'success', // Indica que la operación fue exitosa.
            'data' => $productos // Los datos de las solicitudes obtenidas.
        ]);

    }catch (Exception $e){
        http_response_code(500);
        echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
    }

?>