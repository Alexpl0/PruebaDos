/**
 * MÓDULO DE VISUALIZACIÓN Y PRONÓSTICO DE TENDENCIAS
 * Muestra la tendencia histórica de envíos y costos, y proyecta valores futuros.
 */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors, chartData } from '../configDashboard.js';

export function renderForecastChart() {
    const filteredData = getFilteredData();
    const monthlyData = {};

    // Agrupa los datos por mes
    filteredData.forEach(item => {
        if (item.date) {
            const date = new Date(item.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const cost = parseFloat(item.cost_euros || 0);
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = { count: 0, cost: 0 };
            }
            monthlyData[yearMonth].count++;
            monthlyData[yearMonth].cost += cost;
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    
    // Si no hay datos, limpia la gráfica y termina
    if (sortedMonths.length === 0) {
        if (charts.forecast) {
            charts.forecast.updateOptions({ series: [], xaxis: { categories: [] } });
        }
        return;
    }

    let categories = sortedMonths.map(ym => {
        const [year, month] = ym.split('-');
        return `${month}/${year}`;
    });
    let countData = sortedMonths.map(ym => monthlyData[ym].count);
    let costData = sortedMonths.map(ym => monthlyData[ym].cost);
    const historicalLength = sortedMonths.length;

    // Genera pronóstico si hay al menos 3 meses de datos
    if (historicalLength >= 3) {
        const lastThreeCountsAvg = countData.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const lastThreeCostsAvg = costData.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const lastDate = new Date(`${sortedMonths[historicalLength - 1]}-01`);

        for (let i = 1; i <= 3; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setMonth(lastDate.getMonth() + i);
            const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
            const nextYear = nextDate.getFullYear();
            categories.push(`${nextMonth}/${nextYear}`);
            countData.push(lastThreeCountsAvg);
            costData.push(lastThreeCostsAvg);
        }
    }

    // --- Guardar datos para la exportación a Excel ---
    chartData['forecast'] = {
        title: 'Shipments and Cost Forecast',
        headers: ['Month', 'Shipments', 'Cost (€)', 'Type'],
        data: categories.map((month, index) => [
            month,
            countData[index].toFixed(0),
            costData[index].toFixed(2),
            index < historicalLength ? 'Historical' : 'Forecast'
        ])
    };

    // Prepara los datos para las series de la gráfica, asegurando que la línea de pronóstico conecte
    const historicalCount = countData.slice(0, historicalLength);
    const forecastCount = Array(historicalLength - 1).fill(null).concat(countData.slice(historicalLength - 1));
    const historicalCost = costData.slice(0, historicalLength);
    const forecastCost = Array(historicalLength - 1).fill(null).concat(costData.slice(historicalLength - 1));
    
    const options = {
        chart: { height: 400, type: 'line', id: 'forecast' },
        title: { text: 'Shipments and Cost Forecast', align: 'left' },
        stroke: { width: [3, 3, 2, 2], curve: 'smooth', dashArray: [0, 5, 0, 5] },
        colors: [chartColors.primary, '#775DD0', chartColors.secondary, '#FFA500'],
        xaxis: { categories: categories, labels: { rotate: -45, rotateAlways: true } },
        yaxis: [
            { title: { text: 'Number of Shipments' }, min: 0 },
            { opposite: true, title: { text: 'Cost (€)' }, min: 0 }
        ],
        annotations: {
            xaxis: [{
                x: categories[historicalLength - 1],
                strokeDashArray: 2,
                borderColor: '#775DD0',
                label: {
                    borderColor: '#775DD0',
                    style: { color: '#fff', background: '#775DD0' },
                    text: 'Forecast'
                }
            }]
        },
        series: [
            { name: 'Shipments (Historical)', data: historicalCount },
            { name: 'Shipments (Forecast)', data: forecastCount },
            { name: 'Cost (Historical)', data: historicalCost },
            { name: 'Cost (Forecast)', data: forecastCost }
        ]
    };

    if (charts.forecast) {
        charts.forecast.updateOptions(options);
    } else {
        charts.forecast = new ApexCharts(document.getElementById('chartForecast'), options);
        charts.forecast.render();
    }
}
