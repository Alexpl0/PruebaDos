<?php
/**
 * quotes.php - Página principal del Portal de Cotización Inteligente
 * Adaptada para usar la misma estructura y configuraciones que newOrder.php.
 */

// 1. Manejar sesión y autenticación.
require_once 'dao/users/auth_check.php';

// 2. Cargar dependencias necesarias.
require_once 'dao/elements/daoPlantas.php';
require_once 'dao/elements/daoTransport.php';
require_once 'dao/elements/daoCarrier.php';

// 3. Incluir el inyector de contexto.
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GRAMMER Logística y Tráfico - Portal de Cotización</title>

    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">

    <!-- Estilos externos -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">

    <!-- Estilos locales -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/index.css">
    <link rel="stylesheet" href="cotizaciones/css/index.css">

    <!-- Configuración del contexto -->
    <script src="js/config.js"></script>
</head>
<body>
    <!-- Header GRAMMER -->
    <header class="bg-grammer-gradient text-white py-3 shadow-lg">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div class="d-flex align-items-center">
                        <div class="grammer-logo me-3">
                            <i class="fas fa-industry fa-2x"></i>
                        </div>
                        <div>
                            <h1 class="h3 mb-0 fw-bold">
                                <span class="grammer-brand">GRAMMER</span>
                                <span class="grammer-subtitle">Logística y Tráfico</span>
                            </h1>
                            <small class="opacity-90">
                                <i class="fas fa-shipping-fast me-1"></i>
                                Portal de Cotización Inteligente
                            </small>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 text-md-end">
                    <div class="header-actions">
                        <a href="dashboard.php" class="btn btn-light btn-sm me-2">
                            <i class="fas fa-chart-line me-1"></i>
                            Dashboard
                        </a>
                        <div class="btn-group">
                            <button type="button" class="btn btn-outline-light btn-sm dropdown-toggle" data-bs-toggle="dropdown">
                                <i class="fas fa-cog me-1"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="#" onclick="grammerForm.loadDraft()">
                                    <i class="fas fa-file-import me-2"></i>Cargar Borrador
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="grammerForm.clearDraft()">
                                    <i class="fas fa-trash me-2"></i>Limpiar Borrador
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="mailto:logistica@grammer.com">
                                    <i class="fas fa-envelope me-2"></i>Soporte
                                </a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container py-4">
        <div class="row justify-content-center">
            <div class="col-lg-10">
                <!-- Form Card -->
                <div class="card grammer-card shadow-lg">
                    <div class="card-header grammer-card-header">
                        <div class="d-flex align-items-center justify-content-between">
                            <div>
                                <h2 class="card-title h5 mb-0">
                                    <i class="fas fa-plus-circle text-grammer-accent me-2"></i>
                                    Nueva Solicitud de Cotización
                                </h2>
                                <small class="text-muted">
                                    <i class="fas fa-calendar me-1"></i>
                                    <span id="currentDateTime"></span>
                                </small>
                            </div>
                            <div class="grammer-badge">
                                <i class="fas fa-shield-alt me-1"></i>
                                Sistema Seguro
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <form id="shippingRequestForm" novalidate>
                            <!-- Selector de método y formulario dinámico -->
                            <div id="shippingMethodSelector" class="mb-4">
                                <!-- Será llenado por JavaScript -->
                            </div>
                            
                            <!-- Container para formulario dinámico -->
                            <div id="dynamicFormContainer">
                                <!-- Será llenado dinámicamente por JavaScript según el método seleccionado -->
                            </div>

                            <!-- Botones de Acción (solo visible cuando hay método seleccionado) -->
                            <div id="formActionButtons" class="row mt-4" style="display: none;">
                                <div class="col-md-6">
                                    <button type="button" class="btn btn-outline-secondary w-100" id="clearFormBtn">
                                        <i class="fas fa-eraser me-1"></i>
                                        Limpiar Formulario
                                    </button>
                                </div>
                                <div class="col-md-6">
                                    <button type="submit" class="btn btn-grammer-primary w-100" id="submitBtn">
                                        <i class="fas fa-paper-plane me-1"></i>
                                        <span class="submit-text">Enviar Solicitud</span>
                                        <span class="submit-loading d-none">
                                            <i class="fas fa-spinner fa-spin me-1"></i>
                                            Enviando...
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Info Card GRAMMER -->
                <div class="card grammer-info-card mt-4">
                    <div class="card-body">
                        <h5 class="card-title text-grammer-primary">
                            <i class="fas fa-info-circle me-2"></i>
                            Cómo funciona nuestro sistema de cotización
                        </h5>
                        <div class="row">
                            <div class="col-md-3 text-center mb-3">
                                <div class="info-step">
                                    <div class="step-icon bg-grammer-primary">
                                        <i class="fas fa-mouse-pointer fa-lg"></i>
                                    </div>
                                    <h6>1. Seleccionar Método</h6>
                                    <small class="text-muted">Elige entre Fedex, Aéreo-Marítimo o Nacional</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center mb-3">
                                <div class="info-step">
                                    <div class="step-icon bg-grammer-secondary">
                                        <i class="fas fa-edit fa-lg"></i>
                                    </div>
                                    <h6>2. Completar Datos</h6>
                                    <small class="text-muted">Llena el formulario específico del método</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center mb-3">
                                <div class="info-step">
                                    <div class="step-icon bg-grammer-accent">
                                        <i class="fas fa-share fa-lg"></i>
                                    </div>
                                    <h6>3. Envío Automático</h6>
                                    <small class="text-muted">Se notifica a transportistas especializados</small>
                                </div>
                            </div>
                            <div class="col-md-3 text-center mb-3">
                                <div class="info-step">
                                    <div class="step-icon bg-grammer-success">
                                        <i class="fas fa-chart-bar fa-lg"></i>
                                    </div>
                                    <h6>4. Análisis IA</h6>
                                    <small class="text-muted">Comparativa inteligente de opciones</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Card (Solo visible si hay datos) -->
                <div id="quickStats" class="card grammer-stats-card mt-4 d-none">
                    <div class="card-body">
                        <h6 class="card-title text-grammer-primary mb-3">
                            <i class="fas fa-tachometer-alt me-2"></i>
                            Estadísticas Rápidas - Hoy
                        </h6>
                        <div class="row">
                            <div class="col-md-3">
                                <div class="stat-item">
                                    <div class="stat-number" id="todayRequests">0</div>
                                    <div class="stat-label">Solicitudes</div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-item">
                                    <div class="stat-number" id="pendingQuotes">0</div>
                                    <div class="stat-label">Pendientes</div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-item">
                                    <div class="stat-number" id="completedToday">0</div>
                                    <div class="stat-label">Completadas</div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-item">
                                    <div class="stat-number" id="avgResponseTime">-</div>
                                    <div class="stat-label">Tiempo Resp. Prom.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="text-center py-3">
        <p>© 2025 GRAMMER Automotive Puebla S.A. de C.V. - Todos los derechos reservados.</p>
    </footer>

    <!-- Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/limonte-sweetalert2/11.10.1/sweetalert2.all.min.js"></script>
    <script src="js/config.js"></script>
    <script type="module" src="js/index.js"></script>
</body>
</html>