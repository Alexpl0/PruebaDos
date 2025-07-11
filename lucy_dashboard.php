<?php
/**
 * lucy_dashboard.php - Página para generar dashboards de Power BI con IA.
 * Utiliza el sistema de autenticación y contexto centralizado.
 */

// 1. Manejar sesión y autenticación.
require_once 'dao/users/auth_check.php';

// 2. Incluir el inyector de contexto.
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generador de Dashboards con IA</title>
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">

    <!-- ================== CSS DE TERCEROS ================== -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- ================== CSS LOCAL ================== -->
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/styles.css">
    
    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <!-- Incluir el módulo de configuración JS. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->

    <?php 
    // Carga condicional del CSS del asistente de IA.
    // Asumimos que solo usuarios con nivel > 0 pueden usarlo.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/lucy_dashboard.css">
    <?php endif; ?>
</head>
<body>
    <!-- Contenedor para el header dinámico -->
    <div id="header-container"></div>
    
    <main class="container my-5">
        <div class="lucy-main-container">
            <!-- Sección de Interacción con Lucy -->
            <div id="lucy-interaction-card" class="card">
                <div class="card-body">
                    <div class="lucy-header">
                        <div class="lucy-avatar">
                            <!-- Icono SVG para Lucy: elegante y sin archivos externos -->
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-cpu"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                        </div>
                        <div class="lucy-title">
                            <h1 class="h3">Hola, soy Lucy</h1>
                            <p class="text-muted">Tu asistente de inteligencia artificial para análisis de datos.</p>
                        </div>
                    </div>
                    <hr>
                    <p class="card-text mt-3">Describe el dashboard que necesitas. Sé lo más específico posible para obtener el mejor resultado.</p>
                    
                    <form id="lucy-form">
                        <div class="mb-3">
                            <textarea id="prompt-input" class="form-control" rows="4" placeholder="Ej: 'Necesito un reporte con las ventas por país en un mapa y el costo por transportista en una gráfica de barras...'"></textarea>
                        </div>
                        <button type="submit" id="generate-dashboard-btn" class="btn btn-primary w-100">
                            <i class="fas fa-cogs me-2"></i>Generar Dashboard
                        </button>
                    </form>
                </div>
            </div>

            <!-- Sección para mostrar el resultado del Power BI -->
            <div id="dashboard-result-container" class="mt-4" style="display: none;">
                <div class="card">
                    <div class="card-header">
                        <h5>Visualización de Power BI</h5>
                    </div>
                    <div class="card-body">
                        <!-- Loader -->
                        <div id="loader" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Generando...</span>
                            </div>
                            <p class="mt-2">Lucy está procesando tu solicitud...</p>
                        </div>
                        
                        <!-- Contenedor del Iframe -->
                        <div id="iframe-container" style="display: none;">
                            <iframe id="powerbi-iframe" src="" frameborder="0" allowfullscreen="true"></iframe>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="text-center mt-5 py-3">
        <p>&copy; <?php echo date("Y"); ?> Premium Freight. Todos los derechos reservados.</p>
    </footer>

    <!-- ================== SCRIPTS DE TERCEROS ================== -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- ================== SCRIPTS LOCALES ================== -->
    <script src="js/header.js"></script>

    <?php 
    // Carga condicional del JS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/lucy_dashboard.js"></script>
    <?php endif; ?>
</body>
</html>
