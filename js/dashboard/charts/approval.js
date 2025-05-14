// Gráficos relacionados con aprobaciones

import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Genera o actualiza el gráfico de tiempo promedio de aprobación
 */
export function renderApprovalTimeChart() {
    console.log("[DEBUG] renderApprovalTimeChart:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    // Procesar datos de tiempo de aprobación
    const approvalTimeData = [];
    
    filteredData.forEach(item => {
        // Solo procesar items con fecha de creación y aprobación
        if (item.date && item.approval_date && item.status_name && 
            (item.status_name === 'aprobado' || item.status_name === 'rechazado')) {
            const createDate = new Date(item.date);
            const approvalDate = new Date(item.approval_date);
            
            // Calcular diferencia en días
            const diffTime = Math.abs(approvalDate - createDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            approvalTimeData.push({
                id: item.id,
                days: diffDays,
                status: item.status_name
            });
        }
    });
    
    // Calcular promedio por status
    const avgByStatus = {};
    const countByStatus = {};
    
    approvalTimeData.forEach(item => {
        if (!avgByStatus[item.status]) {
            avgByStatus[item.status] = item.days;
            countByStatus[item.status] = 1;
        } else {
            avgByStatus[item.status] += item.days;
            countByStatus[item.status]++;
        }
    });
    
    // Calcular promedio final
    for (const status in avgByStatus) {
        avgByStatus[status] = avgByStatus[status] / countByStatus[status];
    }
    
    // Preparar datos para ApexCharts
    const categories = Object.keys(avgByStatus);
    const seriesData = Object.values(avgByStatus);
    
    // Crear o actualizar el gráfico
    if (charts.approvalTime) {
        charts.approvalTime.updateOptions({
            xaxis: { categories: categories },
            series: [{ data: seriesData }]
        });
    } else {
        const options = {
            chart: {
                type: 'bar',
                height: 350
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    horizontal: true
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function(val) {
                    return val.toFixed(1) + ' días';
                }
            },
            xaxis: {
                categories: categories,
                title: {
                    text: 'Tiempo promedio (días)'
                }
            },
            colors: [chartColors.primary],
            series: [{
                name: 'Días promedio',
                data: seriesData
            }]
        };
        
        charts.approvalTime = new ApexCharts(document.getElementById('chartApprovalTime'), options);
        charts.approvalTime.render();
    }
}