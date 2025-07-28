/**
 * MÓDULO DE INDICADORES CLAVE DE RENDIMIENTO (KPI)
 * * Este módulo se encarga de calcular y actualizar todos los indicadores clave
 * de rendimiento que se muestran en el panel de control. Los KPIs proporcionan
 * un resumen rápido y visual de las métricas más importantes para el negocio,
 * permitiendo evaluar el rendimiento a simple vista.
 * * Los KPIs incluyen métricas como:
 * - Número total de envíos
 * - Costo total y promedio
 * - Tasas de aprobación y recuperación
 * - Proporciones de envíos internos/externos
 * - Tiempos promedio de procesamiento
 */

import { getFilteredData } from '../dataDashboard.js';
import { formatNumber } from '../utilsDashboard.js';

// URL del nuevo endpoint para KPIs detallados
let WEEKLY_KPIS_URL;
if (typeof URLPF !== 'undefined') {
    WEEKLY_KPIS_URL = URLPF + 'dao/conections/daoWeeklyKPIs.php';
} else {
    console.warn('URL global variable is not defined. Using fallback URL for Weekly KPIs.');
    WEEKLY_KPIS_URL = 'https://grammermx.com/Jesus/PruebaDos/dao/conections/daoWeeklyKPIs.php';
}

export function updateKPIs() {
    const filteredData = getFilteredData();
    
    document.getElementById('kpiTotalEnvios').textContent = formatNumber(filteredData.length);
    
    const costoTotal = filteredData.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
    document.getElementById('kpiCostoTotal').textContent = '€' + formatNumber(costoTotal, 2);
    
    const aprobados = filteredData.filter(item => 
        item.status_name === 'aprobado' || 
        item.status_name === 'approved' || 
        item.status_name?.toLowerCase() === 'approved'
    ).length;
    const apprRate = filteredData.length > 0 ? (aprobados / filteredData.length) * 100 : 0;
    document.getElementById('kpiApprovalRate').textContent = apprRate.toFixed(1) + '%';
    
    // --- Lógica del KPI de Recovery Rate actualizada ---
    // 1. Filtrar solo las órdenes que deben tener un 'recovery_file'.
    const ordersWithRecoveryFile = filteredData.filter(item => item.recovery_file);

    // 2. De ese subconjunto, contar cuántas ya tienen la 'recovery_evidence'.
    const withEvidence = ordersWithRecoveryFile.filter(item => item.recovery_evidence).length;

    // 3. Calcular el porcentaje basado en el nuevo universo de datos.
    // Si no hay órdenes que requieran recovery, el porcentaje es 0.
    const recoveryRate = ordersWithRecoveryFile.length > 0 ? (withEvidence / ordersWithRecoveryFile.length) * 100 : 0;
    document.getElementById('kpiRecoveryRate').textContent = recoveryRate.toFixed(1) + '%';
}

// =================== NUEVA FUNCIONALIDAD: TABLA DE KPIs DETALLADOS ===================

/**
 * Actualiza la sección de KPIs detallados con una tabla bonita
 * Esta función obtiene datos del nuevo endpoint y genera la tabla
 */
export async function updateDetailedKPIsTable() {
    const container = document.getElementById('detailedKPIsContainer');
    
    if (!container) {
        console.warn('Detailed KPIs container not found. Make sure there is a div with id="detailedKPIsContainer"');
        return;
    }

    try {
        // Mostrar loading mientras se cargan los datos
        container.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="height: 200px;">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span class="ms-3">Loading detailed statistics...</span>
            </div>
        `;

        // Obtener datos del endpoint
        const statsData = await fetchWeeklyKPIs();
        
        if (statsData.status === 'success') {
            const html = generateDetailedKPIsHTML(statsData.data);
            container.innerHTML = html;
            
            // Añadir animación de entrada
            container.style.opacity = '0';
            setTimeout(() => {
                container.style.transition = 'opacity 0.3s ease-in-out';
                container.style.opacity = '1';
            }, 100);
        } else {
            throw new Error(statsData.message || 'Failed to load statistics');
        }
        
    } catch (error) {
        console.error('Error updating detailed KPIs table:', error);
        container.innerHTML = `
            <div class="alert alert-danger m-3">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading detailed KPIs: ${error.message}
                <br><small>Please try refreshing the page or contact support.</small>
            </div>
        `;
    }
}

/**
 * Realiza petición al endpoint de KPIs semanales
 * @returns {Promise<Object>} Datos de estadísticas semanales
 */
async function fetchWeeklyKPIs() {
    try {
        const response = await fetch(WEEKLY_KPIS_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin' // Para incluir las cookies de sesión
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Error fetching weekly KPIs:', error);
        throw error;
    }
}

/**
 * Genera el HTML de la tabla de KPIs detallados usando datos del endpoint
 */
function generateDetailedKPIsHTML(stats) {
    const currentDate = new Date();
    const weekRange = `${new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    
    return `
        <div class="detailed-kpis-container">
            <div class="kpis-header">
                <h3 class="kpis-title">
                    <i class="fas fa-chart-line me-2"></i>
                    Weekly Performance Report
                </h3>
                <span class="kpis-subtitle">Premium Freight System | ${weekRange}</span>
            </div>
            
            <div class="kpis-content">
                <!-- General Summary Section -->
                <div class="kpis-section">
                    <h4 class="section-title">
                        <i class="fas fa-chart-bar me-2"></i>
                        General Summary
                    </h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-label">Total Generated Requests</div>
                            <div class="stat-value primary">${formatNumber(stats.total_generated)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Orders Pending / In Progress</div>
                            <div class="stat-value warning">${formatNumber(stats.total_pending)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Approved Orders</div>
                            <div class="stat-value success">${formatNumber(stats.total_approved)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Rejected Orders</div>
                            <div class="stat-value danger">${formatNumber(stats.total_rejected)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Approval Rate (of processed orders)</div>
                            <div class="stat-value info">${stats.approval_rate}%</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Cost of Approved Shipments</div>
                            <div class="stat-value primary">€ ${formatNumber(stats.total_cost, 2)}</div>
                        </div>
                    </div>
                </div>

                <!-- Performance Highlights Section -->
                <div class="kpis-section">
                    <h4 class="section-title">
                        <i class="fas fa-star me-2"></i>
                        Performance Highlights (Based on Approved Orders)
                    </h4>
                    <div class="highlights-grid">
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-user-crown me-2"></i>
                                Top Requesting User
                            </div>
                            <div class="highlight-value">${stats.top_requesting_user.name}</div>
                            <div class="highlight-detail">
                                ${formatNumber(stats.top_requesting_user.request_count)} approved requests | Total Cost: € ${formatNumber(stats.top_requesting_user.total_cost, 2)}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-building me-2"></i>
                                Top Spending Area
                            </div>
                            <div class="highlight-value">${stats.top_spending_area.area}</div>
                            <div class="highlight-detail">
                                Total Spent: € ${formatNumber(stats.top_spending_area.total_spent, 2)}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-clock me-2"></i>
                                Longest Approval Step
                            </div>
                            <div class="highlight-value">${stats.slowest_approver.name}</div>
                            <div class="highlight-detail">
                                Avg. time taken: ${stats.slowest_approver.duration_formatted}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-stopwatch me-2"></i>
                                Average Approval Time
                            </div>
                            <div class="highlight-value">${stats.average_approval_time}</div>
                            <div class="highlight-detail">
                                Creation to Finish
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="kpis-footer">
                <small class="text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    This is an automated report generated on ${currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    <br>Data range: ${stats.date_range ? new Date(stats.date_range.start).toLocaleDateString() + ' to ' + new Date(stats.date_range.end).toLocaleDateString() : 'Last 7 days'}
                </small>
            </div>
        </div>
    `;
}