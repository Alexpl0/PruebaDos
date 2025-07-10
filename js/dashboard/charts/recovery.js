/**
 * MÓDULO DE VISUALIZACIÓN DE ARCHIVOS DE RECUPERACIÓN
 * Muestra la distribución de registros que tienen recovery_file, 
 * indicando cuáles de ellos tienen también una evidencia de recuperación.
 */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartData } from '../configDashboard.js';

export function renderRecoveryFilesChart() {
    const filteredData = getFilteredData();

    // 1. Filtrar solo las órdenes que tienen un 'recovery_file'.
    // Este es nuestro nuevo universo de datos para la gráfica.
    const ordersWithRecoveryFile = filteredData.filter(item => item.recovery_file);

    const chartContainer = document.getElementById('chartRecoveryFiles');

    // Si no hay órdenes con recovery_file en el rango filtrado, 
    // mostramos un mensaje en lugar de una gráfica vacía.
    if (ordersWithRecoveryFile.length === 0) {
        if (charts.recoveryFiles) {
            charts.recoveryFiles.destroy();
            charts.recoveryFiles = null;
        }
        if (chartContainer) {
            chartContainer.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">No data available for Recovery Files Status.</div>`;
        }
        // Limpiar datos de exportación
        chartData['recoveryFiles'] = {
            title: 'Recovery Files Status',
            headers: ['Status', 'Number of Shipments'],
            data: [['No data available', '']]
        };
        return;
    }
    
    // Si previamente se mostró el mensaje de "No data", limpiamos el contenedor.
    if (chartContainer && !chartContainer.querySelector('.apexcharts-canvas')) {
        chartContainer.innerHTML = '';
    }


    // 2. De ese subconjunto, contamos cuántas tienen 'recovery_evidence'.
    const withEvidence = ordersWithRecoveryFile.filter(item => item.recovery_evidence).length;
    
    // 3. Calculamos cuántas no tienen 'recovery_evidence'.
    const withoutEvidence = ordersWithRecoveryFile.length - withEvidence;

    // 4. Preparamos los datos para la gráfica con las nuevas categorías.
    const data = [
        { name: 'With Recovery Evidence', value: withEvidence },
        { name: 'Without Recovery Evidence', value: withoutEvidence }
    ];

    const filteredChartData = data.filter(item => item.value > 0);
    const labels = filteredChartData.map(item => item.name);
    const series = filteredChartData.map(item => item.value);

    // --- Guardar datos para la exportación a Excel ---
    chartData['recoveryFiles'] = {
        title: 'Recovery Files Status',
        headers: ['Documentation Status', 'Number of Shipments'],
        data: filteredChartData.map(item => [item.name, item.value])
    };

    const options = {
        chart: { type: 'pie', height: 300, id: 'recoveryFiles' },
        title: { text: 'Recovery Files Status', align: 'left' },
        labels: labels,
        series: series,
        colors: ['#4CAF50', '#FFB74D'], // Verde para "con evidencia", Naranja para "sin evidencia"
        legend: { position: 'bottom' },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val + " orders";
                }
            }
        }
    };

    if (charts.recoveryFiles) {
        charts.recoveryFiles.updateOptions(options);
    } else {
        charts.recoveryFiles = new ApexCharts(chartContainer, options);
        charts.recoveryFiles.render();
    }
}
