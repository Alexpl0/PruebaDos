/**
 * MÓDULO DE VISUALIZACIÓN DE ARCHIVOS DE RECUPERACIÓN
 * Muestra la distribución de registros según la presencia de archivos de recuperación y evidencias.
 */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors, chartData } from '../configDashboard.js';

export function renderRecoveryFilesChart() {
    const filteredData = getFilteredData();
    const withRecoveryFile = filteredData.filter(item => item.recovery_file).length;
    const withEvidence = filteredData.filter(item => item.recovery_evidence).length;
    const withBoth = filteredData.filter(item => item.recovery_file && item.recovery_evidence).length;
    const total = filteredData.length;

    const data = [
        { name: 'Recovery File Only', value: withRecoveryFile - withBoth },
        { name: 'Evidence Only', value: withEvidence - withBoth },
        { name: 'Recovery File and Evidence', value: withBoth },
        { name: 'No Documentation', value: total - withRecoveryFile - withEvidence + withBoth }
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
        colors: ['#FFB74D', '#2196F3', '#4CAF50', '#E53935'],
        legend: { position: 'bottom' }
    };

    if (charts.recoveryFiles) {
        charts.recoveryFiles.updateOptions(options);
    } else {
        charts.recoveryFiles = new ApexCharts(document.getElementById('chartRecoveryFiles'), options);
        charts.recoveryFiles.render();
    }
}
