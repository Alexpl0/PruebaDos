/**
 * MÓDULO DE VISUALIZACIÓN DE TIPOS DE TRANSPORTE
 * Muestra la cantidad de envíos y el costo promedio por tipo de transporte.
 */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors, chartData } from '../configDashboard.js';
import { formatNumber } from '../utilsDashboard.js';

export function renderTransportChart() {
    const filteredData = getFilteredData();
    const transportData = {};
    const costByTransport = {};

    // Agrupa los datos por método de transporte y suma los costos
    filteredData.forEach(item => {
        const transport = item.transport || 'Unspecified';
        const cost = parseFloat(item.cost_euros || 0);
        if (!transportData[transport]) {
            transportData[transport] = 0;
            costByTransport[transport] = 0;
        }
        transportData[transport]++;
        costByTransport[transport] += cost;
    });

    const categories = Object.keys(transportData);
    const countData = Object.values(transportData);
    
    // Calcula el costo promedio para cada método
    const avgCostData = categories.map(transport => {
        const totalCost = costByTransport[transport];
        const totalCount = transportData[transport];
        return totalCount > 0 ? parseFloat((totalCost / totalCount).toFixed(2)) : 0;
    });

    // --- Guardar datos para la exportación a Excel ---
    chartData['transport'] = {
        title: 'Transportation Analysis',
        headers: ['Transport Method', 'Number of Shipments', 'Average Cost (€)'],
        data: categories.map((transport, index) => [
            transport,
            countData[index],
            avgCostData[index]
        ])
    };

    // Configuración de la gráfica
    const options = {
        chart: { type: 'bar', height: 350, id: 'transport' },
        title: { text: 'Transportation Methods', align: 'left' },
        plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
        dataLabels: { enabled: false },
        xaxis: { categories: categories },
        yaxis: [
            { 
                title: { text: 'Quantity' }, 
                labels: { formatter: val => formatNumber(val, 0) } 
            },
            { 
                opposite: true, 
                title: { text: 'Average Cost (€)' }, 
                labels: { formatter: val => `€${formatNumber(val, 2)}` } 
            }
        ],
        tooltip: { 
            shared: true, 
            intersect: false, 
            y: [
                { formatter: y => `${y.toFixed(0)} shipments` }, 
                { formatter: y => `€${formatNumber(y, 2)}` }
            ] 
        },
        colors: [chartColors.primary, '#FF7043'],
        series: [
            { name: 'Quantity', data: countData },
            { name: 'Average Cost (€)', data: avgCostData }
        ]
    };

    // Renderiza o actualiza la gráfica
    if (charts.transport) {
        charts.transport.updateOptions(options);
    } else {
        charts.transport = new ApexCharts(document.getElementById('chartTransport'), options);
        charts.transport.render();
    }
}
