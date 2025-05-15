// Gráfico de series temporales

// Importa funciones y objetos de configuración necesarios para los gráficos
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Genera o actualiza el gráfico de series temporales
 */
export function renderTimeSeriesChart() {
    // Muestra en consola la cantidad de datos filtrados
    console.log("[DEBUG] renderTimeSeriesChart:", getFilteredData().length);
    // Obtiene los datos filtrados según los filtros activos
    const filteredData = getFilteredData();
    
    // Objeto para agrupar los datos por mes (clave: 'YYYY-MM')
    const monthlyData = {};
    
    // Recorre cada elemento de los datos filtrados
    filteredData.forEach(item => {
        if (item.date) { // Si el elemento tiene fecha
            // Convierte la fecha a objeto Date y extrae año y mes
            const date = new Date(item.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            // Convierte el costo a número flotante
            const cost = parseFloat(item.cost_euros || 0);
            // Determina si el envío es interno
            const isInternal = (item.int_ext || '').includes('INTERNAL');
            
            // Si no existe el mes en el objeto, lo inicializa
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = {
                    count: 1, // Total de envíos en el mes
                    cost: cost, // Costo total en el mes
                    internalCount: isInternal ? 1 : 0, // Envíos internos
                    externalCount: isInternal ? 0 : 1  // Envíos externos
                };
            } else {
                // Si ya existe, acumula los valores
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
    
    // Ordena los meses de forma cronológica
    const sortedMonths = Object.keys(monthlyData).sort();
    
    // Si no hay datos, limpia el gráfico y sale de la función
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
    
    // Prepara los datos para el gráfico
    // Formatea las categorías del eje X como MM/YYYY
    const categories = sortedMonths.map(ym => {
        const [year, month] = ym.split('-');
        return `${month}/${year}`;
    });
    
    // Extrae los datos de cada métrica por mes
    const countData = sortedMonths.map(ym => monthlyData[ym].count);
    const costData = sortedMonths.map(ym => monthlyData[ym].cost);
    const internalData = sortedMonths.map(ym => monthlyData[ym].internalCount);
    const externalData = sortedMonths.map(ym => monthlyData[ym].externalCount);
    
    // Si el gráfico ya existe, actualiza sus datos
    // if (charts.timeSeries) {
    //     charts.timeSeries.updateOptions({
    //         xaxis: {
    //             categories: categories
    //         },
    //         series: [
    //             {
    //                 name: 'Envíos Internos',
    //                 data: internalData
    //             },
    //             {
    //                 name: 'Envíos Externos',
    //                 data: externalData
    //             },
    //             {
    //                 name: 'Costo Total (€)',
    //                 data: costData
    //             }
    //         ]
    //     });
    // } else {
    //     // Si no existe, crea el gráfico con las opciones iniciales
    //     const options = {
    //         chart: {
    //             height: 400,
    //             type: 'line',
    //             stacked: false,
    //             toolbar: {
    //                 show: true
    //             }
    //         },
    //         dataLabels: {
    //             enabled: false
    //         },
    //         stroke: {
    //             width: [1, 1, 4],
    //             curve: 'smooth'
    //         },
    //         title: {
    //             text: 'Tendencia de Envíos y Costos',
    //             align: 'center'
    //         },
    //         grid: {
    //             row: {
    //                 colors: ['#f3f3f3', 'transparent'],
    //                 opacity: 0.5
    //             },
    //         },
    //         xaxis: {
    //             categories: categories,
    //             labels: {
    //                 rotate: -45,
    //                 rotateAlways: true
    //             }
    //         },
    //         yaxis: [
    //             {
    //                 axisTicks: {
    //                     show: true,
    //                 },
    //                 axisBorder: {
    //                     show: true,
    //                     color: chartColors.primary
    //                 },
    //                 labels: {
    //                     style: {
    //                         colors: chartColors.primary,
    //                     }
    //                 },
    //                 title: {
    //                     text: "Cantidad de Envíos",
    //                     style: {
    //                         color: chartColors.primary,
    //                     }
    //                 },
    //                 tooltip: {
    //                     enabled: true
    //                 }
    //             },
    //             {
    //                 seriesName: 'Costo Total (€)',
    //                 opposite: true,
    //                 axisTicks: {
    //                     show: true,
    //                 },
    //                 axisBorder: {
    //                     show: true,
    //                     color: chartColors.secondary
    //                 },
    //                 labels: {
    //                     style: {
    //                         colors: chartColors.secondary,
    //                     }
    //                 },
    //                 title: {
    //                     text: "Costo Total (€)",
    //                     style: {
    //                         color: chartColors.secondary,
    //                     }
    //                 },
    //             },
    //         ],
    //         tooltip: {
    //             shared: true,
    //             intersect: false,
    //             y: [
    //                 {
    //                     formatter: function (y) {
    //                         if (typeof y !== "undefined") {
    //                             return y.toFixed(0) + " envíos";
    //                         }
    //                         return y;
    //                     }
    //                 },
    //                 {
    //                     formatter: function (y) {
    //                         if (typeof y !== "undefined") {
    //                             return y.toFixed(0) + " envíos";
    //                         }
    //                         return y;
    //                     }
    //                 },
    //                 {
    //                     formatter: function (y) {
    //                         if (typeof y !== "undefined") {
    //                             return "€" + y.toLocaleString(undefined, {maximumFractionDigits: 0});
    //                         }
    //                         return y;
    //                     }
    //                 }
    //             ]
    //         },
    //         colors: ['#4472C4', '#A5A5A5', '#ED7D31'],
    //         series: [
    //             {
    //                 name: 'Envíos Internos',
    //                 type: 'column',
    //                 data: internalData
    //             },
    //             {
    //                 name: 'Envíos Externos',
    //                 type: 'column',
    //                 data: externalData
    //             },
    //             {
    //                 name: 'Costo Total (€)',
    //                 type: 'line',
    //                 data: costData
    //             }
    //         ]
    //     };
        
    //     // Crea el gráfico y lo renderiza en el elemento con id 'chartTimeSeries'
    //     charts.timeSeries = new ApexCharts(document.getElementById('chartTimeSeries'), options);
    //     charts.timeSeries.render();
    // }
}

/**
 * Genera o actualiza el gráfico de correlación entre peso y costo
 */
export function renderCorrelationChart() {
    // Muestra en consola la cantidad de datos filtrados
    console.log("[DEBUG] renderCorrelationChart:", getFilteredData().length);
    // Obtiene los datos filtrados
    const filteredData = getFilteredData();
    
    // Array para almacenar los puntos del scatter plot
    const scatterData = [];
    
    // Recorre los datos y extrae los que tienen peso y costo válidos
    filteredData.forEach(item => {
        if (item.weight && item.cost_euros) {
            const weight = parseFloat(item.weight);
            const cost = parseFloat(item.cost_euros);
            
            // Solo agrega si ambos valores son válidos y mayores a cero
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
    
    // Si no hay datos válidos, limpia el gráfico y sale
    if (scatterData.length === 0) {
        console.log("No correlation data available to render chart");
        
        // Si el gráfico ya existe, lo actualiza con datos vacíos
        if (charts.correlation) {
            charts.correlation.updateOptions({
                series: []
            });
        }
        return;
    }
    
    // Obtiene los tipos de transporte únicos
    const transportTypes = [...new Set(scatterData.map(item => item.transport))];
    
    // Agrupa los datos por tipo de transporte para el gráfico
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
    
    // Verifica si después de agrupar hay datos para mostrar
    if (seriesData.length === 0 || seriesData.every(series => series.data.length === 0)) {
        console.log("No correlation data available after grouping");
        if (charts.correlation) {
            charts.correlation.updateOptions({
                series: []
            });
        }
        return;
    }
    
    // Si el gráfico ya existe, actualiza los datos
    if (charts.correlation) {
        charts.correlation.updateOptions({
            series: seriesData
        });
    } else {
        // Si no existe, crea el gráfico con las opciones iniciales
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
                    // Personaliza el tooltip para mostrar información detallada
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
        
        // Crea el gráfico y lo renderiza en el elemento con id 'chartCorrelation'
        charts.correlation = new ApexCharts(document.getElementById('chartCorrelation'), options);
        charts.correlation.render();
    }
}