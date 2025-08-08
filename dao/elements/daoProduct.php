<?php
/**
 * daoProduct.php
 *
 * Endpoint to fetch products based on the user's plant and a search term.
 * The user's plant is retrieved from the session.
 * The search term is passed via a GET parameter 'term'.
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

// Get the search term from Select2, sent as a GET parameter
$searchTerm = isset($_GET['term']) ? $_GET['term'] : '';

try {
    // Establish database connection
    $con = new LocalConector();
    $conex = $con->conectar();
    $conex->set_charset("utf8mb4");

    // ================== LÓGICA DE FILTRADO DINÁMICO ==================
    $baseQuery = "SELECT id, productName FROM `Products`";
    $whereClauses = [];
    $params = [];
    $types = "";

    // 1. Add filter by Plant if it exists
    if ($userPlant !== null && $userPlant !== '') {
        $whereClauses[] = "`Plant` = ?";
        $params[] = $userPlant;
        $types .= "s";
    }

    // 2. Add filter by search term if it's not empty
    if ($searchTerm !== '') {
        $whereClauses[] = "`productName` LIKE ?";
        // Add wildcards for the LIKE clause
        $params[] = "%" . $searchTerm . "%";
        $types .= "s";
    }

    // 3. Build the final query
    if (!empty($whereClauses)) {
        $finalQuery = $baseQuery . " WHERE " . implode(" AND ", $whereClauses);
    } else {
        $finalQuery = $baseQuery;
    }
    // =================================================================

    $stmt = $conex->prepare($finalQuery);

    if (!$stmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }

    // Bind parameters if any exist
    if (!empty($params)) {
        // Use the splat operator (...) to bind a dynamic number of parameters
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $datos = [];
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
