<?php
/**
 * cors_config.php
 * * Este archivo centraliza la configuración de CORS para ser reutilizado en todos los
 * endpoints de la API. Permite solicitudes desde cualquier origen de manera segura
 * para las peticiones que incluyen credenciales.
 */

// Obtener el origen de la solicitud actual.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// ADVERTENCIA: La siguiente sección permite solicitudes desde CUALQUIER origen.
// Se establece dinámicamente el encabezado Access-Control-Allow-Origin
// para reflejar el origen que realiza la solicitud. Esto es necesario para que
// las solicitudes con credenciales ('credentials: include') funcionen.
if ($origin) {
    header("Access-Control-Allow-Origin: $origin");
}

// El resto de los encabezados CORS, configurados para ser lo más permisivos posible.
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: *'); // Permitir cualquier método HTTP
header('Access-Control-Allow-Headers: *'); // Permitir cualquier encabezado

// Manejar la solicitud de pre-vuelo (preflight) del navegador.
// El navegador envía una solicitud OPTIONS antes de la solicitud real (POST, GET, etc.)
// para verificar los permisos CORS.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
