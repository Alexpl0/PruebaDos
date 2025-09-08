<?php
/**
 * dashboard.php - Main analytics dashboard (Refactored)
 * This version uses the centralized context injection system.
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
    <title>Premium Freight Dashboard</title>
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">

    <!-- ================== CSS DE TERCEROS ================== -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.css">
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
    

    <!-- ================== CSS LOCAL ================== -->
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/dashboard.css">

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
            <div class="mt-2">Loading data...</div>
        </div>
    </div>
    <div id="header-container"></div>
    
    <main class="container-fluid my-4">
        <h1 class="mb-4 text-center">Premium Freight Analytics Dashboard</h1>
        
        <!-- Filtros globales --> 
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Filters</h5>
                        <div class="row">
                            <div class="col-md-3">
                                <label for="dateRange" class="form-label">Date Range</label>
                                <input type="text" class="form-control" id="dateRange">
                            </div>
                            <div class="col-md-3">
                                <label for="plantaFilter" class="form-label">Plant</label>
                                <select class="form-select" id="plantaFilter">
                                    <option value="">All Plants</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="statusFilter" class="form-label">Status</label>
                                <select class="form-select" id="statusFilter">
                                    <option value="">All Statuses</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="refreshData" class="form-label">&nbsp;</label>
                                <button id="refreshData" class="btn btn-primary form-control">Refresh Data</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mt-3">
            <div class="col-md-12">
                <div class="btn-group float-end">
                    <button id="exportCSV" class="btn btn-sm btn-outline-success">
                        <i class="fa-solid fa-file-excel"></i> Export to Excel
                    </button>
                    <button id="exportPDF" class="btn btn-sm btn-outline-danger">
                        <i class="fa-solid fa-file-pdf"></i> Export PDF
                    </button>
                    <button id="printDashboard" class="btn btn-sm btn-outline-primary">
                        <i class="fa-solid fa-print"></i> Print
                    </button>
                </div>
            </div>
        </div>
        
        <!-- KPIs principales -->
        <div class="row mb-4" id="filterscards">
            <div class="col-md-3">
                <div class="card bg-primary text-white">
                    <div class="card-body">
                        <h5 class="card-title">Total Shipments</h5>
                        <h2 id="kpiTotalEnvios" class="display-4">0</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white">
                    <div class="card-body">
                        <h5 class="card-title">Total Cost (€)</h5>
                        <h2 id="kpiCostoTotal" class="display-4">0</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white">
                    <div class="card-body">
                        <h5 class="card-title">Approval %</h5>
                        <h2 id="kpiApprovalRate" class="display-4">0%</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-dark">
                    <div class="card-body">
                        <h5 class="card-title">Recovery %</h5>
                        <h2 id="kpiRecoveryRate" class="display-4">0%</h2>
                    </div>
                </div>
            </div>
        </div>

        <!-- 👈 SECCIÓN DE KPIs DETALLADOS REMOVIDA - Ahora está en weeklyPerformance.php -->
        
        <!-- Gráficos -->
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Distribution by Area and Type</h5>
                        <div id="chartAreaDistribution" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Payment Responsibility</h5>
                        <div class="row">
                            <div class="col-md-8">
                                <div id="chartPaidBy" style="height: 350px;"></div>
                            </div>
                            <div class="col-md-4">
                                <div id="paidByStats" class="mt-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-md-7">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Main Causes</h5>
                        <div id="chartCauses" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-md-5">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Cost Categories</h5>
                        <div id="chartCostCategories" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Average Approval Time</h5>
                        <div id="chartApprovalTime" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Transportation Methods</h5>
                        <div id="chartTransport" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Recovery Files Status</h5>
                        <div id="chartRecoveryFiles" class="chart-container"></div>
                    </div>
                </div>
            </div>
            <div class="col-md-8">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Top 10 Products with Most Incidents</h5>
                        <div id="chartProducts" style="height: 300px;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Top User and Plant by Orders Generated</h5>
                        <div id="topUserPlantOrdersChart" style="height: 400px;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Origins and Destinations Map</h5>
                        <div id="mapOriginDestiny"></div>
                        <div id="routesTableContainer" class="mt-3">
                            <table id="routesTable" class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Origin</th>
                                        <th>Destination</th>
                                        <th>Transport</th>
                                        <th>Shipments</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Plant Comparison</h5>
                        <div id="plantComparisonChart" style="height: 450px;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <ul class="nav nav-tabs card-header-tabs" id="analysisTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="trends-tab" data-bs-toggle="tab" data-bs-target="#trends" type="button" role="tab" aria-controls="trends" aria-selected="true">Time Trends</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="correlations-tab" data-bs-toggle="tab" data-bs-target="#correlations" type="button" role="tab" aria-controls="correlations" aria-selected="false">Correlations</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="forecast-tab" data-bs-toggle="tab" data-bs-target="#forecast" type="button" role="tab" aria-controls="forecast" aria-selected="false">Forecasts</button>
                            </li>
                        </ul>
                    </div>
                    <div class="card-body">
                        <div class="tab-content" id="analysisTabsContent">
                            <div class="tab-pane fade show active" id="trends" role="tabpanel" aria-labelledby="trends-tab">
                                <div id="chartTimeSeries" style="height: 400px;"></div>
                            </div>
                            <div class="tab-pane fade" id="correlations" role="tabpanel" aria-labelledby="correlations-tab">
                                <div id="chartCorrelation" style="height: 400px;"></div>
                            </div>
                            <div class="tab-pane fade" id="forecast" role="tabpanel" aria-labelledby="forecast-tab">
                                <div id="chartForecast" style="height: 400px;"></div>
                            </div>
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
    
    <!-- Librerías de Gráficos y Fechas -->
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.js"></script>
    
    <!-- Librerías de Mapas y Tablas -->
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>

    <!-- ===== NUEVAS LIBRERÍAS PARA EXPORTACIÓN ===== -->
    <!-- Librería para generar archivos de Excel (.xlsx) -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <!-- Librería para generar archivos PDF -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    
    <!-- Archivos JS locales -->
    <script src="js/header.js" type="module"></script>
    <script type="module" src="js/dashboard.js"></script>

    <?php 
    // Carga condicional del JS del asistente.
    if (isset($appContextForJS['user']['authorizationLevel']) && $appContextForJS['user']['authorizationLevel'] > 0): ?>
        <script src="js/assistant.js"></script>
    <?php endif; ?>
</body>
</html>