<?php
include_once('../db/db.php');

header('Content-Type: application/json');

if (!isset($_GET['name']) || strlen(trim($_GET['name'])) < 2) {
    echo json_encode([
        "success" => false,
        "message" => "Parámetro 'name' requerido"
    ]);
    exit;
}

$name = trim($_GET['name']);

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    // Busca la compañía por nombre en la tabla Location
    $stmt = $conex->prepare("SELECT company_name, city, state, zip FROM Location WHERE company_name LIKE CONCAT('%', ?, '%') LIMIT 10");
    $stmt->bind_param("s", $name);
    $stmt->execute();
    $result = $stmt->get_result();

    $companies = [];
    while ($row = $result->fetch_assoc()) {
        $companies[] = $row;
    }

    if (count($companies) > 0) {
        echo json_encode([
            "success" => true,
            "companies" => $companies
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Compañía no encontrada"
        ]);
    }

    $stmt->close();
    $conex->close();
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>