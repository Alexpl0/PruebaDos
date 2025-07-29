/**
 * Status Distribution Chart Component
 */

import { utilityService } from '../utils/utilities.js';

export class StatusChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
    }

    render(weeklyData) {
        const container = document.getElementById(this.containerId);
        if (!container || !weeklyData) return;

        if (this.chart) {
            this.chart.destroy();
        }

        const statusData = [
            weeklyData.total_pending || 0,
            weeklyData.total_approved || 0,
            weeklyData.total_rejected || 0
        ];

        const options = {
            series: statusData,
            chart: {
                type: 'donut',
                height: 350,
                toolbar: { show: true }
            },
            labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
            colors: ['#F59E0B', '#218621', '#E41A23'],
            legend: {
                position: 'top',
                fontSize: '16px',
                fontWeight: 700,
                markers: { width: 18, height: 18 }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                fontSize: '18px',
                                fontWeight: 700
                            },
                            value: {
                                show: true,
                                fontSize: '22px',
                                fontWeight: 700,
                                color: '#034C8C',
                                formatter: val => val + ' reqs'
                            },
                            total: {
                                show: true,
                                label: 'Total',
                                fontSize: '18px',
                                fontWeight: 700,
                                color: '#002856',
                                formatter: w => w.globals.seriesTotals.reduce((a, b) => a + b, 0) + ' reqs'
                            }
                        }
                    }
                }
            },
            tooltip: {
                y: {
                    formatter: function(value) {
                        const total = statusData.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `<b>${value} solicitudes</b> (${percentage}%)`;
                    }
                }
            },
            dataLabels: {
                enabled: true,
                style: { fontSize: '16px', fontWeight: 'bold' },
                formatter: (val, opts) => `${opts.w.config.series[opts.seriesIndex]} (${val.toFixed(1)}%)`
            }
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