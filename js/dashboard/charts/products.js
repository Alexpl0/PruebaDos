// Gráfico de productos

import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Genera o actualiza el gráfico de productos
 */
export function renderProductsChart() {
    console.log("[DEBUG] renderProductsChart:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    const productsData = {};
    
    filteredData.forEach(item => {
        const product = item.product || 'Sin especificar';
        
        if (!productsData[product]) {
            productsData[product] = 1;
        } else {
            productsData[product]++;
        }
    });
    
    // Ordenar productos por frecuencia y tomar los 10 más comunes
    const topProducts = Object.entries(productsData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const categories = topProducts.map(([product, _]) => product);
    const data = topProducts.map(([_, count]) => count);
    
    // Crear o actualizar el gráfico
    if (charts.products) {
        charts.products.updateOptions({
            xaxis: { categories: categories },
            series: [{ data: data }]
        });
    } else {
        const options = {
            chart: {
                type: 'bar',
                height: 300
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    horizontal: true,
                    distributed: true
                }
            },
            dataLabels: {
                enabled: false
            },
            xaxis: {
                categories: categories
            },
            colors: chartColors.palette,
            series: [{
                name: 'Incidencias',
                data: data
            }]
        };
        
        charts.products = new ApexCharts(document.getElementById('chartProducts'), options);
        charts.products.render();
    }
}