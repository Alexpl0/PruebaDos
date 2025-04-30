<?php
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
    // Puedes agregar más datos si lo deseas
];

echo json_encode(['status' => 'success']);
?>