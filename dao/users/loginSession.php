<?php
require_once __DIR__ . '/../db/cors_config.php';

session_start();

$input = json_decode(file_get_contents('php://input'), true);

$_SESSION['user'] = [
    'id' => $input['id'],
    'email' => $input['email'],
    'name' => $input['name'],
    'authorization_level' => $input['authorization_level'],
    'plant' => $input['plant'],
    'role' => $input['role']
];

echo json_encode(['status' => 'success']);
?>