<?php
/**
 * context_injector.php
 *
 * Este script se encarga de inyectar el contexto del usuario y la configuración
 * de la aplicación desde el servidor (PHP) al cliente (JavaScript).
 *
 * 1. Asegura que la sesión esté iniciada.
 * 2. Recopila los datos del usuario de $_SESSION de forma segura.
 * 3. Define URLs base y otras configuraciones del entorno.
 * 4. Imprime una etiqueta <script> con un objeto JSON global (APP_CONTEXT)
 * que servirá como la única fuente de verdad para el lado del cliente.
 */

// 1. Asegurarse de que la sesión esté activa
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// 2. Definir URLs base (centralizadas aquí)
$URLBASE = "https://grammermx.com/Logistica/PremiumFreight/";
$URLM = "https://grammermx.com/Mailer/PFMailer/";

// 3. Crear un array con el contexto de la aplicación para JavaScript.
// Se usa el operador de fusión de null (??) para asignar valores por defecto de forma segura.
$appContextForJS = [
    'user' => [
        'id'                 => $_SESSION['user']['id'] ?? null,
        'name'               => $_SESSION['user']['name'] ?? 'Guest',
        'email'              => $_SESSION['user']['email'] ?? null,
        'role'               => $_SESSION['user']['role'] ?? 'Visitor',
        'plant'              => $_SESSION['user']['plant'] ?? null,
        'authorizationLevel' => $_SESSION['user']['authorization_level'] ?? 0
    ],
    'app' => [
        'baseURL'   => $URLBASE,
        'mailerURL' => $URLM
    ]
];

// 4. Convertir el array a un string JSON seguro para prevenir ataques XSS.
// JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP convierten caracteres especiales a entidades Unicode.
$appContextJSON = json_encode($appContextForJS, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);

// 5. Imprimir la etiqueta <script> que crea el objeto global para JavaScript.
// Este objeto actuará como la única fuente de verdad para el contexto de la app en el cliente.
echo "<script>window.APP_CONTEXT = " . $appContextJSON . ";</script>";

?>
