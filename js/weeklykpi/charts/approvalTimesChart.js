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
        const colors = ['#00A3E0', '#218621', '#F59E0B', '#E41A23']; // Más vivos

        const options = {
            series: counts,
            chart: {
                type: 'donut', // Cambia a donut
                height: 380,
                toolbar: { show: true }
            },
            labels: categories,
            colors: colors,
            legend: {
                position: 'top', // Leyenda arriba
                fontSize: '16px',
                fontWeight: 600,
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
                                fontWeight: 700,
                                offsetY: -10
                            },
                            value: {
                                show: true,
                                fontSize: '22px',
                                fontWeight: 700,
                                color: '#034C8C',
                                offsetY: 10,
                                formatter: function (val) {
                                    return val + ' reqs';
                                }
                            },
                            total: {
                                show: true,
                                label: 'Total',
                                fontSize: '18px',
                                fontWeight: 700,
                                color: '#002856',
                                formatter: function (w) {
                                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0) + ' reqs';
                                }
                            }
                        }
                    }
                }
            },
            dataLabels: {
                enabled: true,
                style: {
                    fontSize: '16px',
                    fontWeight: 'bold'
                },
                formatter: function (val, opts) {
                    const count = opts.w.config.series[opts.seriesIndex];
                    return `${count} (${val.toFixed(1)}%)`;
                }
            },
            tooltip: {
                y: {
                    formatter: function (value, { seriesIndex }) {
                        const total = counts.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        const avgHours = timeData[seriesIndex]?.avg_hours;
                        let tooltip = `<b>${value} solicitudes</b> (${percentage}%)`;
                        if (avgHours && avgHours !== 'N/A') {
                            tooltip += `<br><span style="color:#218621">Promedio: ${avgHours}h</span>`;
                        }
                        return tooltip;
                    }
                }
            },
            grid: {
                borderColor: '#e7e7e7'
            },
            responsive: [
                {
                    breakpoint: 768,
                    options: {
                        chart: { height: 260 },
                        legend: { fontSize: '13px' }
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