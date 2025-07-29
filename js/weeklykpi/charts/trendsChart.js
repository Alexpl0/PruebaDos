/**
 * Trends Chart Component
 */

import { config } from '../config/weeklyConfig.js';
import { utilityService } from '../utils/utilities.js';

export class TrendsChart {
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

        // Usar daily_trends si está disponible, sino generar datos basados en totales
        let dailyData;
        if (weeklyData.daily_trends && weeklyData.daily_trends.length > 0) {
            dailyData = weeklyData.daily_trends;
        } else {
            dailyData = this.prepareDailyData(weeklyData);
        }

        const dates = dailyData.map(d => d.date_label || d.date);
        const generated = dailyData.map(d => parseInt(d.generated) || 0);
        const approved = dailyData.map(d => parseInt(d.approved) || 0);
        const rejected = dailyData.map(d => parseInt(d.rejected) || 0);
        const pending = dailyData.map(d => parseInt(d.pending) || 0);

        const options = {
            series: [
                { 
                    name: 'Generadas', 
                    data: generated,
                    color: config.colors.primary
                },
                { 
                    name: 'Aprobadas', 
                    data: approved,
                    color: config.colors.success
                },
                { 
                    name: 'Rechazadas', 
                    data: rejected,
                    color: config.colors.danger
                },
                { 
                    name: 'Pendientes', 
                    data: pending,
                    color: config.colors.warning
                }
            ],
            chart: {
                type: 'line',
                height: config.charts.trendsHeight,
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
                width: config.charts.strokeWidth, 
                curve: 'smooth',
                lineCap: 'round'
            },
            markers: { 
                size: config.charts.markerSize, 
                strokeWidth: 3, 
                strokeColors: '#fff',
                hover: { 
                    size: 10,
                    sizeOffset: 3
                }
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
                },
                grid: {
                    borderColor: '#e7e7e7',
                    strokeDashArray: 3
                }
            },
            yaxis: {
                title: { 
                    text: 'Número de solicitudes', 
                    style: { 
                        fontSize: config.charts.fontSize.title, 
                        fontWeight: config.charts.fontWeight.title 
                    } 
                },
                min: 0,
                labels: {
                    formatter: value => utilityService.formatNumber(value),
                    style: {
                        fontSize: config.charts.fontSize.axis,
                        fontWeight: config.charts.fontWeight.axis
                    }
                }
            },
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
                y: { 
                    formatter: val => `${utilityService.formatNumber(val)} solicitudes` 
                },
                x: {
                    formatter: function(value, { dataPointIndex }) {
                        return dates[dataPointIndex];
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
                type: 'gradient',
                gradient: {
                    shade: 'light',
                    type: 'vertical',
                    shadeIntensity: 0.5,
                    gradientToColors: undefined,
                    inverseColors: true,
                    opacityFrom: 0.8,
                    opacityTo: 0.1,
                    stops: [0, 100]
                }
            },
            responsive: config.responsive
        };

        this.chart = new ApexCharts(container, options);
        this.chart.render();
    }

    /**
     * Prepara datos diarios simulados basados en los totales semanales
     */
    prepareDailyData(weeklyData) {
        const dates = [];
        const generated = [];
        const approved = [];
        const rejected = [];
        const pending = [];

        // Crear 7 días de datos
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            dates.push({
                date: date.toISOString().split('T')[0],
                date_label: date.toLocaleDateString('es-MX', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                })
            });

            // Distribuir datos de manera proporcional con algo de variación
            const variation = () => Math.random() * 0.4 + 0.8; // Entre 0.8 y 1.2
            
            const dayGenerated = Math.floor(((weeklyData.total_generated || 0) / 7) * variation());
            const dayApproved = Math.floor(((weeklyData.total_approved || 0) / 7) * variation());
            const dayRejected = Math.floor(((weeklyData.total_rejected || 0) / 7) * variation());
            const dayPending = Math.floor(((weeklyData.total_pending || 0) / 7) * variation());

            generated.push(dayGenerated);
            approved.push(dayApproved);
            rejected.push(dayRejected);
            pending.push(dayPending);
        }

        return dates.map((dateInfo, index) => ({
            date: dateInfo.date,
            date_label: dateInfo.date_label,
            generated: generated[index],
            approved: approved[index],
            rejected: rejected[index],
            pending: pending[index]
        }));
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