/**
 * WEEKLY PERFORMANCE DASHBOARD - MAIN JAVASCRIPT
 * 
 * Este módulo maneja toda la funcionalidad de la página de rendimiento semanal,
 * incluyendo la carga de datos, visualizaciones, filtros y exportaciones.
 */

// ========================================================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ========================================================================

// URLs de los endpoints
let WEEKLY_KPIS_URL;
if (typeof URLPF !== 'undefined') {
    WEEKLY_KPIS_URL = URLPF + 'dao/conections/daoWeeklyKPIs.php';
} else {
    console.warn('URL global variable is not defined. Using fallback URL for Weekly KPIs.');
    WEEKLY_KPIS_URL = 'https://grammermx.com/Jesus/PruebaDos/dao/conections/daoWeeklyKPIs.php';
}

// Almacenamiento de datos y gráficas
let weeklyData = {};
let charts = {};
let currentDateRange = {
    start: moment().subtract(7, 'days').format('YYYY-MM-DD'),
    end: moment().format('YYYY-MM-DD')
};

// Paleta de colores moderna
const colorPalette = {
    primary: ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
    success: ['#4facfe', '#00f2fe', '#43e97b', '#38f9d7'],
    gradient: {
        primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        success: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        info: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)'
    }
};

// ========================================================================
// 2. FUNCIONES DE CARGA DE DATOS
// ========================================================================

/**
 * Carga los datos semanales desde el endpoint
 */
async function loadWeeklyData() {
    try {
        showLoading(true);
        
        const url = `${WEEKLY_KPIS_URL}?start_date=${currentDateRange.start}&end_date=${currentDateRange.end}`;
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
 * Genera la tabla de resumen semanal
 */
function generateWeeklySummary() {
    const container = document.getElementById('weeklySummaryContainer');
    if (!container || !weeklyData) return;

    const currentDate = new Date();
    const weekRange = `${moment(currentDateRange.start).format('MMM DD')} - ${moment(currentDateRange.end).format('MMM DD, YYYY')}`;
    
    const html = `
        <div class="weekly-summary-container">
            <div class="kpis-header">
                <h3 class="kpis-title">
                    <i class="fas fa-chart-line me-2"></i>
                    Weekly Performance Report
                </h3>
                <span class="kpis-subtitle">Premium Freight System | ${weekRange}</span>
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
                    This is an automated report generated on ${currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </small>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ========================================================================
// 5. VISUALIZACIONES Y GRÁFICAS
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
        colors: ['#667eea', '#4facfe'],
        stroke: {
            width: 3,
            curve: 'smooth'
        },
        xaxis: {
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        title: {
            text: 'Daily Performance Trend',
            align: 'left'
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
        colors: ['#4facfe', '#f093fb', '#ff6b6b'],
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

    if (charts.status) {
        charts.status.destroy();
    }
    charts.status = new ApexCharts(container, options);
    charts.status.render();
}

/**
 * Renderiza el gráfico de top performers
 */
function renderTopPerformersChart() {
    const container = document.getElementById('topPerformersChart');
    if (!container) return;

    // Datos simulados - en el futuro usar datos reales del endpoint
    const options = {
        series: [{
            data: [44, 55, 41, 37, 22, 43, 21]
        }],
        chart: {
            type: 'bar',
            height: 350
        },
        colors: ['#667eea'],
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: true,
            }
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: ['User A', 'User B', 'User C', 'User D', 'User E', 'User F', 'User G'],
        }
    };

    if (charts.topPerformers) {
        charts.topPerformers.destroy();
    }
    charts.topPerformers = new ApexCharts(container, options);
    charts.topPerformers.render();
}

/**
 * Renderiza el gráfico de rendimiento por área
 */
function renderAreaPerformanceChart() {
    const container = document.getElementById('areaPerformanceChart');
    if (!container) return;

    const options = {
        series: [{
            name: 'Requests',
            data: [31, 40, 28, 51, 42, 109, 100]
        }, {
            name: 'Cost (€)',
            data: [11, 32, 45, 32, 34, 52, 41]
        }],
        chart: {
            height: 350,
            type: 'area'
        },
        colors: ['#4facfe', '#f093fb'],
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth'
        },
        xaxis: {
            categories: ['Area A', 'Area B', 'Area C', 'Area D', 'Area E', 'Area F', 'Area G']
        }
    };

    if (charts.areaPerformance) {
        charts.areaPerformance.destroy();
    }
    charts.areaPerformance = new ApexCharts(container, options);
    charts.areaPerformance.render();
}

/**
 * Renderiza el gráfico de tiempos de aprobación
 */
function renderApprovalTimesChart() {
    const container = document.getElementById('approvalTimesChart');
    if (!container) return;

    const options = {
        series: [65, 75, 85, 45],
        chart: {
            type: 'radialBar',
            height: 300
        },
        plotOptions: {
            radialBar: {
                dataLabels: {
                    name: {
                        fontSize: '22px',
                    },
                    value: {
                        fontSize: '16px',
                    },
                    total: {
                        show: true,
                        label: 'Avg',
                        formatter: function (w) {
                            return '2.5h'
                        }
                    }
                }
            }
        },
        labels: ['< 1h', '1-4h', '4-24h', '> 24h'],
        colors: ['#4facfe', '#667eea', '#f093fb', '#ff6b6b']
    };

    if (charts.approvalTimes) {
        charts.approvalTimes.destroy();
    }
    charts.approvalTimes = new ApexCharts(container, options);
    charts.approvalTimes.render();
}

/**
 * Renderiza el gráfico de análisis de costos
 */
function renderCostAnalysisChart() {
    const container = document.getElementById('costAnalysisChart');
    if (!container) return;

    const options = {
        series: [{
            name: 'Total Cost',
            data: [2400, 1398, 9800, 3908, 4800, 3800, 4300]
        }],
        chart: {
            type: 'area',
            height: 300,
            sparkline: {
                enabled: false
            }
        },
        colors: ['#f093fb'],
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
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yaxis: {
            labels: {
                formatter: function (value) {
                    return '€' + value.toLocaleString();
                }
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

    try {
        const workbook = XLSX.utils.book_new();
        
        // Crear hoja de resumen
        const summaryData = [
            ['Weekly Performance Report'],
            ['Period', `${currentDateRange.start} to ${currentDateRange.end}`],
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
        const fileName = `weekly-performance-${currentDateRange.start}-to-${currentDateRange.end}.xlsx`;
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
    if (typeof jsPDF === 'undefined') {
        showErrorMessage('PDF library not loaded');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(20);
        doc.text('Weekly Performance Report', 20, 30);
        
        // Período
        doc.setFontSize(12);
        doc.text(`Period: ${currentDateRange.start} to ${currentDateRange.end}`, 20, 50);

        // Métricas principales
        let yPos = 70;
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
        const fileName = `weekly-performance-${currentDateRange.start}-to-${currentDateRange.end}.pdf`;
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

/**
 * Inicializa el selector de rango de fechas
 */
function initializeDateRangePicker() {
    $('#dateRange').daterangepicker({
        startDate: moment().subtract(7, 'days'),
        endDate: moment(),
        ranges: {
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
        locale: {
            format: 'DD/MM/YYYY'
        }
    }, function(start, end) {
        currentDateRange.start = start.format('YYYY-MM-DD');
        currentDateRange.end = end.format('YYYY-MM-DD');
        updateAllVisualizations();
    });
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
        initializeDateRangePicker();

        // Event listeners
        document.getElementById('refreshData')?.addEventListener('click', updateAllVisualizations);
        document.getElementById('exportExcel')?.addEventListener('click', exportToExcel);
        document.getElementById('exportPDF')?.addEventListener('click', exportToPDF);
        document.getElementById('printReport')?.addEventListener('click', printReport);

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