/**
 * Gráfica de "Top Usuario y Planta por Órdenes Generadas"
 * 
 * Este módulo genera una gráfica de barras verticales mostrando:
 * - El usuario con más órdenes generadas
 * - La planta con más órdenes generadas
 * 
 * Utiliza ApexCharts para la visualización.
 * 
 * Dependencias:
 * - ApexCharts debe estar cargado en la página
 * - getFilteredData() debe estar disponible para obtener los datos filtrados
 */

import { getFilteredData } from '../dataDashboard.js';
import { charts } from '../configDashboard.js';

export function renderTopUserPlantOrdersChart(containerId = 'topUserPlantOrdersChart') {
    const data = getFilteredData();

    // Contar órdenes por usuario
    const userCounts = {};
    // Contar órdenes por planta
    const plantCounts = {};

    data.forEach(item => {
        const user = item.creator_name || 'Desconocido';
        const plant = item.planta || 'Desconocida';

        userCounts[user] = (userCounts[user] || 0) + 1;
        plantCounts[plant] = (plantCounts[plant] || 0) + 1;
    });

    // Obtener el usuario y la planta con más órdenes
    const topUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0] || ['Sin datos', 0];
    const topPlant = Object.entries(plantCounts).sort((a, b) => b[1] - a[1])[0] || ['Sin datos', 0];

    // Datos para la gráfica
    const categories = ['Usuario', 'Planta'];
    const seriesData = [topUser[1], topPlant[1]];
    const labels = [topUser[0], topPlant[0]];

    // Destruir gráfica previa si existe
    if (charts[containerId]) {
        charts[containerId].destroy();
    }

    // Opciones de ApexCharts
    const options = {
        chart: {
            type: 'bar',
            height: 320,
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '50%',
                distributed: true
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val, opts) {
                return labels[opts.dataPointIndex];
            },
            style: {
                fontSize: '14px'
            }
        },
        xaxis: {
            categories: categories,
            labels: {
                style: {
                    fontSize: '14px'
                }
            }
        },
        yaxis: {
            title: { text: 'Órdenes generadas' }
        },
        series: [{
            name: 'Órdenes',
            data: seriesData
        }],
        colors: ['#008FFB', '#00E396'],
        tooltip: {
            y: {
                formatter: function(val, opts) {
                    return `${labels[opts.dataPointIndex]}: ${val} órdenes`;
                }
            }
        },
        title: {
            text: 'Top Usuario y Planta por Órdenes Generadas',
            align: 'center'
        }
    };

    // Renderizar gráfica
    const chart = new ApexCharts(document.getElementById(containerId), options);
    chart.render();

    // Guardar referencia en el registro global
    charts[containerId] = chart;
}