<?php
/**
 * daoAddNumOrder.php
 * * Endpoint para agregar un nuevo número de orden a la base de datos.
 * Se utiliza cuando un usuario introduce un número de orden que no existe
 * y elige la opción de crearlo desde el selector Select2.
 */

include_once('../db/PFDB.php');

header('Content-Type: application/json; charset=utf-8');

// Se asegura de que la petición sea de tipo POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed. Use POST."]);
    exit;
}

// Se obtiene el cuerpo de la petición.
$postData = json_decode(file_get_contents('php://input'), true);

// Se valida que el número de orden se haya recibido y sea numérico.
if (!isset($postData['number']) || !is_numeric($postData['number'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing or invalid required data: number"]);
    exit;
}

$orderNumber = $postData['number'];
// Se crea un nombre por defecto para la nueva orden.
$orderName = "New Order - " . $orderNumber; 

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->begin_transaction();
    
    // Se comprueba si el número de orden ya existe para evitar duplicados.
    $checkQuery = "SELECT ID FROM `NumOrders` WHERE Number = ? LIMIT 1";
    $checkStmt = $conex->prepare($checkQuery);
    $checkStmt->bind_param("i", $orderNumber);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        $row = $checkResult->fetch_assoc();
        $existingId = $row['ID'];
        $checkStmt->close();
        $conex->close();
        
        // Si ya existe, se devuelve su ID.
        echo json_encode([
            "status" => "success", 
            "message" => "Order Number already exists", 
            "order_id" => $existingId,
            "is_new" => false
        ]);
        exit;
    }
    
    $checkStmt->close();

    // Se inserta la nueva orden con IsValid = '1' por defecto.
    $query = "INSERT INTO `NumOrders` (Number, Name, IsValid) VALUES (?, ?, '1')";
    $stmt = $conex->prepare($query);
    
    if (!$stmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }
    
    $stmt->bind_param("is", $orderNumber, $orderName);
    
    $result = $stmt->execute();
    
    if ($result) {
        $insertedId = $stmt->insert_id;
        $stmt->close();
        $conex->commit();
        
        // Se devuelve una respuesta exitosa con el ID de la nueva orden.
        echo json_encode([
            "status" => "success", 
            "message" => "Order Number added successfully", 
            "order_id" => $insertedId,
            "is_new" => true
        ]);
    } else {
        $conex->rollback();
        throw new Exception("Error executing statement: " . $stmt->error);
    }
    
    $conex->close();
    
} catch (Exception $e) {
    // Manejo de errores del servidor.
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
