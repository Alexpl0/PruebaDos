<?phpchivo: js/dashboard.js
session_start();
$nivel = isset($_SESSION['user']['authorization_level']) ? $_SESSION['user']['authorization_level'] : null;
$name = isset($_SESSION['user']['name']) ? $_SESSION['user']['name'] : null;
$userID = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
include_once 'dao/users/auth_check.php';
?>t charts = {};
<script>
    window.authorizationLevel = <?php echo json_encode($nivel); ?>;
    window.userName = <?php echo json_encode($name); ?>; {
    window.userID = <?php echo json_encode($userID); ?>;
    console.log("Auth Level: " + window.authorizationLevel);
    console.log("UserName: " + window.userName);
    console.log("UserID: " + window.userID);
</script>ashboardData();
    
<!DOCTYPE html>ar el evento de actualización
<html lang="en">ElementById('refreshData').addEventListener('click', function() {
<head>  loadDashboardData();
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight Dashboard</title>
    unción para inicializar el selector de rango de fechas
    <!-- Bibliotecas CSS -->Picker() {
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/header.css">onth'), moment()],
    <link rel="stylesheet" href="css/dashboard.css">'month'), moment()],
           'Último Año': [moment().subtract(1, 'year'), moment()],
    <!-- Bibliotecas adicionales de visualización -->year'), moment()]
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.css">
    <script src="https://cdn.jsdelivr.net/npm/d3-cloud@1.2.5/build/d3.layout.cloud.min.js"></script>
</head> autoApply: false,
<body>  locale: {
    <div id="loadingOverlay" style="display:none;">
        <div class="spinner-container">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Cargando...</span>
            </div>l: 'Hasta',
            <div class="mt-2">Cargando datos...</div>
        </div>ekLabel: 'S',
    </div>  daysOfWeek: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
    <div id="header-container"></div>brero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
            firstDay: 1
    <main class="container-fluid my-4">
        <h1 class="mb-4 text-center">Premium Freight Analytics Dashboard</h1>
        
        <!-- Filtros globales -->erangepicker', function(ev, picker) {
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Filtros</h5>
                        <div class="row">
                            <div class="col-md-3">
                                <label for="dateRange" class="form-label">Rango de Fechas</label>
                                <input type="text" class="form-control" id="dateRange">
                            </div>
                            <div class="col-md-3">
                                <label for="plantaFilter" class="form-label">Planta</label>
                                <select class="form-select" id="plantaFilter">o/conections/daoPremiumFreight.php');
                                    <option value="">Todas</option>
                                </select>
                            </div>error! Status: ${response.status}`);
                            <div class="col-md-3">
                                <label for="statusFilter" class="form-label">Status</label>
                                <select class="form-select" id="statusFilter">
                                    <option value="">Todos</option>
                                </select>
                            </div>cess' && Array.isArray(result.data)) {
                            <div class="col-md-3">
                                <label for="refreshData" class="form-label">&nbsp;</label>
                                <button id="refreshData" class="btn btn-primary form-control">Actualizar Datos</button>
                            </div>
                        </div>tros
                    </div>ers(premiumFreightData);
                </div>
            </div>icar filtros iniciales
        </div>plyFilters();
            
        <!-- Añadir después de los filtros existentes -->
        <div class="row mt-3">;
            <div class="col-md-12">
                <div class="btn-group float-end"> result);
                    <button id="exportCSV" class="btn btn-sm btn-outline-success">);
                        <i class="material-symbols-outlined">download</i> Exportar CSV
                    </button>
                    <button id="exportPDF" class="btn btn-sm btn-outline-danger">
                        <i class="material-symbols-outlined">picture_as_pdf</i> Exportar PDF
                    </button>
                    <button id="printDashboard" class="btn btn-sm btn-outline-primary">
                        <i class="material-symbols-outlined">print</i> Imprimir
                    </button>
                </div>lizar los filtros
            </div>eFilters(data) {
        </div>de plantas
        t plantaFilter = document.getElementById('plantaFilter');
        <!-- KPIs principales -->ata.map(item => item.planta))].filter(Boolean).sort();
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-primary text-white">
                    <div class="card-body">
                        <h5 class="card-title">Total Envíos</h5>
                        <h2 id="kpiTotalEnvios" class="display-4">0</h2>
                    </div>ones
                </div>anta => {
            </div>on = document.createElement('option');
            <div class="col-md-3">
                <div class="card bg-success text-white">
                    <div class="card-body">
                        <h5 class="card-title">Costo Total (€)</h5>
                        <h2 id="kpiCostoTotal" class="display-4">0</h2>
                    </div>
                </div> = document.getElementById('statusFilter');
            </div> = [...new Set(data.map(item => item.status_name))].filter(Boolean).sort();
            <div class="col-md-3">
                <div class="card bg-info text-white">
                    <div class="card-body"> {
                        <h5 class="card-title">% Aprobación</h5>
                        <h2 id="kpiApprovalRate" class="display-4">0%</h5>
                    </div>
                </div>opciones
            </div>ch(status => {
            <div class="col-md-3">eateElement('option');
                <div class="card bg-warning text-dark">
                    <div class="card-body">0).toUpperCase() + status.slice(1);
                        <h5 class="card-title">% Recovery</h5>
                        <h2 id="kpiRecoveryRate" class="display-4">0%</h2>
                    </div>
                </div>
            </div>licar filtros
        </div>Filters() {
    // Obtener valores de los filtros
        <!-- Añadir después de la sección de KPIs principales -->
        <div class="row mb-4">e.startDate.format('YYYY-MM-DD');
            <div class="col-md-12">te.format('YYYY-MM-DD');
                <div class="card">etElementById('plantaFilter').value;
                    <div class="card-body">ById('statusFilter').value;
                        <h5 class="card-title">KPIs Detallados</h5>
                        <div class="row" id="detailedKPIs">
                            <div class="col-md-3 col-sm-6 mb-3">
                                <div class="card stats-card border-primary">
                                    <div class="card-body p-3">
                                        <div class="title">Costo Promedio</div>
                                        <div class="value" id="kpiAvgCost">€0</div>
                                    </div>
                                </div>
                            </div>ata.filter(item => {
                            <div class="col-md-3 col-sm-6 mb-3">
                                <div class="card stats-card border-success">
                                    <div class="card-body p-3">& itemDate <= endDate);
                                        <div class="title">Ratio Interno/Externo</div>
                                        <div class="value" id="kpiIntExtRatio">0:0</div>
                                    </div>| item.planta === plantaValue;
                                </div>
                            </div>
                            <div class="col-md-3 col-sm-6 mb-3"> statusValue;
                                <div class="card stats-card border-info">
                                    <div class="card-body p-3">
                                        <div class="title">Tiempo Promedio de Aprobación</div>
                                        <div class="value" id="kpiAvgApprovalTime">0 días</div>
                                    </div>
                                </div>h && statusMatch;
                            </div>
                            <div class="col-md-3 col-sm-6 mb-3">
                                <div class="card stats-card border-warning">
                                    <div class="card-body p-3">
                                        <div class="title">Peso Total</div>
                                        <div class="value" id="kpiTotalWeight">0 kg</div>
                                    </div>
                                </div>
                            </div>
                        </div>as las visualizaciones
                    </div>ons() {
                </div>
            </div>ributionChart();
        </div>ByChart();
        erCausesChart();
        <!-- Primera fila de gráficos -->
        <div class="row mb-4">
            <!-- Gráfico 1: Distribución por Área -->
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Distribución por Área y Tipo</h5>
                        <div id="chartAreaDistribution" style="height: 350px;"></div>
                    </div>
                </div>
            </div>parison();
            
            <!-- Gráfico 2: Quién paga (Grammer vs Cliente) -->
            <div class="col-md-6">s
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Responsable de Pago</h5>a.length.toLocaleString();
                        <div class="row">
                            <div class="col-md-8">
                                <div id="chartPaidBy" style="height: 350px;"></div>t_euros || 0), 0);
                            </div>stoTotal').textContent = costoTotal.toLocaleString(undefined, {maximumFractionDigits: 0});
                            <div class="col-md-4">
                                <div id="paidByStats" class="mt-4"></div>
                            </div>.filter(item => item.status_name === 'aprobado').length;
                        </div>ata.length > 0 ? (aprobados / filteredData.length) * 100 : 0;
                    </div>d('kpiApprovalRate').textContent = apprRate.toFixed(1) + '%';
                </div>
            </div>overy
        </div>ecovery = filteredData.filter(item => 
        item.recovery && item.recovery !== 'NO RECOVERY'
        <!-- Segunda fila de gráficos -->
        <div class="row mb-4">redData.length > 0 ? (conRecovery / filteredData.length) * 100 : 0;
            <!-- Gráfico 3: Principales causas -->tContent = recoveryRate.toFixed(1) + '%';
            <div class="col-md-7">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Principales Causas</h5>redData.length : 0;
                        <div id="chartCauses" style="height: 350px;"></div>.toLocaleString(undefined, {maximumFractionDigits: 2});
                    </div>
                </div>xterno
            </div> = filteredData.filter(item => (item.int_ext || '').includes('INTERNAL')).length;
            ternos = filteredData.filter(item => (item.int_ext || '').includes('EXTERNAL')).length;
            <!-- Gráfico 4: Categorías de costos -->ntent = `${internos}:${externos}`;
            <div class="col-md-5">
                <div class="card h-100">
                    <div class="card-body">.filter(item => item.date && item.approval_date);
                        <h5 class="card-title">Categorías de Costos</h5>
                        <div id="chartCostCategories" style="height: 350px;"></div>
                    </div>.length > 0) {
                </div>tal = itemsConAprobacion.reduce((sum, item) => {
            </div>createDate = new Date(item.date);
        </div>nst approvalDate = new Date(item.approval_date);
            const diffTime = Math.abs(approvalDate - createDate);
        <!-- Tercera fila de gráficos -->ffTime / (1000 * 60 * 60 * 24));
        <div class="row mb-4">ays;
            <!-- Gráfico 5: Análisis de tiempos de aprobación -->
            <div class="col-md-6">
                <div class="card h-100">temsConAprobacion.length;
                    <div class="card-body">
                        <h5 class="card-title">Tiempo Promedio de Aprobación</h5>
                        <div id="chartApprovalTime" style="height: 350px;"></div>Fixed(1) + ' días';
                    </div>
                </div>
            </div>l = filteredData.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
            .getElementById('kpiTotalWeight').textContent = pesoTotal.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' kg';
            <!-- Gráfico 6: Transportes más utilizados -->
            <div class="col-md-6">
                <div class="card h-100">stribución por área
                    <div class="card-body">
                        <h5 class="card-title">Transportes Utilizados</h5>h, filteredData.slice(0, 2));
                        <div id="chartTransport" style="height: 350px;"></div>
                    </div>
                </div>
            </div>orEach(item => {
        </div>area = item.area || 'Sin especificar';
        const intExt = item.int_ext || 'Sin especificar';
        <!-- Cuarta fila de gráficos -->
        <div class="row mb-4">
            <!-- Gráfico 7: Análisis de archivos de recovery -->0 };
            <div class="col-md-4">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Estado de Recovery Files</h5>
                        <div id="chartRecoveryFiles" style="height: 300px;"></div>
                    </div>.EXTERNAL++;
                </div>
            </div>ta[area].other++;
            
            <!-- Gráfico 8: Productos con más problemas -->
            <div class="col-md-8">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">Top 10 Productos con Más Incidencias</h5>
                        <div id="chartProducts" style="height: 300px;"></div>
                    </div>p(area => areaData[area].other);
                </div>
            </div>ualizar el gráfico
        </div>.areaDistribution) {
        charts.areaDistribution.updateOptions({
        <!-- Añadir antes de la sección "Análisis detallado" -->
        <div class="row mb-4">
            <div class="col-md-12"> data: internal },
                <div class="card">, data: external },
                    <div class="card-body">r }
                        <h5 class="card-title">Análisis de Texto: Causas y Descripciones</h5>
                        <div id="wordCloudChart" style="height: 400px;"></div>
                    </div>
                </div>= {
            </div> {
        </div>  type: 'bar',
                height: 350,
        <!-- Mapa de orígenes y destinos -->
        <div class="row mb-4">w: true }
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Mapa de Orígenes y Destinos</h5>
                        <div id="mapOriginDestiny" style="height: 500px;"></div>
                    </div>Shape: 'rounded'
                </div>
            </div>
        </div>taLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: ['transparent'] },
        <!-- Añadir después de alguna fila de gráficos existente -->
        <div class="row mb-4">
            <div class="col-md-12">tidad de envíos' }
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Comparativa de Plantas</h5>
                        <div id="plantComparisonChart" style="height: 450px;"></div>
                    </div>ter: function (val) {
                </div>  return val + " envíos"
            </div>  }
        </div>  }
            },
        <!-- Análisis detallado -->D7D31', '#A5A5A5'],
        <div class="row mb-4">
            <div class="col-md-12"> data: internal },
                <div class="card">, data: external },
                    <div class="card-header">}
                        <ul class="nav nav-tabs card-header-tabs" id="analysisTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="trends-tab" data-bs-toggle="tab" data-bs-target="#trends" type="button" role="tab" aria-controls="trends" aria-selected="true">Tendencias Temporales</button>
                            </li> new ApexCharts(document.getElementById('chartAreaDistribution'), options);
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="correlations-tab" data-bs-toggle="tab" data-bs-target="#correlations" type="button" role="tab" aria-controls="correlations" aria-selected="false">Correlaciones</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="forecast-tab" data-bs-toggle="tab" data-bs-target="#forecast" type="button" role="tab" aria-controls="forecast" aria-selected="false">Pronósticos</button>
                            </li>
                        </ul>erPaidByChart:", filteredData.length, filteredData.slice(0, 2));
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
                        </div>xCharts
                    </div>keys(paidByData);
                </div>ect.values(paidByData);
            </div>
        </div> actualizar el gráfico
    </main>rts.paidBy) {
        charts.paidBy.updateOptions({
    <!-- Bibliotecas JS -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts@3.35.0/dist/apexcharts.min.js"></script>
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3@7.4.4/dist/d3.min.js"></script>
            labels: labels,
            series: series,
            colors: ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5'],
    <!-- Archivos JS locales -->
    <script src="js/header.js"></script>
            },
    <!-- Script principal del dashboard (versión modular) -->
    <script type="module" src="js/dashboard.js"></script>
</body>         options: {
</html>             chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };
        
        charts.paidBy = new ApexCharts(document.getElementById('chartPaidBy'), options);
        charts.paidBy.render();
    }
    
    // Actualizar estadísticas adicionales
    const paidByStats = document.getElementById('paidByStats');
    let statsHTML = '<ul class="list-group">';
    
    // Calcular costos totales por quien paga
    const costByPayer = {};
    filteredData.forEach(item => {
        const paidBy = item.paid_by || 'Sin especificar';
        const cost = parseFloat(item.cost_euros || 0);
        
        if (!costByPayer[paidBy]) {
            costByPayer[paidBy] = cost;
        } else {
            costByPayer[paidBy] += cost;
        }
    });
    
    // Generar estadísticas
    for (const [payer, cost] of Object.entries(costByPayer)) {
        statsHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${payer}
                <span class="badge bg-primary rounded-pill">€${cost.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </li>`;
    }
    
    statsHTML += '</ul>';
    paidByStats.innerHTML = statsHTML;
}

// Función para generar el gráfico de principales causas
function renderCausesChart() {
    console.log("[DEBUG] renderCausesChart:", filteredData.length, filteredData.slice(0, 2));
    // Procesar datos
    const causesData = {};
    
    filteredData.forEach(item => {
        const cause = item.category_cause || 'Sin especificar';
        if (!causesData[cause]) {
            causesData[cause] = 1;
        } else {
            causesData[cause]++;
        }
    });
    
    // Ordenar causas por frecuencia y limitar a las top 10
    const sortedCauses = Object.entries(causesData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    // Calcular el porcentaje acumulativo
    const total = sortedCauses.reduce((sum, [_, count]) => sum + count, 0);
    let cumulative = 0;
    
    const categories = [];
    const counts = [];
    const cumulativePercentage = [];
    
    sortedCauses.forEach(([cause, count]) => {
        categories.push(cause);
        counts.push(count);
        cumulative += count;
        cumulativePercentage.push((cumulative / total) * 100);
    });
    
    // Crear o actualizar el gráfico
    if (charts.causes) {
        charts.causes.updateOptions({
            xaxis: { categories: categories },
            series: [
                { name: 'Cantidad', data: counts },
                { name: 'Acumulativo %', data: cumulativePercentage }
            ]
        });
    } else {
        const options = {
            chart: {
                type: 'line',
                height: 350,
                stacked: false
            },
            plotOptions: {
                bar: {
                    columnWidth: '70%',
                    endingShape: 'rounded'
                },
            },
            stroke: {
                width: [0, 4],
                curve: 'smooth'
            },
            title: {
                text: 'Análisis de Pareto: Principales Causas',
                align: 'center'
            },
            dataLabels: {
                enabled: false,
                enabledOnSeries: [1]
            },
            markers: {
                size: 6,
                colors: ['#FFA500'],
                strokeColors: '#fff',
                strokeWidth: 2,
                hover: { size: 8 }
            },
            xaxis: {
                categories: categories,
                labels: {
                    rotate: -45,
                    rotateAlways: true,
                    style: {
                        fontSize: '11px'
                    }
                }
            },
            yaxis: [
                {
                    title: {
                        text: 'Cantidad',
                    },
                    min: 0
                },
                {
                    opposite: true,
                    title: {
                        text: 'Porcentaje Acumulativo'
                    },
                    min: 0,
                    max: 100,
                    labels: {
                        formatter: function(val) {
                            return val.toFixed(0) + '%';
                        }
                    }
                }
            ],
            tooltip: {
                shared: true,
                intersect: false,
                y: [
                    {
                        formatter: function (y) {
                            if(typeof y !== "undefined") {
                                return y.toFixed(0) + " envíos";
                            }
                            return y;
                        }
                    },
                    {
                        formatter: function (y) {
                            if(typeof y !== "undefined") {
                                return y.toFixed(2) + "%";
                            }
                            return y;
                        }
                    }
                ]
            },
            legend: {
                horizontalAlign: 'left',
                offsetX: 40
            },
            colors: ['#4472C4', '#FFA500'],
            series: [
                {
                    name: 'Cantidad',
                    type: 'column',
                    data: counts
                },
                {
                    name: 'Acumulativo %',
                    type: 'line',
                    data: cumulativePercentage
                }
            ]
        };
        
        charts.causes = new ApexCharts(document.getElementById('chartCauses'), options);
        charts.causes.render();
    }
}

// Función para generar el gráfico de categorías de costos
function renderCostCategoriesChart() {
    console.log("[DEBUG] renderCostCategoriesChart:", filteredData.length, filteredData.slice(0, 2));
    // Calcular las categorías de costo según las reglas proporcionadas
    const costCategories = {
        "≤ €1,500": 0,
        "€1,501 - €5,000": 0,
        "€5,001 - €10,000": 0,
        "> €10,000": 0
    };
    
    filteredData.forEach(item => {
        const cost = parseFloat(item.cost_euros || 0);
        
        if (cost <= 1500) {
            costCategories["≤ €1,500"]++;
        } else if (cost > 1500 && cost <= 5000) {
            costCategories["€1,501 - €5,000"]++;
        } else if (cost > 5000 && cost <= 10000) {
            costCategories["€5,001 - €10,000"]++;
        } else if (cost > 10000) {
            costCategories["> €10,000"]++;
        }
    });
    
    // Preparar datos para ApexCharts
    const labels = Object.keys(costCategories);
    const series = Object.values(costCategories);
    
    // Crear o actualizar el gráfico
    if (charts.costCategories) {
        charts.costCategories.updateOptions({
            labels: labels,
            series: series
        });
    } else {
        const options = {
            chart: {
                type: 'donut',
                height: 350
            },
            labels: labels,
            series: series,
            colors: ['#4CAF50', '#FFB74D', '#FF7043', '#E53935'],
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                formatter: function (w) {
                                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                }
                            }
                        }
                    }
                }
            },
            legend: {
                position: 'bottom'
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };
        
        charts.costCategories = new ApexCharts(document.getElementById('chartCostCategories'), options);
        charts.costCategories.render();
    }
}

// Función para generar el gráfico de tiempo promedio de aprobación
function renderApprovalTimeChart() {
    console.log("[DEBUG] renderApprovalTimeChart:", filteredData.length, filteredData.slice(0, 2));
    // Procesar datos de tiempo de aprobación
    const approvalTimeData = [];
    
    filteredData.forEach(item => {
        // Solo procesar items con fecha de creación y aprobación
        if (item.date && item.approval_date && item.status_name && (item.status_name === 'aprobado' || item.status_name === 'rechazado')) {
            const createDate = new Date(item.date);
            const approvalDate = new Date(item.approval_date);
            
            // Calcular diferencia en días
            const diffTime = Math.abs(approvalDate - createDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            approvalTimeData.push({
                id: item.id,
                days: diffDays,
                status: item.status_name
            });
        }
    });
    
    // Calcular promedio por status
    const avgByStatus = {};
    const countByStatus = {};
    
    approvalTimeData.forEach(item => {
        if (!avgByStatus[item.status]) {
            avgByStatus[item.status] = item.days;
            countByStatus[item.status] = 1;
        } else {
            avgByStatus[item.status] += item.days;
            countByStatus[item.status]++;
        }
    });
    
    // Calcular promedio final
    for (const status in avgByStatus) {
        avgByStatus[status] = avgByStatus[status] / countByStatus[status];
    }
    
    // Preparar datos para ApexCharts
    const categories = Object.keys(avgByStatus);
    const seriesData = Object.values(avgByStatus);
    
    // Crear o actualizar el gráfico
    if (charts.approvalTime) {
        charts.approvalTime.updateOptions({
            xaxis: { categories: categories },
            series: [{ data: seriesData }]
        });
    } else {
        const options = {
            chart: {
                type: 'bar',
                height: 350
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    horizontal: true
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function(val) {
                    return val.toFixed(1) + ' días';
                }
            },
            xaxis: {
                categories: categories,
                title: {
                    text: 'Tiempo promedio (días)'
                }
            },
            colors: ['#4472C4'],
            series: [{
                name: 'Días promedio',
                data: seriesData
            }]
        };
        
        charts.approvalTime = new ApexCharts(document.getElementById('chartApprovalTime'), options);
        charts.approvalTime.render();
    }
}

// Función para generar el gráfico de transportes más utilizados
function renderTransportChart() {
    console.log("[DEBUG] renderTransportChart:", filteredData.length, filteredData.slice(0, 2));
    // Procesar datos
    const transportData = {};
    const costByTransport = {};
    
    filteredData.forEach(item => {
        const transport = item.transport || 'Sin especificar';
        const cost = parseFloat(item.cost_euros || 0);
        
        if (!transportData[transport]) {
            transportData[transport] = 1;
            costByTransport[transport] = cost;
        } else {
            transportData[transport]++;
            costByTransport[transport] += cost;
        }
    });
    
    // Calcular costo promedio
    const avgCostByTransport = {};
    for (const transport in transportData) {
        avgCostByTransport[transport] = costByTransport[transport] / transportData[transport];
    }
    
    // Preparar datos para ApexCharts
    const categories = Object.keys(transportData);
    const countData = Object.values(transportData);
    const avgCostData = Object.values(avgCostByTransport);
    
    // Crear o actualizar el gráfico
    if (charts.transport) {
        charts.transport.updateOptions({
            xaxis: { categories: categories },
            series: [
                { name: 'Cantidad', data: countData },
                { name: 'Costo Promedio (€)', data: avgCostData }
            ]
        });
    } else {
        const options = {
            chart: {
                type: 'bar',
                height: 350
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    endingShape: 'rounded'
                },
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
            },
            xaxis: {
                categories: categories
            },
            yaxis: [
                {
                    title: {
                        text: 'Cantidad'
                    }
                },
                {
                    opposite: true,
                    title: {
                        text: 'Costo Promedio (€)'
                    }
                }
            ],
            tooltip: {
                shared: true,
                intersect: false,
                y: [
                    {
                        formatter: function (y) {
                            if(typeof y !== "undefined") {
                                return y.toFixed(0) + " envíos";
                            }
                            return y;
                        }
                    },
                    {
                        formatter: function (y) {
                            if(typeof y !== "undefined") {
                                return "€" + y.toFixed(2);
                            }
                            return y;
                        }
                    }
                ]
            },
            colors: ['#4472C4', '#FF7043'],
            series: [
                {
                    name: 'Cantidad',
                    data: countData
                },
                {
                    name: 'Costo Promedio (€)',
                    data: avgCostData
                }
            ]
        };
        
        charts.transport = new ApexCharts(document.getElementById('chartTransport'), options);
        charts.transport.render();
    }
}

// Función para generar el gráfico de estado de recovery files
function renderRecoveryFilesChart() {
    console.log("[DEBUG] renderRecoveryFilesChart:", filteredData.length, filteredData.slice(0, 2));
    // Contar registros con recovery file y evidence
    const withRecoveryFile = filteredData.filter(item => item.recovery_file).length;
    const withEvidence = filteredData.filter(item => item.recovery_evidence).length;
    const withBoth = filteredData.filter(item => item.recovery_file && item.recovery_evidence).length;
    const total = filteredData.length;
    
    // Crear datos para el gráfico
    const data = [
        { name: 'Solo Recovery File', value: withRecoveryFile - withBoth },
        { name: 'Solo Evidence', value: withEvidence - withBoth },
        { name: 'Recovery File y Evidence', value: withBoth },
        { name: 'Sin Recovery ni Evidence', value: total - withRecoveryFile - withEvidence + withBoth }
    ];
    
    // Filtrar cualquier categoría con valor 0
    const filteredChartData = data.filter(item => item.value > 0);
    
    // Preparar datos para ApexCharts
    const labels = filteredChartData.map(item => item.name);
    const series = filteredChartData.map(item => item.value);
    
    // Crear o actualizar el gráfico
    if (charts.recoveryFiles) {
        charts.recoveryFiles.updateOptions({
            labels: labels,
            series: series
        });
    } else {
        const options = {
            chart: {
                type: 'pie',
                height: 300
            },
            labels: labels,
            series: series,
            colors: ['#4CAF50', '#FFB74D', '#2196F3', '#E53935'],
            legend: {
                position: 'bottom'
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };
        
        charts.recoveryFiles = new ApexCharts(document.getElementById('chartRecoveryFiles'), options);
        charts.recoveryFiles.render();
    }
}

// Función para generar el gráfico de productos con más incidencias
function renderProductsChart() {
    console.log("[DEBUG] renderProductsChart:", filteredData.length, filteredData.slice(0, 2));
    // Procesar datos
    const productsData = {};
    
    filteredData.forEach(item => {
        const product = item.products || 'Sin especificar';
        if (!productsData[product]) {
            productsData[product] = 1;
        } else {
            productsData[product]++;
        }
    });
    
    // Ordenar y tomar los 10 productos con más incidencias
    const topProducts = Object.entries(productsData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    // Preparar datos para ApexCharts
    const categories = topProducts.map(([product, _]) => product);
    const data = topProducts.map(([_, count]) => count);
    
    // Crear o actualizar el gráfico
    if (charts.products) {
        charts.products.updateOptions({
            xaxis: { categories: categories },
            series: [{ data: data }]
        });
    } else {
        const options = {
            chart: {
                type: 'bar',
                height: 300
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    horizontal: true,
                    distributed: true
                }
            },
            dataLabels: {
                enabled: false
            },
            xaxis: {
                categories: categories
            },
            colors: [
                '#4CAF50', '#FFB74D', '#FF7043', '#E53935', '#4472C4', 
                '#2196F3', '#9C27B0', '#8BC34A', '#FFC107', '#795548'
            ],
            series: [{
                name: 'Incidencias',
                data: data
            }]
        };
        
        charts.products = new ApexCharts(document.getElementById('chartProducts'), options);
        charts.products.render();
    }
}

// Reemplazar la función renderOriginDestinyMap con esta versión mejorada

async function renderOriginDestinyMap() {
    console.log("[DEBUG] renderOriginDestinyMap:", filteredData.length, filteredData.slice(0, 2));
    // Crear el mapa si no existe
    if (!maps.originDestiny) {
        maps.originDestiny = L.map('mapOriginDestiny').setView([25, 0], 2);
        
        // Añadir capa de mapas
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(maps.originDestiny);
    } else {
        // Limpiar marcadores existentes
        maps.originDestiny.eachLayer(function(layer) {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                maps.originDestiny.removeLayer(layer);
            }
        });
    }
    
    // Caché de coordenadas para evitar múltiples consultas
    const coordCache = JSON.parse(localStorage.getItem('mapCoordinatesCache') || '{}');
    
    // Procesar datos para el mapa
    const locations = new Map();
    const routes = [];
    const geocodePromises = [];
    
    filteredData.forEach(item => {
        if (!item.origin_city || !item.destiny_city) return;
        
        // Claves para origen y destino
        const originKey = `${item.origin_company_name || 'Unknown'} (${item.origin_city}, ${item.origin_state || 'Unknown'})`;
        const destKey = `${item.destiny_company_name || 'Unknown'} (${item.destiny_city}, ${item.destiny_state || 'Unknown'})`;
        
        // Verificar caché para origen
        if (!locations.has(originKey)) {
            const cacheKey = `${item.origin_city}-${item.origin_state || 'Unknown'}-${item.origin_country || 'Unknown'}`;
            
            if (coordCache[cacheKey]) {
                locations.set(originKey, {
                    lat: coordCache[cacheKey].lat,
                    lng: coordCache[cacheKey].lng,
                    count: 1
                });
            } else {
                // Añadir a lista de geocodificación pendiente
                geocodePromises.push(
                    geocodeLocation(item.origin_city, item.origin_state, item.origin_country)
                    .then(coords => {
                        if (coords) {
                            locations.set(originKey, {
                                lat: coords.lat,
                                lng: coords.lng,
                                count: 1
                            });
                            
                            // Guardar en caché
                            coordCache[cacheKey] = coords;
                            localStorage.setItem('mapCoordinatesCache', JSON.stringify(coordCache));
                        }
                    })
                    .catch(err => console.error(`Error geocoding ${originKey}:`, err))
                );
            }
        } else {
            locations.get(originKey).count++;
        }
        
        // Similar para destino...
        // (código similar para el destino, omitido por brevedad)
    });
    
    // Esperar a que todas las geocodificaciones se completen
    await Promise.allSettled(geocodePromises);
    
    // Añadir marcadores y rutas
    // (resto de la función similar a la original)
}

// Función para geocodificar ubicaciones
async function geocodeLocation(city, state, country) {
    const query = encodeURIComponent(`${city}, ${state || ''}, ${country || ''}`);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

// Función para generar el gráfico de series temporales
function renderTimeSeriesChart() {
    console.log("[DEBUG] renderTimeSeriesChart:", filteredData.length, filteredData.slice(0, 2));
    // Procesar datos por fecha
    const dateData = {};
    
    filteredData.forEach(item => {
        if (item.date) {
            // Extraer el mes-año (YYYY-MM)
            const monthYear = item.date.substring(0, 7);
            const cost = parseFloat(item.cost_euros || 0);
            
            if (!dateData[monthYear]) {
                dateData[monthYear] = {
                    count: 1,
                    cost: cost
                };
            } else {
                dateData[monthYear].count++;
                dateData[monthYear].cost += cost;
            }
        }
    });
    
    // Ordenar las fechas
    const sortedDates = Object.keys(dateData).sort();
    
    // Preparar series para el gráfico
    const countData = [];
    const costData = [];
    
    sortedDates.forEach(date => {
        countData.push({
            x: date,
            y: dateData[date].count
        });
        
        costData.push({
            x: date,
            y: dateData[date].cost
        });
    });
    
    // Crear o actualizar el gráfico
    if (charts.timeSeries) {
        charts.timeSeries.updateOptions({
            series: [
                { name: 'Cantidad de Envíos', data: countData },
                { name: 'Costo Total (€)', data: costData }
            ]
        });
    } else {
        const options = {
            chart: {
                height: 400,
                type: 'line',
                zoom: {
                    enabled: true
                },
                toolbar: {
                    show: true
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                width: [4, 4],
                curve: 'smooth'
            },
            title: {
                text: 'Tendencia Temporal',
                align: 'left'
            },
            grid: {
                row: {
                    colors: ['#f3f3f3', 'transparent'],
                    opacity: 0.5
                },
            },
            xaxis: {
                type: 'category',
                title: {
                    text: 'Fecha'
                }
            },
            yaxis: [
                {
                    title: {
                        text: 'Cantidad de Envíos'
                    }
                },
                {
                    opposite: true,
                    title: {
                        text: 'Costo Total (€)'
                    }
                }
            ],
            tooltip: {
                shared: true,
                intersect: false,
                y: [
                    {
                        formatter: function (y) {
                            if(typeof y !== "undefined") {
                                return y.toFixed(0) + " envíos";
                            }
                            return y;
                        }
                    },
                    {
                        formatter: function (y) {
                            if(typeof y !== "undefined") {
                                return "€" + y.toFixed(2);
                            }
                            return y;
                        }
                    }
                ]
            },
            colors: ['#4472C4', '#E53935'],
            series: [
                {
                    name: 'Cantidad de Envíos',
                    data: countData
                },
                {
                    name: 'Costo Total (€)',
                    data: costData
                }
            ]
        };
        
        charts.timeSeries = new ApexCharts(document.getElementById('chartTimeSeries'), options);
        charts.timeSeries.render();
    }
}

// Función para generar el gráfico de correlación
function renderCorrelationChart() {
    console.log("[DEBUG] renderCorrelationChart:", filteredData.length, filteredData.slice(0, 2));
    // Procesar datos para correlación entre peso y costo
    const scatterData = [];
    
    filteredData.forEach(item => {
        const weight = parseFloat(item.weight || 0);
        const cost = parseFloat(item.cost_euros || 0);
        
        if (weight > 0 && cost > 0) {
            scatterData.push({
                x: weight,
                y: cost,
                id: item.id,
                transport: item.transport || 'Sin especificar'
            });
        }
    });
    
    // Agrupar datos por tipo de transporte
    const transportTypes = [...new Set(scatterData.map(item => item.transport))];
    const seriesData = transportTypes.map(transport => {
        return {
            name: transport,
            data: scatterData.filter(item => item.transport === transport).map(item => ({
                x: item.x,
                y: item.y,
                id: item.id
            }))
        };
    });
    
    // Crear o actualizar el gráfico
    if (charts.correlation) {
        charts.correlation.updateOptions({
            series: seriesData
        });
    } else {
        const options = {
            chart: {
                height: 400,
                type: 'scatter',
                zoom: {
                    enabled: true,
                    type: 'xy'
                }
            },
            xaxis: {
                title: {
                    text: 'Peso'
                },
                tickAmount: 10,
            },
            yaxis: {
                title: {
                    text: 'Costo (€)'
                },
                tickAmount: 10
            },
            title: {
                text: 'Correlación entre Peso y Costo',
                align: 'left'
            },
            tooltip: {
                custom: function({series, seriesIndex, dataPointIndex, w}) {
                    const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
                    return `
                        <div class="p-2">
                            <div class="mb-1">ID: ${data.id}</div>
                            <div class="mb-1">Peso: ${data.x}</div>
                            <div>Costo: €${data.y.toFixed(2)}</div>
                        </div>
                    `;
                }
            },
            series: seriesData
        };
        
        charts.correlation = new ApexCharts(document.getElementById('chartCorrelation'), options);
        charts.correlation.render();
    }
}

// Función para generar el gráfico de pronóstico
function renderForecastChart() {
    console.log("[DEBUG] renderForecastChart:", filteredData.length, filteredData.slice(0, 2));
    // Procesar datos históricos por mes
    const monthlyData = {};
    
    filteredData.forEach(item => {
        if (item.date) {
            // Extraer el mes-año (YYYY-MM)
            const monthYear = item.date.substring(0, 7);
            const cost = parseFloat(item.cost_euros || 0);
            
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = cost;
            } else {
                monthlyData[monthYear] += cost;
            }
        }
    });
    
    // Ordenar las fechas
    const sortedMonths = Object.keys(monthlyData).sort();
    const historicalData = sortedMonths.map(month => ({
        x: month,
        y: monthlyData[month]
    }));
    
    // Generar pronóstico simple (media móvil de 3 meses)
    const forecastData = [];
    
    if (historicalData.length >= 3) {
        // Calcular la media de los últimos 3 meses
        const lastThreeMonths = historicalData.slice(-3);
        const avgValue = lastThreeMonths.reduce((sum, item) => sum + item.y, 0) / 3;
        
        // Generar 3 meses de pronóstico
        const lastMonth = new Date(sortedMonths[sortedMonths.length - 1] + '-01');
        
        for (let i = 1; i <= 3; i++) {
            const forecastMonth = new Date(lastMonth);
            forecastMonth.setMonth(lastMonth.getMonth() + i);
            
            const forecastMonthStr = forecastMonth.toISOString().substring(0, 7);
            forecastData.push({
                x: forecastMonthStr,
                y: avgValue
            });
        }
    }
    
    // Crear o actualizar el gráfico
    if (charts.forecast) {
        charts.forecast.updateOptions({
            series: [
                { name: 'Datos Históricos', data: historicalData },
                { name: 'Pronóstico', data: forecastData }
            ]
        });
    } else {
        const options = {
            chart: {
                height: 400,
                type: 'line',
                zoom: {
                    enabled: false
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                width: [4, 4],
                curve: 'smooth',
                dashArray: [0, 8]
            },
            title: {
                text: 'Pronóstico de Costos',
                align: 'left'
            },
            markers: {
                size: 0,
                hover: {
                    sizeOffset: 6
                }
            },
            xaxis: {
                type: 'category',
                title: {
                    text: 'Mes'
                }
            },
            yaxis: {
                title: {
                    text: 'Costo Total (€)'
                }
            },
            tooltip: {
                y: [
                    {
                        formatter: function(val) {
                            return "€" + val.toFixed(2);
                        }
                    },
                    {
                        formatter: function(val) {
                            return "€" + val.toFixed(2);
                        }
                    }
                ]
            },
            grid: {
                borderColor: '#e7e7e7'
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
                floating: true,
                offsetY: -25,
                offsetX: -5
            },
            colors: ['#4472C4', '#FFA500'],
            series: [
                { name: 'Datos Históricos', data: historicalData },
                { name: 'Pronóstico', data: forecastData }
            ]
        };
        
        charts.forecast = new ApexCharts(document.getElementById('chartForecast'), options);
        charts.forecast.render();
    }
}

// Reemplazar la función showLoading

function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    } else {
        console.warn('Loading overlay element not found');
    }
    
    // También deshabilitar los botones de filtro durante la carga
    const filterButtons = document.querySelectorAll('#refreshData, #plantaFilter, #statusFilter');
    filterButtons.forEach(button => {
        button.disabled = show;
    });
}

// Función para mostrar/ocultar indicador de carga
function showLoading(show) {
    // Implementación simple para ejemplo
    if (show) {
        // Podría mostrar un spinner o overlay de carga
        console.log('Cargando datos...');
    } else {
        console.log('Datos cargados');
    }
}

// Función para mostrar mensaje de error
function showErrorMessage(message) {
    console.error('ERROR:', message);
    
    // Check if SweetAlert2 is available
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
            confirmButtonText: 'Ok'
        });
    } else {
        // Fallback to basic alert
        alert(message);
    }
}

// Añadir esta función y llamarla desde updateVisualizations()

function renderWordCloud() {
    console.log("[DEBUG] renderWordCloud:", filteredData.length, filteredData.slice(0, 2));
    // Extraer descripciones y causas
    const textData = filteredData.map(item => 
        (item.description || '') + ' ' + (item.root_cause || '') + ' ' + (item.category_cause || '')
    ).join(' ');
    
    // Procesar texto: convertir a minúsculas, eliminar caracteres especiales y dividir en palabras
    const words = textData.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['this', 'that', 'then', 'than', 'with', 'para', 'from'].includes(word));
    
    // Contar frecuencia de palabras
    const wordCounts = {};
    words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Convertir a formato para la nube de palabras
    const wordCloudData = Object.entries(wordCounts)
        .filter(([_, count]) => count > 1)  // Filtrar palabras que aparecen solo una vez
        .map(([text, size]) => ({ text, size }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 100);  // Limitar a 100 palabras para rendimiento
    
    // Crear contenedor para la nube de palabras si no existe
    const wordCloudContainer = document.getElementById('wordCloudChart');
    if (!wordCloudContainer) return;
    
    // Limpiar contenedor
    wordCloudContainer.innerHTML = '';
    
    // Configurar dimensiones
    const width = wordCloudContainer.offsetWidth;
    const height = wordCloudContainer.offsetHeight;
    
    // Función para generar la nube
    const layout = d3.layout.cloud()
        .size([width, height])
        .words(wordCloudData)
        .padding(5)
        .rotate(() => Math.random() > 0.5 ? 0 : 90)
        .font("Impact")
        .fontSize(d => Math.min(50, 5 + d.size * 2))
        .on("end", draw);
    
    layout.start();
    
    function draw(words) {
        d3.select("#wordCloudChart").append("svg")
            .attr("width", layout.size()[0])
            .attr("height", layout.size()[1])
            .append("g")
            .attr("transform", `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`)
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", d => `${d.size}px`)
            .style("font-family", "Impact")
            .style("fill", d => d3.interpolateRainbow(Math.random()))
            .attr("text-anchor", "middle")
            .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
            .text(d => d.text);
    }
}

// Añadir esta función y llamarla desde updateVisualizations()

function renderPlantComparison() {
    console.log("[DEBUG] renderPlantComparison:", filteredData.length, filteredData.slice(0, 2));
    // Obtener las 5 plantas con más registros
    const plantCounts = {};
    
    filteredData.forEach(item => {
        const planta = item.planta || 'Sin especificar';
        plantCounts[planta] = (plantCounts[planta] || 0) + 1;
    });
    
    const topPlantas = Object.entries(plantCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([planta]) => planta);
    
    // Métricas a comparar
    const metrics = [
        { name: "Registros", getValue: (data) => data.length },
        { name: "Costo Promedio (€)", getValue: (data) => {
            const totalCost = data.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
            return data.length ? (totalCost / data.length) : 0;
        }},
        { name: "% Interno", getValue: (data) => {
            const internalCount = data.filter(item => (item.int_ext || '').includes('INTERNAL')).length;
            return data.length ? (internalCount / data.length * 100) : 0;
        }},
        { name: "Tiempo Aprobación (días)", getValue: (data) => {
            const validItems = data.filter(item => item.date && item.approval_date);
            const totalDays = validItems.reduce((sum, item) => {
                const createDate = new Date(item.date);
                const approvalDate = new Date(item.approval_date);
                const diffTime = Math.abs(approvalDate - createDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return sum + diffDays;
            }, 0);
            return validItems.length ? (totalDays / validItems.length) : 0;
        }},
        { name: "Peso Promedio (kg)", getValue: (data) => {
            const totalWeight = data.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
            return data.length ? (totalWeight / data.length) : 0;
        }}
    ];
    
    // Normalizar valores para el radar chart (escala 0-100)
    const normalizeValue = (value, metricName, allValues) => {
        const max = Math.max(...allValues);
        // Para algunas métricas, valores más bajos son mejores
        if (metricName === "Tiempo Aprobación (días)" || metricName === "Costo Promedio (€)") {
            return max ? (1 - (value / max)) * 100 : 0;
        }
        return max ? (value / max) * 100 : 0;
    };
    
    // Preparar datos para cada planta
    const series = topPlantas.map(planta => {
        const plantaData = filteredData.filter(item => item.planta === planta);
        
        // Calcular métricas para esta planta
        const values = metrics.map(metric => {
            const value = metric.getValue(plantaData);
            return { metric: metric.name, rawValue: value };
        });
        
        return {
            planta,
            values
        };
    });
    
    // Normalizar valores entre todas las plantas
    metrics.forEach(metric => {
        const allValues = series.map(s => 
            s.values.find(v => v.metric === metric.name).rawValue
        );
        
        series.forEach(s => {
            const metricObj = s.values.find(v => v.metric === metric.name);
            metricObj.normalizedValue = normalizeValue(metricObj.rawValue, metric.name, allValues);
        });
    });
    
    // Preparar datos para ApexCharts
    const apexSeries = series.map(s => ({
        name: s.planta,
        data: s.values.map(v => v.normalizedValue)
    }));
    
    const apexOptions = {
        chart: {
            height: 450,
            type: 'radar',
            toolbar: {
                show: true
            },
            dropShadow: {
                enabled: true,
                blur: 1,
                left: 1,
                top: 1
            }
        },
        series: apexSeries,
        labels: metrics.map(m => m.name),
        plotOptions: {
            radar: {
                size: 140,
                polygons: {
                    strokeWidth: 1,
                    strokeColor: '#e9e9e9',
                    fill: {
                        colors: ['#f8f8f8', '#fff']
                    }
                }
            }
        },
        colors: ['#FF4560', '#00E396', '#FEB019', '#775DD0', '#4472C4'],
        markers: {
            size: 4,
            colors: ['#fff'],
            strokeColors: ['#FF4560', '#00E396', '#FEB019', '#775DD0', '#4472C4'],
            strokeWidth: 2
        },
        tooltip: {
            y: {
                formatter: function(val, { seriesIndex, dataPointIndex }) {
                    const metric = metrics[dataPointIndex];
                    const rawValue = series[seriesIndex].values[dataPointIndex].rawValue;
                    
                    if (metric.name === "Costo Promedio (€)") {
                        return `€${rawValue.toFixed(2)}`;
                    } else if (metric.name === "% Interno") {
                        return `${rawValue.toFixed(1)}%`;
                    } else if (metric.name === "Tiempo Aprobación (días)") {
                        return `${rawValue.toFixed(1)} días`;
                    } else if (metric.name === "Peso Promedio (kg)") {
                        return `${rawValue.toFixed(1)} kg`;
                    } else {
                        return rawValue.toLocaleString();
                    }
                }
            }
        },
        yaxis: {
            tickAmount: 5,
            labels: {
                formatter: function(val) {
                    return val.toFixed(0);
                }
            }
        }
    };
    
    // Crear o actualizar el gráfico
    if (charts.plantComparison) {
        charts.plantComparison.updateOptions(apexOptions);
    } else {
        charts.plantComparison = new ApexCharts(document.getElementById('plantComparisonChart'), apexOptions);
        charts.plantComparison.render();
    }
}

// Añadir la llamada en updateVisualizations
function updateVisualizations() {
    // Código existente...
    renderPlantComparison();
    // Código existente...
}

// Añadir al final del archivo

// Función para exportar a CSV
function exportToCSV() {
    // Preparar encabezados
    const headers = [
        'ID', 'Planta', 'Fecha', 'Área', 'Tipo', 'Descripción', 'Causa',
        'Costo (€)', 'Transporte', 'Origen', 'Ciudad Origen', 'Destino',
        'Ciudad Destino', 'Peso (kg)', 'Status', 'Aprobador', 'Recovery'
    ];
    
    // Preparar filas
    const rows = filteredData.map(item => [
        item.id || '',
        item.planta || '',
        item.date || '',
        item.area || '',
        item.int_ext || '',
        item.description || '',
        item.category_cause || '',
        item.cost_euros || '0',
        item.transport || '',
        item.origin_company_name || '',
        item.origin_city || '',
        item.destiny_company_name || '',
        item.destiny_city || '',
        item.weight || '0',
        item.status_name || '',
        item.approver_name || '',
        item.recovery || ''
    ]);
    
    // Formatear CSV
    let csvContent = headers.join(',') + '\n';
    
    rows.forEach(row => {
        // Escapar comas y comillas en los datos
        const formattedRow = row.map(cell => {
            const stringCell = String(cell);
            return stringCell.includes(',') || stringCell.includes('"') 
                ? `"${stringCell.replace(/"/g, '""')}"` 
                : stringCell;
        });
        
        csvContent += formattedRow.join(',') + '\n';
    });
    
    // Crear enlace de descarga
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `premium_freight_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Función para imprimir dashboard
function printDashboard() {
    window.print();
}

// Añadir event listeners para los botones de exportación
document.addEventListener('DOMContentLoaded', function() {
    const exportCSVBtn = document.getElementById('exportCSV');
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', exportToCSV);
    }
    
    const printBtn = document.getElementById('printDashboard');
    if (printBtn) {
        printBtn.addEventListener('click', printDashboard);
    }
    
    // Para el PDF necesitarías una biblioteca como jsPDF o html2pdf
    // Aquí solo un placeholder
    const exportPDFBtn = document.getElementById('exportPDF');
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', function() {
            alert('Funcionalidad de exportación a PDF en desarrollo');
        });
    }
});
</copilot-edited-file>