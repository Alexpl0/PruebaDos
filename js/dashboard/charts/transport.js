// Gráfico de transportes

import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';
import { formatNumber } from '../utilsDashboard.js';

/**
 * Genera o actualiza el gráfico de transportes
 */
export function renderTransportChart() {
    console.log("[DEBUG] renderTransportChart:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    const transportData = {};
    const costByTransport = {};
    
    filteredData.forEach(item => {
        const transport = item.transport || 'Sin especificar';
        const cost = parseFloat(item.cost_euros || 0);
        
        if (!transportData[transport]) {
            transportData[transport] = 1;
            costByTransport[transport] = cost;
        } else {
            transportData[transport]++;
            costByTransport[transport] += cost;
        }
    });
    
    // Calcular costo promedio por tipo de transporte
    const avgCostByTransport = {};
    for (const transport in transportData) {
        avgCostByTransport[transport] = costByTransport[transport] / transportData[transport];
    }
    
    // Preparar datos para ApexCharts
    const categories = Object.keys(transportData);
    const countData = Object.values(transportData);
    const avgCostData = Object.values(avgCostByTransport);
    
    // Crear o actualizar el gráfico
    if (charts.transport) {
        charts.transport.updateOptions({
            xaxis: { categories: categories },
            series: [
                { name: 'Cantidad', data: countData },
                { name: 'Costo Promedio (€)', data: avgCostData }
            ]
        });
    } else {
        const options = {
            chart: {
                type: 'bar',
                height: 350
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    endingShape: 'rounded'
                },
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
            },
            xaxis: {
                categories: categories
            },
            yaxis: [
                {
                    title: {
                        text: 'Cantidad'
                    }
                },
                {
                    opposite: true,
                    title: {
                        text: 'Costo Promedio (€)'
                    }
                }
            ],
            tooltip: {
                shared: true,
                intersect: false,
                y: [
                    {
                        formatter: function (y) {
                            if (typeof y !== "undefined") {
                                return y.toFixed(0) + " envíos";
                            }
                            return y;
                        }
                    },
                    {
                        formatter: function (y) {
                            if (typeof y !== "undefined") {
                                return "€" + formatNumber(y, 2);
                            }
                            return y;
                        }
                    }
                ]
            },
            colors: [chartColors.primary, '#FF7043'],
            series: [
                {
                    name: 'Cantidad',
                    data: countData
                },
                {
                    name: 'Costo Promedio (€)',
                    data: avgCostData
                }
            ]
        };
        
        charts.transport = new ApexCharts(document.getElementById('chartTransport'), options);
        charts.transport.render();
    }
}