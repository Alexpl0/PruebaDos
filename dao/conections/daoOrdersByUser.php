<?php
/**
 * API endpoint to fetch orders created by a specific user
 */

// Include database connection
require_once '../../config.php';
require_once '../database/connection.php';

// Set content type to JSON
header('Content-Type: application/json');

// Get input data
$data = json_decode(file_get_contents('php://input'), true);
$userId = isset($data['userId']) ? intval($data['userId']) : 0;

// Validate user ID
if ($userId <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid user ID'
    ]);
    exit;
}

try {
    // Get database connection
    $conn = getConnection();

    // Query to fetch orders created by the specified user
    $query = "SELECT o.*, s.name as status_name
              FROM premium_freight o
              LEFT JOIN status s ON o.status_id = s.id
              WHERE o.user_id = :userId
              ORDER BY o.id DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
    $stmt->execute();
    
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Return success response with orders
    echo json_encode([
        'success' => true,
        'orders' => $orders
    ]);
    
} catch (PDOException $e) {
    // Return error response
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>