<?php

header('Content-Type: application/json');
include_once('../db/PFDB.php');

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    // Obtener datos del POST (JSON)
    $input = json_decode(file_get_contents('php://input'), true);
    $company_name = trim($input['company_name'] ?? '');
    $city         = trim($input['city'] ?? '');
    $state        = trim($input['state'] ?? '');
    $zip          = trim($input['zip'] ?? '');

    if ($company_name === '') {
        echo json_encode(['success' => false, 'message' => 'El nombre de la compañía es requerido']);
        exit;
    }

    // Verificar si ya existe la compañía
    $sql_check = "SELECT id FROM Location WHERE company_name = ?";
    $stmt_check = $conex->prepare($sql_check);
    $stmt_check->bind_param("s", $company_name);
    $stmt_check->execute();
    $stmt_check->store_result();
    if ($stmt_check->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'La compañía ya existe']);
        $stmt_check->close();
        $conex->close();
        exit;
    }
    $stmt_check->close();

    // Insertar la nueva compañía
    $sql_insert = "INSERT INTO Location (company_name, city, state, zip) VALUES (?, ?, ?, ?)";
    $stmt_insert = $conex->prepare($sql_insert);
    $stmt_insert->bind_param("ssss", $company_name, $city, $state, $zip);

    if ($stmt_insert->execute()) {
        echo json_encode(['success' => true, 'message' => 'Compañía registrada correctamente', 'id' => $stmt_insert->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al registrar la compañía']);
    }

    $stmt_insert->close();
    $conex->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>