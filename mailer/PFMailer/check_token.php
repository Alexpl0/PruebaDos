<?php
// Importar la configuración global
require_once __DIR__ . '/config.php';
require_once 'PFmailer.php';

// Establecer el tipo de contenido de la respuesta
header('Content-Type: application/json');

// Obtener el token de la URL
$token = $_GET['token'] ?? '';

if (empty($token)) {
    echo json_encode([
        'success' => false,
        'message' => 'No se proporcionó ningún token'
    ]);
    exit;
}

// Inicializar conexión a la base de datos
$con = new LocalConector();
$db = $con->conectar();

// Verificar si el token existe
$sql = "SELECT * FROM EmailActionTokens WHERE token = ?";
$stmt = $db->prepare($sql);
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'El token no existe en la base de datos',
        'token' => $token
    ]);
    exit;
}

// Obtener los datos del token
$tokenData = $result->fetch_assoc();
$orderId = $tokenData['order_id'];

// Obtener información de la orden
$orderInfo = [];
$orderSql = "SELECT PF.status_id, PFA.act_approv 
             FROM PremiumFreight PF 
             LEFT JOIN PremiumFreightApprovals PFA ON PF.id = PFA.premium_freight_id 
             WHERE PF.id = ?";
$orderStmt = $db->prepare($orderSql);
$orderStmt->bind_param("i", $orderId);
$orderStmt->execute();
$orderResult = $orderStmt->get_result();

if ($orderResult->num_rows > 0) {
    $orderData = $orderResult->fetch_assoc();
    $orderInfo = [
        'status_id' => $orderData['status_id'],
        'status_text' => getStatusText($orderData['status_id']),
        'is_approved' => $orderData['act_approv'] == 1 ? true : false
    ];
}

// Función para obtener el texto del estado
function getStatusText($statusId) {
    $statusMap = [
        1 => 'Nuevo',
        2 => 'En Revisión',
        3 => 'Aprobado',
        4 => 'Rechazado',
        5 => 'Completado'
    ];
    
    return $statusMap[$statusId] ?? 'Desconocido';
}

echo json_encode([
    'success' => true,
    'message' => 'Token encontrado',
    'data' => [
        'token' => $tokenData['token'],
        'order_id' => $tokenData['order_id'],
        'user_id' => $tokenData['user_id'],
        'action' => $tokenData['action'],
        'created_at' => $tokenData['created_at'],
        'is_used' => $tokenData['is_used'] == 1,
        'used_at' => $tokenData['used_at']
    ],
    'order_info' => $orderInfo
]);
?>