<?php
session_start();

// Lista de páginas permitidas para usuarios con auth_level 0
$allowed_pages_level0 = [
    '/Jesus/PruebaDos/index.php',
    '/Jesus/PruebaDos/newOrder.php',
    '/Jesus/PruebaDos/profile.php'
];

// Obtener la ruta actual
$current_page = $_SERVER['REQUEST_URI'];

// Comprobar si el usuario ha iniciado sesión
if (!isset($_SESSION['user'])) {
    // No ha iniciado sesión, redirigir al login (excepto si ya está en index.php)
    if (!strpos($current_page, 'index.php')) {
        header('Location: index.php');
        exit;
    }
} else {
    // Ha iniciado sesión, verificar nivel de autorización
    $auth_level = isset($_SESSION['auth_level']) ? $_SESSION['auth_level'] : null;
    
    // Si el usuario tiene auth_level 0, verificar página
    if ($auth_level === 0) {
        $is_allowed = false;
        
        // Comprobar si la página actual está en la lista de permitidas
        foreach ($allowed_pages_level0 as $page) {
            if (strpos($current_page, $page) !== false) {
                $is_allowed = true;
                break;
            }
        }
        
        // Si no está permitida, redirigir a una página permitida
        if (!$is_allowed) {
            header('Location: newOrder.php');
            exit;
        }
    }
    // Para otros niveles de autorización, puedes agregar más condiciones aquí
}
?>