/* === Archivo: js/charts/forecast.js === */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors, chartData } from '../configDashboard.js';

export function renderForecastChart() {
    const filteredData = getFilteredData();
    const monthlyData = {};

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
    let categories = sortedMonths.map(ym => {
        const [year, month] = ym.split('-');
        return `${month}/${year}`;
    });
    let countData = sortedMonths.map(ym => monthlyData[ym].count);
    let costData = sortedMonths.map(ym => monthlyData[ym].cost);
    const historicalLength = sortedMonths.length;

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

    // --- ¡NUEVO! Guardar datos para exportación ---
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
                x2: categories[historicalLength],
                fillColor: '#B3F7CA',
                label: { text: 'Forecast' },
                opacity: 0.2
            }]
        },
        series: [
            { name: 'Shipments (Historical)', type: 'line', data: countData.slice(0, historicalLength) },
            { name: 'Shipments (Forecast)', type: 'line', data: Array(historicalLength -1).fill(null).concat(countData.slice(historicalLength-1)) },
            { name: 'Cost (Historical)', type: 'line', data: costData.slice(0, historicalLength) },
            { name: 'Cost (Forecast)', type: 'line', data: Array(historicalLength-1).fill(null).concat(costData.slice(historicalLength-1)) }
        ]
    };

    if (charts.forecast) {
        charts.forecast.updateOptions(options);
    } else {
        charts.forecast = new ApexCharts(document.getElementById('chartForecast'), options);
        charts.forecast.render();
    }
}
