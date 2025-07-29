// weeklyPerformanceMain.js
import { config } from './config/weeklyConfig.js';
import { dataService } from './services/dataService.js';
import { chartService } from './services/chartService.js';
import { exportService } from './services/exportService.js';
import { uiService } from './services/uiService.js';

/**
 * Main Weekly Performance Dashboard Controller
 */

class WeeklyPerformanceDashboard {
    constructor() {
        this.isInitialized = false;
    }

    /**
     * Initialize the dashboard
     */
    async initialize() {
        try {
            console.log('Initializing Weekly Performance Dashboard...');
            
            // Initialize services
            await dataService.initialize();
            chartService.initialize();
            exportService.initialize();
            uiService.initialize();
            
            // Initialize UI components
            this.initializeSelectors();
            this.initializeEventListeners();
            
            // Load initial data
            await this.updateAllVisualizations();

            this.isInitialized = true;
            console.log('Weekly Performance Dashboard initialized successfully');

        } catch (error) {
            console.error('Error initializing Weekly Performance Dashboard:', error);
            uiService.showErrorMessage('Failed to initialize dashboard: ' + error.message);
        }
    }

    /**
     * Initialize selectors
     */
    initializeSelectors() {
        uiService.initializeSelectors();
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        const refreshBtn = document.getElementById('refreshData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.updateAllVisualizations());
        }

        // Listen for plant changes
        const plantSelect = document.getElementById('plantSelect');
        if (plantSelect) {
            plantSelect.addEventListener('change', () => this.updateAllVisualizations());
        }

        // Listen for week changes
        document.getElementById('prevWeek')?.addEventListener('click', () => this.updateAllVisualizations());
        document.getElementById('nextWeek')?.addEventListener('click', () => this.updateAllVisualizations());
    }

    /**
     * Update all visualizations
     */
    async updateAllVisualizations() {
        if (!this.isInitialized) return;

        try {
            uiService.showLoading(true);
            
            await dataService.loadWeeklyData();
            const weeklyData = dataService.getWeeklyData();
            
            if (weeklyData) {
                uiService.updateMetricCards(weeklyData);
                uiService.generateWeeklySummary(weeklyData);
                chartService.renderAll(weeklyData);
                uiService.generateInsights(weeklyData);
            }

        } catch (error) {
            console.error('Error updating visualizations:', error);
            uiService.showErrorMessage('Error updating dashboard: ' + error.message);
        } finally {
            uiService.showLoading(false);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.weeklyDashboard = new WeeklyPerformanceDashboard();
    window.weeklyDashboard.initialize();
});

export default WeeklyPerformanceDashboard;