/**
 * Status Distribution Chart Component
 */

import { config } from '../config/weeklyConfig.js';
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

        // Preparar datos del estado
        const statusData = [
            {
                name: 'Pendientes',
                value: parseInt(weeklyData.total_pending) || 0,
                color: config.colors.status.pending
            },
            {
                name: 'Aprobadas',
                value: parseInt(weeklyData.total_approved) || 0,
                color: config.colors.status.approved
            },
            {
                name: 'Rechazadas',
                value: parseInt(weeklyData.total_rejected) || 0,
                color: config.colors.status.rejected
            }
        ];

        // Filtrar datos con valor > 0
        const filteredData = statusData.filter(item => item.value > 0);
        
        if (filteredData.length === 0) {
            container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle me-2"></i>No data available</div>';
            return;
        }

        const series = filteredData.map(item => item.value);
        const labels = filteredData.map(item => item.name);
        const colors = filteredData.map(item => item.color);

        const options = {
            series: series,
            chart: {
                type: 'donut',
                height: config.charts.defaultHeight,
                toolbar: { 
                    show: true,
                    tools: {
                        download: true
                    }
                },
                animations: config.animations
            },
            labels: labels,
            colors: colors,
            legend: {
                position: 'top',
                fontSize: config.charts.fontSize.legend,
                fontWeight: config.charts.fontWeight.legend,
                markers: { 
                    width: 18, 
                    height: 18,
                    radius: 3
                },
                itemMargin: {
                    horizontal: 10,
                    vertical: 5
                }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: config.charts.donutSize,
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                fontSize: '18px',
                                fontWeight: 700,
                                offsetY: -10,
                                formatter: function (val) {
                                    return val;
                                }
                            },
                            value: {
                                show: true,
                                fontSize: '22px',
                                fontWeight: 700,
                                color: config.colors.primary,
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
                                color: config.colors.primaryDark,
                                formatter: function (w) {
                                    const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                    return total + ' reqs';
                                }
                            }
                        }
                    }
                }
            },
            dataLabels: {
                enabled: true,
                style: { 
                    fontSize: config.charts.fontSize.dataLabel, 
                    fontWeight: config.charts.fontWeight.dataLabel,
                    colors: ['#fff']
                },
                formatter: function (val, opts) {
                    const count = opts.w.config.series[opts.seriesIndex];
                    return `${count}\n(${val.toFixed(1)}%)`;
                },
                dropShadow: {
                    enabled: true,
                    top: 1,
                    left: 1,
                    blur: 1,
                    opacity: 0.45
                }
            },
            tooltip: {
                enabled: true,
                y: {
                    formatter: function(value, { seriesIndex }) {
                        const total = series.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `<b>${utilityService.formatNumber(value)} solicitudes</b><br>
                                <span style="color: ${colors[seriesIndex]}">${percentage}% del total</span>`;
                    }
                },
                style: {
                    fontSize: '14px'
                }
            },
            states: {
                hover: {
                    filter: {
                        type: 'lighten',
                        value: 0.1
                    }
                },
                active: {
                    filter: {
                        type: 'darken',
                        value: 0.1
                    }
                }
            },
            responsive: config.responsive
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