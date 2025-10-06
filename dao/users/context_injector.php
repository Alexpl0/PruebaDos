<?php
/**
 * context_injector.php
 *
 * Este script se encarga de inyectar el contexto del usuario y la configuración
 * de la aplicación desde el servidor (PHP) al cliente (JavaScript).
 *
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - Agregado approval_level desde tabla Approvers
 * - Mantiene authorization_level para control de acceso a páginas
 */

// 1. Asegurarse de que la sesión esté activa
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// 2. Incluir conexión a base de datos
require_once __DIR__ . '/../db/PFDB.php';

// 3. Definir URLs base (centralizadas aquí)
$URLBASE = "https://grammermx.com/Jesus/PruebaDos/";
$URLM = "https://grammermx.com/Mailer/PFMailer/";

// 4. Crear un array con el contexto de la aplicación para JavaScript.
$user = $_SESSION['user'] ?? [];

$appContextForJS = [
    'user' => [
        'id'                 => $user['id'] ?? null,
        'name'               => $user['name'] ?? 'Guest',
        'email'              => $user['email'] ?? null,
        'role'               => $user['role'] ?? 'Visitor',
        'plant'              => $user['plant'] ?? null,
        'authorizationLevel' => $user['authorization_level'] ?? 0,
        'approvalLevel'      => 0 // Se actualizará abajo
    ],
    'app' => [
        'baseURL'   => $URLBASE,
        'mailerURL' => $URLM
    ]
];

// 5. NUEVO: Obtener approval_level de la tabla Approvers
try {
    if (isset($user['id']) && $user['id'] !== null) {
        $con = new LocalConector();
        $conex = $con->conectar();
        $conex->set_charset("utf8mb4");
        
        // Obtener el nivel de aprobación más alto del usuario
        // Si tiene múltiples niveles, tomamos el más alto para el contexto general
        $stmt = $conex->prepare("
            SELECT MAX(approval_level) as max_approval_level 
            FROM Approvers 
            WHERE user_id = ?
        ");
        $stmt->bind_param("i", $user['id']);
        $stmt->execute();
        $stmt->bind_result($maxApprovalLevel);
        
        if ($stmt->fetch()) {
            $appContextForJS['user']['approvalLevel'] = intval($maxApprovalLevel ?? 0);
        }
        
        $stmt->close();
        $conex->close();
    }
} catch (Exception $e) {
    error_log("Error getting approval level in context_injector: " . $e->getMessage());
    // En caso de error, approval_level queda en 0
}

// 6. Convertir el array a un string JSON seguro para prevenir ataques XSS.
// JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP convierten caracteres especiales a entidades Unicode.
$appContextJSON = json_encode($appContextForJS, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);

// 7. Imprimir la etiqueta <script> que crea el objeto global para JavaScript.
// Este objeto actuará como la única fuente de verdad para el contexto de la app en el cliente.
echo "<script>window.APP_CONTEXT = " . $appContextJSON . ";</script>";

?>
