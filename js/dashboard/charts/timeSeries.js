/* === Archivo: js/charts/timeSeries.js === */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors, chartData } from '../configDashboard.js';
import { formatNumber } from '../utilsDashboard.js';

export function renderTimeSeriesChart() {
    const filteredData = getFilteredData();
    const monthlyData = {};

    filteredData.forEach(item => {
        if (item.date) {
            const date = new Date(item.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const cost = parseFloat(item.cost_euros || 0);
            const isInternal = (item.int_ext || '').includes('INTERNAL');
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = { count: 0, cost: 0, internalCount: 0, externalCount: 0 };
            }
            monthlyData[yearMonth].count++;
            monthlyData[yearMonth].cost += cost;
            if (isInternal) monthlyData[yearMonth].internalCount++;
            else monthlyData[yearMonth].externalCount++;
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    if (sortedMonths.length === 0) {
        if (charts.timeSeries) charts.timeSeries.updateOptions({ series: [], xaxis: { categories: [] } });
        return;
    }

    const categories = sortedMonths.map(ym => {
        const [year, month] = ym.split('-');
        return `${month}/${year}`;
    });
    const internalData = sortedMonths.map(ym => monthlyData[ym].internalCount);
    const externalData = sortedMonths.map(ym => monthlyData[ym].externalCount);
    const costData = sortedMonths.map(ym => monthlyData[ym].cost);

    // --- Guardar datos para exportación ---
    chartData['timeSeries'] = {
        title: 'Shipments and Cost Trend',
        headers: ['Month', 'Internal Shipments', 'External Shipments', 'Total Cost (€)'],
        data: categories.map((month, index) => [
            month,
            internalData[index],
            externalData[index],
            costData[index].toFixed(2)
        ])
    };

    const options = {
        chart: { type: 'line', height: 350, stacked: false, id: 'timeSeries' },
        title: { text: 'Shipments and Costs Trend', align: 'center' },
        stroke: { width: [1, 1, 4], curve: 'smooth' },
        xaxis: { categories: categories, labels: { rotate: -45, rotateAlways: true } },
        yaxis: [
            { title: { text: "Number of Shipments" }, min: 0, labels: { formatter: val => formatNumber(val, 0) } },
            { opposite: true, title: { text: "Total Cost (€)" }, min: 0, labels: { formatter: val => `€${formatNumber(val, 0)}` } }
        ],
        tooltip: { shared: true, intersect: false, y: [ { formatter: y => `${y.toFixed(0)} shipments` }, { formatter: y => `${y.toFixed(0)} shipments` }, { formatter: y => `€${formatNumber(y, 2)}` } ] },
        colors: ['#4472C4', '#A5A5A5', '#ED7D31'],
        series: [
            { name: 'Internal Shipments', type: 'column', data: internalData },
            { name: 'External Shipments', type: 'column', data: externalData },
            { name: 'Total Cost (€)', type: 'line', data: costData }
        ]
    };

    if (charts.timeSeries) {
        charts.timeSeries.updateOptions(options);
    } else {
        charts.timeSeries = new ApexCharts(document.getElementById('chartTimeSeries'), options);
        charts.timeSeries.render();
    }
}

export function renderCorrelationChart() {
    const filteredData = getFilteredData();
    const scatterData = [];

    filteredData.forEach(item => {
        if (item.weight && item.cost_euros) {
            const weight = parseFloat(item.weight);
            const cost = parseFloat(item.cost_euros);
            if (!isNaN(weight) && !isNaN(cost) && weight > 0 && cost > 0) {
                scatterData.push({
                    x: weight,
                    y: cost,
                    id: item.id,
                    transport: item.transport || 'Unspecified',
                    description: item.description || 'No description'
                });
            }
        }
    });
    
    if (scatterData.length === 0) {
        if (charts.correlation) charts.correlation.updateOptions({ series: [] });
        return;
    }

    const transportTypes = [...new Set(scatterData.map(item => item.transport))];
    const seriesData = transportTypes.map(transport => ({
        name: transport,
        data: scatterData.filter(item => item.transport === transport).map(item => ({
            x: item.x, y: item.y, id: item.id, description: item.description
        }))
    }));

    // --- Guardar datos para exportación ---
    chartData['correlation'] = {
        title: 'Weight vs Cost Correlation',
        headers: ['ID', 'Weight (kg)', 'Cost (€)', 'Transport', 'Description'],
        data: scatterData.map(item => [
            item.id,
            item.x,
            item.y,
            item.transport,
            item.description
        ])
    };

    const options = {
        chart: { height: 400, type: 'scatter', zoom: { enabled: true, type: 'xy' }, id: 'correlation' },
        title: { text: 'Correlation between Weight and Cost', align: 'left' },
        xaxis: { title: { text: 'Weight (kg)' }, tickAmount: 10 },
        yaxis: { title: { text: 'Cost (€)' }, tickAmount: 10, labels: { formatter: val => `€${formatNumber(val, 0)}` } },
        tooltip: { custom: ({series, seriesIndex, dataPointIndex, w}) => {
            const data = w.config.series[seriesIndex].data[dataPointIndex];
            return `<div class="p-2"><b>ID:</b> ${data.id}<br><b>Transport:</b> ${w.config.series[seriesIndex].name}<br><b>Weight:</b> ${data.x} kg<br><b>Cost:</b> €${formatNumber(data.y, 2)}<br><small>${data.description}</small></div>`;
        }},
        series: seriesData
    };

    if (charts.correlation) {
        charts.correlation.updateOptions(options);
    } else {
        charts.correlation = new ApexCharts(document.getElementById('chartCorrelation'), options);
        charts.correlation.render();
    }
}
