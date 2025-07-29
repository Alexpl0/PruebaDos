/**
 * Approval Times Distribution Chart Component
 */

import { utilityService } from '../utils/utilities.js';

export class ApprovalTimesChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
    }

    render(weeklyData) {
        const container = document.getElementById(this.containerId);
        if (!container || !weeklyData || !weeklyData.approval_times_distribution) return;

        if (this.chart) {
            this.chart.destroy();
        }

        const timeData = weeklyData.approval_times_distribution;
        const categories = timeData.map(item => item.time_category);
        const counts = timeData.map(item => parseInt(item.count) || 0);
        const colors = ['#218621', '#F59E0B', '#E41A23', '#034C8C'];

        const options = {
            series: counts,
            chart: {
                type: 'pie',
                height: 400,
                toolbar: {
                    show: true
                }
            },
            labels: categories,
            colors: colors,
            legend: {
                position: 'bottom',
                fontSize: '14px'
            },
            plotOptions: {
                pie: {
                    expandOnClick: false,
                    donut: {
                        size: '0%'
                    }
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function(val, opts) {
                    const count = opts.w.config.series[opts.seriesIndex];
                    return count + '\n(' + val.toFixed(1) + '%)';
                },
                style: {
                    fontSize: '12px',
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                y: {
                    formatter: function(value, { seriesIndex }) {
                        const total = counts.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        const avgHours = timeData[seriesIndex]?.avg_hours;
                        
                        let tooltip = `${value} requests (${percentage}%)`;
                        if (avgHours && avgHours !== 'N/A') {
                            tooltip += `<br>Avg: ${avgHours}h`;
                        }
                        return tooltip;
                    }
                }
            },
            responsive: [
                {
                    breakpoint: 768,
                    options: {
                        chart: {
                            height: 300
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            ]
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