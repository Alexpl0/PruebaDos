// Gráfico de principales causas

import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Genera o actualiza el gráfico de principales causas
 */
export function renderCausesChart() {
    console.log("[DEBUG] renderCausesChart:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    const causesData = {};
    
    filteredData.forEach(item => {
        const cause = item.category_cause || 'Sin especificar';
        if (!causesData[cause]) {
            causesData[cause] = 1;
        } else {
            causesData[cause]++;
        }
    });
    
    // Ordenar causas por frecuencia y tomar las 10 más comunes
    const sortedCauses = Object.entries(causesData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const total = sortedCauses.reduce((sum, [_, count]) => sum + count, 0);
    let cumulative = 0;
    
    const categories = [];
    const counts = [];
    const cumulativePercentage = [];
    
    sortedCauses.forEach(([cause, count]) => {
        categories.push(cause);
        counts.push(count);
        cumulative += count;
        cumulativePercentage.push((cumulative / total) * 100);
    });
    
    // Crear o actualizar el gráfico
    if (charts.causes) {
        charts.causes.updateOptions({
            xaxis: { categories: categories },
            series: [
                { name: 'Cantidad', data: counts },
                { name: 'Acumulativo %', data: cumulativePercentage }
            ]
        });
    } else {
        const options = {
            chart: {
                type: 'line',
                height: 350,
                stacked: false
            },
            plotOptions: {
                bar: {
                    columnWidth: '70%',
                    endingShape: 'rounded'
                },
            },
            stroke: {
                width: [0, 4],
                curve: 'smooth'
            },
            title: {
                text: 'Análisis de Pareto: Principales Causas',
                align: 'center'
            },
            dataLabels: {
                enabled: false,
                enabledOnSeries: [1]
            },
            markers: {
                size: 6,
                colors: ['#FFA500'],
                strokeColors: '#fff',
                strokeWidth: 2,
                hover: { size: 8 }
            },
            xaxis: {
                categories: categories,
                labels: {
                    rotate: -45,
                    rotateAlways: true,
                    style: {
                        fontSize: '11px'
                    }
                }
            },
            yaxis: [
                {
                    title: {
                        text: 'Cantidad',
                    },
                    min: 0
                },
                {
                    opposite: true,
                    title: {
                        text: 'Porcentaje Acumulativo'
                    },
                    min: 0,
                    max: 100,
                    labels: {
                        formatter: function(val) {
                            return val.toFixed(0) + '%';
                        }
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
                                return y.toFixed(0) + " incidencias";
                            }
                            return y;
                        }
                    },
                    {
                        formatter: function (y) {
                            if (typeof y !== "undefined") {
                                return y.toFixed(1) + "%";
                            }
                            return y;
                        }
                    }
                ]
            },
            legend: {
                horizontalAlign: 'left',
                offsetX: 40
            },
            colors: [chartColors.primary, '#FFA500'],
            series: [
                {
                    name: 'Cantidad',
                    type: 'column',
                    data: counts
                },
                {
                    name: 'Acumulativo %',
                    type: 'line',
                    data: cumulativePercentage
                }
            ]
        };
        
        charts.causes = new ApexCharts(document.getElementById('chartCauses'), options);
        charts.causes.render();
    }
}