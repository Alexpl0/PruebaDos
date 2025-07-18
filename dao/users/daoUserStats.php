<?php
// Incluye el archivo de conexión a la base de datos.
include_once('../db/PFDB.php');
// Inicia la sesión para acceder a las variables de sesión.
session_start();

// Establece la cabecera para indicar que la respuesta es en formato JSON.
header('Content-Type: application/json');

// --- MODO DE DEPURACIÓN DE ERRORES DE MYSQLI ---
// Esta línea es clave: fuerza a MySQLi a lanzar excepciones en lugar de solo advertencias.
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Verifica si el usuario ha iniciado sesión.
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'You must be logged in to view stats'
    ]);
    exit;
}

try {
    // Obtiene el ID del usuario de la variable de sesión.
    $userId = $_SESSION['user']['id'];
    
    // Crea una nueva instancia del conector de la base de datos y establece la conexión.
    $con = new LocalConector();
    $conex = $con->conectar();
    
    // 1. --- Obtener el conteo de órdenes CREADAS por este usuario ---
    $stmt = $conex->prepare("SELECT COUNT(*) FROM PremiumFreight WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($ordersCreated);
    $stmt->fetch();
    $stmt->close();
    
    // 2. --- Obtener el conteo de órdenes RECHAZADAS ---
    // CORRECCIÓN: Se cambió 'pfa.pf_id' por 'pfa.premium_freight_id'.
    $stmt = $conex->prepare("
        SELECT COUNT(DISTINCT pf.id)
        FROM PremiumFreight AS pf
        INNER JOIN PremiumFreightApprovals AS pfa ON pf.id = pfa.premium_freight_id
        WHERE pf.user_id = ? AND pfa.act_approv = 99
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($ordersRejected);
    $stmt->fetch();
    $stmt->close();

    // 3. --- Obtener el conteo de órdenes APROBADAS ---
    // CORRECCIÓN: Se cambió 'pfa.pf_id' por 'pfa.premium_freight_id' en el JOIN y en la subconsulta.
    $stmt = $conex->prepare("
        SELECT COUNT(DISTINCT pf.id)
        FROM PremiumFreight AS pf
        INNER JOIN PremiumFreightApprovals AS pfa ON pf.id = pfa.premium_freight_id
        WHERE 
            pf.user_id = ? 
            AND pf.required_auth_level = pfa.act_approv
            AND pf.id NOT IN (
                SELECT DISTINCT pfa_rejected.premium_freight_id
                FROM PremiumFreightApprovals AS pfa_rejected
                WHERE pfa_rejected.act_approv = 99
            )
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($ordersApproved);
    $stmt->fetch();
    $stmt->close();
    
    // Cierra la conexión a la base de datos.
    $conex->close();
    
    // Devuelve una respuesta JSON con los nuevos conteos.
    echo json_encode([
        'success' => true,
        'created' => $ordersCreated,
        'approved' => $ordersApproved,
        'rejected' => $ordersRejected
    ]);
    
} catch (Exception $e) {
    // Si ocurre cualquier error, ahora devolverá el mensaje específico de la base de datos.
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database Error: ' . $e->getMessage()
    ]);
}
?>
