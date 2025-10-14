<?php
/**
 * Endpoint to manage GRAMMER shipping requests
 * @author Alejandro Pérez (Updated for new DB schema)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Assuming session is started and user is authenticated
session_start();

require_once '../config/database.php'; // Assumes a PDO connection named $pdo
require_once '../includes/validation.php';
require_once '../includes/email_sender.php';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        handleCreateRequest();
    } else {
        throw new Exception('Method not allowed');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}

function handleCreateRequest() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid data');
    }

    // Authentication check
    if (!isset($_SESSION['user']) || empty($_SESSION['user']['id'])) {
        throw new Exception('User not authenticated');
    }
    
    $user_id = $_SESSION['user']['id'];
    $user_name = $input['user_name'] ?? $_SESSION['user']['name'];
    $company_area = $input['company_area'] ?? 'Logistics';
    $shipping_method = $input['shipping_method'];
    $method_data = $input['method_data'];
    $notes = $input['notes'] ?? null;
    
    if (empty($shipping_method) || empty($method_data)) {
        throw new Exception("Required fields: shipping_method, method_data");
    }
    
    try {
        $pdo->beginTransaction();
        
        // DB Schema Change: Insert into `ShippingRequests` with new columns
        $stmt = $pdo->prepare("
            INSERT INTO ShippingRequests 
            (user_id, user_name, company_area, shipping_method, request_status, notes)
            VALUES (?, ?, ?, ?, 'pending', ?)
        ");
        
        $stmt->execute([$user_id, $user_name, $company_area, $shipping_method, $notes]);
        $request_id = $pdo->lastInsertId();
        
        // Insert into specific shipment tables
        switch ($shipping_method) {
            case 'fedex':
                insertFedexShipment($pdo, $request_id, $method_data);
                break;
            case 'aereo_maritimo':
                insertAirSeaShipment($pdo, $request_id, $method_data);
                break;
            case 'nacional':
                insertDomesticShipment($pdo, $request_id, $method_data);
                break;
            default:
                throw new Exception('Unsupported shipping method');
        }
        
        $pdo->commit();
        
        sendQuoteRequestEmails($request_id, $shipping_method, $method_data);
        
        echo json_encode([
            'success' => true,
            'request_id' => $request_id,
            'message' => 'GRAMMER request created successfully'
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// DB Schema Change: Updated functions to insert into `FedexShipments`, `AirSeaShipments`, `DomesticShipments`
function insertFedexShipment($pdo, $request_id, $data) {
    $stmt = $pdo->prepare("
        INSERT INTO FedexShipments (
            request_id, origin_company_name, origin_address, origin_contact_name, origin_contact_phone, origin_contact_email,
            destination_company_name, destination_address, destination_contact_name, destination_contact_phone, destination_contact_email,
            total_packages, total_weight, package_dimensions, order_number, merchandise_description, merchandise_type, merchandise_material
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $request_id, $data['origin_company_name'], $data['origin_address'], $data['origin_contact_name'], $data['origin_contact_phone'], $data['origin_contact_email'],
        $data['destination_company_name'], $data['destination_address'], $data['destination_contact_name'], $data['destination_contact_phone'], $data['destination_contact_email'],
        $data['total_packages'], $data['total_weight'], $data['package_dimensions'], $data['order_number'], $data['merchandise_description'], $data['merchandise_type'], $data['merchandise_material']
    ]);
}

function insertAirSeaShipment($pdo, $request_id, $data) {
    $stmt = $pdo->prepare("
        INSERT INTO AirSeaShipments (
            request_id, total_pallets, total_boxes, weight_per_unit, unit_length, unit_width, unit_height,
            pickup_date, pickup_address, ship_hours_start, ship_hours_end, contact_name, contact_phone, contact_email,
            incoterm, delivery_type, delivery_point_type, delivery_company_name, delivery_place, delivery_date_plant, order_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $request_id, $data['total_pallets'], $data['total_boxes'], $data['weight_per_unit'], $data['unit_length'], $data['unit_width'], $data['unit_height'],
        $data['pickup_date'], $data['pickup_address'], $data['ship_hours_start'], $data['ship_hours_end'], $data['contact_name'], $data['contact_phone'], $data['contact_email'],
        $data['incoterm'], $data['delivery_type'], $data['delivery_point_type'], $data['delivery_company_name'], $data['delivery_place'], $data['delivery_date_plant'], $data['order_number']
    ]);
}

function insertDomesticShipment($pdo, $request_id, $data) {
    $stmt = $pdo->prepare("
        INSERT INTO DomesticShipments (
            request_id, total_pallets, total_boxes, weight_per_unit, unit_length, unit_width, unit_height,
            pickup_date, pickup_address, ship_hours_start, ship_hours_end, contact_name, contact_phone, contact_email,
            delivery_place, delivery_date_plant, order_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $request_id, $data['total_pallets'], $data['total_boxes'], $data['weight_per_unit'], $data['unit_length'], $data['unit_width'], $data['unit_height'],
        $data['pickup_date'], $data['pickup_address'], $data['ship_hours_start'], $data['ship_hours_end'], $data['contact_name'], $data['contact_phone'], $data['contact_email'],
        $data['delivery_place'], $data['delivery_date_plant'], $data['order_number']
    ]);
}

function sendQuoteRequestEmails($request_id, $shipping_method, $method_data) {
    error_log("GRAMMER: Sending emails for request #$request_id - Method: $shipping_method");
}
