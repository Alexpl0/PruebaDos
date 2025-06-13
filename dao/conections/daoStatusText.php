<?php

// Este archivo lo que hace es cambiar el Status que nos dice si la orden fue aprobada o no,
// el estado de la orden en texto; Nuevo, Aprobado, Rechazado, etc.
// Esto lo hace cambiando el status_id de la tabla PremiumFreight
// para así llamar a la Tabla Status y de ahí obtener el texto, si es nuevo, Aprovado, Rechazado, etc.

header('Content-Type: application/json');
include_once('../db/PFDB.php');

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
        "message" => "Invalid or incomplete JSON data. Required: 'orderId' and 'statusid'."
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
            "message" => "Status updated successfully"
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "No records updated. The ID might not exist or the status is the same."
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