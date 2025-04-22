<?php

// URL del archivo JSON que contiene la información de las plantas
$url = "https://grammermx.com/Programas/Trafico/Premium%20Freight/EstadoRes.php";

try {
    // Inicializa una sesión cURL para la URL especificada
    $ch = curl_init($url);

    // Configura cURL para devolver el resultado como una cadena en lugar de imprimirlo directamente
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

    // Ejecuta la solicitud cURL y almacena el resultado
    $result = curl_exec($ch);

    // Cierra la sesión cURL
    curl_close($ch);

    // Si el resultado contiene etiquetas HTML, intenta extraer el JSON
    if (strpos($result, '<html') !== false) {
        // Si el JSON está dentro de <script id="datos">...</script>
        if (preg_match('/<script id="datos".*?>(.*?)<\/script>/is', $result, $matches)) {
            $jsonString = $matches[1];
            $jsonStates = json_decode($jsonString, true);
        } else {
            // Si el JSON está directamente en el body sin etiquetas
            if (preg_match('/<body[^>]*>(.*?)<\/body>/is', $result, $bodyMatches)) {
                $jsonString = trim($bodyMatches[1]);
                $jsonStates = json_decode($jsonString, true);
                if ($jsonStates === null) {
                    throw new Exception("No se pudo decodificar el JSON del body.");
                }
            } else {
                throw new Exception("No se encontró el JSON en el HTML.");
            }
        }
    } else {
        // Si la respuesta es JSON puro
        $jsonStates = json_decode($result, true);
    }

    // Aquí tu lógica con $jsonStates...
    // Por ejemplo, para devolver el JSON:
    header('Content-Type: application/json');
    echo json_encode([
        "success" => true,
        "data" => $jsonStates
    ]);

} catch (Exception $e) {
    // Si ocurre un error, devuelve un código de respuesta HTTP 500 y un mensaje de error en formato JSON
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
    exit;
}
?>