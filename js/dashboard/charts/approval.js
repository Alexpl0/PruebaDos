// Gráficos relacionados con aprobaciones

// Importa la función para obtener los datos filtrados y la configuración de los gráficos
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Genera o actualiza el gráfico de tiempo promedio de aprobación
 */
export function renderApprovalTimeChart() {
    // Muestra en consola la cantidad de datos filtrados
    console.log("[DEBUG] renderApprovalTimeChart:", getFilteredData().length);
    // Obtiene los datos filtrados según los filtros activos
    const filteredData = getFilteredData();
    
    // Array para almacenar los datos de tiempo de aprobación por registro
    const approvalTimeData = [];
    
    // Procesa cada registro filtrado
    filteredData.forEach(item => {
        // Solo considera registros con fecha de creación, fecha de aprobación y estado válido
        if (item.date && item.approval_date && item.status_name && 
            (item.status_name === 'aprobado' || item.status_name === 'rechazado')) {
            const createDate = new Date(item.date);           // Fecha de creación
            const approvalDate = new Date(item.approval_date); // Fecha de aprobación/rechazo
            
            // Calcula la diferencia en días entre creación y aprobación
            const diffTime = Math.abs(approvalDate - createDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Guarda el resultado en el array
            approvalTimeData.push({
                id: item.id,
                days: diffDays,
                status: item.status_name
            });
        }
    });
    
    // Objetos para acumular suma y conteo de días por estado
    const avgByStatus = {};
    const countByStatus = {};
    
    // Acumula los días y cuenta por cada estado
    approvalTimeData.forEach(item => {
        if (!avgByStatus[item.status]) {
            avgByStatus[item.status] = item.days;
            countByStatus[item.status] = 1;
        } else {
            avgByStatus[item.status] += item.days;
            countByStatus[item.status]++;
        }
    });
    
    // Calcula el promedio final de días por estado
    for (const status in avgByStatus) {
        avgByStatus[status] = avgByStatus[status] / countByStatus[status];
    }
    
    // Prepara los datos para ApexCharts
    const categories = Object.keys(avgByStatus);      // Estados (aprobado, rechazado)
    const seriesData = Object.values(avgByStatus);    // Promedios de días por estado
    
    // Si el gráfico ya existe, lo actualiza con los nuevos datos
    if (charts.approvalTime) {
        charts.approvalTime.updateOptions({
            xaxis: { categories: categories },
            series: [{ data: seriesData }]
        });
    } else {
        // Si no existe, crea el gráfico con las opciones iniciales
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
        
        // Crea el gráfico y lo renderiza en el elemento con id 'chartApprovalTime'
        charts.approvalTime = new ApexCharts(document.getElementById('chartApprovalTime'), options);
        charts.approvalTime.render();
    }
}