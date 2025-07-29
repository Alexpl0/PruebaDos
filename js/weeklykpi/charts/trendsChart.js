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
        if (!container || !weeklyData || !weeklyData.daily_trends) return;

        if (this.chart) {
            this.chart.destroy();
        }

        const daily = weeklyData.daily_trends;
        const dates = daily.map(d => d.date_label);
        const generated = daily.map(d => d.generated || 0);
        const approved = daily.map(d => d.approved || 0);
        const rejected = daily.map(d => d.rejected || 0);

        const options = {
            series: [
                { name: 'Generadas', data: generated },
                { name: 'Aprobadas', data: approved },
                { name: 'Rechazadas', data: rejected }
            ],
            chart: {
                type: 'line',
                height: 380,
                toolbar: { show: true }
            },
            colors: ['#00A3E0', '#218621', '#E41A23'],
            stroke: { width: 4, curve: 'smooth' },
            markers: { size: 7, strokeWidth: 3, hover: { size: 10 } },
            xaxis: {
                categories: dates,
                title: { text: 'Día', style: { fontSize: '16px', fontWeight: 700 } }
            },
            yaxis: {
                title: { text: 'Solicitudes', style: { fontSize: '16px', fontWeight: 700 } },
                min: 0
            },
            legend: {
                position: 'top',
                fontSize: '16px',
                fontWeight: 700
            },
            tooltip: {
                shared: true,
                intersect: false,
                y: { formatter: val => val + ' solicitudes' }
            },
            grid: { borderColor: '#e7e7e7' }
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