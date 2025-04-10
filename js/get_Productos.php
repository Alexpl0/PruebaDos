<?php
include_once('dao/db/db.php');
$con = connection();


try{
    // Se crea una instancia de la clase LocalConector para manejar la conexión a la base de datos
    $con = new LocalConector();
    // Se llama al método conectar() para establecer la conexión a la base de datos
    $conex=$con ->conectar();

    $stmt = $conex->prepare("SELECT * FROM `Productos`");
    // Se ejecuta la consulta
    $stmt->execute();

}catch (Exception $e){
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}

?>