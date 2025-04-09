<?php

include_once('dao/db/db.php');

$nombre = $_POST['nombre'];
$marca = $_POST['marca'];
$descripcion = $_POST['descripcion'];

try {
    // Se crea una instancia de la clase LocalConector para manejar la conexión a la base de datos
    $con = new LocalConector();
    // Se llama al método conectar() para establecer la conexión a la base de datos
    $conex=$con ->conectar();

    //Query para conectar a la tabla de la base datos. Se identifica la tabla y los campos, ademas los VALUES se dejan con ? para evitar inyecciones SQL
    $stmt = $conex->prepare("INSERT INTO `Productos`(`Nombre`, `Marca`, `Descripcion`) VALUES (?,?,?)");
    // Se preparan los valores a insertar en la tabla, se especifica el tipo de dato de cada uno de los valores a insertar, en este caso son todos strings sss
    $stmt->bind_param("sss", $nombre, $marca, $descripcion);

    // Se ejecuta la consulta
    $stmt->execute();

    // Se verifica si se insertó correctamente
    if ($stmt->affected_rows > 0) {
        //Si se afecto al menos una línea, se considera un insert exitoso
        echo json_encode(["success" => true, "message" => "Insert exitoso"]);
    } else {
        //Si no se afecto ninguna línea, se considera un insert fallido
        echo json_encode(["success" => false, "message" => "No se pudo insertar el registro"]);
    }

    $stmt->close(); // Cierra la declaración preparada
    $conex->close(); // Cierra la conexión a la base de datos para evitar intrusos

} catch (Exception $e){
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}
?>



