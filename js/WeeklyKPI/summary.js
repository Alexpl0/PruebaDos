/**
 * SUMMARY.JS - GENERACIÓN DE RESUMEN E INSIGHTS
 * Este módulo maneja la generación del resumen semanal,
 * análisis automático de insights y recomendaciones.
 */

import { getWeeklyData, getSelectedPlant, getCurrentWeek } from './config.js';
import { formatNumber, safeUpdateElement } from './utils.js';

// ========================================================================
// GENERACIÓN DE RESUMEN SEMANAL
// ========================================================================

/**
 * Genera la tabla de resumen semanal completa
 */
export function generateWeeklySummary() {
    const container = document.getElementById('weeklySummaryContainer');
    if (!container) {
        console.error('Weekly summary container not found');
        return;
    }

    const weeklyData = getWeeklyData();
    if (!weeklyData) {
        showNoDataSummary(container);
        return;
    }

    const summaryHTML = buildSummaryHTML(weeklyData);
    container.innerHTML = summaryHTML;
    
    console.log('Weekly summary generated successfully');
}

/**
 * Construye el HTML del resumen semanal
 */
function buildSummaryHTML(data) {
    const currentWeek = getCurrentWeek();
    const selectedPlant = getSelectedPlant();
    
    const weekInfo = `Week ${currentWeek.weekNumber} of ${currentWeek.year}`;
    const weekRange = `${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD, YYYY')}`;
    const plantInfo = selectedPlant ? ` - ${selectedPlant}` : '';
    
    return `
        <div class="weekly-summary-container">
            ${buildSummaryHeader(weekInfo, weekRange, plantInfo)}
            <div class="kpis-content">
                ${buildGeneralSummarySection(data)}
                ${buildPerformanceHighlightsSection(data)}
            </div>
            ${buildSummaryFooter()}
        </div>
    `;
}

/**
 * Construye el header del resumen
 */
function buildSummaryHeader(weekInfo, weekRange, plantInfo) {
    return `
        <div class="kpis-header">
            <div class="kpis-header-content">
                <h3 class="kpis-title">
                    <i class="fas fa-chart-line me-2"></i>
                    Weekly Performance Report
                </h3>
                <span class="kpis-subtitle">Premium Freight System | ${weekInfo} (${weekRange})${plantInfo}</span>
            </div>
            <div class="kpis-header-actions">
                <div class="kpis-export-buttons">
                    <button id="exportExcel" class="btn" disabled>
                        <i class="fas fa-file-excel me-1"></i>Excel
                    </button>
                    <button id="exportPDF" class="btn" disabled>
                        <i class="fas fa-file-pdf me-1"></i>PDF
                    </button>
                    <button id="printReport" class="btn" disabled>
                        <i class="fas fa-print me-1"></i>Print
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Construye la sección de resumen general
 */
function buildGeneralSummarySection(data) {
    return `
        <div class="kpis-section">
            <h4 class="section-title">
                <i class="fas fa-chart-bar me-2"></i>
                General Summary
            </h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-label">Total Generated Requests</div>
                    <div class="stat-value primary">${formatNumber(data.total_generated || 0)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Orders Pending / In Progress</div>
                    <div class="stat-value warning">${formatNumber(data.total_pending || 0)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Total Approved Orders</div>
                    <div class="stat-value success">${formatNumber(data.total_approved || 0)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Total Rejected Orders</div>
                    <div class="stat-value danger">${formatNumber(data.total_rejected || 0)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Approval Rate (of processed orders)</div>
                    <div class="stat-value info">${data.approval_rate || 0}%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Total Cost of Approved Shipments</div>
                    <div class="stat-value primary">€ ${formatNumber(data.total_cost || 0, 2)}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Construye la sección de highlights de rendimiento
 */
function buildPerformanceHighlightsSection(data) {
    return `
        <div class="kpis-section">
            <h4 class="section-title">
                <i class="fas fa-star me-2"></i>
                Performance Highlights (Based on Approved Orders)
            </h4>
            <div class="highlights-grid">
                ${buildTopRequestingUserHighlight(data)}
                ${buildTopSpendingAreaHighlight(data)}
                ${buildSlowestApproverHighlight(data)}
                ${buildAverageTimeHighlight(data)}
            </div>
        </div>
    `;
}

/**
 * Construye el highlight del top requesting user
 */
function buildTopRequestingUserHighlight(data) {
    const topUser = data.top_requesting_user || {};
    return `
        <div class="highlight-item">
            <div class="highlight-label">
                <i class="fas fa-user-crown me-2"></i>
                Top Requesting User
            </div>
            <div class="highlight-value">${topUser.name || 'N/A'}</div>
            <div class="highlight-detail">
                ${formatNumber(topUser.request_count || 0)} approved requests | Total Cost: € ${formatNumber(topUser.total_cost || 0, 2)}
            </div>
        </div>
    `;
}

/**
 * Construye el highlight del top spending area
 */
function buildTopSpendingAreaHighlight(data) {
    const topArea = data.top_spending_area || {};
    return `
        <div class="highlight-item">
            <div class="highlight-label">
                <i class="fas fa-building me-2"></i>
                Top Spending Area
            </div>
            <div class="highlight-value">${topArea.area || 'N/A'}</div>
            <div class="highlight-detail">
                Total Spent: € ${formatNumber(topArea.total_spent || 0, 2)}
            </div>
        </div>
    `;
}

/**
 * Construye el highlight del slowest approver
 */
function buildSlowestApproverHighlight(data) {
    const slowestApprover = data.slowest_approver || {};
    return `
        <div class="highlight-item">
            <div class="highlight-label">
                <i class="fas fa-clock me-2"></i>
                Longest Approval Step
            </div>
            <div class="highlight-value">${slowestApprover.name || 'N/A'}</div>
            <div class="highlight-detail">
                Avg. time taken: ${slowestApprover.duration_formatted || 'N/A'}
            </div>
        </div>
    `;
}

/**
 * Construye el highlight del average time
 */
function buildAverageTimeHighlight(data) {
    return `
        <div class="highlight-item">
            <div class="highlight-label">
                <i class="fas fa-stopwatch me-2"></i>
                Average Approval Time
            </div>
            <div class="highlight-value">${data.average_approval_time || 'N/A'}</div>
            <div class="highlight-detail">
                Creation to Finish
            </div>
        </div>
    `;
}

/**
 * Construye el footer del resumen
 */
function buildSummaryFooter() {
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    return `
        <div class="kpis-footer">
            <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                This is an automated report generated on ${currentDate}
            </small>
        </div>
    `;
}

/**
 * Muestra mensaje cuando no hay datos
 */
function showNoDataSummary(container) {
    container.innerHTML = `
        <div class="weekly-summary-container">
            <div class="kpis-header">
                <div class="kpis-header-content">
                    <h3 class="kpis-title">
                        <i class="fas fa-chart-line me-2"></i>
                        Weekly Performance Report
                    </h3>
                    <span class="kpis-subtitle">No data available for the selected period</span>
                </div>
            </div>
            <div class="kpis-content">
                <div class="text-center p-5">
                    <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No Data Available</h5>
                    <p class="text-muted">Please select a different time period or plant, or ensure data has been loaded.</p>
                </div>
            </div>
        </div>
    `;
}

// ========================================================================
// GENERACIÓN DE INSIGHTS AUTOMÁTICOS
// ========================================================================

/**
 * Genera insights automáticos basados en los datos
 */
export function generateInsights() {
    const container = document.getElementById('insightsContainer');
    if (!container) {
        console.error('Insights container not found');
        return;
    }

    const weeklyData = getWeeklyData();
    if (!weeklyData) {
        showNoInsights(container);
        return;
    }

    const insights = analyzeData(weeklyData);
    const insightsHTML = buildInsightsHTML(insights);
    container.innerHTML = insightsHTML;
    
    console.log('Insights generated:', insights);
}

/**
 * Analiza los datos y genera insights
 */
function analyzeData(data) {
    const insights = [];

    // Análisis de approval rate
    insights.push(...analyzeApprovalRate(data));
    
    // Análisis de top performers
    insights.push(...analyzeTopPerformers(data));
    
    // Análisis de costos
    insights.push(...analyzeCosts(data));
    
    // Análisis de tiempos
    insights.push(...analyzeApprovalTimes(data));
    
    // Análisis de actividad
    insights.push(...analyzeActivity(data));

    // Si no hay insights, agregar mensaje por defecto
    if (insights.length === 0) {
        insights.push({
            type: 'info',
            title: 'Performance Analysis',
            description: 'All metrics are within normal ranges. Continue monitoring for trends.',
            priority: 'low'
        });
    }

    return insights;
}

/**
 * Analiza la tasa de aprobación
 */
function analyzeApprovalRate(data) {
    const insights = [];
    const approvalRate = data.approval_rate || 0;

    if (approvalRate > 90) {
        insights.push({
            type: 'positive',
            title: 'Excellent Approval Rate',
            description: `Your approval rate of ${approvalRate}% is excellent and above industry standards.`,
            priority: 'high'
        });
    } else if (approvalRate > 80) {
        insights.push({
            type: 'positive',
            title: 'Good Approval Rate',
            description: `Approval rate of ${approvalRate}% is above average and performing well.`,
            priority: 'medium'
        });
    } else if (approvalRate < 60) {
        insights.push({
            type: 'warning',
            title: 'Low Approval Rate Alert',
            description: `Consider reviewing request quality - current approval rate of ${approvalRate}% could be improved.`,
            priority: 'high'
        });
    } else if (approvalRate < 75) {
        insights.push({
            type: 'info',
            title: 'Approval Rate Opportunity',
            description: `Approval rate of ${approvalRate}% has room for improvement. Consider request quality training.`,
            priority: 'medium'
        });
    }

    return insights;
}

/**
 * Analiza los top performers
 */
function analyzeTopPerformers(data) {
    const insights = [];
    
    if (data.top_requesting_user && data.top_requesting_user.name !== 'N/A') {
        const topUser = data.top_requesting_user;
        insights.push({
            type: 'positive',
            title: 'Top Performer Identified',
            description: `${topUser.name} is leading with ${topUser.request_count} approved requests, contributing €${formatNumber(topUser.total_cost, 2)} in value.`,
            priority: 'medium'
        });
    }

    return insights;
}

/**
 * Analiza los costos
 */
function analyzeCosts(data) {
    const insights = [];
    const totalCost = data.total_cost || 0;
    const totalRequests = data.total_generated || 0;
    const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;

    if (totalCost > 10000) {
        insights.push({
            type: 'warning',
            title: 'High Cost Alert',
            description: `Total cost of €${formatNumber(totalCost, 2)} is notably high. Consider cost optimization strategies.`,
            priority: 'high'
        });
    }

    if (avgCostPerRequest > 500) {
        insights.push({
            type: 'info',
            title: 'High Average Cost',
            description: `Average cost per request (€${formatNumber(avgCostPerRequest, 2)}) is above normal. Review pricing strategies.`,
            priority: 'medium'
        });
    }

    return insights;
}

/**
 * Analiza los tiempos de aprobación
 */
function analyzeApprovalTimes(data) {
    const insights = [];
    
    if (data.slowest_approver && data.slowest_approver.name !== 'N/A') {
        insights.push({
            type: 'info',
            title: 'Approval Time Opportunity',
            description: `${data.slowest_approver.name} is taking longer than average (${data.slowest_approver.duration_formatted}). Consider workflow optimization.`,
            priority: 'medium'
        });
    }

    return insights;
}

/**
 * Analiza la actividad general
 */
function analyzeActivity(data) {
    const insights = [];
    const totalRequests = data.total_generated || 0;

    if (totalRequests === 0) {
        insights.push({
            type: 'warning',
            title: 'No Activity',
            description: 'No requests were generated this week. Consider investigating system usage or user engagement.',
            priority: 'high'
        });
    } else if (totalRequests < 5) {
        insights.push({
            type: 'info',
            title: 'Low Activity',
            description: 'Very few requests generated this week. Consider investigating system usage patterns.',
            priority: 'medium'
        });
    } else if (totalRequests > 100) {
        insights.push({
            type: 'positive',
            title: 'High Activity',
            description: `Excellent engagement with ${totalRequests} requests generated. System is being well utilized.`,
            priority: 'low'
        });
    }

    return insights;
}

/**
 * Construye el HTML de los insights
 */
function buildInsightsHTML(insights) {
    // Ordenar insights por prioridad
    const sortedInsights = insights.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return sortedInsights.map(insight => `
        <div class="insight-item ${insight.type}">
            <div class="insight-header">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-priority priority-${insight.priority}">${insight.priority}</div>
            </div>
            <div class="insight-description">${insight.description}</div>
        </div>
    `).join('');
}

/**
 * Muestra mensaje cuando no hay insights
 */
function showNoInsights(container) {
    container.innerHTML = `
        <div class="text-center p-4">
            <i class="fas fa-lightbulb fa-2x text-muted mb-3"></i>
            <p class="text-muted">No insights available. Load data to generate automatic analysis.</p>
        </div>
    `;
}

// ========================================================================
// FUNCIONES DE EXPORTACIÓN DE DATOS DEL RESUMEN
// ========================================================================

/**
 * Prepara los datos del resumen para exportación
 */
export function prepareSummaryForExport() {
    const data = getWeeklyData();
    if (!data) return null;

    const currentWeek = getCurrentWeek();
    const selectedPlant = getSelectedPlant();

    return {
        metadata: {
            week: currentWeek.weekNumber,
            year: currentWeek.year,
            dateRange: `${currentWeek.start.format('YYYY-MM-DD')} to ${currentWeek.end.format('YYYY-MM-DD')}`,
            plant: selectedPlant || 'All Plants',
            generatedAt: new Date().toISOString()
        },
        summary: {
            totalGenerated: data.total_generated || 0,
            totalPending: data.total_pending || 0,
            totalApproved: data.total_approved || 0,
            totalRejected: data.total_rejected || 0,
            approvalRate: data.approval_rate || 0,
            totalCost: data.total_cost || 0,
            averageApprovalTime: data.average_approval_time || 'N/A'
        },
        highlights: {
            topRequestingUser: data.top_requesting_user || {},
            topSpendingArea: data.top_spending_area || {},
            slowestApprover: data.slowest_approver || {},
            averageTime: data.average_approval_time || 'N/A'
        },
        insights: analyzeData(data)
    };
}