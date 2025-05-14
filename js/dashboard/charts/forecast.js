// Gráfico de pronóstico

import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Genera o actualiza el gráfico de pronóstico
 */
export function renderForecastChart() {
    console.log("[DEBUG] renderForecastChart:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    // Agrupar datos por mes
    const monthlyData = {};
    
    filteredData.forEach(item => {
        if (item.date) {
            const date = new Date(item.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const cost = parseFloat(item.cost_euros || 0);
            
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = {
                    count: 1,
                    cost: cost
                };
            } else {
                monthlyData[yearMonth].count++;
                monthlyData[yearMonth].cost += cost;
            }
        }
    });
    
    // Ordenar los datos por fecha
    const sortedMonths = Object.keys(monthlyData).sort();
    
    // Datos históricos
    const categories = sortedMonths.map(ym => {
        const [year, month] = ym.split('-');
        return `${month}/${year}`;
    });
    
    const countData = sortedMonths.map(ym => monthlyData[ym].count);
    const costData = sortedMonths.map(ym => monthlyData[ym].cost);
    
    // Simple forecast para los próximos 3 meses usando promedio móvil
    if (categories.length >= 3) {
        const lastThreeCountsAvg = countData.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const lastThreeCostsAvg = costData.slice(-3).reduce((a, b) => a + b, 0) / 3;
        
        // Generar fechas para los próximos 3 meses
        const lastDate = new Date(`${sortedMonths[sortedMonths.length - 1]}-01`);
        
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
    
    // Separar datos históricos y de pronóstico
    const historicalCategories = categories.slice(0, sortedMonths.length);
    const forecastCategories = categories.slice(sortedMonths.length);
    
    const historicalCount = countData.slice(0, sortedMonths.length);
    const forecastCount = countData.slice(sortedMonths.length);
    
    const historicalCost = costData.slice(0, sortedMonths.length);
    const forecastCost = costData.slice(sortedMonths.length);
    
    // Crear o actualizar el gráfico
    if (charts.forecast) {
        charts.forecast.updateOptions({
            xaxis: {
                categories: categories,
                labels: {
                    rotate: -45,
                    rotateAlways: true
                }
            },
            annotations: {
                xaxis: [{
                    x: historicalCategories.length - 0.5,
                    strokeDashArray: 0,
                    borderColor: '#775DD0',
                    label: {
                        borderColor: '#775DD0',
                        style: {
                            color: '#fff',
                            background: '#775DD0'
                        },
                        text: 'Pronóstico'
                    }
                }]
            },
            series: [
                {
                    name: 'Envíos (Histórico)',
                    data: historicalCount
                },
                {
                    name: 'Envíos (Pronóstico)',
                    data: Array(historicalCount.length).fill(null).concat(forecastCount)
                },
                {
                    name: 'Costo (Histórico)',
                    data: historicalCost
                },
                {
                    name: 'Costo (Pronóstico)',
                    data: Array(historicalCost.length).fill(null).concat(forecastCost)
                }
            ]
        });
    } else {
        const options = {
            chart: {
                height: 400,
                type: 'line',
                zoom: {
                    enabled: true
                },
                toolbar: {
                    show: true
                }
            },
            stroke: {
                width: [3, 3, 2, 2],
                curve: 'smooth',
                dashArray: [0, 5, 0, 5]
            },
            colors: [chartColors.primary, '#775DD0', chartColors.secondary, '#FFA500'],
            markers: {
                size: [4, 4, 0, 0],
                hover: {
                    size: 6
                }
            },
            xaxis: {
                categories: categories,
                labels: {
                    rotate: -45,
                    rotateAlways: true
                }
            },
            yaxis: [
                {
                    title: {
                        text: 'Cantidad de Envíos'
                    },
                    min: 0
                },
                {
                    opposite: true,
                    title: {
                        text: 'Costo (€)'
                    },
                    min: 0
                }
            ],
            tooltip: {
                shared: true,
                intersect: false
            },
            legend: {
                position: 'top'
            },
            annotations: {
                xaxis: [{
                    x: historicalCategories.length - 0.5,
                    strokeDashArray: 0,
                    borderColor: '#775DD0',
                    label: {
                        borderColor: '#775DD0',
                        style: {
                            color: '#fff',
                            background: '#775DD0'
                        },
                        text: 'Pronóstico'
                    }
                }]
            },
            series: [
                {
                    name: 'Envíos (Histórico)',
                    type: 'line',
                    data: historicalCount
                },
                {
                    name: 'Envíos (Pronóstico)',
                    type: 'line',
                    data: Array(historicalCount.length).fill(null).concat(forecastCount)
                },
                {
                    name: 'Costo (Histórico)',
                    type: 'line',
                    data: historicalCost
                },
                {
                    name: 'Costo (Pronóstico)',
                    type: 'line',
                    data: Array(historicalCost.length).fill(null).concat(forecastCost)
                }
            ]
        };
        
        charts.forecast = new ApexCharts(document.getElementById('chartForecast'), options);
        charts.forecast.render();
    }
}