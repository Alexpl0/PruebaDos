/**
 * MÓDULO DE VISUALIZACIÓN DE COSTOS DE RECUPERACIÓN
 * Muestra una gráfica de barras con dos categorías:
 * 1. Costo de órdenes sin recovery file (barra simple)
 * 2. Costo de órdenes con recovery file (barra apilada: pendientes + recuperadas)
 */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartData } from '../configDashboard.js';
import { formatNumber } from '../utilsDashboard.js';

export function renderRecoveryFilesChart() {
    const filteredData = getFilteredData();
    const chartContainer = document.getElementById('chartRecoveryFiles');

    // 1. CALCULAR DATOS PARA LA GRÁFICA
    
    // Órdenes SIN recovery file
    const ordersWithoutRecoveryFile = filteredData.filter(item => !item.recovery_file);
    const costWithoutRecovery = ordersWithoutRecoveryFile.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
    
    // Órdenes CON recovery file
    const ordersWithRecoveryFile = filteredData.filter(item => item.recovery_file);
    const costWithRecovery = ordersWithRecoveryFile.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
    
    // Órdenes CON recovery file Y CON recovery evidence (recuperadas)
    const ordersRecovered = ordersWithRecoveryFile.filter(item => item.recovery_evidence);
    const costRecovered = ordersRecovered.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
    
    // Costo pendiente de recuperar
    const costPending = costWithRecovery - costRecovered;

    // Verificar si hay datos
    if (filteredData.length === 0) {
        if (charts.recoveryFiles) {
            charts.recoveryFiles.destroy();
            charts.recoveryFiles = null;
        }
        
        if (chartContainer) {
            chartContainer.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">No data available for Recovery Analysis.</div>`;
        }
        
        chartData['recoveryFiles'] = {
            title: 'Recovery Cost Analysis',
            headers: ['Category', 'Cost (€)', 'Orders Count'],
            data: [['No data available', '', '']]
        };
        return;
    }

    // Limpiar contenedor si previamente tenía mensaje de "No data"
    if (chartContainer && !chartContainer.querySelector('.apexcharts-canvas')) {
        chartContainer.innerHTML = '';
    }

    // 2. CONFIGURACIÓN DE LA GRÁFICA COMBINADA
    const options = {
        chart: { 
            type: 'bar', 
            height: 400, 
            id: 'recoveryFiles',
            stacked: true,
            toolbar: { show: true }
        },
        title: { 
            text: 'Recovery Cost Analysis - Orders Comparison', 
            align: 'left',
            style: { fontSize: '18px', fontWeight: 'bold' }
        },
        series: [
            {
                name: 'Orders Without Recovery (€)',
                data: [costWithoutRecovery, 0], // Solo en la primera categoría
                stack: 'without-recovery'
            },
            {
                name: 'Pending Recovery (€)',
                data: [0, costPending], // Solo en la segunda categoría
                stack: 'with-recovery'
            },
            {
                name: 'Successfully Recovered (€)',
                data: [0, costRecovered], // Solo en la segunda categoría
                stack: 'with-recovery'
            }
        ],
        xaxis: {
            categories: ['Orders Without Recovery', 'Orders With Recovery'],
            title: { text: 'Recovery Categories' }
        },
        yaxis: {
            title: { text: 'Cost in Euros (€)' },
            labels: {
                formatter: function (val) {
                    return '€' + formatNumber(val, 0);
                }
            }
        },
        colors: [
            '#FF6B6B', // Rojo para órdenes sin recovery
            'rgba(255, 193, 7, 0.6)', // Amarillo transparente para pendientes
            '#28A745' // Verde sólido para recuperadas
        ],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '65%'
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val > 0 ? '€' + formatNumber(val, 0) : '';
            },
            style: {
                fontSize: '11px',
                colors: ["#FFFFFF"],
                fontWeight: 'bold'
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'center',
            offsetY: -10
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: function (val) {
                    return val > 0 ? '€' + formatNumber(val, 2) : '';
                }
            }
        },
        grid: {
            borderColor: '#e7e7e7',
            row: {
                colors: ['#f3f3f3', 'transparent'],
                opacity: 0.5
            }
        }
    };

    // 3. RENDERIZAR/ACTUALIZAR LA GRÁFICA
    if (charts.recoveryFiles) {
        charts.recoveryFiles.updateOptions(options);
    } else if (chartContainer) {
        charts.recoveryFiles = new ApexCharts(chartContainer, options);
        charts.recoveryFiles.render();
    }

    // 4. GUARDAR DATOS PARA EXPORTACIÓN
    chartData['recoveryFiles'] = {
        title: 'Recovery Cost Analysis',
        headers: ['Category', 'Cost (€)', 'Orders Count', 'Details'],
        data: [
            ['Orders Without Recovery', formatNumber(costWithoutRecovery, 2), ordersWithoutRecoveryFile.length, 'Orders that do not require recovery documentation'],
            ['Orders With Recovery (Total)', formatNumber(costWithRecovery, 2), ordersWithRecoveryFile.length, 'Orders that require recovery documentation'],
            ['- Successfully Recovered', formatNumber(costRecovered, 2), ordersRecovered.length, 'Orders with both recovery file and evidence'],
            ['- Pending Recovery', formatNumber(costPending, 2), ordersWithRecoveryFile.length - ordersRecovered.length, 'Orders with recovery file but missing evidence']
        ]
    };
}
