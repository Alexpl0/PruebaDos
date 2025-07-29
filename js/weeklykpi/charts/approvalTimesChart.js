/**
 * Approval Times Distribution Chart Component
 */

import { config } from '../config/weeklyConfig.js';
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
        
        if (timeData.length === 0) {
            container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle me-2"></i>No approval times data available</div>';
            return;
        }

        const categories = timeData.map(item => item.time_category || 'N/A');
        const counts = timeData.map(item => parseInt(item.count) || 0);
        
        // Colores específicos para tiempos de aprobación
        const colors = [
            config.colors.success,    // Rápido (< 1 hora)
            config.colors.primary,    // Normal (1-4 horas)  
            config.colors.warning,    // Lento (4-24 horas)
            config.colors.danger      // Muy lento (> 24 horas)
        ];

        const options = {
            series: counts,
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
            labels: categories,
            colors: colors.slice(0, categories.length),
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
                    if (count === 0) return '';
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
                    formatter: function (value, { seriesIndex }) {
                        const total = counts.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        const avgHours = timeData[seriesIndex]?.avg_hours;
                        
                        let tooltipContent = `<div style="padding: 5px;">
                                            <b>${utilityService.formatNumber(value)} solicitudes</b><br>
                                            <span style="color: ${colors[seriesIndex]}">${percentage}% del total</span>`;
                        
                        if (avgHours && avgHours !== 'N/A' && avgHours !== null) {
                            tooltipContent += `<br><span style="color: ${config.colors.success}">Promedio: ${avgHours}h</span>`;
                        }
                        
                        tooltipContent += '</div>';
                        return tooltipContent;
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