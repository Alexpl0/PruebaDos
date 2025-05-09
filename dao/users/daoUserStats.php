<?php
include_once('../db/db.php');
session_start();

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'You must be logged in to view stats'
    ]);
    exit;
}

try {
    // Get user ID from session
    $userId = $_SESSION['user']['id'];
    
    // Connect to database
    $con = new LocalConector();
    $conex = $con->conectar();
    
    // Get count of orders created by this user
    $stmt = $conex->prepare("SELECT COUNT(*) FROM PremiumFreight WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($ordersCreated);
    $stmt->fetch();
    $stmt->close();
    
    // Get count of orders approved by this user
    $stmt = $conex->prepare("
        SELECT COUNT(DISTINCT premium_freight_id) 
        FROM PremiumFreightApprovals 
        WHERE user_id = ? AND status_id <> 99
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($ordersApproved);
    $stmt->fetch();
    $stmt->close();
    
    // Get count of orders rejected by this user
    $stmt = $conex->prepare("
        SELECT COUNT(DISTINCT premium_freight_id) 
        FROM PremiumFreightApprovals 
        WHERE user_id = ? AND status_id = 99
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($ordersRejected);
    $stmt->fetch();
    $stmt->close();
    
    $conex->close();
    
    echo json_encode([
        'success' => true,
        'created' => $ordersCreated,
        'approved' => $ordersApproved,
        'rejected' => $ordersRejected
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred: ' . $e->getMessage()
    ]);
}
?>