/**
 * Trends Chart Component
 */

import { utilityService } from '../utils/utilities.js';

export class TrendsChart {
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

        // Preparar datos diarios
        const dailyData = this.prepareDailyData(weeklyData);

        const options = {
            series: [
                {
                    name: 'Generated',
                    data: dailyData.generated
                },
                {
                    name: 'Approved',
                    data: dailyData.approved
                },
                {
                    name: 'Rejected',
                    data: dailyData.rejected
                }
            ],
            chart: {
                type: 'line',
                height: 350,
                toolbar: {
                    show: true,
                    tools: {
                        download: true,
                        selection: false,
                        zoom: false,
                        zoomin: false,
                        zoomout: false,
                        pan: false,
                        reset: false
                    }
                },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800
                }
            },
            colors: ['#034C8C', '#218621', '#E41A23'],
            stroke: {
                width: 3,
                curve: 'smooth'
            },
            markers: {
                size: 6,
                strokeWidth: 2,
                fillOpacity: 1,
                hover: {
                    size: 8
                }
            },
            xaxis: {
                categories: dailyData.dates,
                title: {
                    text: 'Date'
                }
            },
            yaxis: {
                title: {
                    text: 'Number of Requests'
                },
                min: 0
            },
            legend: {
                position: 'top'
            },
            tooltip: {
                shared: true,
                intersect: false,
                y: {
                    formatter: function(value) {
                        return value + ' requests';
                    }
                }
            },
            grid: {
                borderColor: '#e7e7e7',
                row: {
                    colors: ['#f3f3f3', 'transparent'],
                    opacity: 0.5
                }
            }
        };

        this.chart = new ApexCharts(container, options);
        this.chart.render();
    }

    prepareDailyData(weeklyData) {
        // Generar datos de ejemplo basados en los totales
        const dates = [];
        const generated = [];
        const approved = [];
        const rejected = [];

        // Crear 7 días de datos
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            // Distribuir datos de manera proporcional
            const dayGenerated = Math.floor((weeklyData.total_generated || 0) / 7) + Math.floor(Math.random() * 3);
            const dayApproved = Math.floor((weeklyData.total_approved || 0) / 7) + Math.floor(Math.random() * 2);
            const dayRejected = Math.floor((weeklyData.total_rejected || 0) / 7) + Math.floor(Math.random() * 1);

            generated.push(dayGenerated);
            approved.push(dayApproved);
            rejected.push(dayRejected);
        }

        return { dates, generated, approved, rejected };
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