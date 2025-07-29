/**
 * Cost Analysis Chart Component
 */

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
        const dates = dailyCosts.map(item => {
            const date = new Date(item.approval_date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const costs = dailyCosts.map(item => parseFloat(item.daily_cost) || 0);
        const orders = dailyCosts.map(item => parseInt(item.daily_count) || 0);

        const options = {
            series: [
                {
                    name: 'Daily Cost (€)',
                    type: 'column',
                    data: costs
                },
                {
                    name: 'Number of Orders',
                    type: 'line',
                    data: orders
                }
            ],
            chart: {
                type: 'line',
                height: 400,
                toolbar: {
                    show: true
                }
            },
            colors: ['#034C8C', '#218621'],
            stroke: {
                width: [0, 3]
            },
            plotOptions: {
                bar: {
                    columnWidth: '60%',
                    endingShape: 'rounded'
                }
            },
            dataLabels: {
                enabled: false
            },
            xaxis: {
                categories: dates,
                title: {
                    text: 'Date'
                }
            },
            yaxis: [
                {
                    title: {
                        text: 'Daily Cost (€)'
                    },
                    labels: {
                        formatter: function(value) {
                            return '€' + utilityService.formatNumber(value, 0);
                        }
                    }
                },
                {
                    opposite: true,
                    title: {
                        text: 'Number of Orders'
                    },
                    min: 0
                }
            ],
            legend: {
                position: 'top'
            },
            tooltip: {
                shared: true,
                intersect: false,
                y: [
                    {
                        formatter: function(value) {
                            return '€' + utilityService.formatNumber(value, 2);
                        }
                    },
                    {
                        formatter: function(value) {
                            return value + ' orders';
                        }
                    }
                ]
            },
            grid: {
                borderColor: '#e7e7e7'
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.9,
                    stops: [0, 90, 100]
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