<?php
session_start();

// Lista de páginas públicas (solo para usuarios NO logueados)
$public_pages = [
    'index.php',
    'register.php', 
    'recovery.php',
    'password_reset.php'
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
    '/view_order.php'
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
    $auth_level = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
    $user_plant = isset($_SESSION['user']['plant']) ? $_SESSION['user']['plant'] : null;
    $user_name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
    $user_id = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
    $user_verified = isset($_SESSION['user']['verified']) ? $_SESSION['user']['verified'] : 0;
    
    // VERIFICACIÓN DE CUENTA: Si el usuario no está verificado, redirigir a página de verificación
    if ($user_verified == 0 && $base_name !== 'verification_required.php') {
        // Enviar correo de verificación automáticamente
        require_once __DIR__ . '/../../mailer/PFMailer/PFmailer.php';
        $mailer = new PFMailer();
        $mailer->sendVerificationEmail($user_id);
        
        header('Location: verification_required.php');
        exit;
    }
    
    // EXCEPCIÓN: password_reset.php debe ser accesible independientemente del estado de sesión
    if ($base_name === 'password_reset.php') {
        if (isset($_GET['token']) && !empty($_GET['token'])) {
            // No hacer nada, permitir que la página procese el token
        } else {
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
        foreach ($restricted_pages_level0 as $page) {
            if (strpos($current_page, $page) !== false || $base_name === trim($page, '/')) {
                header('Location: myorders.php');
                exit;
            }
        }
    }
}
?>