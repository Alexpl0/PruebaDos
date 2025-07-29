/**
 * UI Service for Weekly Performance Dashboard
 */

import { dataService } from './dataService.js';
import { utilityService } from '../utils/utilities.js';

class UIService {
    constructor() {
        this.isInitialized = false;
    }

    initialize() {
        this.isInitialized = true;
    }

    /**
     * Inicializa los selectores de la interfaz
     */
    initializeSelectors() {
        this.initializeWeekSelector();
        this.initializePlantSelector();
    }

    /**
     * Inicializa el selector de semanas
     */
    initializeWeekSelector() {
        const prevBtn = document.getElementById('prevWeek');
        const nextBtn = document.getElementById('nextWeek');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const currentWeek = dataService.getCurrentWeek();
                currentWeek.start.subtract(1, 'week');
                currentWeek.end.subtract(1, 'week');
                currentWeek.weekNumber = currentWeek.start.isoWeek();
                currentWeek.year = currentWeek.start.year();
                dataService.setCurrentWeek(currentWeek);
                this.updateWeekDisplay();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const currentWeek = dataService.getCurrentWeek();
                currentWeek.start.add(1, 'week');
                currentWeek.end.add(1, 'week');
                currentWeek.weekNumber = currentWeek.start.isoWeek();
                currentWeek.year = currentWeek.start.year();
                dataService.setCurrentWeek(currentWeek);
                this.updateWeekDisplay();
            });
        }

        this.updateWeekDisplay();
    }

    /**
     * Actualiza la visualización del selector de semanas
     */
    updateWeekDisplay() {
        const currentWeek = dataService.getCurrentWeek();
        const weekNumberElement = document.getElementById('weekNumber');
        const weekDatesElement = document.getElementById('weekDates');

        if (weekNumberElement) {
            weekNumberElement.textContent = `Week ${currentWeek.weekNumber}, ${currentWeek.year}`;
        }

        if (weekDatesElement) {
            weekDatesElement.textContent = `${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD, YYYY')}`;
        }
    }

    /**
     * Inicializa el selector de plantas
     */
    async initializePlantSelector() {
        const plantSelect = document.getElementById('plantSelect');
        if (!plantSelect) return;

        try {
            await dataService.loadAvailablePlants();
            const plants = dataService.getAvailablePlants();

            plantSelect.innerHTML = '<option value="">All Plants</option>';
            
            plants.forEach(plant => {
                const option = document.createElement('option');
                option.value = plant;
                option.textContent = plant;
                plantSelect.appendChild(option);
            });

            plantSelect.addEventListener('change', (e) => {
                dataService.setSelectedPlant(e.target.value);
            });

        } catch (error) {
            console.error('Error initializing plant selector:', error);
        }
    }

    /**
     * Actualiza las tarjetas de métricas
     */
    updateMetricCards(weeklyData) {
        if (!weeklyData) return;

        // Tarjetas principales
        const metrics = [
            { id: 'totalGenerated', value: weeklyData.total_generated || 0 },
            { id: 'totalPending', value: weeklyData.total_pending || 0 },
            { id: 'totalApproved', value: weeklyData.total_approved || 0 },
            { id: 'totalRejected', value: weeklyData.total_rejected || 0 },
            { id: 'approvalRate', value: (weeklyData.approval_rate || 0) + '%' },
            { id: 'totalCost', value: '€' + utilityService.formatNumber(weeklyData.total_cost || 0, 2) }
        ];

        metrics.forEach(metric => {
            const element = document.getElementById(metric.id);
            if (element) {
                element.textContent = metric.value;
            }
        });

        // Información adicional
        this.updateAdditionalInfo(weeklyData);
    }

    /**
     * Actualiza información adicional
     */
    updateAdditionalInfo(weeklyData) {
        const additionalInfo = [
            { id: 'avgApprovalTime', value: weeklyData.average_approval_time || 'N/A' },
            { id: 'topUser', value: weeklyData.top_requesting_user?.name || 'N/A' },
            { id: 'topUserCost', value: weeklyData.top_requesting_user?.total_cost ? '€' + utilityService.formatNumber(weeklyData.top_requesting_user.total_cost, 2) : 'N/A' },
            { id: 'topArea', value: weeklyData.top_spending_area?.area || 'N/A' },
            { id: 'topAreaCost', value: weeklyData.top_spending_area?.total_spent ? '€' + utilityService.formatNumber(weeklyData.top_spending_area.total_spent, 2) : 'N/A' },
            { id: 'slowestApprover', value: weeklyData.slowest_approver?.name || 'N/A' },
            { id: 'slowestTime', value: weeklyData.slowest_approver?.duration_formatted || 'N/A' }
        ];

        additionalInfo.forEach(info => {
            const element = document.getElementById(info.id);
            if (element) {
                element.textContent = info.value;
            }
        });
    }

    /**
     * Genera el resumen semanal
     */
    generateWeeklySummary(weeklyData) {
        const container = document.getElementById('summaryContainer');
        if (!container || !weeklyData) return;

        const currentWeek = dataService.getCurrentWeek();
        const selectedPlant = dataService.getSelectedPlant();

        const html = `
            <div class="summary-header">
                <h4>Weekly Summary</h4>
                <p class="summary-period">
                    Week ${currentWeek.weekNumber}, ${currentWeek.year} 
                    (${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD, YYYY')})
                    ${selectedPlant ? `- Plant: ${selectedPlant}` : ''}
                </p>
            </div>
            <div class="summary-content">
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Requests:</span>
                        <span class="stat-value">${weeklyData.total_generated || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Approval Rate:</span>
                        <span class="stat-value success">${weeklyData.approval_rate || 0}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Cost:</span>
                        <span class="stat-value">€${utilityService.formatNumber(weeklyData.total_cost || 0, 2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Avg. Approval Time:</span>
                        <span class="stat-value">${weeklyData.average_approval_time || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Genera insights automáticos
     */
    generateInsights(weeklyData) {
        const container = document.getElementById('insightsContainer');
        if (!container || !weeklyData) return;

        const insights = [];

        // Insight sobre approval rate
        const approvalRate = weeklyData.approval_rate || 0;
        if (approvalRate > 80) {
            insights.push({
                type: 'success',
                title: 'Excellent Approval Rate',
                description: `The approval rate of ${approvalRate}% is above the recommended threshold of 80%.`
            });
        } else if (approvalRate < 60) {
            insights.push({
                type: 'warning',
                title: 'Low Approval Rate',
                description: `The approval rate of ${approvalRate}% is below optimal. Consider reviewing request quality.`
            });
        }

        // Insight sobre top user
        if (weeklyData.top_requesting_user && weeklyData.top_requesting_user.name !== 'N/A') {
            insights.push({
                type: 'info',
                title: 'Top Requester',
                description: `${weeklyData.top_requesting_user.name} generated the most requests with €${utilityService.formatNumber(weeklyData.top_requesting_user.total_cost, 2)} in total cost.`
            });
        }

        // Insight sobre costos
        const totalCost = weeklyData.total_cost || 0;
        if (totalCost > 10000) {
            insights.push({
                type: 'warning',
                title: 'High Weekly Costs',
                description: `Total costs of €${utilityService.formatNumber(totalCost, 2)} are above €10,000. Monitor spending closely.`
            });
        }

        // Si no hay insights, mostrar mensaje por defecto
        if (insights.length === 0) {
            insights.push({
                type: 'info',
                title: 'Performance Summary',
                description: 'Weekly performance metrics are within normal ranges.'
            });
        }

        const html = insights.map(insight => `
            <div class="insight-item ${insight.type}">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * Muestra estado de carga
     */
    showLoading(show = true) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Muestra mensaje de error
     */
    showErrorMessage(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: message,
                timer: 5000
            });
        } else {
            alert('Error: ' + message);
        }
    }

    /**
     * Muestra mensaje de éxito
     */
    showSuccessMessage(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: message,
                timer: 3000
            });
        } else {
            alert('Success: ' + message);
        }
    }
}

export const uiService = new UIService();