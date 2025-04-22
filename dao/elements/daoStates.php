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

    // Si el resultado es HTML, extrae el JSON usando una expresión regular
    if (strpos($result, '<html') !== false) {
        // Ejemplo: JSON dentro de <script id="datos">...</script>
        if (preg_match('/<script id="datos".*?>(.*?)<\/script>/is', $result, $matches)) {
            $jsonString = $matches[1];
            $jsonStates = json_decode($jsonString, true);
        } else {
            throw new Exception("No se encontró el JSON en el HTML.");
        }
    } else {
        // Si la respuesta es JSON puro
        $jsonStates = json_decode($result, true);
    }

    // ...aquí tu lógica con $jsonStates...

} catch (Exception $e) {
    // Si ocurre un error, devuelve un código de respuesta HTTP 500 y un mensaje de error en formato JSON
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
    exit;
}
?>