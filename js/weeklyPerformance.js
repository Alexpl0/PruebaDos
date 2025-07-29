/**
 * WEEKLY PERFORMANCE DASHBOARD - MAIN JAVASCRIPT
 * Este módulo maneja toda la funcionalidad de la página de rendimiento semanal,
 * incluyendo la carga de datos, visualizaciones, filtros y exportaciones.
 */

// ========================================================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ========================================================================

// URLs de los endpoints
let WEEKLY_KPIS_URL;
let PLANTS_URL;
if (typeof URLPF !== 'undefined') {
    WEEKLY_KPIS_URL = URLPF + 'dao/conections/daoWeeklyKPIs.php';
    PLANTS_URL = URLPF + 'dao/conections/daoPlants.php';
} else {
    console.warn('URL global variable is not defined. Using fallback URL for Weekly KPIs.');
    WEEKLY_KPIS_URL = 'https://grammermx.com/Jesus/PruebaDos/dao/conections/daoWeeklyKPIs.php';
    PLANTS_URL = 'https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPlants.php';
}

// Almacenamiento de datos y gráficas
let weeklyData = {};
let charts = {};
let availablePlants = [];
let currentWeek = {
    start: moment().startOf('isoWeek'),
    end: moment().endOf('isoWeek'),
    weekNumber: moment().isoWeek(),
    year: moment().year()
};
let selectedPlant = '';

// Paleta de colores usando variables del sistema existente
const colorPalette = {
    primary: '#034C8C',
    primaryLight: '#4A90D9', 
    primaryDark: '#002856',
    accent: '#00A3E0',
    success: '#218621',
    warning: '#F59E0B',
    danger: '#E41A23',
    info: '#3B82F6',
    gradients: {
        primary: 'linear-gradient(135deg, #034C8C 0%, #002856 100%)',
        success: 'linear-gradient(135deg, #218621 0%, #16a34a 100%)',
        warning: 'linear-gradient(135deg, #F59E0B 0%, #f59e0b 100%)',
        info: 'linear-gradient(135deg, #3B82F6 0%, #00A3E0 100%)',
        danger: 'linear-gradient(135deg, #E41A23 0%, #dc2626 100%)'
    }
};

// ========================================================================
// 2. SELECTOR DE SEMANAS Y PLANTAS
// ========================================================================

/**
 * Inicializa el selector de semanas y plantas
 */
function initializeSelectors() {
    updateWeekDisplay();
    initializePlantSelector();
    
    // Event listeners para navegación de semanas
    document.getElementById('prevWeek').addEventListener('click', () => {
        currentWeek.start.subtract(1, 'week');
        currentWeek.end.subtract(1, 'week');
        currentWeek.weekNumber = currentWeek.start.isoWeek();
        currentWeek.year = currentWeek.start.year();
        updateWeekDisplay();
        updateAllVisualizations();
    });
    
    document.getElementById('nextWeek').addEventListener('click', () => {
        const nextWeekStart = moment(currentWeek.start).add(1, 'week');
        const today = moment();
        
        // No permitir navegar a semanas futuras
        if (nextWeekStart.isAfter(today, 'week')) {
            showErrorMessage('Cannot navigate to future weeks');
            return;
        }
        
        currentWeek.start.add(1, 'week');
        currentWeek.end.add(1, 'week');
        currentWeek.weekNumber = currentWeek.start.isoWeek();
        currentWeek.year = currentWeek.start.year();
        updateWeekDisplay();
        updateAllVisualizations();
    });

    // Event listener para el selector de planta
    document.getElementById('plantSelector').addEventListener('change', (e) => {
        selectedPlant = e.target.value;
        console.log('Plant selected:', selectedPlant);
        updateAllVisualizations();
    });
}

/**
 * Actualiza la visualización del selector de semanas
 */
function updateWeekDisplay() {
    const weekDisplay = document.getElementById('weekDisplay');
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');
    
    if (!weekDisplay) return;
    
    const weekInfo = `Week ${currentWeek.weekNumber} of ${currentWeek.year}`;
    const weekDates = `${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD')}`;
    
    weekDisplay.innerHTML = `
        <div class="week-info">${weekInfo}</div>
        <div class="week-dates">${weekDates}</div>
    `;
    
    // Deshabilitar navegación futura
    const today = moment();
    const nextWeekStart = moment(currentWeek.start).add(1, 'week');
    nextBtn.disabled = nextWeekStart.isAfter(today, 'week');
    
    // Opcional: limitar cuánto atrás se puede ir (ej: máximo 1 año)
    const oneYearAgo = moment().subtract(1, 'year');
    prevBtn.disabled = currentWeek.start.isBefore(oneYearAgo, 'week');
}

/**
 * Inicializa el selector de plantas - ACTUALIZADO para usar tabla User
 */
async function initializePlantSelector() {
    try {
        const plantsData = await loadAvailablePlants();
        const plantSelector = document.getElementById('plantSelector');
        
        if (!plantSelector) return;
        
        // Limpiar opciones existentes excepto "All Plants"
        plantSelector.innerHTML = '<option value="">All Plants</option>';
        
        // Añadir plantas disponibles
        plantsData.forEach(plant => {
            const option = document.createElement('option');
            option.value = plant;
            option.textContent = plant;
            plantSelector.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading plants:', error);
    }
}

/**
 * Carga las plantas disponibles desde la tabla User - ACTUALIZADO
 */
async function loadAvailablePlants() {
    try {
        const response = await fetch(PLANTS_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success' && result.data) {
            // Los datos ya vienen como array de strings de plantas
            const plants = result.data.filter(plant => plant && plant.trim() !== '');
            
            availablePlants = plants;
            return plants;
        }
        
        return [];
    } catch (error) {
        console.error('Error loading plants:', error);
        return [];
    }
}

/**
 * Obtiene el rango de fechas actual en formato para la API
 */
function getCurrentDateRange() {
    return {
        start: currentWeek.start.format('YYYY-MM-DD'),
        end: currentWeek.end.format('YYYY-MM-DD')
    };
}

// ========================================================================
// 3. FUNCIONES DE CARGA DE DATOS
// ========================================================================

/**
 * Carga los datos semanales desde el endpoint
 */
async function loadWeeklyData() {
    try {
        showLoading(true);
        
        const dateRange = getCurrentDateRange();
        let url = `${WEEKLY_KPIS_URL}?start_date=${dateRange.start}&end_date=${dateRange.end}`;
        
        // Añadir filtro de planta si está seleccionado
        if (selectedPlant && selectedPlant.trim() !== '') {
            url += `&plant=${encodeURIComponent(selectedPlant)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success') {
            weeklyData = result.data;
            console.log('Weekly data loaded:', weeklyData);
            showLoading(false);
            return weeklyData;
        } else {
            throw new Error(result.message || 'Failed to load weekly data');
        }

    } catch (error) {
        console.error('Error loading weekly data:', error);
        showLoading(false);
        showErrorMessage(`Error loading data: ${error.message}`);
        throw error;
    }
}

/**
 * Muestra/oculta el overlay de carga
 */
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Muestra mensajes de error
 */
function showErrorMessage(message) {
    console.error('ERROR:', message);
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
            confirmButtonText: 'Ok'
        });
    } else {
        alert(message);
    }
}

// ========================================================================
// 3. ACTUALIZACIÓN DE MÉTRICAS PRINCIPALES
// ========================================================================

/**
 * Actualiza las tarjetas de métricas principales
 */
function updateMetricCards() {
    if (!weeklyData || Object.keys(weeklyData).length === 0) return;

    // Total Requests
    document.getElementById('totalRequests').textContent = formatNumber(weeklyData.total_generated || 0);
    
    // Approval Rate
    document.getElementById('approvalRate').textContent = `${weeklyData.approval_rate || 0}%`;
    
    // Total Cost
    document.getElementById('totalCost').textContent = `€${formatNumber(weeklyData.total_cost || 0, 2)}`;
    
    // Average Time
    document.getElementById('avgTime').textContent = weeklyData.average_approval_time || 'N/A';

    // TODO: Implementar cálculo de trends comparando con período anterior
    updateTrends();
}

/**
 * Actualiza los indicadores de tendencia (placeholders por ahora)
 */
function updateTrends() {
    // Placeholders - en el futuro se pueden calcular comparando períodos
    const trends = [
        { id: 'requestsTrend', value: '+12%', positive: true },
        { id: 'approvalTrend', value: '+5%', positive: true },
        { id: 'costTrend', value: '-8%', positive: false },
        { id: 'timeTrend', value: '-15%', positive: true }
    ];

    trends.forEach(trend => {
        const element = document.getElementById(trend.id);
        if (element) {
            element.innerHTML = `
                <i class="fas fa-arrow-${trend.positive ? 'up' : 'down'}"></i> ${trend.value}
            `;
            element.className = trend.positive ? 'metric-trend' : 'metric-trend negative';
        }
    });
}

// ========================================================================
// 4. GENERACIÓN DE TABLA DE RESUMEN
// ========================================================================

/**
 * Genera la tabla de resumen semanal con botones de exportación
 */
function generateWeeklySummary() {
    const container = document.getElementById('weeklySummaryContainer');
    if (!container || !weeklyData) return;

    const weekInfo = `Week ${currentWeek.weekNumber} of ${currentWeek.year}`;
    const weekRange = `${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD, YYYY')}`;
    const plantInfo = selectedPlant ? ` - ${selectedPlant}` : '';
    
    const html = `
        <div class="weekly-summary-container">
            <div class="kpis-header">
                <div class="kpis-header-content">
                    <h3 class="kpis-title">
                        <i class="fas fa-chart-line me-2"></i>
                        Weekly Performance Report
                    </h3>
                    <span class="kpis-subtitle">Premium Freight System | ${weekInfo} (${weekRange})${plantInfo}</span>
                </div>
                <div class="kpis-header-actions">
                    <div class="kpis-export-buttons">
                        <button id="exportExcel" class="btn" disabled>
                            <i class="fas fa-file-excel me-1"></i>Excel
                        </button>
                        <button id="exportPDF" class="btn" disabled>
                            <i class="fas fa-file-pdf me-1"></i>PDF
                        </button>
                        <button id="printReport" class="btn" disabled>
                            <i class="fas fa-print me-1"></i>Print
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="kpis-content">
                <!-- General Summary Section -->
                <div class="kpis-section">
                    <h4 class="section-title">
                        <i class="fas fa-chart-bar me-2"></i>
                        General Summary
                    </h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-label">Total Generated Requests</div>
                            <div class="stat-value primary">${formatNumber(weeklyData.total_generated || 0)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Orders Pending / In Progress</div>
                            <div class="stat-value warning">${formatNumber(weeklyData.total_pending || 0)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Approved Orders</div>
                            <div class="stat-value success">${formatNumber(weeklyData.total_approved || 0)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Rejected Orders</div>
                            <div class="stat-value danger">${formatNumber(weeklyData.total_rejected || 0)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Approval Rate (of processed orders)</div>
                            <div class="stat-value info">${weeklyData.approval_rate || 0}%</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Cost of Approved Shipments</div>
                            <div class="stat-value primary">€ ${formatNumber(weeklyData.total_cost || 0, 2)}</div>
                        </div>
                    </div>
                </div>

                <!-- Performance Highlights Section -->
                <div class="kpis-section">
                    <h4 class="section-title">
                        <i class="fas fa-star me-2"></i>
                        Performance Highlights (Based on Approved Orders)
                    </h4>
                    <div class="highlights-grid">
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-user-crown me-2"></i>
                                Top Requesting User
                            </div>
                            <div class="highlight-value">${weeklyData.top_requesting_user?.name || 'N/A'}</div>
                            <div class="highlight-detail">
                                ${formatNumber(weeklyData.top_requesting_user?.request_count || 0)} approved requests | Total Cost: € ${formatNumber(weeklyData.top_requesting_user?.total_cost || 0, 2)}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-building me-2"></i>
                                Top Spending Area
                            </div>
                            <div class="highlight-value">${weeklyData.top_spending_area?.area || 'N/A'}</div>
                            <div class="highlight-detail">
                                Total Spent: € ${formatNumber(weeklyData.top_spending_area?.total_spent || 0, 2)}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-clock me-2"></i>
                                Longest Approval Step
                            </div>
                            <div class="highlight-value">${weeklyData.slowest_approver?.name || 'N/A'}</div>
                            <div class="highlight-detail">
                                Avg. time taken: ${weeklyData.slowest_approver?.duration_formatted || 'N/A'}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-stopwatch me-2"></i>
                                Average Approval Time
                            </div>
                            <div class="highlight-value">${weeklyData.average_approval_time || 'N/A'}</div>
                            <div class="highlight-detail">
                                Creation to Finish
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="kpis-footer">
                <small class="text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    This is an automated report generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </small>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Re-asignar event listeners a los nuevos botones
    setTimeout(() => {
        assignExportButtonListeners();
    }, 100);
}

/**
 * Asigna event listeners a los botones de exportación
 */
function assignExportButtonListeners() {
    const exportExcel = document.getElementById('exportExcel');
    const exportPDF = document.getElementById('exportPDF');
    const printReportBtn = document.getElementById('printReport');
    
    if (exportExcel) {
        exportExcel.removeEventListener('click', exportToExcel);
        exportExcel.addEventListener('click', exportToExcel);
        exportExcel.disabled = false;
    }
    
    if (exportPDF) {
        exportPDF.removeEventListener('click', exportToPDF);
        exportPDF.addEventListener('click', exportToPDF);
        exportPDF.disabled = false;
    }
    
    if (printReportBtn) {
        printReportBtn.removeEventListener('click', printReport);
        printReportBtn.addEventListener('click', printReport);
        printReportBtn.disabled = false;
    }
}

// ========================================================================
// 5. VISUALIZACIONES Y GRÁFICAS - ACTUALIZADAS CON DATOS REALES
// ========================================================================

/**
 * Renderiza el gráfico de tendencias semanales
 */
function renderTrendsChart() {
    const container = document.getElementById('trendsChart');
    if (!container) return;

    // Datos simulados para demostración - en el futuro usar datos reales
    const options = {
        series: [{
            name: 'Requests',
            data: [30, 40, 35, 50, 49, 60, 70]
        }, {
            name: 'Approvals',
            data: [25, 35, 30, 45, 42, 55, 63]
        }],
        chart: {
            height: 400,
            type: 'line',
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                }
            }
        },
        colors: [colorPalette.primary, colorPalette.accent],
        stroke: {
            width: 3,
            curve: 'smooth'
        },
        xaxis: {
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        title: {
            text: 'Daily Performance Trend',
            align: 'left',
            style: {
                fontFamily: 'Merriweather, serif'
            }
        },
        grid: {
            borderColor: '#e7e7e7',
            row: {
                colors: ['#f3f3f3', 'transparent'],
                opacity: 0.5
            }
        },
        markers: {
            size: 5
        }
    };

    if (charts.trends) {
        charts.trends.destroy();
    }
    charts.trends = new ApexCharts(container, options);
    charts.trends.render();
}

/**
 * Renderiza el gráfico de distribución de estados
 */
function renderStatusChart() {
    const container = document.getElementById('statusChart');
    if (!container || !weeklyData) return;

    const options = {
        series: [
            weeklyData.total_approved || 0,
            weeklyData.total_pending || 0,
            weeklyData.total_rejected || 0
        ],
        chart: {
            type: 'donut',
            height: 400
        },
        labels: ['Approved', 'Pending', 'Rejected'],
        colors: [colorPalette.success, colorPalette.warning, colorPalette.danger],
        legend: {
            position: 'bottom',
            fontFamily: 'Merriweather, serif'
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

    if (charts.status) {
        charts.status.destroy();
    }
    charts.status = new ApexCharts(container, options);
    charts.status.render();
}

/**
 * Renderiza el gráfico de top performers - ACTUALIZADO CON DATOS REALES
 */
function renderTopPerformersChart() {
    const container = document.getElementById('topPerformersChart');
    if (!container || !weeklyData || !weeklyData.top_performers) return;

    // Extraer datos reales
    const performers = weeklyData.top_performers || [];
    
    if (performers.length === 0) {
        container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle text-muted me-2"></i>No data available for the selected period</div>';
        return;
    }

    const names = performers.map(p => p.name);
    const requests = performers.map(p => parseInt(p.approved_requests));

    const options = {
        series: [{
            name: 'Approved Requests',
            data: requests
        }],
        chart: {
            type: 'bar',
            height: 350
        },
        colors: [colorPalette.primary],
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: true,
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function(val) {
                return val + ' requests';
            }
        },
        xaxis: {
            categories: names,
            title: {
                text: 'Number of Approved Requests',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            }
        },
        yaxis: {
            title: {
                text: 'Users',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            }
        },
        title: {
            text: 'Top Users by Approved Requests',
            align: 'left',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '14px'
            }
        },
        tooltip: {
            y: {
                formatter: function(val, { series, seriesIndex, dataPointIndex, w }) {
                    const performer = performers[dataPointIndex];
                    return `<div>
                        <strong>${val} approved requests</strong><br>
                        Total Cost: €${formatNumber(performer.total_cost, 2)}
                    </div>`;
                }
            }
        }
    };

    if (charts.topPerformers) {
        charts.topPerformers.destroy();
    }
    charts.topPerformers = new ApexCharts(container, options);
    charts.topPerformers.render();
}

/**
 * Renderiza el gráfico de rendimiento por área - ACTUALIZADO CON DATOS REALES
 */
function renderAreaPerformanceChart() {
    const container = document.getElementById('areaPerformanceChart');
    if (!container || !weeklyData || !weeklyData.area_performance) return;

    // Extraer datos reales
    const areas = weeklyData.area_performance || [];
    
    if (areas.length === 0) {
        container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle text-muted me-2"></i>No data available for the selected period</div>';
        return;
    }

    const areaNames = areas.map(a => a.area_name);
    const requests = areas.map(a => parseInt(a.total_requests));
    const costs = areas.map(a => parseFloat(a.total_cost));

    const options = {
        series: [{
            name: 'Total Requests',
            type: 'column',
            data: requests
        }, {
            name: 'Total Cost (€)',
            type: 'line',
            data: costs
        }],
        chart: {
            height: 350,
            type: 'line'
        },
        colors: [colorPalette.accent, colorPalette.warning],
        stroke: {
            width: [0, 4]
        },
        dataLabels: {
            enabled: true,
            enabledOnSeries: [1],
            formatter: function(val, opts) {
                if (opts.seriesIndex === 1) {
                    return '€' + formatNumber(val, 0);
                }
                return val;
            }
        },
        xaxis: {
            categories: areaNames,
            title: {
                text: 'Business Areas',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            }
        },
        yaxis: [{
            title: {
                text: 'Number of Requests',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            }
        }, {
            opposite: true,
            title: {
                text: 'Total Cost (€)',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            },
            labels: {
                formatter: function(val) {
                    return '€' + formatNumber(val, 0);
                }
            }
        }],
        title: {
            text: 'Performance by Business Area (Approved Orders)',
            align: 'left',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '14px'
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right'
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: function(val, { series, seriesIndex, dataPointIndex, w }) {
                    if (seriesIndex === 0) {
                        return val + ' requests';
                    } else {
                        return '€' + formatNumber(val, 2);
                    }
                }
            }
        }
    };

    if (charts.areaPerformance) {
        charts.areaPerformance.destroy();
    }
    charts.areaPerformance = new ApexCharts(container, options);
    charts.areaPerformance.render();
}

/**
 * Renderiza el gráfico de tiempos de aprobación - ACTUALIZADO CON DATOS REALES
 */
function renderApprovalTimesChart() {
    const container = document.getElementById('approvalTimesChart');
    if (!container || !weeklyData || !weeklyData.approval_times_distribution) return;

    // Extraer datos reales
    const timeDistribution = weeklyData.approval_times_distribution || [];
    
    if (timeDistribution.length === 0) {
        container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle text-muted me-2"></i>No approval time data available</div>';
        return;
    }

    const categories = timeDistribution.map(t => t.time_category);
    const counts = timeDistribution.map(t => parseInt(t.count));

    // Calcular porcentajes
    const total = counts.reduce((sum, count) => sum + count, 0);
    const percentages = counts.map(count => total > 0 ? Math.round((count / total) * 100) : 0);

    const options = {
        series: percentages,
        chart: {
            type: 'radialBar',
            height: 300
        },
        plotOptions: {
            radialBar: {
                dataLabels: {
                    name: {
                        fontSize: '14px',
                        fontFamily: 'Merriweather, serif'
                    },
                    value: {
                        fontSize: '12px',
                        fontFamily: 'Merriweather, serif',
                        formatter: function(val, opts) {
                            const count = counts[opts.seriesIndex] || 0;
                            return `${val}%\n(${count} orders)`;
                        }
                    },
                    total: {
                        show: true,
                        label: 'Total Orders',
                        fontSize: '12px',
                        fontFamily: 'Merriweather, serif',
                        formatter: function (w) {
                            return `${total}`;
                        }
                    }
                }
            }
        },
        labels: categories,
        colors: [colorPalette.success, colorPalette.primary, colorPalette.warning, colorPalette.danger],
        title: {
            text: 'Time to Approval Distribution',
            align: 'center',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '14px'
            }
        },
        subtitle: {
            text: 'How long it takes from request creation to approval',
            align: 'center',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '12px',
                color: '#666'
            }
        },
        legend: {
            show: true,
            position: 'bottom',
            fontFamily: 'Merriweather, serif',
            fontSize: '12px',
            formatter: function(seriesName, opts) {
                const count = counts[opts.seriesIndex] || 0;
                const percentage = percentages[opts.seriesIndex] || 0;
                return `${seriesName}: ${count} orders (${percentage}%)`;
            }
        }
    };

    if (charts.approvalTimes) {
        charts.approvalTimes.destroy();
    }
    charts.approvalTimes = new ApexCharts(container, options);
    charts.approvalTimes.render();
}

/**
 * Renderiza el gráfico de análisis de costos - ACTUALIZADO CON DATOS REALES Y TÍTULO
 */
function renderCostAnalysisChart() {
    const container = document.getElementById('costAnalysisChart');
    if (!container || !weeklyData || !weeklyData.daily_costs) return;

    // Extraer datos reales
    const dailyCosts = weeklyData.daily_costs || [];
    
    if (dailyCosts.length === 0) {
        container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle text-muted me-2"></i>No cost data available for the selected period</div>';
        return;
    }

    const dates = dailyCosts.map(d => moment(d.approval_date).format('MMM DD'));
    const costs = dailyCosts.map(d => parseFloat(d.daily_cost));
    const counts = dailyCosts.map(d => parseInt(d.daily_count));

    const options = {
        series: [{
            name: 'Daily Cost (Approved Orders)',
            data: costs
        }],
        chart: {
            type: 'area',
            height: 300,
            sparkline: {
                enabled: false
            },
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: false,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: false,
                    reset: true
                }
            }
        },
        colors: [colorPalette.warning],
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.3,
                stops: [0, 90, 100]
            }
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        xaxis: {
            categories: dates,
            title: {
                text: 'Date',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            }
        },
        yaxis: {
            title: {
                text: 'Cost (€)',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            },
            labels: {
                formatter: function (value) {
                    return '€' + formatNumber(value, 0);
                }
            }
        },
        title: {
            text: 'Daily Cost Trend (Approved Orders Only)',
            align: 'left',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '14px'
            }
        },
        subtitle: {
            text: 'Shows the total cost of approved freight requests per day',
            align: 'left',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '12px',
                color: '#666'
            }
        },
        dataLabels: {
            enabled: false
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: function(val, { series, seriesIndex, dataPointIndex, w }) {
                    const count = counts[dataPointIndex] || 0;
                    return `<div>
                        <strong>€${formatNumber(val, 2)}</strong><br>
                        From ${count} approved order${count !== 1 ? 's' : ''}
                    </div>`;
                }
            }
        },
        markers: {
            size: 4,
            hover: {
                size: 6
            }
        }
    };

    if (charts.costAnalysis) {
        charts.costAnalysis.destroy();
    }
    charts.costAnalysis = new ApexCharts(container, options);
    charts.costAnalysis.render();
}

// ========================================================================
// 6. INSIGHTS Y RECOMENDACIONES
// ========================================================================

/**
 * Genera insights automáticos basados en los datos
 */
function generateInsights() {
    const container = document.getElementById('insightsContainer');
    if (!container || !weeklyData) return;

    const insights = [];

    // Insight sobre approval rate
    const approvalRate = weeklyData.approval_rate || 0;
    if (approvalRate > 80) {
        insights.push({
            type: 'positive',
            title: 'Excellent Approval Rate',
            description: `Your approval rate of ${approvalRate}% is excellent and above industry standards.`
        });
    } else if (approvalRate < 60) {
        insights.push({
            type: 'warning',
            title: 'Low Approval Rate Alert',
            description: `Consider reviewing request quality - current approval rate of ${approvalRate}% could be improved.`
        });
    }

    // Insight sobre top user
    if (weeklyData.top_requesting_user && weeklyData.top_requesting_user.name !== 'N/A') {
        insights.push({
            type: 'positive',
            title: 'Top Performer Identified',
            description: `${weeklyData.top_requesting_user.name} is leading with ${weeklyData.top_requesting_user.request_count} approved requests.`
        });
    }

    // Insight sobre costos
    const totalCost = weeklyData.total_cost || 0;
    if (totalCost > 10000) {
        insights.push({
            type: 'warning',
            title: 'High Cost Alert',
            description: `Total cost of €${formatNumber(totalCost, 2)} is notably high. Consider cost optimization strategies.`
        });
    }

    // Si no hay insights, mostrar mensaje por defecto
    if (insights.length === 0) {
        insights.push({
            type: 'info',
            title: 'Performance Analysis',
            description: 'All metrics are within normal ranges. Continue monitoring for trends.'
        });
    }

    const html = insights.map(insight => `
        <div class="insight-item ${insight.type}">
            <div class="insight-title">${insight.title}</div>
            <div class="insight-description">${insight.description}</div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// ========================================================================
// 7. FUNCIONES DE EXPORTACIÓN
// ========================================================================

/**
 * Exporta los datos a Excel
 */
function exportToExcel() {
    if (!weeklyData) {
        showErrorMessage('No data available to export');
        return;
    }

    if (typeof XLSX === 'undefined') {
        showErrorMessage('Excel export library not loaded');
        return;
    }

    try {
        const workbook = XLSX.utils.book_new();
        const dateRange = getCurrentDateRange();
        
        // Crear hoja de resumen
        const summaryData = [
            ['Weekly Performance Report'],
            ['Week', `${currentWeek.weekNumber} of ${currentWeek.year}`],
            ['Period', `${dateRange.start} to ${dateRange.end}`],
            [''],
            ['Metric', 'Value'],
            ['Total Generated Requests', weeklyData.total_generated || 0],
            ['Total Pending', weeklyData.total_pending || 0],
            ['Total Approved', weeklyData.total_approved || 0],
            ['Total Rejected', weeklyData.total_rejected || 0],
            ['Approval Rate', `${weeklyData.approval_rate || 0}%`],
            ['Total Cost', `€${formatNumber(weeklyData.total_cost || 0, 2)}`],
            [''],
            ['Top Requesting User', weeklyData.top_requesting_user?.name || 'N/A'],
            ['Top Spending Area', weeklyData.top_spending_area?.area || 'N/A'],
            ['Average Approval Time', weeklyData.average_approval_time || 'N/A']
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // Guardar archivo
        const fileName = `weekly-performance-week${currentWeek.weekNumber}-${currentWeek.year}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        // Mostrar mensaje de éxito
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Export Successful',
                text: 'Weekly performance data has been exported to Excel',
                icon: 'success',
                timer: 3000
            });
        }
    } catch (error) {
        console.error('Export error:', error);
        showErrorMessage('Error exporting to Excel: ' + error.message);
    }
}

/**
 * Exporta los datos a PDF
 */
function exportToPDF() {
    if (typeof window.jspdf === 'undefined') {
        showErrorMessage('PDF library not available. Please try again or contact support.');
        return;
    }

    if (!weeklyData) {
        showErrorMessage('No data available to export');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(20);
        doc.text('Weekly Performance Report', 20, 30);
        
        // Información de la semana
        doc.setFontSize(12);
        doc.text(`Week ${currentWeek.weekNumber} of ${currentWeek.year}`, 20, 45);
        doc.text(`Period: ${getCurrentDateRange().start} to ${getCurrentDateRange().end}`, 20, 55);

        // Métricas principales
        let yPos = 75;
        doc.setFontSize(14);
        doc.text('Performance Metrics:', 20, yPos);
        
        yPos += 20;
        doc.setFontSize(11);
        const metrics = [
            `Total Generated Requests: ${weeklyData.total_generated || 0}`,
            `Total Approved: ${weeklyData.total_approved || 0}`,
            `Total Rejected: ${weeklyData.total_rejected || 0}`,
            `Approval Rate: ${weeklyData.approval_rate || 0}%`,
            `Total Cost: €${formatNumber(weeklyData.total_cost || 0, 2)}`,
            `Average Approval Time: ${weeklyData.average_approval_time || 'N/A'}`
        ];

        metrics.forEach(metric => {
            doc.text(metric, 30, yPos);
            yPos += 15;
        });

        // Highlights
        yPos += 10;
        doc.setFontSize(14);
        doc.text('Performance Highlights:', 20, yPos);
        
        yPos += 20;
        doc.setFontSize(11);
        const highlights = [
            `Top Requesting User: ${weeklyData.top_requesting_user?.name || 'N/A'}`,
            `Top Spending Area: ${weeklyData.top_spending_area?.area || 'N/A'}`,
            `Slowest Approver: ${weeklyData.slowest_approver?.name || 'N/A'}`
        ];

        highlights.forEach(highlight => {
            doc.text(highlight, 30, yPos);
            yPos += 15;
        });

        // Guardar PDF
        const fileName = `weekly-performance-week${currentWeek.weekNumber}-${currentWeek.year}.pdf`;
        doc.save(fileName);

        // Mostrar mensaje de éxito
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Export Successful',
                text: 'Weekly performance report has been exported to PDF',
                icon: 'success',
                timer: 3000
            });
        }
    } catch (error) {
        console.error('PDF export error:', error);
        showErrorMessage('Error exporting to PDF: ' + error.message);
    }
}

/**
 * Imprime el reporte
 */
function printReport() {
    window.print();
}

// ========================================================================
// 8. FUNCIONES DE UTILIDAD
// ========================================================================

/**
 * Formatea números para visualización
 */
function formatNumber(number, decimals = 0) {
    if (isNaN(number)) return '0';
    return number.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/**
 * Actualiza todas las visualizaciones
 */
async function updateAllVisualizations() {
    try {
        await loadWeeklyData();
        updateMetricCards();
        generateWeeklySummary();
        renderTrendsChart();
        renderStatusChart();
        renderTopPerformersChart();
        renderAreaPerformanceChart();
        renderApprovalTimesChart();
        renderCostAnalysisChart();
        generateInsights();
    } catch (error) {
        console.error('Error updating visualizations:', error);
    }
}

// ========================================================================
// 9. INICIALIZACIÓN
// ========================================================================

/**
 * Inicializa la página completa
 */
async function initializeWeeklyPerformance() {
    try {
        console.log('Initializing Weekly Performance Dashboard...');

        // Inicializar componentes
        initializeSelectors();

        // Event listener para el botón de refresh
        document.getElementById('refreshData')?.addEventListener('click', updateAllVisualizations);

        // Cargar datos iniciales
        await updateAllVisualizations();

        console.log('Weekly Performance Dashboard initialized successfully');

    } catch (error) {
        console.error('Error initializing Weekly Performance Dashboard:', error);
        showErrorMessage('Failed to initialize dashboard: ' + error.message);
    }
}

// ========================================================================
// 10. PUNTO DE ENTRADA
// ========================================================================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeWeeklyPerformance);