/**
 * Top Performers Chart Component
 */

import { utilityService } from '../utils/utilities.js';

export class TopPerformersChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
    }

    render(weeklyData) {
        const container = document.getElementById(this.containerId);
        if (!container || !weeklyData || !weeklyData.top_performers) return;

        if (this.chart) {
            this.chart.destroy();
        }

        const topPerformers = weeklyData.top_performers.slice(0, 10);
        const names = topPerformers.map(p => p.name);
        const requests = topPerformers.map(p => parseInt(p.approved_requests) || 0);
        const costs = topPerformers.map(p => parseFloat(p.total_cost) || 0);

        const options = {
            series: [
                { name: 'Solicitudes Aprobadas', type: 'column', data: requests },
                { name: 'Costo Total (€)', type: 'line', data: costs }
            ],
            chart: {
                type: 'line',
                height: 400,
                toolbar: { show: true }
            },
            colors: ['#00A3E0', '#E41A23'],
            stroke: { width: [0, 4] },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '60%',
                    endingShape: 'rounded'
                }
            },
            dataLabels: { enabled: false },
            xaxis: {
                categories: names,
                labels: { rotate: -45, style: { fontSize: '14px', fontWeight: 700 } }
            },
            yaxis: [
                {
                    title: { text: 'Solicitudes', style: { fontSize: '16px', fontWeight: 700 } },
                    min: 0
                },
                {
                    opposite: true,
                    title: { text: 'Costo Total (€)', style: { fontSize: '16px', fontWeight: 700 } },
                    labels: {
                        formatter: value => '€' + utilityService.formatNumber(value, 0)
                    }
                }
            ],
            legend: {
                position: 'top',
                fontSize: '16px',
                fontWeight: 700
            },
            tooltip: {
                shared: true,
                intersect: false,
                y: [
                    { formatter: value => value + ' solicitudes' },
                    { formatter: value => '€' + utilityService.formatNumber(value, 2) }
                ]
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