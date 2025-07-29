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
    <title>Weekly Performance Dashboard</title>
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
</head>
<body>
    <div id="loadingOverlay" style="display:none;">
        <div class="spinner-container">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="mt-2">Loading weekly performance data...</div>
        </div>
    </div>
    
    <div id="header-container"></div>
    
    <main class="container-fluid my-4">
        <div class="performance-header">
            <h1 class="performance-title">
                <i class="fas fa-chart-line me-3"></i>
                Weekly Performance Dashboard
            </h1>
            <p class="performance-subtitle">Comprehensive analytics and KPIs for Premium Freight operations</p>
        </div>
        
        <!-- Date Range Filter - ACTUALIZADO CON MEJOR ESTRUCTURA -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card filter-card">
                    <div class="card-body">
                        <div class="filter-container">
                            <div class="filter-section">
                                <label for="weekSelector" class="form-label">
                                    <i class="fas fa-calendar-week"></i>Analysis Week
                                </label>
                                <div class="week-selector" id="weekSelector">
                                    <button type="button" class="week-nav-btn" id="prevWeek">
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    <div class="week-display">
                                        <div class="week-info" id="weekNumber">Week of 2025</div>
                                        <div class="week-dates" id="weekDates">Loading...</div>
                                    </div>
                                    <button type="button" class="week-nav-btn" id="nextWeek">
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="filter-section">
                                <label for="plantSelect" class="form-label">
                                    <i class="fas fa-industry"></i>Plant Filter
                                </label>
                                <div class="plant-selector">
                                    <select class="form-select" id="plantSelect">
                                        <option value="">All Plants</option>
                                        <!-- Options will be populated dynamically -->
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="refresh-container">
                            <button id="refreshData" class="btn btn-refresh" disabled>
                                <i class="fas fa-sync-alt me-2"></i>Refresh Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Weekly Summary Table -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card summary-card">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-clipboard-list me-2"></i>Weekly Performance Summary
                        </h5>
                    </div>
                    <div class="card-body p-0">
                        <div id="summaryContainer">
                            <!-- Weekly summary table will be generated here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Performance Metrics Cards -->
        <div class="row mb-4">
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="metric-card primary">
                    <div class="metric-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <div class="metric-content">
                        <h3 id="totalGenerated">0</h3>
                        <p>Total Requests</p>
                        <span class="metric-trend" id="requestsTrend">
                            <i class="fas fa-arrow-up"></i> 0%
                        </span>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="metric-card success">
                    <div class="metric-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="metric-content">
                        <h3 id="approvalRate">0%</h3>
                        <p>Approval Rate</p>
                        <span class="metric-trend" id="approvalTrend">
                            <i class="fas fa-arrow-up"></i> 0%
                        </span>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="metric-card warning">
                    <div class="metric-icon">
                        <i class="fas fa-euro-sign"></i>
                    </div>
                    <div class="metric-content">
                        <h3 id="totalCost">€0</h3>
                        <p>Total Cost</p>
                        <span class="metric-trend" id="costTrend">
                            <i class="fas fa-arrow-up"></i> 0%
                        </span>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="metric-card info">
                    <div class="metric-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="metric-content">
                        <h3 id="averageApprovalTime">0h</h3>
                        <p>Avg. Approval Time</p>
                        <span class="metric-trend" id="timeTrend">
                            <i class="fas fa-arrow-down"></i> 0%
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts Row 1 -->
        <div class="row mb-4">
            <div class="col-lg-8">
                <div class="card chart-card">
                    <div class="card-header">
                        <h5 class="card-title">
                            <i class="fas fa-chart-line me-2"></i>Weekly Trends Analysis
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="trendsChart" style="height: 400px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-4">
                <div class="card chart-card">
                    <div class="card-header">
                        <h5 class="card-title">
                            <i class="fas fa-pie-chart me-2"></i>Status Distribution
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="statusChart" style="height: 400px;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts Row 2 -->
        <div class="row mb-4">
            <div class="col-lg-6">
                <div class="card chart-card">
                    <div class="card-header">
                        <h5 class="card-title">
                            <i class="fas fa-users me-2"></i>Top Performers (by Approved Requests)
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="topPerformersChart" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-6">
                <div class="card chart-card">
                    <div class="card-header">
                        <h5 class="card-title">
                            <i class="fas fa-building me-2"></i>Area Performance (Approved Orders)
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="areaPerformanceChart" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts Row 3 -->
        <div class="row mb-4">
            <div class="col-lg-4">
                <div class="card chart-card">
                    <div class="card-header">
                        <h5 class="card-title">
                            <i class="fas fa-stopwatch me-2"></i>Approval Time Distribution
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="approvalTimesChart" style="height: 300px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-lg-8">
                <div class="card chart-card">
                    <div class="card-header">
                        <h5 class="card-title">
                            <i class="fas fa-chart-area me-2"></i>Daily Cost Analysis (Approved Orders Only)
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="costAnalysisChart" style="height: 300px;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Performance Insights -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card insights-card">
                    <div class="card-header">
                        <h5 class="card-title">
                            <i class="fas fa-lightbulb me-2"></i>Performance Insights & Recommendations
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="insightsContainer">
                            <!-- AI-generated insights will be displayed here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
    
    <!-- Bibliotecas JS -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Librerías de Gráficos -->
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.js"></script>
    
    <!-- Librerías de Exportación -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script>
        // Verificar que jsPDF esté disponible antes de cargar la página
        let jsPDFLoaded = false;
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = function() {
            jsPDFLoaded = true;
            console.log('jsPDF library loaded successfully');
            // Habilitar botones cuando las bibliotecas estén listas
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(() => {
                    enableButtons();
                }, 1000);
            });
        };
        script.onerror = function() {
            console.error('Failed to load jsPDF library');
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(() => {
                    enableButtons(false);
                }, 1000);
            });
        };
        document.head.appendChild(script);
        
        // Función para habilitar/deshabilitar botones
        function enableButtons(enablePDF = true) {
            const buttons = ['refreshData', 'exportExcel', 'printReport'];
            buttons.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = false;
            });
            
            const pdfBtn = document.getElementById('exportPDF');
            if (pdfBtn) {
                pdfBtn.disabled = !enablePDF;
                if (!enablePDF) {
                    pdfBtn.title = 'PDF export unavailable - library failed to load';
                    pdfBtn.classList.add('btn-secondary');
                    pdfBtn.classList.remove('btn-outline-danger');
                }
            }
            
            // Inicializar tooltips de Bootstrap
            try {
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });
            } catch (error) {
                console.log('Bootstrap tooltips not available:', error);
            }
        }
    </script>
    
    <!-- Archivos JS locales -->
    <script src="js/header.js" type="module"></script>
    <script type="module" src="js/weeklykpi/weeklyPerformanceMain.js"></script>

    <?php 
    // Carga condicional del JS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>