// Gráfico de distribución por área

import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Genera o actualiza el gráfico de distribución por área
 */
export function renderAreaDistributionChart() {
    console.log("[DEBUG] renderAreaDistributionChart:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    // Procesar datos
    const areaData = {};
    
    filteredData.forEach(item => {
        const area = item.area || 'Sin especificar';
        const intExt = item.int_ext || 'Sin especificar';
        
        if (!areaData[area]) {
            areaData[area] = { INTERNAL: 0, EXTERNAL: 0, other: 0 };
        }
        
        if (intExt.includes('INTERNAL')) {
            areaData[area].INTERNAL++;
        } else if (intExt.includes('EXTERNAL')) {
            areaData[area].EXTERNAL++;
        } else {
            areaData[area].other++;
        }
    });
    
    // Preparar datos para ApexCharts
    const areas = Object.keys(areaData);
    const internal = areas.map(area => areaData[area].INTERNAL);
    const external = areas.map(area => areaData[area].EXTERNAL);
    const other = areas.map(area => areaData[area].other);
    
    // Crear o actualizar el gráfico
    if (charts.areaDistribution) {
        charts.areaDistribution.updateOptions({
            xaxis: { categories: areas },
            series: [
                { name: 'Internal', data: internal },
                { name: 'External', data: external },
                { name: 'Otros', data: other }
            ]
        });
    } else {
        const options = {
            chart: {
                type: 'bar',
                height: 350,
                stacked: true,
                toolbar: { show: true }
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    endingShape: 'rounded'
                },
            },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: ['transparent'] },
            xaxis: { categories: areas },
            yaxis: {
                title: { text: 'Cantidad de envíos' }
            },
            fill: { opacity: 1 },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + " envíos";
                    }
                }
            },
            colors: [chartColors.primary, chartColors.secondary, chartColors.neutral],
            series: [
                { name: 'Internal', data: internal },
                { name: 'External', data: external },
                { name: 'Otros', data: other }
            ]
        };
        
        charts.areaDistribution = new ApexCharts(document.getElementById('chartAreaDistribution'), options);
        charts.areaDistribution.render();
    }
}