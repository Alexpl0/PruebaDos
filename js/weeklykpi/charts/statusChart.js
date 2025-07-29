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

        // Destruir gráfica existente
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
                toolbar: {
                    show: true
                }
            },
            labels: ['Pending', 'Approved', 'Rejected'],
            colors: ['#F59E0B', '#218621', '#E41A23'],
            legend: {
                position: 'bottom',
                fontSize: '14px'
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '60%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                formatter: function(w) {
                                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                }
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
                        return value + ' (' + percentage + '%)';
                    }
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function(val, opts) {
                    return opts.w.config.series[opts.seriesIndex];
                }
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