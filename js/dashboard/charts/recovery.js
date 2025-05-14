// Gráfico de recovery files

import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Genera o actualiza el gráfico de archivos de recovery
 */
export function renderRecoveryFilesChart() {
    console.log("[DEBUG] renderRecoveryFilesChart:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    // Contar diferentes combinaciones de archivos de recovery
    const withRecoveryFile = filteredData.filter(item => item.recovery_file).length;
    const withEvidence = filteredData.filter(item => item.recovery_evidence).length;
    const withBoth = filteredData.filter(item => item.recovery_file && item.recovery_evidence).length;
    const total = filteredData.length;
    
    const data = [
        { name: 'Solo Recovery File', value: withRecoveryFile - withBoth },
        { name: 'Solo Evidence', value: withEvidence - withBoth },
        { name: 'Recovery File y Evidence', value: withBoth },
        { name: 'Sin Recovery ni Evidence', value: total - withRecoveryFile - withEvidence + withBoth }
    ];
    
    // Filtrar categorías con valor 0
    const filteredChartData = data.filter(item => item.value > 0);
    
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