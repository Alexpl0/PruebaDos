<?php
session_start();

// Lista de páginas permitidas para usuarios con authorization_level 0
$allowed_pages_level0 = [
    '/newOrder.php',
    '/profile.php'
];

// Lista de páginas restringidas para usuarios con authorization_level 0
$restricted_pages_level0 = [
    '/orders.php',
    '/adminUsers.php',
    '/dashboard.php'
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
    
    // Debug: Agregar console.log para información del usuario desde auth_check
    echo "<script>";
    echo "console.log('=== AUTH_CHECK DEBUG INFO ===');";
    echo "console.log('Current Page:', " . json_encode($current_page) . ");";
    echo "console.log('User ID:', " . json_encode($user_id) . ");";
    echo "console.log('User Name:', " . json_encode($user_name) . ");";
    echo "console.log('User Plant:', " . json_encode($user_plant) . ");";
    echo "console.log('Authorization Level:', " . json_encode($auth_level) . ");";
    echo "console.log('Base Name:', " . json_encode($base_name) . ");";
    echo "console.log('==============================');";
    echo "</script>";
    
    // Si el usuario tiene authorization_level 0, verificar página
    if ($auth_level === 0 || $auth_level === '0') {
        // Verificar si está intentando acceder a una página restringida
        foreach ($restricted_pages_level0 as $page) {
            if (strpos($current_page, $page) !== false || $base_name === trim($page, '/')) {
                // Redirigir a una página permitida
                header('Location: newOrder.php');
                exit;
            }
        }
    }
    // Para otros niveles de autorización, puedes agregar más condiciones aquí
}
?>