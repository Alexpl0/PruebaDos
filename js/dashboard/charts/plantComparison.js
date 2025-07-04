/* === Archivo: js/charts/plantComparison.js === */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors, chartData } from '../configDashboard.js';

export function renderPlantComparison() {
    const filteredData = getFilteredData();
    const plantCounts = {};
    filteredData.forEach(item => {
        const planta = item.planta || 'Unspecified';
        plantCounts[planta] = (plantCounts[planta] || 0) + 1;
    });

    const topPlantas = Object.entries(plantCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([planta]) => planta);
    
    const metrics = [
        { name: "Records", getValue: data => data.length },
        { name: "Average Cost (€)", getValue: data => data.length > 0 ? data.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0) / data.length : 0 },
        { name: "% Internal", getValue: data => data.length > 0 ? (data.filter(item => (item.int_ext || '').includes('INTERNAL')).length / data.length) * 100 : 0 },
        { name: "Approval Time (days)", getValue: data => {
            const items = data.filter(item => item.date && item.approval_date);
            if (items.length === 0) return 0;
            const totalTime = items.reduce((sum, item) => sum + Math.ceil(Math.abs(new Date(item.approval_date) - new Date(item.date)) / (1000 * 60 * 60 * 24)), 0);
            return totalTime / items.length;
        }},
        { name: "Average Weight (kg)", getValue: data => data.length > 0 ? data.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0) / data.length : 0 }
    ];

    const series = topPlantas.map(planta => {
        const plantaData = filteredData.filter(item => item.planta === planta);
        return { planta: planta, values: metrics.map(metric => ({ metric: metric.name, rawValue: metric.getValue(plantaData) })) };
    });

    // --- ¡NUEVO! Guardar datos para exportación ---
    chartData['plantComparison'] = {
        title: 'Plant Comparison',
        headers: ['Plant', ...metrics.map(m => m.name)],
        data: series.map(s => [s.planta, ...s.values.map(v => v.rawValue.toFixed(2))])
    };

    const apexSeries = series.map(s => ({
        name: s.planta,
        data: s.values.map(v => { // Normalization logic here for chart display
            const allValues = series.map(s2 => s2.values.find(v2 => v2.metric === v.metric).rawValue);
            const max = Math.max(...allValues);
            if (v.metric.includes("Cost") || v.metric.includes("Time")) {
                return max ? (1 - (v.rawValue / max)) * 100 : 0;
            }
            return max ? (v.rawValue / max) * 100 : 0;
        })
    }));

    const options = {
        chart: { height: 450, type: 'radar', id: 'plantComparison' },
        title: { text: 'Plant Comparison', align: 'left' },
        series: apexSeries,
        labels: metrics.map(m => m.name),
        colors: chartColors.palette.slice(0, 5),
        tooltip: { y: { formatter: (val, { seriesIndex, dataPointIndex }) => {
            const rawValue = series[seriesIndex].values[dataPointIndex].rawValue;
            const metricName = metrics[dataPointIndex].name;
            if (metricName.includes("€")) return `€${rawValue.toFixed(2)}`;
            if (metricName.includes("%")) return `${rawValue.toFixed(1)}%`;
            if (metricName.includes("days")) return `${rawValue.toFixed(1)} days`;
            if (metricName.includes("kg")) return `${rawValue.toFixed(1)} kg`;
            return rawValue.toLocaleString();
        }}},
        yaxis: { labels: { formatter: val => val.toFixed(0) } }
    };
    
    if (charts.plantComparison) {
        charts.plantComparison.updateOptions(options);
    } else {
        charts.plantComparison = new ApexCharts(document.getElementById('plantComparisonChart'), options);
        charts.plantComparison.render();
    }
}
