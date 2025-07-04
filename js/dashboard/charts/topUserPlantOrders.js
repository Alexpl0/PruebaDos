/* === Archivo: js/charts/topUserPlantOrders.js === */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartData } from '../configDashboard.js';

export function renderTopUserPlantOrdersChart(containerId = 'topUserPlantOrdersChart') {
    const data = getFilteredData();
    const userCounts = {};
    const plantCounts = {};

    data.forEach(item => {
        const user = item.creator_name || 'Desconocido';
        const plant = item.planta || 'Desconocida';
        userCounts[user] = (userCounts[user] || 0) + 1;
        plantCounts[plant] = (plantCounts[plant] || 0) + 1;
    });

    const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0] || ['Sin datos', 0];
    const topPlant = Object.entries(plantCounts).sort((a, b) => b[1] - a[1])[0] || ['Sin datos', 0];

    const categories = ['Top User', 'Top Plant'];
    const seriesData = [topUser[1], topPlant[1]];
    const labels = [topUser[0], topPlant[0]];

    // --- Guardar datos para exportación ---
    chartData['topUserPlant'] = {
        title: 'Top User and Plant by Orders',
        headers: ['Category', 'Name', 'Total Orders'],
        data: [
            ['Top User', topUser[0], topUser[1]],
            ['Top Plant', topPlant[0], topPlant[1]]
        ]
    };

    const options = {
        chart: { type: 'bar', height: 320, toolbar: { show: false }, id: 'topUserPlantOrders' },
        title: { text: 'Top User and Plant by Orders Generated', align: 'center' },
        plotOptions: { bar: { horizontal: false, columnWidth: '50%', distributed: true } },
        dataLabels: { enabled: true, formatter: (val, opts) => labels[opts.dataPointIndex], style: { fontSize: '14px' } },
        xaxis: { categories: categories, labels: { style: { fontSize: '14px' } } },
        yaxis: { title: { text: 'Órdenes generadas' } },
        series: [{ name: 'Órdenes', data: seriesData }],
        colors: ['#008FFB', '#00E396'],
        tooltip: { y: { formatter: (val, opts) => `${labels[opts.dataPointIndex]}: ${val} órdenes` } }
    };

    if (charts[containerId]) {
        charts[containerId].updateOptions(options);
    } else {
        const chart = new ApexCharts(document.getElementById(containerId), options);
        chart.render();
        charts[containerId] = chart;
    }
}

