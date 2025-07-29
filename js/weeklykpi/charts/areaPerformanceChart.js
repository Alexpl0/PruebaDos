/**
 * Area Performance Chart Component
 */

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
        const areas = areaData.map(area => area.area_name);
        const costs = areaData.map(area => parseFloat(area.total_cost) || 0);
        const colors = utilityService.generateColors(areas.length);

        const options = {
            series: [
                {
                    name: 'Total Cost',
                    data: costs
                }
            ],
            chart: {
                type: 'bar',
                height: 400,
                toolbar: {
                    show: true
                }
            },
            colors: colors,
            plotOptions: {
                bar: {
                    horizontal: true,
                    distributed: true,
                    barHeight: '60%'
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function(val) {
                    return '€' + utilityService.formatNumber(val, 0);
                },
                style: {
                    colors: ['#fff']
                }
            },
            xaxis: {
                categories: areas,
                title: {
                    text: 'Total Cost (€)'
                },
                labels: {
                    formatter: function(value) {
                        return '€' + utilityService.formatNumber(value, 0);
                    }
                }
            },
            yaxis: {
                title: {
                    text: 'Business Areas'
                }
            },
            legend: {
                show: false
            },
            tooltip: {
                y: {
                    formatter: function(value, { dataPointIndex }) {
                        const area = areaData[dataPointIndex];
                        return `€${utilityService.formatNumber(value, 2)}<br>Requests: ${area.total_requests}`;
                    }
                }
            },
            grid: {
                borderColor: '#e7e7e7'
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