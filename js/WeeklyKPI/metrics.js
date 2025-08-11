/**
 * METRICS.JS - ACTUALIZACIÓN DE MÉTRICAS Y KPIs
 * Este módulo maneja la actualización de las tarjetas de métricas principales,
 * cálculo de tendencias y visualización de KPIs.
 */

import { getWeeklyData, getCurrentWeek } from './config.js';
import { formatNumber, calculatePercentageChange, safeUpdateElement } from './utils.js';

// ========================================================================
// ACTUALIZACIÓN DE MÉTRICAS PRINCIPALES
// ========================================================================

/**
 * Actualiza todas las tarjetas de métricas principales
 */
export function updateAllMetricCards() {
    const weeklyData = getWeeklyData();
    
    if (!weeklyData || Object.keys(weeklyData).length === 0) {
        console.warn('No weekly data available for metrics update');
        return;
    }

    updateTotalRequestsCard(weeklyData);
    updateApprovalRateCard(weeklyData);
    updateTotalCostCard(weeklyData);
    updateAverageTimeCard(weeklyData);
    
    console.log('All metric cards updated successfully');
}

/**
 * Actualiza la tarjeta de Total Requests
 */
function updateTotalRequestsCard(data) {
    const totalRequests = data.total_generated || 0;
    safeUpdateElement('totalRequests', formatNumber(totalRequests), false);
}

/**
 * Actualiza la tarjeta de Approval Rate
 */
function updateApprovalRateCard(data) {
    const approvalRate = data.approval_rate || 0;
    safeUpdateElement('approvalRate', `${approvalRate}%`, false);
}

/**
 * Actualiza la tarjeta de Total Cost
 */
function updateTotalCostCard(data) {
    const totalCost = data.total_cost || 0;
    safeUpdateElement('totalCost', `€${formatNumber(totalCost, 2)}`, false);
}

/**
 * Actualiza la tarjeta de Average Time
 */
function updateAverageTimeCard(data) {
    const avgTime = data.average_approval_time || 'N/A';
    safeUpdateElement('avgTime', avgTime, false);
}

// ========================================================================
// MANEJO DE TENDENCIAS
// ========================================================================

/**
 * Actualiza los indicadores de tendencia
 */
export function updateTrends(currentData = null, previousData = null) {
    if (!currentData) {
        currentData = getWeeklyData();
    }
    
    if (!currentData) {
        console.warn('No current data available for trends');
        return;
    }
    
    if (!previousData) {
        // Necesitamos cargar los datos de la semana anterior
        console.log('Loading previous week data for trends...');
        loadPreviousWeekData().then(prevData => {
            if (prevData) {
                updateTrendsWithData(currentData, prevData);
            } else {
                hideTrendIndicators();
            }
        }).catch(error => {
            console.error('Error loading previous week data:', error);
            hideTrendIndicators();
        });
        return;
    }

    updateTrendsWithData(currentData, previousData);
}

/**
 * Actualiza las tendencias con los datos proporcionados
 */
function updateTrendsWithData(currentData, previousData) {
    // Mostrar los indicadores de tendencia
    showTrendIndicators();

    // Actualizar cada tendencia
    updateRequestsTrend(currentData, previousData);
    updateApprovalRateTrend(currentData, previousData);
    updateCostTrend(currentData, previousData);
    updateTimeTrend(currentData, previousData);
    
    console.log('Trends updated successfully');
}

/**
 * Carga los datos de la semana anterior
 */
async function loadPreviousWeekData() {
    try {
        const currentWeek = getCurrentWeek();
        const previousWeek = {
            start: moment(currentWeek.start).subtract(1, 'week').format('YYYY-MM-DD'),
            end: moment(currentWeek.end).subtract(1, 'week').format('YYYY-MM-DD')
        };
        
        const selectedPlant = getSelectedPlant();
        let url = `${API_ENDPOINTS.WEEKLY_KPIS}?start_date=${previousWeek.start}&end_date=${previousWeek.end}`;
        
        if (selectedPlant && selectedPlant.trim() !== '') {
            url += `&plant=${encodeURIComponent(selectedPlant)}`;
        }
        
        console.log('Loading previous week data from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success') {
            return result.data || {};
        } else {
            throw new Error(result.message || 'Failed to load previous week data');
        }
        
    } catch (error) {
        console.error('Error loading previous week data:', error);
        return null;
    }
}

/**
 * Actualiza la tendencia de solicitudes totales
 */
function updateRequestsTrend(currentData, previousData) {
    const requestsChange = calculatePercentageChange(
        currentData.total_generated, 
        previousData.total_generated
    );
    updateTrendElement('requestsTrend', requestsChange, true);
}

/**
 * Actualiza la tendencia de tasa de aprobación
 */
function updateApprovalRateTrend(currentData, previousData) {
    // Para approval rate usamos diferencia simple de puntos porcentuales
    const approvalRateChange = (currentData.approval_rate || 0) - (previousData.approval_rate || 0);
    updateTrendElement('approvalTrend', approvalRateChange, true, 'p.p.');
}

/**
 * Actualiza la tendencia de costo total
 */
function updateCostTrend(currentData, previousData) {
    const costChange = calculatePercentageChange(
        currentData.total_cost, 
        previousData.total_cost
    );
    // Un aumento en el costo es NEGATIVO
    updateTrendElement('costTrend', costChange, false);
}

/**
 * Actualiza la tendencia de tiempo promedio
 */
function updateTimeTrend(currentData, previousData) {
    const timeChange = calculatePercentageChange(
        currentData.average_approval_time_seconds, 
        previousData.average_approval_time_seconds
    );
    // Una disminución en el tiempo es POSITIVA
    updateTrendElement('timeTrend', timeChange, false);
}

/**
 * Actualiza un elemento DOM de tendencia
 */
function updateTrendElement(elementId, change, higherIsBetter, unit = '%') {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Trend element not found: ${elementId}`);
        return;
    }

    if (change === null || change === undefined || isNaN(change)) {
        element.innerHTML = `<i class="fas fa-minus"></i> N/A`;
        element.className = 'metric-trend neutral';
        return;
    }

    // Determina si la tendencia es positiva o negativa para el color
    const isPositive = higherIsBetter ? change >= 0 : change < 0;
    const isNegative = higherIsBetter ? change < 0 : change > 0;
    
    // Determina el ícono de la flecha
    let iconClass = 'fa-minus';
    if (Math.abs(change) > 0.1) {
        iconClass = change > 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    }

    // Formato del valor
    const formattedValue = Math.abs(change) < 0.1 ? '0.0' : change.toFixed(1);
    element.innerHTML = `<i class="fas ${iconClass}"></i> ${formattedValue}${unit}`;
    
    // Asigna la clase correcta para el color
    element.className = 'metric-trend'; // Limpia clases anteriores
    if (isPositive) {
        element.classList.add('positive');
    } else if (isNegative) {
        element.classList.add('negative');
    } else {
        element.classList.add('neutral');
    }
    
    console.log(`Updated trend ${elementId}: ${formattedValue}${unit} (${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'})`);
}

/**
 * Oculta los indicadores de tendencia
 */
function hideTrendIndicators() {
    const trendElements = ['requestsTrend', 'approvalTrend', 'costTrend', 'timeTrend'];
    
    trendElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    });
}

/**
 * Muestra los indicadores de tendencia
 */
function showTrendIndicators() {
    const trendElements = ['requestsTrend', 'approvalTrend', 'costTrend', 'timeTrend'];
    
    trendElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'inline-flex';
        }
    });
}

/**
 * Verifica que todos los elementos de tendencia existen en el DOM
 */
export function validateTrendElements() {
    const trendElements = ['requestsTrend', 'approvalTrend', 'costTrend', 'timeTrend'];
    const results = {};
    
    trendElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        results[elementId] = {
            exists: !!element,
            visible: element ? element.style.display !== 'none' : false,
            hasParent: element ? !!element.parentElement : false
        };
    });
    
    console.log('Trend elements validation:', results);
    return results;
}

// ========================================================================
// ANÁLISIS DE MÉTRICAS
// ========================================================================

/**
 * Genera análisis automático de las métricas
 */
export function generateMetricsAnalysis() {
    const data = getWeeklyData();
    if (!data) return null;

    const analysis = {
        performance: evaluatePerformance(data),
        alerts: generateAlerts(data),
        recommendations: generateRecommendations(data),
        summary: generateSummary(data)
    };

    return analysis;
}

/**
 * Evalúa el rendimiento general
 */
function evaluatePerformance(data) {
    const approvalRate = data.approval_rate || 0;
    const totalRequests = data.total_generated || 0;
    const totalCost = data.total_cost || 0;

    let score = 0;
    let level = 'Poor';

    // Evaluar approval rate (40% del score)
    if (approvalRate >= 90) score += 40;
    else if (approvalRate >= 80) score += 32;
    else if (approvalRate >= 70) score += 24;
    else if (approvalRate >= 60) score += 16;

    // Evaluar volumen de solicitudes (30% del score)
    if (totalRequests >= 50) score += 30;
    else if (totalRequests >= 30) score += 24;
    else if (totalRequests >= 20) score += 18;
    else if (totalRequests >= 10) score += 12;

    // Evaluar eficiencia de costos (30% del score)
    const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
    if (avgCostPerRequest <= 100) score += 30;
    else if (avgCostPerRequest <= 200) score += 24;
    else if (avgCostPerRequest <= 300) score += 18;
    else if (avgCostPerRequest <= 500) score += 12;

    // Determinar nivel
    if (score >= 85) level = 'Excellent';
    else if (score >= 70) level = 'Good';
    else if (score >= 55) level = 'Average';
    else if (score >= 40) level = 'Below Average';

    return { score, level, breakdown: { approvalRate, totalRequests, avgCostPerRequest } };
}

/**
 * Genera alertas basadas en las métricas
 */
function generateAlerts(data) {
    const alerts = [];

    // Alert por approval rate bajo
    if ((data.approval_rate || 0) < 70) {
        alerts.push({
            type: 'warning',
            title: 'Low Approval Rate',
            message: `Current approval rate of ${data.approval_rate}% is below recommended threshold.`,
            priority: 'high'
        });
    }

    // Alert por costo alto
    if ((data.total_cost || 0) > 10000) {
        alerts.push({
            type: 'warning',
            title: 'High Cost Alert',
            message: `Total cost of €${formatNumber(data.total_cost, 2)} is significantly high.`,
            priority: 'medium'
        });
    }

    // Alert por pocas solicitudes
    if ((data.total_generated || 0) < 5) {
        alerts.push({
            type: 'info',
            title: 'Low Activity',
            message: 'Very few requests generated this week. Consider investigating system usage.',
            priority: 'low'
        });
    }

    return alerts;
}

/**
 * Genera recomendaciones basadas en los datos
 */
function generateRecommendations(data) {
    const recommendations = [];

    const approvalRate = data.approval_rate || 0;
    const totalCost = data.total_cost || 0;
    const totalRequests = data.total_generated || 0;

    if (approvalRate < 80) {
        recommendations.push({
            category: 'Process Improvement',
            title: 'Improve Request Quality',
            description: 'Consider providing training to users on how to submit better requests.',
            impact: 'high'
        });
    }

    if (totalRequests > 0 && (totalCost / totalRequests) > 300) {
        recommendations.push({
            category: 'Cost Optimization',
            title: 'Review Cost Structure',
            description: 'Average cost per request is high. Review pricing and negotiate better rates.',
            impact: 'medium'
        });
    }

    if (data.slowest_approver && data.slowest_approver.name !== 'N/A') {
        recommendations.push({
            category: 'Process Efficiency',
            title: 'Optimize Approval Process',
            description: 'Some approvers are taking longer than average. Consider workflow optimization.',
            impact: 'medium'
        });
    }

    return recommendations;
}

/**
 * Genera un resumen de las métricas
 */
function generateSummary(data) {
    const totalRequests = data.total_generated || 0;
    const approvedRequests = data.total_approved || 0;
    const approvalRate = data.approval_rate || 0;
    const totalCost = data.total_cost || 0;

    return {
        totalActivity: totalRequests,
        successfulRequests: approvedRequests,
        efficiency: `${approvalRate}%`,
        totalInvestment: `€${formatNumber(totalCost, 2)}`,
        averageCost: totalRequests > 0 ? `€${formatNumber(totalCost / totalRequests, 2)}` : '€0',
        topPerformer: data.top_requesting_user?.name || 'N/A'
    };
}

// ========================================================================
// EXPORTACIÓN DE DATOS DE MÉTRICAS
// ========================================================================

/**
 * Obtiene los datos de métricas formateados para exportación
 */
export function getMetricsForExport() {
    const data = getWeeklyData();
    if (!data) return null;

    return {
        summary: {
            totalGenerated: data.total_generated || 0,
            totalApproved: data.total_approved || 0,
            totalRejected: data.total_rejected || 0,
            totalPending: data.total_pending || 0,
            approvalRate: data.approval_rate || 0,
            totalCost: data.total_cost || 0,
            averageTime: data.average_approval_time || 'N/A'
        },
        performance: generateMetricsAnalysis()
    };
}