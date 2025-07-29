/**
 * Area Performance Chart Component
 */

import { utilityService } from '../utils/utilities.js';

export class AreaPerformanceChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
    }

    render(weeklyData) {
        const container = document.getElementById(this.containerId);
        if (!container || !weeklyData || !weeklyData.area_performance) return;

        if (this.chart) {
            this.chart.destroy();
        }

        const areaData = weeklyData.area_performance;
        const areas = areaData.map(area => area.area_name);
        const costs = areaData.map(area => parseFloat(area.total_cost) || 0);
        const colors = utilityService.generateColors(areas.length);

        const options = {
            series: [{ name: 'Costo Total', data: costs }],
            chart: {
                type: 'bar',
                height: 400,
                toolbar: { show: true }
            },
            colors: colors,
            plotOptions: {
                bar: {
                    horizontal: true,
                    distributed: true,
                    barHeight: '60%'
                }
            },
            dataLabels: {
                enabled: true,
                formatter: val => '€' + utilityService.formatNumber(val, 0),
                style: { colors: ['#fff'], fontSize: '16px', fontWeight: 700 }
            },
            xaxis: {
                categories: areas,
                title: { text: 'Costo Total (€)', style: { fontSize: '16px', fontWeight: 700 } },
                labels: {
                    formatter: value => '€' + utilityService.formatNumber(value, 0)
                }
            },
            yaxis: {
                title: { text: 'Áreas', style: { fontSize: '16px', fontWeight: 700 } }
            },
            legend: { show: false },
            tooltip: {
                y: {
                    formatter: (value, { dataPointIndex }) => {
                        const area = areaData[dataPointIndex];
                        return `€${utilityService.formatNumber(value, 2)}<br>Solicitudes: ${area.total_requests}`;
                    }
                }
            },
            grid: { borderColor: '#e7e7e7' }
        };

        this.chart = new ApexCharts(container, options);
        this.chart.render();
    }

    getChart() {
        return this.chart;
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}