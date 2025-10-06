<?php
/**
 * lucy_dashboard.php - Página para generar dashboards de Excel, Power BI y Gamma con AI.
 */

require_once 'dao/users/auth_check.php';
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lucy - AI Dashboard Generator</title>
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">

    <!-- Third-party CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Local CSS -->
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/styles.css">
    
    <!-- Config -->
    <script src="js/config.js"></script>

    <?php if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/lucy_dashboard.css">
    <?php endif; ?>
</head>
<body>
    <div id="header-container"></div>
    
    <main class="container my-5">
        <div class="lucy-main-container">
            <!-- Lucy Interaction Section -->
            <div id="lucy-interaction-card" class="card">
                <div class="card-body">
                    <div class="lucy-header">
                        <div class="lucy-avatar">
                            <img src="assets/assistant/Lucy.png" alt="Lucy Avatar" width="48" height="48" style="border-radius: 50%; object-fit: cover;">
                        </div>
                        <div class="lucy-title">
                            <h1 class="h3">Hola, soy Lucy</h1>
                            <p class="text-muted">Tu asistente de IA para análisis de datos.</p>
                        </div>
                    </div>
                    <hr>
                    
                    <!-- Output Type Selector - ACTUALIZADO CON GAMMA -->
                    <div class="output-selector">
                        <button type="button" id="output-excel-btn" class="output-type-btn active">
                            <i class="fas fa-file-excel"></i>
                            <span>Excel</span>
                        </button>
                        <button type="button" id="output-powerbi-btn" class="output-type-btn">
                            <i class="fas fa-chart-bar"></i>
                            <span>Power BI</span>
                        </button>
                        <button type="button" id="output-gamma-btn" class="output-type-btn">
                            <i class="fas fa-presentation"></i>
                            <span>Gamma</span>
                        </button>
                    </div>
                    
                    <p class="card-text mt-3">Describe el dashboard que necesitas. Sé lo más específico posible para obtener el mejor resultado.</p>
                    
                    <p class="prompt-example">Por ejemplo: <em>"Crea un dashboard que muestre los costos por transportista en un gráfico de barras y el número de órdenes por planta en una tabla dinámica."</em></p>
                    
                    <form id="lucy-form" class="text-center">
                        <div class="mb-3">
                            <textarea id="prompt-input" class="form-control" rows="4" placeholder="Ej: 'Necesito un reporte con los costos totales por categoría de causa, una tabla con todas las órdenes pendientes, y un gráfico de línea mostrando la tendencia de costos por mes...'"></textarea>
                        </div>
                        <button type="submit" id="generate-dashboard-btn" class="btn btn-primary">
                            <i class="fas fa-cogs me-2"></i>Generar Dashboard
                        </button>
                    </form>
                </div>
            </div>

            <!-- Results Section -->
            <div id="dashboard-result-container" class="mt-4" style="display: none;">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="fas fa-chart-line me-2"></i>Dashboard Interactivo
                        </h5>
                        <div class="dashboard-controls">
                            <button id="download-excel-btn" class="btn btn-success btn-sm">
                                <i class="fas fa-download"></i>
                                Descargar
                            </button>
                            <button id="new-dashboard-btn" class="btn btn-secondary btn-sm">
                                <i class="fas fa-plus"></i>
                                Nuevo Dashboard
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <!-- Loader -->
                        <div id="loader" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                                <span class="visually-hidden">Generando...</span>
                            </div>
                            <p class="mt-3">
                                <strong>Lucy está procesando tu solicitud...</strong>
                            </p>
                            <p class="text-muted">Esto puede tomar unos momentos mientras analizamos los datos y creamos tu dashboard personalizado.</p>
                        </div>
                        
                        <!-- Iframe Container -->
                        <div id="iframe-container" style="display: none;">
                            <iframe id="powerbi-iframe" src="" frameborder="0" allowfullscreen="true"></iframe>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Chat Interface -->
            <div id="chat-container" class="mt-4" style="display: none;">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fas fa-comments me-2"></i>Conversación con Lucy
                        </h5>
                        <p class="text-muted small mb-0">Puedes pedirle a Lucy que modifique el dashboard o agregar más análisis.</p>
                    </div>
                    <div class="card-body">
                        <div id="chat-messages"></div>
                        
                        <div id="chat-input-container">
                            <textarea 
                                id="chat-input" 
                                class="form-control" 
                                rows="1" 
                                placeholder="Escribe tu mensaje... (Ej: 'Agrega un gráfico de pastel mostrando la distribución por carrier')"
                            ></textarea>
                            <button id="send-chat-btn" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="text-center mt-5 py-3">
        <p>&copy; <?php echo date("Y"); ?> Premium Freight. All rights reserved.</p>
    </footer>

    <!-- Third-party scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Local scripts -->
    <script src="js/header.js" type="module"></script>

    <?php if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/lucy_dashboard.js"></script>
    <?php endif; ?>
</body>
</html>