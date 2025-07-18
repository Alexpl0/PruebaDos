<?php
// Incluye el archivo de conexión a la base de datos.
include_once('../db/PFDB.php');
// Inicia la sesión para acceder a las variables de sesión.
session_start();

// Establece la cabecera para indicar que la respuesta es en formato JSON.
header('Content-Type: application/json');

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
    // Esta lógica no cambia: cuenta todas las órdenes donde el user_id coincide.
    $stmt = $conex->prepare("SELECT COUNT(*) FROM PremiumFreight WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($ordersCreated);
    $stmt->fetch();
    $stmt->close();
    
    // 2. --- Obtener el conteo de órdenes RECHAZADAS ---
    // Una orden se considera rechazada si tiene una entrada en PremiumFreightApprovals con act_approv = 99.
    // Se cuentan las órdenes distintas (DISTINCT) para no contar múltiples rechazos de la misma orden.
    $stmt = $conex->prepare("
        SELECT COUNT(DISTINCT pf.id)
        FROM PremiumFreight AS pf
        INNER JOIN PremiumFreightApprovals AS pfa ON pf.id = pfa.pf_id
        WHERE pf.user_id = ? AND pfa.act_approv = 99
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($ordersRejected);
    $stmt->fetch();
    $stmt->close();

    // 3. --- Obtener el conteo de órdenes APROBADAS ---
    // Una orden está aprobada si su 'required_auth_level' coincide con un 'act_approv'.
    // CRÍTICO: También nos aseguramos de que la orden no esté en la lista de órdenes rechazadas.
    // La subconsulta (NOT IN) excluye cualquier orden que ya haya sido contada como rechazada.
    $stmt = $conex->prepare("
        SELECT COUNT(DISTINCT pf.id)
        FROM PremiumFreight AS pf
        INNER JOIN PremiumFreightApprovals AS pfa ON pf.id = pfa.pf_id
        WHERE 
            pf.user_id = ? 
            AND pf.required_auth_level = pfa.act_approv
            AND pf.id NOT IN (
                SELECT DISTINCT pfa_rejected.pf_id
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
    // Si ocurre cualquier error, devuelve un error 500.
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred: ' . $e->getMessage()
    ]);
}
?>
