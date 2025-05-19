<?php
session_start();
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
$userID = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
include_once 'dao/users/auth_check.php';
?>
<script>
    window.authorizationLevel = <?php echo json_encode($nivel); ?>;
    window.userName = <?php echo json_encode($name); ?>;
    window.userID = <?php echo json_encode($userID); ?>;
//     console.log("Auth Level: " + window.authorizationLevel);
//     console.log("UserName: " + window.userName);
//     console.log("UserID: " + window.userID);
 </script>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight Dashboard</title>
    
    <!-- ================== CSS DE TERCEROS ================== -->
    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Chart.js -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.css">
    
    <!-- Google Material Symbols (iconos) -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    
    <!-- Leaflet (mapas) -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    
    <!-- ApexCharts -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.css">
    
    <!-- Daterangepicker -->
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.css" />

    <!-- SweetAlert2 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">

    <!-- ================== CSS LOCAL ================== -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/dashboard.css">
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

        <!-- Añadir después de los filtros existentes -->
        <div class="row mt-3">
            <div class="col-md-12">
                <div class="btn-group float-end">
                    <button id="exportCSV" class="btn btn-sm btn-outline-success">
                        <i class="material-symbols-outlined">download</i> Export CSV
                    </button>
                    <button id="exportPDF" class="btn btn-sm btn-outline-danger">
                        <i class="material-symbols-outlined">picture_as_pdf</i> Export PDF
                    </button>
                    <button id="printDashboard" class="btn btn-sm btn-outline-primary">
                        <i class="material-symbols-outlined">print</i> Print
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
                        <h2 id="kpiApprovalRate" class="display-4">0%</h5>
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

        <!-- Añadir después de la sección de KPIs principales -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Detailed KPIs</h5>
                        <div class="row" id="detailedKPIs">
                            <div class="col-md-3 col-sm-6 mb-3">
                                <div class="card stats-card border-primary">
                                    <div class="card-body p-3">
                                        <div class="title">Average Cost</div>
                                        <div class="value" id="kpiAvgCost">€0</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 col-sm-6 mb-3">
                                <div class="card stats-card border-success">
                                    <div class="card-body p-3">
                                        <div class="title">Internal/External Ratio</div>
                                        <div class="value" id="kpiIntExtRatio">0:0</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 col-sm-6 mb-3">
                                <div class="card stats-card border-info">
                                    <div class="card-body p-3">
                                        <div class="title">Average Approval Time</div>
                                        <div class="value" id="kpiAvgApprovalTime">0 days</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 col-sm-6 mb-3">
                                <div class="card stats-card border-warning">
                                    <div class="card-body p-3">
                                        <div class="title">Total Weight</div>
                                        <div class="value" id="kpiTotalWeight">0 kg</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Primera fila de gráficos -->
        <div class="row mb-4">
            <!-- Gráfico 1: Distribución por Área -->
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Distribution by Area and Type</h5>
                        <div id="chartAreaDistribution" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
            
            <!-- Gráfico 2: Quién paga (Grammer vs Cliente) -->
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
        
        <!-- Segunda fila de gráficos -->
        <div class="row mb-4">
            <!-- Gráfico 3: Principales causas -->
            <div class="col-md-7">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Main Causes</h5>
                        <div id="chartCauses" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
            
            <!-- Gráfico 4: Categorías de costos -->
            <div class="col-md-5">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Cost Categories</h5>
                        <div id="chartCostCategories" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Tercera fila de gráficos -->
        <div class="row mb-4">
            <!-- Gráfico 5: Análisis de tiempos de aprobación -->
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Average Approval Time</h5>
                        <div id="chartApprovalTime" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
            
            <!-- Gráfico 6: Transportes más utilizados -->
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Transportation Methods</h5>
                        <div id="chartTransport" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Cuarta fila de gráficos -->
        <div class="row mb-4">
            <!-- Gráfico 7: Análisis de archivos de recovery -->
            <div class="col-md-4">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Recovery Files Status</h5>
                        <div id="chartRecoveryFiles" style="height: 300px;"></div>
                    </div>
                </div>
            </div>
            
            <!-- Gráfico 8: Productos con más problemas -->
            <div class="col-md-8">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Top 10 Products with Most Incidents</h5>
                        <div id="chartProducts" style="height: 300px;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Añadir antes de la sección "Análisis detallado" -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Text Analysis: Causes and Descriptions</h5>
                        <div id="wordCloudChart" style="height: 400px;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mapa de orígenes y destinos -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Origins and Destinations Map</h5>
                        <div id="mapOriginDestiny" style="height: 500px;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Añadir después de alguna fila de gráficos existente -->
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

        <!-- Análisis detallado -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <ul class="nav nav-tabs card-header-tabs" id="analysisTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="trends-tab" data-bs-toggle="tab" data-bs-target="#trends" type="button" role="tab" aria-controls="trends" aria-selected="true">Time Trends</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="correlations-tab" data-bs-toggle="tab" data-bs-target="#correlations" type="button" role="tab" aria-controls="correlations" aria-selected="false">Correlaciones</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="forecast-tab" data-bs-toggle="tab" data-bs-target="#forecast" type="button" role="tab" aria-controls="forecast" aria-selected="false">Pronósticos</button>
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
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.js"></script>
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3@7.4.4/dist/d3.min.js"></script>
    
    <!-- Archivos JS locales -->
    <script src="js/header.js"></script>

    <!-- Script principal del dashboard (versión modular) -->
    <script type="module" src="js/dashboard.js"></script>
</body>
</html>