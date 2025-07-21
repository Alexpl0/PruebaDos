<?php
// --- CORS GLOBAL ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();

// Lista de páginas públicas (solo para usuarios NO logueados)
$public_pages = [
    'index.php',
    'register.php', 
    'recovery.php',
    'password_reset.php'
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
$base_name = basename(parse_url($current_page, PHP_URL_PATH));

// Comprobar si el usuario ha iniciado sesión
if (!isset($_SESSION['user'])) {
    // Usuario NO logueado
    if (!in_array($base_name, $public_pages)) {
        header('Location: index.php');
        exit;
    }
} else {
    // Usuario SÍ está logueado
    $auth_level = $_SESSION['user']['authorization_level'] ?? null;
    $user_id = $_SESSION['user']['id'] ?? null;
    
    // EXCEPCIÓN: password_reset.php debe ser accesible si hay un token válido
    if ($base_name === 'password_reset.php') {
        if (!isset($_GET['token']) || empty($_GET['token'])) {
            header('Location: recovery.php');
            exit;
        }
    }
    // Si intenta acceder a otras páginas públicas estando logueado, redirigir a profile
    elseif (in_array($base_name, $public_pages)) {
        header('Location: profile.php');
        exit;
    }
    
    // --- NUEVA REGLA DE SÚPER USUARIO ---
    // Solo el usuario con ID 36 puede acceder a la página de administración de usuarios.
    if ($base_name === 'adminUsers.php' && $user_id != 36) {
        // Si no es el súper usuario, se redirige a una página segura.
        header('Location: newOrder.php');
        exit;
    }
    
    // Si el usuario tiene authorization_level 0, verificar páginas restringidas
    if ($auth_level === 0 || $auth_level === '0') {
        foreach ($restricted_pages_level0 as $page) {
            if (strpos($current_page, $page) !== false || $base_name === trim($page, '/')) {
                header('Location: myorders.php');
                exit;
            }
        }
    }
}
?>
