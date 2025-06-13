<?php

/**
 * Obtiene el ID de la Orden seleccionada
 * En la Tabla de Premium Freight Aprroval actualiza el historico de la orden
 * Menciona quién la aprobo, cuando y bajo qué nivel 
 * Actualiza el act_approcv que es donde se lleva el control de los pasos para aprovar
 * Va conforme al nivel de aprovación de los usuarios y el nivel de aprovación requerido según el costo
 * En caso de ser rechazado se cambia el status a 99
 */
/**
 * Hace validaciones de seguridad como que el nivel de usuario sea el correcto
 * Además de que el usuario tenga acceso a la orden
 * Si no se cumplen estas condiciones no se permite la aprobación
 * ACTUALIZADO: Ahora también maneja rejection_reason para rechazos
 * */

session_start();
include_once('../db/PFDB.php');

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
        "message" => "Invalid or incomplete JSON data. Required: 'orderId', 'newStatusId', 'userLevel', 'userID' and 'authDate'."
    ]);
    exit;
}

// Verifica que el usuario esté autenticado y que el nivel de sesión coincida con el enviado
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['authorization_level'])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized. Please log in."
    ]);
    exit;
}

$sessionLevel = intval($_SESSION['user']['authorization_level']);
$userLevel = intval($data['userLevel']);
$userID = intval($data['userID']);
$authDate = $data['authDate'];
$orderId = intval($data['orderId']);
$newStatusId = intval($data['newStatusId']);
$userPlant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;

// NUEVO: Obtener rejection_reason si está presente
$rejectionReason = isset($data['rejection_reason']) ? trim($data['rejection_reason']) : null;

// Validar rejection_reason para rechazos
if ($newStatusId === 99) {
    // Para rechazos, validar que se proporcione una razón
    if (empty($rejectionReason)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "A reason is required to reject the order."
        ]);
        exit;
    }
    
    // Validar longitud máxima
    if (strlen($rejectionReason) > 999) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Rejection reason cannot exceed 999 characters."
        ]);
        exit;
    }
} else {
    // Para aprobaciones, la razón debe ser null
    $rejectionReason = null;
}

// Seguridad: El nivel enviado por el frontend debe coincidir con el de la sesión
if ($sessionLevel !== $userLevel) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized. Session level does not match the sent level."
    ]);
    exit;
}

try {
    $con = new LocalConector();
    $conex = $con->conectar();

    // 1. Consulta información completa de la orden incluyendo datos del creador y nivel requerido
    $stmt = $conex->prepare(
        "SELECT 
            pfa.act_approv, 
            pf.required_auth_level,
            u.plant AS creator_plant
         FROM PremiumFreightApprovals pfa
         JOIN PremiumFreight pf ON pfa.premium_freight_id = pf.id
         JOIN User u ON pf.user_id = u.id
         WHERE pfa.premium_freight_id = ?"
    );
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $stmt->bind_result($approvalStatus, $requiredAuthLevel, $creatorPlant);
    
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Order not found."
        ]);
        $stmt->close();
        $conex->close();
        exit;
    }
    $stmt->close();

    // 2. Validación de planta: Solo si el usuario tiene planta asignada
    if ($userPlant !== null && $userPlant !== '') {
        if ($creatorPlant !== $userPlant) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "message" => "You do not have permission to approve/reject orders from other plants."
            ]);
            $conex->close();
            exit;
        }
    }

    // 3. Validación de nivel de autorización: debe ser el siguiente nivel requerido
    if ($sessionLevel !== ((intval($approvalStatus)) + 1)) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "You do not have permission to approve/reject this order at this time."
        ]);
        $conex->close();
        exit;
    }

    // 4. Validación adicional: verificar que no se exceda el nivel requerido (excepto para rechazo = 99)
    if ($newStatusId !== 99 && $newStatusId > intval($requiredAuthLevel)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "The order has already reached the required approval level."
        ]);
        $conex->close();
        exit;
    }

    // 5. ACTUALIZADO: Actualiza el estado, registra el usuario, fecha y razón de rechazo si aplica
    $stmt = $conex->prepare(
        "UPDATE PremiumFreightApprovals 
         SET act_approv = ?, 
             user_id = ?, 
             approval_date = ?,
             rejection_reason = ?
         WHERE premium_freight_id = ?"
    );
    $stmt->bind_param(
        "isssi",
        $newStatusId,
        $userID,
        $authDate,
        $rejectionReason,
        $orderId
    );
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $response = [
            "success" => true,
            "message" => $newStatusId === 99 ? "Order rejected successfully" : "Status updated successfully",
            "new_status" => $newStatusId,
            "required_level" => $requiredAuthLevel
        ];
        
        // Incluir rejection_reason en la respuesta si es un rechazo
        if ($newStatusId === 99 && $rejectionReason) {
            $response['rejection_reason'] = $rejectionReason;
        }
        
        echo json_encode($response);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "No records updated. The ID might not exist or the status is the same."
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