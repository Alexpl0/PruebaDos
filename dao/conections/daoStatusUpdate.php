<?php

include_once('../db/db.php');

// Recibe el JSON enviado por POST
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Verifica que existan los campos enviados desde JavaScript
if (!$data || !isset($data['orderId']) || !isset($data['newStatusId'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Datos JSON inválidos o incompletos. Se requiere 'orderId' y 'newStatusId'."
    ]);
    exit;
}

// Opcional: fuerza los valores a enteros para mayor seguridad
$orderId = intval($data['orderId']);
$newStatusId = intval($data['newStatusId']);

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    // Preparamos la consulta UPDATE para modificar solo project_status
    $stmt = $conex->prepare(
        "UPDATE `PremiumFreight` 
         SET project_status = ?
         WHERE id = ?"
    );

    // Vinculamos los parámetros: newStatusId (integer), orderId (integer)
    $stmt->bind_param(
        "ii",
        $newStatusId,
        $orderId
    );

    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode([
            "success" => true,
            "message" => "Estado actualizado correctamente"
        ]);
    } else {
        // Si affected_rows es 0, podría ser que el ID no existe o que no se cambió el valor
        echo json_encode([
            "success" => false,
            "message" => "No se actualizó ningún registro. El ID podría no existir o el estado es el mismo."
        ]);
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>