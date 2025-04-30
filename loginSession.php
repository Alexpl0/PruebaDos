<?php
session_start();
// Supón que recibes los datos del usuario por POST (JSON)
$input = json_decode(file_get_contents('php://input'), true);

// Aquí deberías validar los datos y obtener el usuario de la base de datos
// Supongamos que $input['id'] y $input['email'] existen y son válidos

$_SESSION['user'] = [
    'id' => $input['id'],
    'email' => $input['email'],
    // Puedes agregar más datos si lo deseas
];

echo json_encode(['status' => 'success']);
?>