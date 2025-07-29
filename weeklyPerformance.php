<?php
/**
 * weeklyPerformance.php - Weekly Performance Analytics Dashboard
 * This page shows detailed weekly statistics and KPIs with enhanced visualizations.
 */

// 1. Manejar sesión y autenticación.
require_once 'dao/users/auth_check.php';

// 2. Incluir el inyector de contexto.
require_once 'dao/users/context_injector.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Performance Dashboard - Premium Freight</title>
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">

    <!-- ================== CSS DE TERCEROS ================== -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.css">
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">

    <!-- ================== CSS LOCAL ================== -->
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/weeklyPerformance.css">

    <!-- ================== SISTEMA DE CONTEXTO CENTRALIZADO ================== -->
    <?php
        // El inyector ya fue requerido en la parte superior del script.
    ?>
    <!-- Incluir el módulo de configuración JS. -->
    <script src="js/config.js"></script>
    <!-- ==================================================================== -->

    <?php 
    // Carga condicional del CSS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <link rel="stylesheet" href="css/assistant.css">
    <?php endif; ?>

    <style>
        /* Estilos adicionales para el loading overlay mejorado */
        #loadingOverlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 255, 255, 0.95);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        }

        .spinner-container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            border: 1px solid #e0e0e0;
        }

        .spinner-container .spinner-border {
            width: 4rem;
            height: 4rem;
            border-width: 0.4em;
        }

        .loading-text {
            margin-top: 1rem;
            color: #034C8C;
            font-weight: 600;
            font-size: 1.1rem;
        }

        /* Mejoras en las cards de métricas */
        .metric-card {
            transition: all 0.3s ease;
            border-radius: 12px;
            overflow: hidden;
        }

        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        /* Mejoras en las gráficas */
        .chart-card {
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
        }

        .chart-card:hover {
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        /* Animaciones de entrada */
        .animate {
            animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Mejoras en el selector de semanas */
        .week-selector {
            background: linear-gradient(135deg, #034C8C 0%, #002856 100%);
            border-radius: 12px;
            padding: 1rem;
            color: white;
        }

        .week-nav-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            transition: all 0.3s ease;
        }

        .week-nav-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }

        /* Error state styling */
        .error-interface {
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            color: white;
            border-radius: 15px;
            padding: 2rem;
            text-align: center;
        }

        /* Metric trends styling */
        .metric-trend.positive {
            color: #218621;
        }

        .metric-trend.negative {
            color: #E41A23;
        }

        .metric-trend.neutral {
            color: #6b7280;
        }
    </style>
</head>
<body>
    <!-- Loading Overlay mejorado -->
    <div id="loadingOverlay" style="display:none;">
        <div class="spinner-container">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="loading-text">Cargando datos del dashboard...</div>
            <div class="mt-2">
                <small class="text-muted">Esto puede tomar unos segundos</small>
            </div>
        </div>
    </div>
    
    <div id="header-container"></div>
    
    <main class="container-fluid my-4">
        <!-- Dashboard Header -->
        <div class="performance-header animate">
            <h1 class="performance-title">
                <i class="fas fa-chart-line me-3"></i>
                Weekly Performance Dashboard
            </h1>
            <p class="performance-subtitle">
                Análisis completo de KPIs y métricas semanales para Premium Freight
            </p>
        </div>
        
        <!-- Filters Section -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card filter-card animate">
                    <div class="card-body">
                        <div class="filter-container">
                            <div class="filter-section">
                                <label for="weekSelector" class="form-label">
                                    <i class="fas fa-calendar-week"></i> Semana de Análisis
                                </label>
                                <div class="week-selector" id="weekSelector">
                                    <button type="button" class="week-nav-btn" id="prevWeek" title="Semana anterior (Ctrl + ←)">
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    <div class="week-display text-center mx-3" id="weekDisplay">
                                        <div class="week-info fw-bold" id="weekNumber">Semana de 2025</div>
                                        <div class="week-dates" id="weekDates">Cargando...</div>
                                    </div>
                                    <button type="button" class="week-nav-btn" id="nextWeek" title="Semana siguiente (Ctrl + →)">
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="filter-section">
                                <label for="plantSelector" class="form-label">
                                    <i class="fas fa-industry"></i> Filtro de Planta
                                </label>
                                <div class="plant-selector">
                                    <select class="form-select" id="plantSelector">
                                        <option value="">Todas las Plantas</option>
                                        <!-- Opciones se poblarán dinámicamente -->
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="refresh-container">
                            <button id="refreshData" class="btn btn-refresh" disabled title="Actualizar datos (Ctrl + R)">
                                <i class="fas fa-sync-alt me-2"></i>Actualizar Datos
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Weekly Summary Container -->
        <div class="row mb-4">
            <div class="col-12">
                <div id="weeklySummaryContainer" class="animate">
                    <!-- El resumen semanal se generará aquí dinámicamente -->
                </div>
            </div>
        </div>

        <!-- Performance Metrics Cards -->
        <div class="row mb-4">
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="metric-card primary animate">
                    <div class="metric-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <div class="metric-content">
                        <h3 id="totalRequests">0</h3>
                        <p>Total Generadas</p>
                        <span class="metric-trend" id="requestsTrend">
                            <i class="fas fa-info-circle"></i> Esta semana
                        </span>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="metric-card success animate">
                    <div class="metric-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="metric-content">
                        <h3 id="approvalRate">0%</h3>
                        <p>Tasa de Aprobación</p>
                        <span class="metric-trend" id="approvalTrend">
                            <i class="fas fa-percentage"></i> Del total
                        </span>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="metric-card warning animate">
                    <div class="metric-icon">
                        <i class="fas fa-euro-sign"></i>
                    </div>
                    <div class="metric-content">
                        <h3 id="totalCost">€0</h3>
                        <p>Costo Total</p>
                        <span class="metric-trend" id="costTrend">
                            <i class="fas fa-calculator"></i> Aprobados
                        </span>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="metric-card info animate">
                    <div class="metric-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="metric-content">
                        <h3 id="avgTime">0h</h3>
                        <p>Tiempo Promedio</p>
                        <span class="metric-trend" id="timeTrend">
                            <i class="fas fa-stopwatch"></i> Aprobación
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts Row 1: Trends & Status -->
        <div class="row mb-4">
            <div class="col-lg-8">
                <div class="card chart-card animate">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-chart-line me-2"></i>Análisis de Tendencias Semanales
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="trendsChart" style="height: 400px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-4">
                <div class="card chart-card animate">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-pie-chart me-2"></i>Distribución por Estado
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="statusChart" style="height: 400px;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts Row 2: Performance Analysis -->
        <div class="row mb-4">
            <div class="col-lg-6">
                <div class="card chart-card animate">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-users me-2"></i>Top Performers (Solicitudes Aprobadas)
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="topPerformersChart" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-6">
                <div class="card chart-card animate">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-building me-2"></i>Rendimiento por Área (Órdenes Aprobadas)
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="areaPerformanceChart" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts Row 3: Time & Cost Analysis -->
        <div class="row mb-4">
            <div class="col-lg-4">
                <div class="card chart-card animate">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-stopwatch me-2"></i>Distribución de Tiempos de Aprobación
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="approvalTimesChart" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-8">
                <div class="card chart-card animate">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-chart-area me-2"></i>Análisis de Costos Diarios (Solo Órdenes Aprobadas)
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="costAnalysisChart" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Performance Insights -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card insights-card animate">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-lightbulb me-2"></i>Insights de Rendimiento y Recomendaciones
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="insightsContainer">
                            <div class="text-center p-4">
                                <i class="fas fa-chart-bar fa-2x text-muted mb-3"></i>
                                <p class="text-muted">Los insights se generarán automáticamente después de cargar los datos.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
    
    <!-- ================== BIBLIOTECAS JS ================== -->
    <!-- Core Libraries -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Chart Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.js"></script>
    
    <!-- Export Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    
    <!-- PDF Library con manejo de errores mejorado -->
    <script>
        // Función para cargar jsPDF con mejor manejo de errores
        let jsPDFLoaded = false;
        let jsPDFError = false;

        function loadJSPDF() {
            return new Promise((resolve, reject) => {
                if (jsPDFLoaded) {
                    resolve(true);
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                
                script.onload = function() {
                    jsPDFLoaded = true;
                    console.log('jsPDF library loaded successfully');
                    resolve(true);
                };
                
                script.onerror = function() {
                    jsPDFError = true;
                    console.error('Failed to load jsPDF library');
                    reject(new Error('jsPDF failed to load'));
                };
                
                document.head.appendChild(script);
            });
        }

        // Cargar jsPDF al inicio
        loadJSPDF().catch(error => {
            console.warn('PDF functionality will be limited:', error);
        });

        // Función para verificar disponibilidad de bibliotecas
        function checkLibraryAvailability() {
            const libraries = {
                moment: typeof moment !== 'undefined',
                ApexCharts: typeof ApexCharts !== 'undefined',
                XLSX: typeof XLSX !== 'undefined',
                jsPDF: jsPDFLoaded,
                Swal: typeof Swal !== 'undefined',
                jQuery: typeof $ !== 'undefined',
                Bootstrap: typeof bootstrap !== 'undefined'
            };

            console.log('Library availability check:', libraries);
            
            const missing = Object.entries(libraries)
                .filter(([name, available]) => !available)
                .map(([name]) => name);

            if (missing.length > 0) {
                console.warn('Missing libraries:', missing);
            }

            return libraries;
        }

        // Verificar bibliotecas cuando el DOM esté listo
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                checkLibraryAvailability();
            }, 1000);
        });
    </script>
    
    <!-- Local JS Files -->
    <script src="js/header.js" type="module"></script>
    <script type="module" src="js/weeklykpi/weeklyPerformance.js"></script>

    <?php 
    // Carga condicional del JS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>

    <!-- Global Error Handling -->
    <script>
        // Manejo global de errores
        window.addEventListener('error', function(event) {
            console.error('Global JavaScript error:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // Manejo de promesas rechazadas
        window.addEventListener('unhandledrejection', function(event) {
            console.error('Unhandled promise rejection:', event.reason);
            event.preventDefault();
        });

        // Función de utilidad para mostrar estado de carga
        function showGlobalLoading(show = true, message = 'Cargando...') {
            const overlay = document.getElementById('loadingOverlay');
            const text = overlay.querySelector('.loading-text');
            
            if (overlay) {
                overlay.style.display = show ? 'flex' : 'none';
                if (text && message) {
                    text.textContent = message;
                }
            }
        }

        // Función para mostrar mensajes de estado
        function showStatusMessage(type, title, message, timer = 3000) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: type,
                    title: title,
                    text: message,
                    timer: timer,
                    showConfirmButton: timer === 0,
                    toast: true,
                    position: 'top-end'
                });
            } else {
                console.log(`${type.toUpperCase()}: ${title} - ${message}`);
                alert(`${title}: ${message}`);
            }
        }
    </script>
</body>
</html>