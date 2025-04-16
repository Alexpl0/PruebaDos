<?php

// URL del archivo JSON que contiene la información de las plantas
$url = "https://grammermx.com/Programas/Trafico/Premium%20Freight/proveedores.json";

try {
    // Inicializa una sesión cURL para la URL especificada
    $ch = curl_init($url);

    // Configura cURL para devolver el resultado como una cadena en lugar de imprimirlo directamente
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

    // Ejecuta la solicitud cURL y almacena el resultado
    $result = curl_exec($ch);

    // Cierra la sesión cURL
    curl_close($ch);

    // Decodifica el resultado JSON en un array asociativo de PHP
    $jsonSupplier = json_decode($result, true);

    

} catch (Exception $e) {
    // Si ocurre un error, devuelve un código de respuesta HTTP 500 y un mensaje de error en formato JSON
    http_response_code(500);
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
    exit;
}
?>