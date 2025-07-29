/**
 * Area Performance Chart Component
 */

import { config } from '../config/weeklyConfig.js';
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
        
        if (areaData.length === 0) {
            container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle me-2"></i>No area performance data available</div>';
            return;
        }

        const areas = areaData.map(area => area.area_name || 'N/A');
        const costs = areaData.map(area => parseFloat(area.total_cost) || 0);
        const requests = areaData.map(area => parseInt(area.total_requests) || 0);
        
        // Generar colores dinámicamente
        const colors = utilityService.generateColors(areas.length);

        const options = {
            series: [{ 
                name: 'Costo Total', 
                data: costs.map((cost, index) => ({
                    x: areas[index],
                    y: cost,
                    requests: requests[index]
                }))
            }],
            chart: {
                type: 'bar',
                height: config.charts.defaultHeight,
                toolbar: { 
                    show: true,
                    tools: {
                        download: true
                    }
                },
                animations: config.animations
            },
            colors: colors,
            plotOptions: {
                bar: {
                    horizontal: true,
                    distributed: true,
                    barHeight: config.charts.barHeight,
                    borderRadius: config.charts.borderRadius,
                    dataLabels: {
                        position: 'center'
                    }
                }
            },
            dataLabels: {
                enabled: true,
                formatter: (val, opts) => {
                    if (val === 0) return '';
                    return '€' + utilityService.formatNumber(val, 0);
                },
                style: { 
                    colors: ['#fff'], 
                    fontSize: config.charts.fontSize.dataLabel, 
                    fontWeight: config.charts.fontWeight.dataLabel 
                },
                dropShadow: {
                    enabled: true,
                    top: 1,
                    left: 1,
                    blur: 1,
                    opacity: 0.45
                }
            },
            xaxis: {
                categories: areas,
                title: { 
                    text: 'Costo Total (€)', 
                    style: { 
                        fontSize: config.charts.fontSize.title, 
                        fontWeight: config.charts.fontWeight.title 
                    } 
                },
                labels: {
                    formatter: value => '€' + utilityService.formatNumber(value, 0),
                    style: {
                        fontSize: config.charts.fontSize.axis,
                        fontWeight: config.charts.fontWeight.axis
                    }
                }
            },
            yaxis: {
                title: { 
                    text: 'Áreas de Negocio', 
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
            legend: { 
                show: false 
            },
            tooltip: {
                enabled: true,
                y: {
                    formatter: (value, { dataPointIndex }) => {
                        const area = areaData[dataPointIndex];
                        return `<div style="padding: 5px;">
                                <b>Costo Total:</b> €${utilityService.formatNumber(value, 2)}<br>
                                <b>Solicitudes:</b> ${utilityService.formatNumber(area.total_requests)}<br>
                                <b>Promedio por solicitud:</b> €${utilityService.formatNumber(value / area.total_requests, 2)}
                                </div>`;
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
                type: 'gradient',
                gradient: {
                    shade: 'light',
                    type: 'horizontal',
                    shadeIntensity: 0.3,
                    gradientToColors: undefined,
                    inverseColors: false,
                    opacityFrom: 0.9,
                    opacityTo: 0.6,
                    stops: [0, 100]
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