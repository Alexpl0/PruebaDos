<?php
/**
 * daoGetUserApprovalRoles.php
 * Obtiene todos los roles de aprobación del usuario autenticado desde la tabla Approvers
 */

header('Content-Type: application/json');
include_once('../db/PFDB.php');

// Verificar que el usuario esté autenticado
session_start();
if (!isset($_SESSION['user']) || !isset($_SESSION['user']['id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'User not authenticated']);
    exit;
}

$userId = $_SESSION['user']['id'];

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // Obtener todos los roles de aprobación del usuario con información adicional
    $sql = "
        SELECT 
            a.id,
            a.user_id,
            a.approval_level,
            a.plant,
            u.name as user_name,
            u.role as user_role,
            CASE 
                WHEN a.approval_level = 1 THEN 'Traffic'
                WHEN a.approval_level = 2 THEN 'Transportation'
                WHEN a.approval_level = 3 THEN 'Logistics Manager'
                WHEN a.approval_level = 4 THEN 'Controlling'
                WHEN a.approval_level = 5 THEN 'Plant Manager'
                WHEN a.approval_level = 6 THEN 'Senior Manager Logistics Division'
                WHEN a.approval_level = 7 THEN 'Manager OPS Division'
                WHEN a.approval_level = 8 THEN 'SR VP Regional'
                ELSE CONCAT('Level ', a.approval_level)
            END as charge_name
        FROM Approvers a
        INNER JOIN User u ON a.user_id = u.id
        WHERE a.user_id = ?
        ORDER BY a.approval_level ASC, a.plant ASC
    ";

    $stmt = $conex->prepare($sql);
    if (!$stmt) {
        throw new Exception('Error preparing query: ' . $conex->error);
    }

    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $roles = [];
    while ($row = $result->fetch_assoc()) {
        // Construir el nombre descriptivo del rol
        $roleName = $row['charge_name'];
        if ($row['plant'] !== null) {
            $roleName .= ' - Plant ' . $row['plant'];
        } else {
            $roleName .= ' - Regional';
        }

        $roles[] = [
            'id' => $row['id'],
            'approval_level' => (int)$row['approval_level'],
            'plant' => $row['plant'],
            'charge_name' => $row['charge_name'],
            'display_name' => $roleName
        ];
    }

    // Respuesta exitosa
    echo json_encode([
        'status' => 'success',
        'data' => $roles,
        'count' => count($roles)
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conex->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error fetching approval roles: ' . $e->getMessage()
    ]);
}
?>