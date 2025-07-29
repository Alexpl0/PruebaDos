/**
 * Top Performers Chart Component
 */

import { config } from '../config/weeklyConfig.js';
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

        // Tomar los top 10 performers
        const topPerformers = weeklyData.top_performers.slice(0, 10);
        
        if (topPerformers.length === 0) {
            container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle me-2"></i>No performers data available</div>';
            return;
        }

        const names = topPerformers.map(p => p.name || 'N/A');
        const requests = topPerformers.map(p => parseInt(p.approved_requests) || 0);
        const costs = topPerformers.map(p => parseFloat(p.total_cost) || 0);

        const options = {
            series: [
                { 
                    name: 'Solicitudes Aprobadas', 
                    type: 'column', 
                    data: requests,
                    color: config.colors.primary
                },
                { 
                    name: 'Costo Total (€)', 
                    type: 'line', 
                    data: costs,
                    color: config.colors.danger
                }
            ],
            chart: {
                type: 'line',
                height: config.charts.defaultHeight,
                toolbar: { 
                    show: true,
                    tools: {
                        download: true
                    }
                },
                animations: config.animations
            },
            stroke: { 
                width: [0, config.charts.strokeWidth],
                curve: 'smooth'
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: config.charts.columnWidth,
                    endingShape: 'rounded',
                    borderRadius: config.charts.borderRadius
                }
            },
            dataLabels: { 
                enabled: false 
            },
            xaxis: {
                categories: names,
                labels: { 
                    rotate: -45, 
                    style: { 
                        fontSize: config.charts.fontSize.axis, 
                        fontWeight: config.charts.fontWeight.axis 
                    },
                    maxHeight: 80
                },
                title: {
                    text: 'Usuarios',
                    style: {
                        fontSize: config.charts.fontSize.title,
                        fontWeight: config.charts.fontWeight.title
                    }
                }
            },
            yaxis: [
                {
                    title: { 
                        text: 'Solicitudes Aprobadas', 
                        style: { 
                            fontSize: config.charts.fontSize.title, 
                            fontWeight: config.charts.fontWeight.title,
                            color: config.colors.primary
                        } 
                    },
                    min: 0,
                    labels: {
                        formatter: value => utilityService.formatNumber(value),
                        style: {
                            colors: [config.colors.primary],
                            fontSize: config.charts.fontSize.axis
                        }
                    }
                },
                {
                    opposite: true,
                    title: { 
                        text: 'Costo Total (€)', 
                        style: { 
                            fontSize: config.charts.fontSize.title, 
                            fontWeight: config.charts.fontWeight.title,
                            color: config.colors.danger
                        } 
                    },
                    min: 0,
                    labels: {
                        formatter: value => '€' + utilityService.formatNumber(value, 0),
                        style: {
                            colors: [config.colors.danger],
                            fontSize: config.charts.fontSize.axis
                        }
                    }
                }
            ],
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
                    horizontal: 15,
                    vertical: 5
                }
            },
            tooltip: {
                shared: true,
                intersect: false,
                y: [
                    { 
                        formatter: value => `${utilityService.formatNumber(value)} solicitudes` 
                    },
                    { 
                        formatter: value => '€' + utilityService.formatNumber(value, 2) 
                    }
                ],
                x: {
                    formatter: function(value, { dataPointIndex }) {
                        const performer = topPerformers[dataPointIndex];
                        return `<b>${performer.name}</b>`;
                    }
                },
                style: {
                    fontSize: '14px'
                }
            },
            grid: { 
                borderColor: '#e7e7e7',
                strokeDashArray: 3
            },
            fill: {
                type: ['gradient', 'solid'],
                gradient: {
                    shade: 'light',
                    type: 'vertical',
                    shadeIntensity: 0.3,
                    gradientToColors: [config.colors.primaryLight],
                    inverseColors: false,
                    opacityFrom: 0.9,
                    opacityTo: 0.6,
                    stops: [0, 100]
                }
            },
            markers: {
                size: config.charts.markerSize,
                strokeColors: '#fff',
                strokeWidth: 2,
                hover: {
                    size: 10
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