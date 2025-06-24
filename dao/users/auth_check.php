<?php
session_start();

// Lista de páginas públicas (solo para usuarios NO logueados)
$public_pages = [
    'index.php',
    'register.php', 
    'recovery.php',
    'password_reset.php'  // Esta línea ya existe, pero necesitamos agregar más lógica
];

// Lista de páginas permitidas para usuarios con authorization_level 0
$allowed_pages_level0 = [
    '/newOrder.php',
    '/profile.php',
    '/myorders.php'
];

// Lista de páginas restringidas para usuarios con authorization_level 0
$restricted_pages_level0 = [
    '/orders.php',
    '/adminUsers.php',
    '/dashboard.php',
    '/view_order.php',
    '/viewWeekOrder.php',
];

// Obtener la ruta actual
$current_page = $_SERVER['REQUEST_URI'];
$base_name = basename(parse_url($current_page, PHP_URL_PATH)); // Usar parse_url para manejar parámetros

// Comprobar si el usuario ha iniciado sesión
if (!isset($_SESSION['user'])) {
    // Usuario NO logueado
    // Solo puede acceder a páginas públicas
    if (!in_array($base_name, $public_pages)) {
        header('Location: index.php');
        exit;
    }
} else {
    // Usuario SÍ está logueado
    $auth_level = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
    $user_plant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
    $user_name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
    $user_id = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
    
    // EXCEPCIÓN: password_reset.php debe ser accesible independientemente del estado de sesión
    // si tiene un token válido, ya que puede ser usado por usuarios logueados o no logueados
    if ($base_name === 'password_reset.php') {
        // Permitir acceso si hay un token en la URL
        if (isset($_GET['token']) && !empty($_GET['token'])) {
            // No hacer nada, permitir que la página procese el token
        } else {
            // Si no hay token, redirigir a recovery
            header('Location: recovery.php');
            exit;
        }
    }
    // Si intenta acceder a otras páginas públicas estando logueado, redirigir a profile
    elseif (in_array($base_name, $public_pages) && $base_name !== 'password_reset.php') {
        header('Location: profile.php');
        exit;
    }
    
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