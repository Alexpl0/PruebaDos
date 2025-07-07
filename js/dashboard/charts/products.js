/**
 * MÓDULO DE VISUALIZACIÓN DE PRODUCTOS
 * Muestra los 10 productos con más incidentes en un gráfico de barras horizontales.
 */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors, chartData } from '../configDashboard.js';

export function renderProductsChart() {
    const filteredData = getFilteredData();
    const productsData = {};
    filteredData.forEach(item => {
        const product = item.products || 'Unspecified';
        productsData[product] = (productsData[product] || 0) + 1;
    });

    const topProducts = Object.entries(productsData).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const categories = topProducts.map(([product, _]) => product === 'Sin especificar' ? 'Unspecified' : product);
    const data = topProducts.map(([_, count]) => count);

    // --- Guardar datos para la exportación a Excel ---
    chartData['topProducts'] = {
        title: 'Top 10 Products by Incidents',
        headers: ['Product', 'Number of Incidents'],
        data: topProducts.map(([product, count]) => [product === 'Sin especificar' ? 'Unspecified' : product, count])
    };

    const options = {
        chart: { type: 'bar', height: 300, id: 'products' },
        title: { text: 'Top 10 Products with Most Incidents', align: 'left' },
        plotOptions: { bar: { borderRadius: 4, horizontal: true, distributed: true } },
        dataLabels: { enabled: false },
        xaxis: { categories: categories },
        colors: chartColors.palette,
        series: [{ name: 'Incidents', data: data }]
    };

    if (charts.products) {
        charts.products.updateOptions(options);
    } else {
        charts.products = new ApexCharts(document.getElementById('chartProducts'), options);
        charts.products.render();
    }
}
