<?php
session_start();

// Lista de páginas permitidas para usuarios con authorization_level 0
$allowed_pages_level0 = [
    '/newOrder.php',
    '/profile.php',
    '/myorders.php'  // Agregamos myorders.php para que usuarios nivel 0 vean sus órdenes
];

// Lista de páginas restringidas para usuarios con authorization_level 0
$restricted_pages_level0 = [
    '/orders.php',
    '/adminUsers.php',
    '/dashboard.php',
    '/view_order.php'  // Mantenemos view_order.php restringida para usuarios nivel 0
];

// Obtener la ruta actual
$current_page = $_SERVER['REQUEST_URI'];
$base_name = basename($current_page);

// Comprobar si el usuario ha iniciado sesión
if (!isset($_SESSION['user'])) {
    // Páginas públicas permitidas sin sesión
    $public_pages = ['index.php', 'register.php', 'recovery.php'];
    if (!in_array($base_name, $public_pages)) {
        header('Location: index.php');
        exit;
    }
} else {
    // Ha iniciado sesión, verificar nivel de autorización
    $auth_level = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
    $user_plant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
    $user_name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
    $user_id = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
    
    // Si el usuario tiene authorization_level 0, verificar página
    if ($auth_level === 0 || $auth_level === '0') {
        // Verificar si está intentando acceder a una página restringida
        foreach ($restricted_pages_level0 as $page) {
            if (strpos($current_page, $page) !== false || $base_name === trim($page, '/')) {
                // Redirigir a una página permitida (myorders.php para que vean sus órdenes)
                header('Location: myorders.php');
                exit;
            }
        }
    }
    // Para otros niveles de autorización, puedes agregar más condiciones aquí
}
?>