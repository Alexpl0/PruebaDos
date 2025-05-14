// Gráficos relacionados con costos

import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';
import { formatNumber } from '../utils.js';

/**
 * Genera o actualiza el gráfico de categorías de costos
 */
export function renderCostCategoriesChart() {
    console.log("[DEBUG] renderCostCategoriesChart:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    const costCategories = {
        "≤ €1,500": 0,
        "€1,501 - €5,000": 0,
        "€5,001 - €10,000": 0,
        "> €10,000": 0
    };
    
    filteredData.forEach(item => {
        const cost = parseFloat(item.cost_euros || 0);
        
        if (cost <= 1500) {
            costCategories["≤ €1,500"]++;
        } else if (cost <= 5000) {
            costCategories["€1,501 - €5,000"]++;
        } else if (cost <= 10000) {
            costCategories["€5,001 - €10,000"]++;
        } else {
            costCategories["> €10,000"]++;
        }
    });
    
    const labels = Object.keys(costCategories);
    const series = Object.values(costCategories);
    
    // Crear o actualizar el gráfico
    if (charts.costCategories) {
        charts.costCategories.updateOptions({
            labels: labels,
            series: series
        });
    } else {
        const options = {
            chart: {
                type: 'donut',
                height: 350
            },
            labels: labels,
            series: series,
            colors: ['#4CAF50', '#FFB74D', '#FF7043', '#E53935'],
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                formatter: function (w) {
                                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                }
                            }
                        }
                    }
                }
            },
            legend: {
                position: 'bottom'
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };
        
        charts.costCategories = new ApexCharts(document.getElementById('chartCostCategories'), options);
        charts.costCategories.render();
    }
}

/**
 * Genera o actualiza el gráfico de quien paga
 */
export function renderPaidByChart() {
    console.log("[DEBUG] renderPaidByChart:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    const paidByData = {};
    
    filteredData.forEach(item => {
        const paidBy = item.paid_by || 'Sin especificar';
        
        if (!paidByData[paidBy]) {
            paidByData[paidBy] = 1;
        } else {
            paidByData[paidBy]++;
        }
    });
    
    const labels = Object.keys(paidByData);
    const series = Object.values(paidByData);
    
    // Crear o actualizar el gráfico
    if (charts.paidBy) {
        charts.paidBy.updateOptions({
            labels: labels,
            series: series,
            colors: ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5'],
        });
    } else {
        const options = {
            chart: {
                type: 'pie',
                height: 300
            },
            labels: labels,
            series: series,
            colors: chartColors.palette,
            legend: {
                position: 'bottom'
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };
        
        charts.paidBy = new ApexCharts(document.getElementById('chartPaidBy'), options);
        charts.paidBy.render();
    }
    
    // Generar estadísticas de costo por pagador
    const paidByStats = document.getElementById('paidByStats');
    if (paidByStats) {
        let statsHTML = '<ul class="list-group">';
        
        // Calcular costos totales por quien paga
        const costByPayer = {};
        filteredData.forEach(item => {
            const paidBy = item.paid_by || 'Sin especificar';
            const cost = parseFloat(item.cost_euros || 0);
            
            if (!costByPayer[paidBy]) {
                costByPayer[paidBy] = cost;
            } else {
                costByPayer[paidBy] += cost;
            }
        });
        
        // Generar estadísticas
        for (const [payer, cost] of Object.entries(costByPayer)) {
            statsHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${payer}
                    <span class="badge bg-primary rounded-pill">€${formatNumber(cost, 0)}</span>
                </li>`;
        }
        
        statsHTML += '</ul>';
        paidByStats.innerHTML = statsHTML;
    }
}