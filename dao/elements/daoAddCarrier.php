<?php

include_once('../db/PFDB.php');

header('Content-Type: application/json; charset=utf-8');

// Make sure we're using a POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "error", "message" => "Method not allowed. Use POST."], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Get the data from the request body
$postData = json_decode(file_get_contents('php://input'), true);

// Verify all required data is received
if (!isset($postData['name']) || trim($postData['name']) === '') {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "Missing required data: name"], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Clean up and prepare the data
$carrierName = trim($postData['name']);

try {
    $con = new LocalConector();
    $conex = $con->conectar();
    
    // Start a transaction for safety
    $conex->begin_transaction();
    
    // Check if this carrier already exists
    $checkQuery = "SELECT id FROM `Carriers` WHERE name = ? LIMIT 1";
    $checkStmt = $conex->prepare($checkQuery);
    $checkStmt->bind_param("s", $carrierName);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        // Carrier already exists, return its ID
        $row = $checkResult->fetch_assoc();
        $existingId = $row['id'];
        $checkStmt->close();
        $conex->close();
        
        echo json_encode([
            "status" => "success", 
            "message" => "Carrier already exists", 
            "carrier_id" => $existingId,
            "is_new" => false
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $checkStmt->close();

    // Prepare the query to insert the new carrier
    $query = "INSERT INTO `Carriers` (name) VALUES (?)";
    $stmt = $conex->prepare($query);
    
    // Check if preparation was successful
    if (!$stmt) {
        throw new Exception("Error preparing statement: " . $conex->error);
    }
    
    // Bind parameters
    $stmt->bind_param("s", $carrierName);
    
    // Execute the query
    $result = $stmt->execute();
    
    if ($result) {
        // Get the inserted ID (if the table has an auto-increment field)
        $insertedId = $stmt->insert_id;
        
        // Close the statement
        $stmt->close();
        
        // Commit the transaction
        $conex->commit();
        
        // Return success and the inserted data
        echo json_encode([
            "status" => "success", 
            "message" => "Carrier added successfully", 
            "carrier_id" => $insertedId,
            "is_new" => true
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    } else {
        // Rollback if there was an error
        $conex->rollback();
        throw new Exception("Error executing statement: " . $stmt->error);
    }
    
    // Close the connection
    $conex->close();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Server error: " . $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>