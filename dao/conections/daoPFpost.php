<?php

include_once('../../db/db.php');

// Recibe el JSON enviado por POST
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Datos JSON inválidos"]);
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    $stmt = $conex->prepare(
        "INSERT INTO [Premium Freight] (
            planta, codeplanta, transport, InOutBound, CostoEuros, Description,
            Area, IntExt, PaidBy, CategoryCause, ProjectStatus, Recovery,
            Weight, Measures, Products, Carrier, QuotedCost, Reference, ReferenceNumber,
            inputCompanyNameShip, inputCityShip, StatesShip, inputZipShip,
            inputCompanyNameDest, inputCityDest, StatesDest, inputZipDest
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    );

    $stmt->bind_param(
        "sssssssssssssssssssssssssss",
        $data['planta'],
        $data['codeplanta'],
        $data['transport'],
        $data['InOutBound'],
        $data['CostoEuros'],
        $data['Description'],
        $data['Area'],
        $data['IntExt'],
        $data['PaidBy'],
        $data['CategoryCause'],
        $data['ProjectStatus'],
        $data['Recovery'],
        $data['Weight'],
        $data['Measures'],
        $data['Products'],
        $data['Carrier'],
        $data['QuotedCost'],
        $data['Reference'],
        $data['ReferenceNumber'],
        $data['inputCompanyNameShip'],
        $data['inputCityShip'],
        $data['StatesShip'],
        $data['inputZipShip'],
        $data['inputCompanyNameDest'],
        $data['inputCityDest'],
        $data['StatesDest'],
        $data['inputZipDest']
    );

    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Insert exitoso"]);
    } else {
        echo json_encode(["success" => false, "message" => "No se pudo insertar el registro"]);
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}
?>