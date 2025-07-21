<?php
// Cambia esto exactamente al dominio de tu frontend (incluye https y sin barra final)
header('Access-Control-Allow-Origin: https://grammermx.com');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();

// Supón que recibes los datos del usuario por POST (JSON)
$input = json_decode(file_get_contents('php://input'), true);

// Aquí deberías validar los datos y obtener el usuario de la base de datos
// Supongamos que $input['id'], $input['email'] y $input['authorization_level'] existen y son válidos

$_SESSION['user'] = [
    'id' => $input['id'],
    'email' => $input['email'],
    'name' => $input['name'], // Asegúrate de que 'name' esté en el JSON
    'authorization_level' => $input['authorization_level'], 
    'plant' => $input['plant'], // Asegúrate de que 'plant' esté en el JSON
    'role' => $input['role'] // Si tienes un campo de rol, puedes agregarlo aquí
    // Puedes agregar más datos si lo deseas
];

echo json_encode(['status' => 'success']);
?>