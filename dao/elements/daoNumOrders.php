<?php
/**
 * daoNumOrders.php
 * * Endpoint para buscar y obtener los números de orden (NumOrders) válidos.
 * Este script es consumido por el control Select2 en el formulario de nueva orden.
 * Devuelve los datos en el formato que Select2 espera (id, text).
 */

include_once('../db/PFDB.php');

header('Content-Type: application/json; charset=utf-8');

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // Término de búsqueda opcional enviado por Select2
    $searchTerm = $_GET['q'] ?? '';
    $datos = [];
    
    // La consulta base selecciona el ID y el Número de la tabla NumOrders.
    // Filtra para incluir solo las órdenes marcadas como válidas (IsValid = '1').
    $query = "SELECT ID as id, Number as text FROM `NumOrders` WHERE `IsValid` = '1'";

    // Si hay un término de búsqueda, se añade a la consulta para filtrar por el número de orden.
    if (!empty($searchTerm)) {
        $query .= " AND `Number` LIKE ?";
        $stmt = $conex->prepare($query);
        $searchParam = "%" . $searchTerm . "%";
        $stmt->bind_param("s", $searchParam);
    } else {
        // Si no hay término de búsqueda, se ejecuta la consulta para obtener todos los resultados válidos.
        $stmt = $conex->prepare($query);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    // Se recogen los resultados en un array.
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }
    $stmt->close();

    // Se devuelve una respuesta JSON exitosa con los datos.
    echo json_encode(['status' => 'success', 'data' => $datos], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $conex->close();

} catch (Exception $e) {
    // Manejo de errores del servidor.
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage(), "data" => []], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>
