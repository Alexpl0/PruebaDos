/**
 * CHARTS.JS - VISUALIZACIONES Y GRÁFICAS
 * Este módulo maneja todas las visualizaciones con ApexCharts,
 * incluyendo gráficos de tendencias, distribuciones y análisis.
 */

import { getWeeklyData, getCharts, setChart, COLOR_PALETTE, CHART_CONFIG } from './config.js';
import { formatNumber, isElementVisible } from './utils.js';

// ========================================================================
// RENDERIZADO DE GRÁFICAS PRINCIPALES
// ========================================================================

/**
 * Renderiza todas las gráficas del dashboard
 */
export function renderAllCharts() {
    const data = getWeeklyData();
    if (!data) {
        console.warn('No data available for chart rendering');
        return;
    }

    console.log('Rendering all charts with data:', data);

    renderTrendsChart();
    renderStatusChart(data);
    renderTopPerformersChart(data);
    renderAreaPerformanceChart(data);
    renderApprovalTimesChart(data);
    renderCostAnalysisChart(data);

    console.log('All charts rendered successfully');
}

/**
 * Renderiza el gráfico de tendencias semanales
 */
export function renderTrendsChart() {
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
            height: CHART_CONFIG.defaultHeight,
            type: 'line',
            toolbar: CHART_CONFIG.toolbar
        },
        colors: [COLOR_PALETTE.primary, COLOR_PALETTE.accent],
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
                fontFamily: CHART_CONFIG.fontFamily
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

    destroyExistingChart('trends');
    const chart = new ApexCharts(container, options);
    chart.render();
    setChart('trends', chart);
}

/**
 * Renderiza el gráfico de distribución de estados
 */
export function renderStatusChart(data) {
    const container = document.getElementById('statusChart');
    if (!container || !data) return;

    const options = {
        series: [
            data.total_approved || 0,
            data.total_pending || 0,
            data.total_rejected || 0
        ],
        chart: {
            type: 'donut',
            height: CHART_CONFIG.defaultHeight
        },
        labels: ['Approved', 'Pending', 'Rejected'],
        colors: [COLOR_PALETTE.success, COLOR_PALETTE.warning, COLOR_PALETTE.danger],
        legend: {
            position: 'bottom',
            fontFamily: CHART_CONFIG.fontFamily
        },
        plotOptions: {
            pie: {
                donut: {
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

    destroyExistingChart('status');
    const chart = new ApexCharts(container, options);
    chart.render();
    setChart('status', chart);
}

/**
 * Renderiza el gráfico de top performers
 */
export function renderTopPerformersChart(data) {
    const container = document.getElementById('topPerformersChart');
    if (!container || !data || !data.top_performers) return;

    const performers = data.top_performers || [];
    
    if (performers.length === 0) {
        showNoDataMessage(container, 'No data available for the selected period');
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
        colors: [COLOR_PALETTE.primary],
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
                    fontFamily: CHART_CONFIG.fontFamily
                }
            }
        },
        yaxis: {
            title: {
                text: 'Users',
                style: {
                    fontFamily: CHART_CONFIG.fontFamily
                }
            }
        },
        title: {
            text: 'Top Users by Approved Requests',
            align: 'left',
            style: {
                fontFamily: CHART_CONFIG.fontFamily,
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

    destroyExistingChart('topPerformers');
    const chart = new ApexCharts(container, options);
    chart.render();
    setChart('topPerformers', chart);
}

/**
 * Renderiza el gráfico de rendimiento por área
 */
export function renderAreaPerformanceChart(data) {
    const container = document.getElementById('areaPerformanceChart');
    if (!container || !data || !data.area_performance) return;

    const areas = data.area_performance || [];
    
    if (areas.length === 0) {
        showNoDataMessage(container, 'No data available for the selected period');
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
        colors: [COLOR_PALETTE.accent, COLOR_PALETTE.warning],
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
                    fontFamily: CHART_CONFIG.fontFamily
                }
            }
        },
        yaxis: [{
            title: {
                text: 'Number of Requests',
                style: {
                    fontFamily: CHART_CONFIG.fontFamily
                }
            }
        }, {
            opposite: true,
            title: {
                text: 'Total Cost (€)',
                style: {
                    fontFamily: CHART_CONFIG.fontFamily
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
                fontFamily: CHART_CONFIG.fontFamily,
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

    destroyExistingChart('areaPerformance');
    const chart = new ApexCharts(container, options);
    chart.render();
    setChart('areaPerformance', chart);
}

/**
 * Renderiza el gráfico de tiempos de aprobación
 */
export function renderApprovalTimesChart(data) {
    const container = document.getElementById('approvalTimesChart');
    if (!container || !data || !data.approval_times_distribution) return;

    const timeDistribution = data.approval_times_distribution || [];
    
    if (timeDistribution.length === 0) {
        showNoDataMessage(container, 'No approval time data available');
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
                        fontFamily: CHART_CONFIG.fontFamily
                    },
                    value: {
                        fontSize: '12px',
                        fontFamily: CHART_CONFIG.fontFamily,
                        formatter: function(val, opts) {
                            const count = counts[opts.seriesIndex] || 0;
                            return `${val}%\n(${count} orders)`;
                        }
                    },
                    total: {
                        show: true,
                        label: 'Total Orders',
                        fontSize: '12px',
                        fontFamily: CHART_CONFIG.fontFamily,
                        formatter: function (w) {
                            return `${total}`;
                        }
                    }
                }
            }
        },
        labels: categories,
        colors: [COLOR_PALETTE.success, COLOR_PALETTE.primary, COLOR_PALETTE.warning, COLOR_PALETTE.danger],
        title: {
            text: 'Time to Approval Distribution',
            align: 'center',
            style: {
                fontFamily: CHART_CONFIG.fontFamily,
                fontSize: '14px'
            }
        },
        subtitle: {
            text: 'How long it takes from request creation to approval',
            align: 'center',
            style: {
                fontFamily: CHART_CONFIG.fontFamily,
                fontSize: '12px',
                color: '#666'
            }
        },
        legend: {
            show: true,
            position: 'bottom',
            fontFamily: CHART_CONFIG.fontFamily,
            fontSize: '12px',
            formatter: function(seriesName, opts) {
                const count = counts[opts.seriesIndex] || 0;
                const percentage = percentages[opts.seriesIndex] || 0;
                return `${seriesName}: ${count} orders (${percentage}%)`;
            }
        }
    };

    destroyExistingChart('approvalTimes');
    const chart = new ApexCharts(container, options);
    chart.render();
    setChart('approvalTimes', chart);
}

/**
 * Renderiza el gráfico de análisis de costos
 */
export function renderCostAnalysisChart(data) {
    const container = document.getElementById('costAnalysisChart');
    if (!container || !data || !data.daily_costs) return;

    const dailyCosts = data.daily_costs || [];
    
    if (dailyCosts.length === 0) {
        showNoDataMessage(container, 'No cost data available for the selected period');
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
            toolbar: CHART_CONFIG.toolbar
        },
        colors: [COLOR_PALETTE.warning],
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
                    fontFamily: CHART_CONFIG.fontFamily
                }
            }
        },
        yaxis: {
            title: {
                text: 'Cost (€)',
                style: {
                    fontFamily: CHART_CONFIG.fontFamily
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
                fontFamily: CHART_CONFIG.fontFamily,
                fontSize: '14px'
            }
        },
        subtitle: {
            text: 'Shows the total cost of approved freight requests per day',
            align: 'left',
            style: {
                fontFamily: CHART_CONFIG.fontFamily,
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

    destroyExistingChart('costAnalysis');
    const chart = new ApexCharts(container, options);
    chart.render();
    setChart('costAnalysis', chart);
}

// ========================================================================
// FUNCIONES DE UTILIDAD PARA GRÁFICAS
// ========================================================================

/**
 * Destruye una gráfica existente si existe
 */
function destroyExistingChart(chartKey) {
    const charts = getCharts();
    if (charts[chartKey]) {
        charts[chartKey].destroy();
        delete charts[chartKey];
    }
}

/**
 * Muestra mensaje de "no hay datos" en un contenedor
 */
function showNoDataMessage(container, message = 'No data available') {
    container.innerHTML = `
        <div class="text-center p-4">
            <i class="fas fa-info-circle text-muted me-2"></i>
            ${message}
        </div>
    `;
}

/**
 * Verifica si una gráfica está completamente renderizada y lista para exportar
 */
export function isChartReady(chartId, chartObj) {
    const container = document.getElementById(chartId);
    
    if (!container || !isElementVisible(container)) {
        return false;
    }
    
    if (!chartObj || typeof chartObj.dataURI !== 'function') {
        return false;
    }
    
    // Verificar que el SVG tenga dimensiones válidas
    const svg = container.querySelector('svg');
    if (!svg) {
        return false;
    }
    
    const width = svg.getAttribute('width');
    const height = svg.getAttribute('height');
    
    if (!width || !height || width === 'NaN' || height === 'NaN' || width === '0' || height === '0') {
        return false;
    }
    
    return true;
}

/**
 * Espera a que una gráfica esté completamente renderizada
 */
export function waitForChartReady(chartId, chartObj, maxWait = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkReady = () => {
            if (isChartReady(chartId, chartObj)) {
                resolve(true);
                return;
            }
            
            if (Date.now() - startTime > maxWait) {
                console.warn(`Chart ${chartId} not ready after ${maxWait}ms`);
                resolve(false);
                return;
            }
            
            setTimeout(checkReady, 100);
        };
        
        checkReady();
    });
}

/**
 * Obtiene la imagen de una gráfica de forma segura
 */
export async function getChartImage(chartObj) {
    try {
        // Intentar obtener la imagen con diferentes opciones
        const options = [
            { pixelRatio: 2, scale: 2 },
            { pixelRatio: 1, scale: 1 },
            {}
        ];
        
        for (const option of options) {
            try {
                const dataUrlObj = await chartObj.dataURI(option);
                
                if (dataUrlObj && dataUrlObj.imgURI && dataUrlObj.imgURI.startsWith('data:image/')) {
                    // Verificar que la imagen se puede cargar
                    const isValid = await new Promise((resolve) => {
                        const testImg = new Image();
                        testImg.onload = () => resolve(true);
                        testImg.onerror = () => resolve(false);
                        testImg.src = dataUrlObj.imgURI;
                        
                        // Timeout de 3 segundos
                        setTimeout(() => resolve(false), 3000);
                    });
                    
                    if (isValid) {
                        return dataUrlObj.imgURI;
                    }
                }
            } catch (optionError) {
                console.warn('Failed to get chart image with option:', option, optionError);
                continue;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting chart image:', error);
        return null;
    }
}

// ========================================================================
// FUNCIONES DE REDIMENSIONAMIENTO
// ========================================================================

/**
 * Redimensiona todas las gráficas
 */
export function resizeAllCharts() {
    const charts = getCharts();
    
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
            chart.resize();
        }
    });
}

/**
 * Destruye todas las gráficas
 */
export function destroyAllCharts() {
    const charts = getCharts();
    
    Object.keys(charts).forEach(chartKey => {
        destroyExistingChart(chartKey);
    });
}