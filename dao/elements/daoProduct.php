<?php
/**
 * daoProduct.php
 *
 * Endpoint to fetch products based on the user's plant.
 * The user's plant is retrieved from the session.
 */

// Set header to return JSON content
header('Content-Type: application/json; charset=utf-8');

// Include the database connection
include_once('../db/PFDB.php');

// Start session to access user data
session_start();

// Check if user is authenticated
if (!isset($_SESSION['user'])) {
    http_response_code(401); // Unauthorized
    echo json_encode([
        'status' => 'error',
        'message' => 'User not authenticated.'
    ]);
    exit;
}

// Get user's plant from session (can be null or empty for regional users)
$userPlant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;

try {
    // Establish database connection
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    $datos = [];

    // ================== REGLA DE FILTRO POR PLANTA O REGIONAL ==================
    if ($userPlant === null || $userPlant === '') {
        // Usuario regional: puede ver todos los productos
        $query = "SELECT id, productName FROM `Products`";
        $stmt = $conex->prepare($query);
    } else {
        // Usuario con planta: solo ve productos de su planta
        $query = "SELECT id, productName FROM `Products` WHERE `Plant` = ?";
        $stmt = $conex->prepare($query);
        if ($stmt) {
            $stmt->bind_param("s", $userPlant);
        }
    }
    // ===========================================================================

    if (!$stmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }

    // Ejecuta el query (solo si hay planta, ya se hizo bind_param arriba)
    $stmt->execute();
    $result = $stmt->get_result();

    // Fetch results into an array
    while ($row = $result->fetch_assoc()) {
        $datos[] = $row;
    }

    $stmt->close();
    $conex->close();

    // Return a successful response with the filtered product data
    echo json_encode(['status' => 'success', 'data' => $datos], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // Handle any exceptions and return an error response
    http_response_code(500); // Internal Server Error
    echo json_encode([
        "status" => "error", 
        "message" => "Database error: " . $e->getMessage(), 
        "data" => []
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>
