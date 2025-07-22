<?php
require_once __DIR__ . '/../db/cors_config.php';
session_start();
session_unset(); // Elimina todas las variables de sesión
session_destroy(); // Destruye la sesión

// Redirige al usuario al inicio de sesión o a la página principal
header("Location: ../../index.php");
exit();
?>