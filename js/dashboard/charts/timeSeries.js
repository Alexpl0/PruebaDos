// Gráfico de series temporales

import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Genera o actualiza el gráfico de series temporales
 */
export function renderTimeSeriesChart() {
    console.log("[DEBUG] renderTimeSeriesChart:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    // Agrupar datos por mes
    const monthlyData = {};
    
    filteredData.forEach(item => {
        if (item.date) {
            const date = new Date(item.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const cost = parseFloat(item.cost_euros || 0);
            const isInternal = (item.int_ext || '').includes('INTERNAL');
            
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = {
                    count: 1,
                    cost: cost,
                    internalCount: isInternal ? 1 : 0,
                    externalCount: isInternal ? 0 : 1
                };
            } else {
                monthlyData[yearMonth].count++;
                monthlyData[yearMonth].cost += cost;
                if (isInternal) {
                    monthlyData[yearMonth].internalCount++;
                } else {
                    monthlyData[yearMonth].externalCount++;
                }
            }
        }
    });
    
    // Ordenar los datos por fecha
    const sortedMonths = Object.keys(monthlyData).sort();
    
    // If no data is available, return early to prevent chart errors
    if (sortedMonths.length === 0) {
        console.log("No time series data available to render chart");
        if (charts.timeSeries) {
            charts.timeSeries.updateOptions({
                xaxis: { categories: [] },
                yaxis: [
                    {
                        axisTicks: { show: true },
                        axisBorder: { show: true, color: chartColors.primary },
                        labels: { style: { colors: chartColors.primary } },
                        title: { text: "Cantidad de Envíos", style: { color: chartColors.primary } },
                        tooltip: { enabled: true },
                        min: 0
                    },
                    {
                        seriesName: 'Costo Total (€)',
                        opposite: true,
                        axisTicks: { show: true },
                        axisBorder: { show: true, color: chartColors.secondary },
                        labels: { style: { colors: chartColors.secondary } },
                        title: { text: "Costo Total (€)", style: { color: chartColors.secondary } },
                        min: 0
                    }
                ],
                series: [
                    { name: 'Envíos Internos', data: [] },
                    { name: 'Envíos Externos', data: [] },
                    { name: 'Costo Total (€)', data: [] }
                ]
            });
        }
        return;
    }
    
    const categories = sortedMonths.map(ym => {
        const [year, month] = ym.split('-');
        return `${month}/${year}`;
    });
    
    const countData = sortedMonths.map(ym => monthlyData[ym].count);
    const costData = sortedMonths.map(ym => monthlyData[ym].cost);
    const internalData = sortedMonths.map(ym => monthlyData[ym].internalCount);
    const externalData = sortedMonths.map(ym => monthlyData[ym].externalCount);
    
    // Crear o actualizar el gráfico
    if (charts.timeSeries) {
        charts.timeSeries.updateOptions({
            xaxis: {
                categories: categories
            },
            series: [
                {
                    name: 'Envíos Internos',
                    data: internalData
                },
                {
                    name: 'Envíos Externos',
                    data: externalData
                },
                {
                    name: 'Costo Total (€)',
                    data: costData
                }
            ]
        });
    } else {
        const options = {
            chart: {
                height: 400,
                type: 'line',
                stacked: false,
                toolbar: {
                    show: true
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                width: [1, 1, 4],
                curve: 'smooth'
            },
            title: {
                text: 'Tendencia de Envíos y Costos',
                align: 'center'
            },
            grid: {
                row: {
                    colors: ['#f3f3f3', 'transparent'],
                    opacity: 0.5
                },
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
                    axisTicks: {
                        show: true,
                    },
                    axisBorder: {
                        show: true,
                        color: chartColors.primary
                    },
                    labels: {
                        style: {
                            colors: chartColors.primary,
                        }
                    },
                    title: {
                        text: "Cantidad de Envíos",
                        style: {
                            color: chartColors.primary,
                        }
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                {
                    seriesName: 'Costo Total (€)',
                    opposite: true,
                    axisTicks: {
                        show: true,
                    },
                    axisBorder: {
                        show: true,
                        color: chartColors.secondary
                    },
                    labels: {
                        style: {
                            colors: chartColors.secondary,
                        }
                    },
                    title: {
                        text: "Costo Total (€)",
                        style: {
                            color: chartColors.secondary,
                        }
                    },
                },
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
                                return y.toFixed(0) + " envíos";
                            }
                            return y;
                        }
                    },
                    {
                        formatter: function (y) {
                            if (typeof y !== "undefined") {
                                return "€" + y.toLocaleString(undefined, {maximumFractionDigits: 0});
                            }
                            return y;
                        }
                    }
                ]
            },
            colors: ['#4472C4', '#A5A5A5', '#ED7D31'],
            series: [
                {
                    name: 'Envíos Internos',
                    type: 'column',
                    data: internalData
                },
                {
                    name: 'Envíos Externos',
                    type: 'column',
                    data: externalData
                },
                {
                    name: 'Costo Total (€)',
                    type: 'line',
                    data: costData
                }
            ]
        };
        
        charts.timeSeries = new ApexCharts(document.getElementById('chartTimeSeries'), options);
        charts.timeSeries.render();
    }
}

/**
 * Genera o actualiza el gráfico de correlación
 */
export function renderCorrelationChart() {
    console.log("[DEBUG] renderCorrelationChart:", getFilteredData().length);
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
                    transport: item.transport || 'Sin especificar',
                    description: item.description || 'Sin descripción'
                });
            }
        }
    });
    
    // Check if there is any valid data to render
    if (scatterData.length === 0) {
        console.log("No correlation data available to render chart");
        
        // If chart already exists, update with empty data
        if (charts.correlation) {
            charts.correlation.updateOptions({
                series: []
            });
        }
        return;
    }
    
    // Agrupar por tipo de transporte
    const transportTypes = [...new Set(scatterData.map(item => item.transport))];
    
    const seriesData = transportTypes.map(transport => {
        return {
            name: transport,
            data: scatterData.filter(item => item.transport === transport).map(item => {
                return {
                    x: item.x,
                    y: item.y,
                    id: item.id,
                    description: item.description
                };
            })
        };
    });
    
    // Additional check for empty series after grouping
    if (seriesData.length === 0 || seriesData.every(series => series.data.length === 0)) {
        console.log("No correlation data available after grouping");
        if (charts.correlation) {
            charts.correlation.updateOptions({
                series: []
            });
        }
        return;
    }
    
    // Crear o actualizar el gráfico
    if (charts.correlation) {
        charts.correlation.updateOptions({
            series: seriesData
        });
    } else {
        const options = {
            chart: {
                height: 400,
                type: 'scatter',
                zoom: {
                    enabled: true,
                    type: 'xy'
                }
            },
            xaxis: {
                title: {
                    text: 'Peso (kg)'
                },
                tickAmount: 10,
            },
            yaxis: {
                title: {
                    text: 'Costo (€)'
                },
                tickAmount: 10
            },
            title: {
                text: 'Correlación entre Peso y Costo',
                align: 'left'
            },
            tooltip: {
                custom: function({series, seriesIndex, dataPointIndex, w}) {
                    const data = w.config.series[seriesIndex].data[dataPointIndex];
                    return `<div class="p-2">
                        <b>ID:</b> ${data.id}<br>
                        <b>Transporte:</b> ${w.config.series[seriesIndex].name}<br>
                        <b>Peso:</b> ${data.x} kg<br>
                        <b>Costo:</b> €${data.y.toLocaleString(undefined, {maximumFractionDigits: 2})}<br>
                        <small>${data.description}</small>
                    </div>`;
                }
            },
            series: seriesData
        };
        
        charts.correlation = new ApexCharts(document.getElementById('chartCorrelation'), options);
        charts.correlation.render();
    }
}