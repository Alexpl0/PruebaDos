<?php

header('Content-Type: application/json');
include_once('../db/db.php');

// Recibe el JSON enviado por POST
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Verifica que existan los campos requeridos
if (
    !$data ||
    !isset($data['orderId']) ||
    !isset($data['statusid'])
) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Datos JSON inválidos o incompletos. Se requiere 'orderId' y 'statusid'."
    ]);
    exit;
}

$orderId = intval($data['orderId']);
$statusid = intval($data['statusid']);

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    $stmt = $conex->prepare(
        "UPDATE PremiumFreight SET status_id = ? WHERE id = ?"
    );
    $stmt->bind_param("ii", $statusid, $orderId);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode([
            "success" => true,
            "message" => "Estado actualizado correctamente"
        ]);
    } else {
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