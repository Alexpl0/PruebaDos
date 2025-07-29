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
        const container = document.getElementById('weeklySummaryContainer');
        if (!container || !weeklyData) return;

        const weekInfo = `Week ${weeklyData.week_number || ''} of ${weeklyData.year || ''}`;
        const weekRange = `${weeklyData.start_date || ''} - ${weeklyData.end_date || ''}`;
        const plantInfo = weeklyData.selected_plant ? ` - ${weeklyData.selected_plant}` : '';

        container.innerHTML = `
            <div class="dashboard-summary-card card animate">
                <div class="dashboard-summary-header" style="background: var(--primary-gradient); color: #fff; padding: 1.2rem 2rem; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <h3 style="margin:0;font-size:1.4rem;font-weight:700;letter-spacing:0.5px;">
                            <i class="fas fa-chart-line me-2"></i>
                            Weekly Performance Summary
                        </h3>
                        <div style="font-size:1rem;opacity:0.85;">
                            ${weekInfo} <span style="font-weight:400;">(${weekRange})</span>${plantInfo}
                        </div>
                    </div>
                    <div>
                        <button id="exportExcel" class="btn btn-sm btn-outline-light me-2" title="Export to Excel"><i class="fas fa-file-excel"></i></button>
                        <button id="exportPDF" class="btn btn-sm btn-outline-light me-2" title="Export to PDF"><i class="fas fa-file-pdf"></i></button>
                        <button id="printReport" class="btn btn-sm btn-outline-light" title="Print"><i class="fas fa-print"></i></button>
                    </div>
                </div>
                <div class="dashboard-summary-body" style="padding:2rem;">
                    <div class="row g-3">
                        <div class="col-6 col-md-3">
                            <div class="metric-card primary">
                                <div class="metric-icon"><i class="fas fa-file-alt"></i></div>
                                <div class="metric-content">
                                    <h3>${utilityService.formatNumber(weeklyData.total_generated || 0)}</h3>
                                    <p>Total Generated</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="metric-card warning">
                                <div class="metric-icon"><i class="fas fa-hourglass-half"></i></div>
                                <div class="metric-content">
                                    <h3>${utilityService.formatNumber(weeklyData.total_pending || 0)}</h3>
                                    <p>Pending/In Progress</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="metric-card success">
                                <div class="metric-icon"><i class="fas fa-check-circle"></i></div>
                                <div class="metric-content">
                                    <h3>${utilityService.formatNumber(weeklyData.total_approved || 0)}</h3>
                                    <p>Approved</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="metric-card danger">
                                <div class="metric-icon"><i class="fas fa-times-circle"></i></div>
                                <div class="metric-content">
                                    <h3>${utilityService.formatNumber(weeklyData.total_rejected || 0)}</h3>
                                    <p>Rejected</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row g-3 mt-3">
                        <div class="col-6 col-md-3">
                            <div class="metric-card info">
                                <div class="metric-icon"><i class="fas fa-percentage"></i></div>
                                <div class="metric-content">
                                    <h3>${weeklyData.approval_rate || 0}%</h3>
                                    <p>Approval Rate</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="metric-card primary">
                                <div class="metric-icon"><i class="fas fa-euro-sign"></i></div>
                                <div class="metric-content">
                                    <h3>€${utilityService.formatNumber(weeklyData.total_cost || 0, 2)}</h3>
                                    <p>Total Cost</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="metric-card info">
                                <div class="metric-icon"><i class="fas fa-stopwatch"></i></div>
                                <div class="metric-content">
                                    <h3>${weeklyData.average_approval_time || 'N/A'}</h3>
                                    <p>Avg. Approval Time</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="metric-card success">
                                <div class="metric-icon"><i class="fas fa-user-crown"></i></div>
                                <div class="metric-content">
                                    <h3 style="font-size:1.1rem;">${weeklyData.top_requesting_user?.name || 'N/A'}</h3>
                                    <p>Top User</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row g-3 mt-3">
                        <div class="col-6 col-md-4">
                            <div class="metric-card info">
                                <div class="metric-icon"><i class="fas fa-building"></i></div>
                                <div class="metric-content">
                                    <h3 style="font-size:1.1rem;">${weeklyData.top_spending_area?.area || 'N/A'}</h3>
                                    <p>Top Area</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-4">
                            <div class="metric-card warning">
                                <div class="metric-icon"><i class="fas fa-clock"></i></div>
                                <div class="metric-content">
                                    <h3 style="font-size:1.1rem;">${weeklyData.slowest_approver?.name || 'N/A'}</h3>
                                    <p>Slowest Approver</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 col-md-4">
                            <div class="metric-card info">
                                <div class="metric-icon"><i class="fas fa-info-circle"></i></div>
                                <div class="metric-content">
                                    <h3 style="font-size:1.1rem;">${weeklyData.slowest_approver?.duration_formatted || 'N/A'}</h3>
                                    <p>Longest Approval Step</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="dashboard-summary-footer" style="background: #f8fafc; color: #666; font-size:0.95rem; padding: 0.8rem 2rem;">
                    <i class="fas fa-info-circle me-1"></i>
                    Report generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
        `;
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