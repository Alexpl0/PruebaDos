<?php

include_once('../db/db.php');

header('Content-Type: application/json; charset=utf-8');

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    $searchTerm = $_GET['q'] ?? '';
    $datos = [];
    
    // Build the base query - return all needed fields
    $query = "SELECT id, name FROM `Carriers`";

    if (!empty($searchTerm)) {
        // If there's a search term, add WHERE LIKE clause
        $query .= " WHERE `name` LIKE ?";
        $stmt = $conex->prepare($query);
        $searchParam = "%" . $searchTerm . "%";
        $stmt->bind_param("s", $searchParam);
    } else {
        // If no search term, prepare query without WHERE to get all results
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

// https://grammermx.com/Jesus/PruebaDos/dao/elements/daoCarriers.php