<?php

include_once('../db/PFDB.php');

header('Content-Type: application/json; charset=utf-8');

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    $searchTerm = $_GET['q'] ?? '';
    $datos = [];
    
    // Construir la consulta base - ahora devolvemos todos los campos necesarios
    $query = "SELECT id, company_name, city, state, zip FROM `Location`";

    if (!empty($searchTerm)) {
        // Si hay un término de búsqueda, añadir la cláusula WHERE LIKE
        $query .= " WHERE `company_name` LIKE ?";
        $stmt = $conex->prepare($query);
        $searchParam = "%" . $searchTerm . "%";
        $stmt->bind_param("s", $searchParam);
    } else {
        // Si no hay término de búsqueda, preparar la consulta sin WHERE para obtener todos los resultados
        $stmt = $conex->prepare($query);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }
    $stmt->close();

    echo json_encode(['status' => 'success', 'data' => $datos], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage(), "data" => []], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>