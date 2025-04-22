<?php

// URL del archivo JSON que contiene la información de las plantas
$url = "https://grammermx.com/Programas/Trafico/Premium%20Freight/EstadoRes.php";

try {
    // Inicializa una sesión cURL para la URL especificada
    $ch = curl_init($url);

    // Configura cURL para devolver el resultado como una cadena en lugar de imprimirlo directamente
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

    // Ejecuta la solicitud cURL y almacena el resultado (HTML completo)
    $result = curl_exec($ch);

    // Cierra la sesión cURL
    curl_close($ch);

    if ($result === false) {
        throw new Exception("Error en la solicitud cURL: " . curl_error($ch));
    }

    // Extraer el JSON del contenido HTML
    $jsonData = extractJsonFromHtml($result);
    
    // Decodifica el resultado JSON en un array asociativo de PHP
    $jsonStates = json_decode($jsonData, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Error al decodificar JSON: " . json_last_error_msg());
    }
    
    // Aquí puedes continuar trabajando con $jsonStates

} catch (Exception $e) {
    // Si ocurre un error, devuelve un código de respuesta HTTP 500 y un mensaje de error en formato JSON
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
    exit;
}

/**
 * Extrae datos JSON del contenido HTML
 * 
 * @param string $html El contenido HTML completo
 * @return string El JSON extraído
 */
function extractJsonFromHtml($html) {
    // Método 1: Buscar con expresiones regulares cualquier bloque entre llaves que parezca JSON
    if (preg_match('/(\[.*\]|\{.*\})/s', $html, $matches)) {
        return $matches[0];
    }
    
    // Método 2: Buscar específicamente contenido entre etiquetas script que contenga un array u objeto JSON
    if (preg_match('/<script[^>]*>(.*?var\s+\w+\s*=\s*(\[.*\]|\{.*\})).*?<\/script>/s', $html, $matches)) {
        preg_match('/(\[.*\]|\{.*\})/s', $matches[1], $jsonMatches);
        if (!empty($jsonMatches[0])) {
            return $jsonMatches[0];
        }
    }
    
    // Si no se ha encontrado JSON, lanzar excepción
    throw new Exception("No se pudo encontrar datos JSON en el HTML");
}
?>