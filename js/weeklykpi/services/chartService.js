/**
 * Chart Service for Weekly Performance Dashboard
 */

import { TrendsChart } from '../charts/trendsChart.js';
import { StatusChart } from '../charts/statusChart.js';
import { TopPerformersChart } from '../charts/topPerformersChart.js';
import { AreaPerformanceChart } from '../charts/areaPerformanceChart.js';
import { ApprovalTimesChart } from '../charts/approvalTimesChart.js';
import { CostAnalysisChart } from '../charts/costAnalysisChart.js';

class ChartService {
    constructor() {
        this.charts = {};
        this.isInitialized = false;
    }

    initialize() {
        this.charts = {
            trends: new TrendsChart('trendsChart'),
            status: new StatusChart('statusChart'),
            topPerformers: new TopPerformersChart('topPerformersChart'),
            areaPerformance: new AreaPerformanceChart('areaPerformanceChart'),
            approvalTimes: new ApprovalTimesChart('approvalTimesChart'),
            costAnalysis: new CostAnalysisChart('costAnalysisChart')
        };
        this.isInitialized = true;
    }

    renderAll(weeklyData) {
        if (!this.isInitialized || !weeklyData) return;

        Object.values(this.charts).forEach(chart => {
            try {
                chart.render(weeklyData);
            } catch (error) {
                console.error(`Error rendering chart:`, error);
            }
        });
    }

    getChart(chartKey) {
        return this.charts[chartKey]?.getChart();
    }

    destroyAll() {
        Object.values(this.charts).forEach(chart => {
            try {
                chart.destroy();
            } catch (error) {
                console.error('Error destroying chart:', error);
            }
        });
    }
}

export const chartService = new ChartService();