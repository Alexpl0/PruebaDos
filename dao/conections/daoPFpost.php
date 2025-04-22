<?php

include_once('../db/db.php');

// Recibe el JSON enviado por POST
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Datos JSON inválidos"
    ]);
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    $stmt = $conex->prepare(
        "INSERT INTO `PremiumFreight` (
            user_id, date, planta, code_planta, transport, in_out_bound, cost_euros, description, area, int_ext, paid_by, category_cause, project_status, recovery, weight, measures, products, carrier, quoted_cost, reference, reference_number, origin_id, destiny_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    );

    // Todos los campos menos user_id (int) y weight, quoted_cost (pueden ser numéricos, pero si llegan como string está bien si la columna es VARCHAR)
    $stmt->bind_param(
        "issssssssssssssssssssss",
        $data['user_id'],
        $data['date'],
        $data['planta'],
        $data['code_planta'],
        $data['transport'],
        $data['in_out_bound'],
        $data['cost_euros'],
        $data['description'],
        $data['area'],
        $data['int_ext'],
        $data['paid_by'],
        $data['category_cause'],
        $data['project_status'],
        $data['recovery'],
        $data['weight'],
        $data['measures'],
        $data['products'],
        $data['carrier'],
        $data['quoted_cost'],
        $data['reference'],
        $data['reference_number'],
        $data['origin_id'],
        $data['destiny_id']
    );

    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode([
            "success" => true,
            "message" => "Insert exitoso"
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "No se pudo insertar el registro"
        ]);
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "mensaje" => $e->getMessage()
    ]);
}
?>