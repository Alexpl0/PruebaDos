/**
 * MÓDULO DE ANÁLISIS DE PARETO PARA CAUSAS DE INCIDENCIAS
 * Muestra las principales causas de incidencias y su porcentaje acumulativo.
 */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors, chartData } from '../configDashboard.js';
import { formatNumber } from '../utilsDashboard.js';

export function renderCausesChart() {
    const filteredData = getFilteredData();
    const causesData = {};
    filteredData.forEach(item => {
        const cause = item.category_cause || 'Unspecified';
        causesData[cause] = (causesData[cause] || 0) + 1;
    });

    // Ordena y limita a las 10 causas principales
    const sortedCauses = Object.entries(causesData).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const total = sortedCauses.reduce((sum, [_, count]) => sum + count, 0);
    let cumulative = 0;
    const categories = [];
    const counts = [];
    const cumulativePercentage = [];

    sortedCauses.forEach(([cause, count]) => {
        let translatedCause = cause === 'Sin especificar' ? 'Unspecified' : cause;
        categories.push(translatedCause);
        counts.push(count);
        cumulative += count;
        cumulativePercentage.push((cumulative / total) * 100);
    });

    // --- Guardar datos para la exportación a Excel ---
    chartData['causesPareto'] = {
        title: 'Pareto Analysis Causes',
        headers: ['Cause', 'Incidents Count', 'Cumulative %'],
        data: categories.map((cause, index) => [
            cause,
            counts[index],
            cumulativePercentage[index].toFixed(2) + '%'
        ])
    };

    // Configuración de la gráfica
    const options = {
        chart: { type: 'line', height: 350, stacked: false, id: 'causes' },
        title: { text: 'Pareto Analysis: Main Causes', align: 'center' },
        stroke: { width: [0, 4], curve: 'smooth' },
        xaxis: { categories: categories, labels: { rotate: -45, rotateAlways: true, style: { fontSize: '11px' } } },
        yaxis: [
            { title: { text: 'Count' }, min: 0, labels: { formatter: val => formatNumber(val, 0) } },
            { opposite: true, title: { text: 'Cumulative Percentage' }, min: 0, max: 100, labels: { formatter: val => val.toFixed(0) + '%' } }
        ],
        tooltip: { shared: true, intersect: false, y: [ { formatter: y => y.toFixed(0) + " incidents" }, { formatter: y => y.toFixed(1) + "%" } ] },
        legend: { horizontalAlign: 'left', offsetX: 40 },
        colors: [chartColors.primary, '#FFA500'],
        series: [
            { name: 'Count', type: 'column', data: counts },
            { name: 'Cumulative %', type: 'line', data: cumulativePercentage }
        ]
    };

    // Renderiza o actualiza la gráfica
    if (charts.causes) {
        charts.causes.updateOptions(options);
    } else {
        charts.causes = new ApexCharts(document.getElementById('chartCauses'), options);
        charts.causes.render();
    }
}
