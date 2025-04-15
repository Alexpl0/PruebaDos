<?php

include_once('../dao/db/db.php');

$user=$_POST['user'];

try {
    // Se crea una instancia de la clase LocalConector para manejar la conexión a la base de datos
    $con = new LocalConector();
    // Se llama al método conectar() para establecer la conexión a la base de datos
    $conex=$con ->conectar();

    //Query para conectar a la tabla de la base datos. Se identifica la tabla y los campos, ademas los VALUES se dejan con ? para evitar inyecciones SQL
    $stmt = $conex->prepare("SELECT `IdUser`, `Username`, `Mail`, `Password`, `ROL` FROM `Usuarios` WHERE `Username` = ?;");
    // Se preparan los valores a insertar en la tabla, se especifica el tipo de dato de cada uno de los valores a insertar, en este caso son todos strings sss
    $stmt->bind_param("s", $user);

    // Se ejecuta la consulta
    $stmt->execute();

    // Se verifica si se obbtuvieron resultados
    $result = $stmt->get_result();
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        echo json_encode(["success" => true, "data" => $row]);
    } else {
        echo json_encode(["success" => false, "mensaje" => "No se encontraron resultados."]);
    }

    $stmt->close(); // Cierra la declaración preparada
    $conex->close(); // Cierra la conexión a la base de datos para evitar intrusos

} catch (Exception $e){
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}