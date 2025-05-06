<?php

include_once('../db/db.php');

// Fuerza la codificación UTF-8 para evitar conflictos con acentos
header('Content-Type: application/json; charset=utf-8');

try {
    // Se crea una instancia de la clase LocalConector para manejar la conexión a la base de datos
    $con = new LocalConector();
    // Se llama al método conectar() para establecer la conexión a la base de datos
    $conex = $con->conectar();

    // Establece la codificación de la conexión a UTF-8
    $conex->set_charset("utf8mb4");

    // Obtener el término de búsqueda de los parámetros GET
    // Usar el operador de fusión de null para un valor predeterminado si 'q' no está presente
    $searchTerm = $_GET['q'] ?? '';

    $datos = [];

    // Solo ejecutar la consulta si hay un término de búsqueda (o si deseas mostrar todos si está vacío)
    // Para Select2, usualmente solo queremos resultados si el usuario ha escrito algo.
    if (!empty($searchTerm)) {
        // Preparar la consulta SQL para buscar en la columna 'company_name' (ajusta si tu columna se llama diferente)
        // Usamos LIKE para búsquedas parciales y concatenamos '%' para buscar en cualquier parte del string.
        $query = "SELECT company_name FROM `Location` WHERE `company_name` LIKE ?";
        $stmt = $conex->prepare($query);

        // Añadir los comodines '%' al término de búsqueda para la cláusula LIKE
        $searchParam = "%" . $searchTerm . "%";
        $stmt->bind_param("s", $searchParam);

        $stmt->execute();
        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $datos[] = $row; // Asegúrate de que esto coincida con lo que espera processResults (ej: {company_name: '...' })
        }
        $stmt->close(); // Cierra la declaración preparada.
    }
    // Si searchTerm está vacío, $datos permanecerá como un array vacío,
    // lo cual es el comportamiento esperado para Select2 cuando no hay coincidencias o no se ha buscado.

    // Enviar datos como JSON
    echo json_encode(['status' => 'success', 'data' => $datos], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $conex->close(); // Cierra la conexión a la base de datos.

} catch (Exception $e) {
    http_response_code(500);
    // Devuelve un error en formato JSON también
    echo json_encode(["status" => "error", "message" => $e->getMessage(), "data" => []], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>