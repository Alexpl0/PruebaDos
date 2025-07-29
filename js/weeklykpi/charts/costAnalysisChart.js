/**
 * Cost Analysis Chart Component
 */

import { config } from '../config/weeklyConfig.js';
import { utilityService } from '../utils/utilities.js';

export class CostAnalysisChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
    }

    render(weeklyData) {
        const container = document.getElementById(this.containerId);
        if (!container || !weeklyData || !weeklyData.daily_costs) return;

        if (this.chart) {
            this.chart.destroy();
        }

        const dailyCosts = weeklyData.daily_costs;
        
        if (dailyCosts.length === 0) {
            container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle me-2"></i>No daily costs data available</div>';
            return;
        }

        const dates = dailyCosts.map(item => {
            const date = new Date(item.approval_date);
            return date.toLocaleDateString('es-MX', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric' 
            });
        });
        const costs = dailyCosts.map(item => parseFloat(item.daily_cost) || 0);
        const orders = dailyCosts.map(item => parseInt(item.daily_count) || 0);

        const options = {
            series: [
                { 
                    name: 'Costo Diario (€)', 
                    type: 'column', 
                    data: costs,
                    color: config.colors.primary
                },
                { 
                    name: 'Órdenes Aprobadas', 
                    type: 'line', 
                    data: orders,
                    color: config.colors.success
                }
            ],
            chart: {
                type: 'line',
                height: config.charts.defaultHeight,
                toolbar: { 
                    show: true,
                    tools: {
                        download: true,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                },
                animations: config.animations,
                zoom: {
                    enabled: true,
                    type: 'x',
                    autoScaleYaxis: true
                }
            },
            stroke: { 
                width: [0, config.charts.strokeWidth],
                curve: 'smooth'
            },
            plotOptions: {
                bar: {
                    columnWidth: config.charts.columnWidth,
                    endingShape: 'rounded',
                    borderRadius: config.charts.borderRadius
                }
            },
            dataLabels: { 
                enabled: false 
            },
            xaxis: {
                categories: dates,
                title: { 
                    text: 'Día de la semana', 
                    style: { 
                        fontSize: config.charts.fontSize.title, 
                        fontWeight: config.charts.fontWeight.title 
                    } 
                },
                labels: {
                    style: {
                        fontSize: config.charts.fontSize.axis,
                        fontWeight: config.charts.fontWeight.axis
                    }
                }
            },
            yaxis: [
                {
                    title: { 
                        text: 'Costo Diario (€)', 
                        style: { 
                            fontSize: config.charts.fontSize.title, 
                            fontWeight: config.charts.fontWeight.title,
                            color: config.colors.primary
                        } 
                    },
                    min: 0,
                    labels: {
                        formatter: value => '€' + utilityService.formatNumber(value, 0),
                        style: {
                            colors: [config.colors.primary],
                            fontSize: config.charts.fontSize.axis
                        }
                    }
                },
                {
                    opposite: true,
                    title: { 
                        text: 'Órdenes Aprobadas', 
                        style: { 
                            fontSize: config.charts.fontSize.title, 
                            fontWeight: config.charts.fontWeight.title,
                            color: config.colors.success
                        } 
                    },
                    min: 0,
                    labels: {
                        formatter: value => utilityService.formatNumber(value),
                        style: {
                            colors: [config.colors.success],
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
                        formatter: value => '€' + utilityService.formatNumber(value, 2) 
                    },
                    { 
                        formatter: value => `${utilityService.formatNumber(value)} órdenes` 
                    }
                ],
                x: {
                    formatter: function(value, { dataPointIndex }) {
                        const dailyData = dailyCosts[dataPointIndex];
                        return `<b>${dates[dataPointIndex]}</b><br>${dailyData.approval_date}`;
                    }
                },
                style: {
                    fontSize: '14px'
                }
            },
            grid: { 
                borderColor: '#e7e7e7',
                strokeDashArray: 3,
                row: {
                    colors: ['transparent', 'transparent'],
                    opacity: 0.5
                }
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