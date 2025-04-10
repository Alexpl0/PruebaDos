<?php
include_once('dao/db/db.php');
$con = connection();


try{
    // Consulta para obtener los datos de los productos
    $sql = "SELECT * FROM users";
    $query = mysqli_query($con, $sql);

}catch (Exception $e){
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}

?>