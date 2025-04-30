<?php

session_start();
include_once('../db/db.php');

// Recibe el JSON enviado por POST
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Verifica que existan los campos enviados desde JavaScript
if (
    !$data ||
    !isset($data['orderId']) ||
    !isset($data['newStatusId']) ||
    !isset($data['userLevel']) ||
    !isset($data['userID']) ||
    !isset($data['authDate'])
) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Datos JSON inválidos o incompletos. Se requiere 'orderId', 'newStatusId', 'userLevel', 'userID' y 'authDate'."
    ]);
    exit;
}

// Verifica que el usuario esté autenticado y que el nivel de sesión coincida con el enviado
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['authorization_level'])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "No autorizado. Debe iniciar sesión."
    ]);
    exit;
}

$sessionLevel = intval($_SESSION['user']['authorization_level']);
$userLevel = intval($data['userLevel']);
$userID = intval($data['userID']);
$authDate =$data['authDate'];
$orderId = intval($data['orderId']);
$newStatusId = intval($data['newStatusId']);

// Seguridad: El nivel enviado por el frontend debe coincidir con el de la sesión
if ($sessionLevel !== $userLevel) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "No autorizado. El nivel de sesión no coincide con el enviado."
    ]);
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    // 1. Consulta el nivel de aprobación requerido para la orden
    $stmt = $conex->prepare(
        "SELECT act_approv FROM PremiumFreightApprovals WHERE premium_freight_id = ?"
    );
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $stmt->bind_result($approvalStatus);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Orden no encontrada."
        ]);
        $stmt->close();
        $conex->close();
        exit;
    }
    $stmt->close();

    // 2. Solo permite actualizar si el nivel de usuario coincide con el requerido
    if ($sessionLevel !== ((intval($approvalStatus))+1)) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "No tienes permisos para aprobar/rechazar esta orden."
        ]);
        $conex->close();
        exit;
    }

    // 3. Actualiza el estado y registra el usuario y la fecha de autorización si tu tabla lo permite
    $stmt = $conex->prepare(
        "UPDATE PremiumFreightApprovals 
         SET act_approv = ?, 
             user_id = ?, 
             approval_date = ?
         WHERE premium_freight_id = ?"
    );
    $stmt->bind_param(
        "issi",
        $newStatusId,
        $userID,
        $authDate,
        $orderId
    );
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode([
            "success" => true,
            "message" => "Estado actualizado correctamente"
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "No se actualizó ningún registro. El ID podría no existir o el estado es el mismo."
        ]);
    }

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>