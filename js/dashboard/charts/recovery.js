/**
 * MÓDULO DE VISUALIZACIÓN DE COSTOS DE RECUPERACIÓN
 * Muestra dos gráficas de barras:
 * 1. Costo de órdenes sin recovery file
 * 2. Comparación de costos: órdenes con recovery file vs órdenes recuperadas
 */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartData } from '../configDashboard.js';
import { formatNumber } from '../utilsDashboard.js';

export function renderRecoveryFilesChart() {
    const filteredData = getFilteredData();

    // Contenedores para las dos gráficas
    const chartContainer1 = document.getElementById('chartRecoveryFiles');
    const chartContainer2 = document.getElementById('chartRecoveryFilesStacked'); // Necesitarás agregar este div en el HTML

    // 1. CALCULAR DATOS PARA AMBAS GRÁFICAS
    
    // Órdenes SIN recovery file
    const ordersWithoutRecoveryFile = filteredData.filter(item => !item.recovery_file);
    const costWithoutRecovery = ordersWithoutRecoveryFile.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
    
    // Órdenes CON recovery file
    const ordersWithRecoveryFile = filteredData.filter(item => item.recovery_file);
    const costWithRecovery = ordersWithRecoveryFile.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
    
    // Órdenes CON recovery file Y CON recovery evidence (recuperadas)
    const ordersRecovered = ordersWithRecoveryFile.filter(item => item.recovery_evidence);
    const costRecovered = ordersRecovered.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);

    // Verificar si hay datos
    if (filteredData.length === 0) {
        // Limpiar ambas gráficas si no hay datos
        if (charts.recoveryFiles) {
            charts.recoveryFiles.destroy();
            charts.recoveryFiles = null;
        }
        if (charts.recoveryFilesStacked) {
            charts.recoveryFilesStacked.destroy();
            charts.recoveryFilesStacked = null;
        }
        
        if (chartContainer1) {
            chartContainer1.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">No data available for Recovery Analysis.</div>`;
        }
        if (chartContainer2) {
            chartContainer2.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">No data available for Recovery Analysis.</div>`;
        }
        
        // Limpiar datos de exportación
        chartData['recoveryFiles'] = {
            title: 'Recovery Cost Analysis',
            headers: ['Category', 'Cost (€)', 'Orders Count'],
            data: [['No data available', '', '']]
        };
        return;
    }

    // Limpiar contenedores si previamente tenían mensajes de "No data"
    if (chartContainer1 && !chartContainer1.querySelector('.apexcharts-canvas')) {
        chartContainer1.innerHTML = '';
    }
    if (chartContainer2 && !chartContainer2.querySelector('.apexcharts-canvas')) {
        chartContainer2.innerHTML = '';
    }

    // 2. GRÁFICA 1: ÓRDENES SIN RECOVERY (Barras simples)
    const options1 = {
        chart: { 
            type: 'bar', 
            height: 300, 
            id: 'recoveryFiles',
            toolbar: { show: true }
        },
        title: { 
            text: 'Orders Without Recovery File - Cost Analysis', 
            align: 'left',
            style: { fontSize: '16px', fontWeight: 'bold' }
        },
        series: [{
            name: 'Cost (€)',
            data: [costWithoutRecovery]
        }],
        xaxis: {
            categories: ['Orders Without Recovery'],
            title: { text: 'Category' }
        },
        yaxis: {
            title: { text: 'Cost in Euros (€)' },
            labels: {
                formatter: function (val) {
                    return '€' + formatNumber(val, 0);
                }
            }
        },
        colors: ['#FF6B6B'], // Rojo para indicar órdenes sin recovery
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '50%',
                dataLabels: {
                    position: 'top'
                }
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return '€' + formatNumber(val, 0);
            },
            offsetY: -20,
            style: {
                fontSize: '12px',
                colors: ["#304758"]
            }
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return '€' + formatNumber(val, 2);
                }
            }
        }
    };

    // 3. GRÁFICA 2: ÓRDENES CON RECOVERY (Barras apiladas)
    const options2 = {
        chart: { 
            type: 'bar', 
            height: 300, 
            id: 'recoveryFilesStacked',
            stacked: true,
            toolbar: { show: true }
        },
        title: { 
            text: 'Recovery Process - Cost Comparison', 
            align: 'left',
            style: { fontSize: '16px', fontWeight: 'bold' }
        },
        series: [
            {
                name: 'Pending Recovery (€)',
                data: [costWithRecovery - costRecovered] // Costo pendiente de recuperar
            },
            {
                name: 'Successfully Recovered (€)',
                data: [costRecovered] // Costo ya recuperado
            }
        ],
        xaxis: {
            categories: ['Orders With Recovery File'],
            title: { text: 'Recovery Status' }
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
            'rgba(255, 193, 7, 0.4)', // Amarillo transparente para pendientes
            '#28A745' // Verde sólido para recuperadas
        ],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '60%'
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val > 0 ? '€' + formatNumber(val, 0) : '';
            },
            style: {
                fontSize: '11px',
                colors: ["#FFFFFF"]
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'center'
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return '€' + formatNumber(val, 2);
                }
            }
        }
    };

    // 4. RENDERIZAR/ACTUALIZAR LAS GRÁFICAS
    if (charts.recoveryFiles) {
        charts.recoveryFiles.updateOptions(options1);
    } else if (chartContainer1) {
        charts.recoveryFiles = new ApexCharts(chartContainer1, options1);
        charts.recoveryFiles.render();
    }

    if (charts.recoveryFilesStacked) {
        charts.recoveryFilesStacked.updateOptions(options2);
    } else if (chartContainer2) {
        charts.recoveryFilesStacked = new ApexCharts(chartContainer2, options2);
        charts.recoveryFilesStacked.render();
    }

    // 5. GUARDAR DATOS PARA EXPORTACIÓN
    chartData['recoveryFiles'] = {
        title: 'Recovery Cost Analysis',
        headers: ['Category', 'Cost (€)', 'Orders Count', 'Details'],
        data: [
            ['Orders Without Recovery', formatNumber(costWithoutRecovery, 2), ordersWithoutRecoveryFile.length, 'Orders that do not require recovery documentation'],
            ['Orders With Recovery (Total)', formatNumber(costWithRecovery, 2), ordersWithRecoveryFile.length, 'Orders that require recovery documentation'],
            ['Orders Successfully Recovered', formatNumber(costRecovered, 2), ordersRecovered.length, 'Orders with both recovery file and evidence'],
            ['Orders Pending Recovery', formatNumber(costWithRecovery - costRecovered, 2), ordersWithRecoveryFile.length - ordersRecovered.length, 'Orders with recovery file but missing evidence']
        ]
    };
}
