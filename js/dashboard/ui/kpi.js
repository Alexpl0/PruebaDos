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
    
    updateDetailedKPIs(filteredData, costoTotal);
}

export function updateDetailedKPIs(data, costoTotal) {
    const costoPromedio = data.length > 0 ? costoTotal / data.length : 0;
    document.getElementById('kpiAvgCost').textContent = '€' + formatNumber(costoPromedio, 2);
    
    const internos = data.filter(item => (item.int_ext || '').includes('INTERNAL')).length;
    const externos = data.filter(item => (item.int_ext || '').includes('EXTERNAL')).length;
    document.getElementById('kpiIntExtRatio').textContent = `${internos}:${externos}`;
    
    const tiempoPromedio = calcularTiempoPromedioAprobacion(data);
    document.getElementById('kpiAvgApprovalTime').textContent = tiempoPromedio.toFixed(1) + ' days';
    
    const pesoTotal = data.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
    document.getElementById('kpiTotalWeight').textContent = formatNumber(pesoTotal) + ' kg';
}

function calcularTiempoPromedioAprobacion(data) {
    const itemsConAprobacion = data.filter(item => item.date && item.approval_date);
    
    let tiempoPromedio = 0;
    
    if (itemsConAprobacion.length > 0) {
        const tiempoTotal = itemsConAprobacion.reduce((sum, item) => {
            const createDate = new Date(item.date);
            const approvalDate = new Date(item.approval_date);
            
            const diffTime = Math.abs(approvalDate - createDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return sum + diffDays;
        }, 0);
        
        tiempoPromedio = tiempoTotal / itemsConAprobacion.length;
    }
    
    return tiempoPromedio;
}

// =================== NUEVA FUNCIONALIDAD: TABLA DE KPIs DETALLADOS ===================

/**
 * Actualiza la sección de KPIs detallados con una tabla bonita
 * Esta función reemplaza la sección "Detailed KPIs" con información estilo reporte semanal
 */
export function updateDetailedKPIsTable() {
    const container = document.getElementById('detailedKPIsContainer');
    
    if (!container) {
        console.warn('Detailed KPIs container not found. Make sure there is a div with id="detailedKPIsContainer"');
        return;
    }

    try {
        const stats = calculateDetailedStatistics();
        const html = generateDetailedKPIsHTML(stats);
        container.innerHTML = html;
        
        // Añadir animación de entrada
        container.style.opacity = '0';
        setTimeout(() => {
            container.style.transition = 'opacity 0.3s ease-in-out';
            container.style.opacity = '1';
        }, 100);
        
    } catch (error) {
        console.error('Error updating detailed KPIs table:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading detailed KPIs. Please try refreshing the page.
            </div>
        `;
    }
}

/**
 * Calcula las estadísticas detalladas basadas en los datos filtrados
 * @returns {Object} Objeto con todas las estadísticas calculadas
 */
function calculateDetailedStatistics() {
    const data = getFilteredData();
    
    if (!data || data.length === 0) {
        return getEmptyStatistics();
    }

    // General Summary Statistics
    const totalGenerated = data.length;
    const totalPending = data.filter(item => 
        item.status_name && (
            item.status_name.toLowerCase().includes('pending') ||
            item.status_name.toLowerCase().includes('progress') ||
            item.status_name.toLowerCase().includes('waiting') ||
            item.status_name.toLowerCase().includes('proceso')
        )
    ).length;
    
    const totalApproved = data.filter(item => 
        item.status_name && (
            item.status_name.toLowerCase().includes('approved') ||
            item.status_name.toLowerCase().includes('aprobado')
        )
    ).length;
    
    const totalRejected = data.filter(item => 
        item.status_name && (
            item.status_name.toLowerCase().includes('rejected') ||
            item.status_name.toLowerCase().includes('rechazado')
        )
    ).length;

    // Approval Rate Calculation
    const processedOrders = totalApproved + totalRejected;
    const approvalRate = processedOrders > 0 ? ((totalApproved / processedOrders) * 100).toFixed(1) : 'N/A';

    // Total Cost Calculation (solo órdenes aprobadas)
    const approvedOrders = data.filter(item => 
        item.status_name && (
            item.status_name.toLowerCase().includes('approved') ||
            item.status_name.toLowerCase().includes('aprobado')
        )
    );
    
    const totalCost = approvedOrders.reduce((sum, item) => {
        const cost = parseFloat(item.cost_euros || item.total_cost || item.cost || 0);
        return sum + cost;
    }, 0);

    // Performance Highlights - Top Requesting User
    const userStats = {};
    approvedOrders.forEach(item => {
        const userName = item.creator_name || item.name || 'Unknown User';
        if (!userStats[userName]) {
            userStats[userName] = { count: 0, totalCost: 0 };
        }
        userStats[userName].count++;
        userStats[userName].totalCost += parseFloat(item.cost_euros || item.total_cost || item.cost || 0);
    });

    const topUser = Object.entries(userStats).reduce((max, [name, stats]) => {
        return stats.count > (max.count || 0) ? { name, ...stats } : max;
    }, { name: 'N/A', count: 0, totalCost: 0 });

    // Top Spending Area
    const areaStats = {};
    approvedOrders.forEach(item => {
        const area = item.creator_plant || item.planta || item.plant || 'Unknown Area';
        if (!areaStats[area]) {
            areaStats[area] = 0;
        }
        areaStats[area] += parseFloat(item.cost_euros || item.total_cost || item.cost || 0);
    });

    const topArea = Object.entries(areaStats).reduce((max, [area, spent]) => {
        return spent > (max.totalSpent || 0) ? { area, totalSpent: spent } : max;
    }, { area: 'N/A', totalSpent: 0 });

    // Average Approval Time & Slowest Approver
    const approvalTimes = [];
    const approverStats = {};
    
    data.forEach(item => {
        if (item.approval_date && item.date) {
            const createdDate = new Date(item.date);
            const approvedDate = new Date(item.approval_date);
            const timeDiff = approvedDate - createdDate;
            
            if (timeDiff > 0) {
                approvalTimes.push(timeDiff);
                
                const approverName = item.approver_name || 'Unknown Approver';
                if (!approverStats[approverName]) {
                    approverStats[approverName] = [];
                }
                approverStats[approverName].push(timeDiff);
            }
        }
    });

    const avgApprovalTime = approvalTimes.length > 0 
        ? formatDuration(approvalTimes.reduce((sum, time) => sum + time, 0) / approvalTimes.length)
        : 'N/A';

    // Find slowest approver
    const slowestApprover = Object.entries(approverStats).reduce((slowest, [name, times]) => {
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        return avgTime > (slowest.avgTime || 0) 
            ? { name, avgTime, duration: formatDuration(avgTime) }
            : slowest;
    }, { name: 'N/A', duration: 'N/A' });

    return {
        totalGenerated,
        totalPending,
        totalApproved,
        totalRejected,
        approvalRate,
        totalCost,
        topUser,
        topArea,
        avgApprovalTime,
        slowestApprover
    };
}

/**
 * Retorna estadísticas vacías cuando no hay datos
 */
function getEmptyStatistics() {
    return {
        totalGenerated: 0,
        totalPending: 0,
        totalApproved: 0,
        totalRejected: 0,
        approvalRate: 'N/A',
        totalCost: 0,
        topUser: { name: 'N/A', count: 0, totalCost: 0 },
        topArea: { area: 'N/A', totalSpent: 0 },
        avgApprovalTime: 'N/A',
        slowestApprover: { name: 'N/A', duration: 'N/A' }
    };
}

/**
 * Formatea una duración en milisegundos a texto legible
 */
function formatDuration(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return 'N/A';
    
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Genera el HTML de la tabla de KPIs detallados
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
                            <div class="stat-value primary">${formatNumber(stats.totalGenerated)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Orders Pending / In Progress</div>
                            <div class="stat-value warning">${formatNumber(stats.totalPending)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Approved Orders</div>
                            <div class="stat-value success">${formatNumber(stats.totalApproved)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Rejected Orders</div>
                            <div class="stat-value danger">${formatNumber(stats.totalRejected)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Approval Rate (of processed orders)</div>
                            <div class="stat-value info">${stats.approvalRate}${stats.approvalRate !== 'N/A' ? '%' : ''}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Cost of Approved Shipments</div>
                            <div class="stat-value primary">€ ${formatNumber(stats.totalCost, 2)}</div>
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
                            <div class="highlight-value">${stats.topUser.name}</div>
                            <div class="highlight-detail">
                                ${formatNumber(stats.topUser.count)} approved requests | Total Cost: € ${formatNumber(stats.topUser.totalCost, 2)}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-building me-2"></i>
                                Top Spending Area
                            </div>
                            <div class="highlight-value">${stats.topArea.area}</div>
                            <div class="highlight-detail">
                                Total Spent: € ${formatNumber(stats.topArea.totalSpent, 2)}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-clock me-2"></i>
                                Longest Approval Step
                            </div>
                            <div class="highlight-value">${stats.slowestApprover.name}</div>
                            <div class="highlight-detail">
                                Avg. time taken: ${stats.slowestApprover.duration}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-stopwatch me-2"></i>
                                Average Approval Time
                            </div>
                            <div class="highlight-value">${stats.avgApprovalTime}</div>
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
                </small>
            </div>
        </div>
    `;
}

/**
 * Actualiza la sección de KPIs detallados
 */
export function updateDetailedKPIs() {
    const container = document.getElementById('detailedKPIsContainer');
    if (!container) {
        console.error("Error: El contenedor 'detailedKPIsContainer' no existe en el DOM.");
        return;
    }

    // Actualiza el contenido del contenedor con los KPIs detallados
    container.textContent = "Actualizando KPIs detallados..."; // Ejemplo de actualización
    // Aquí iría el resto de la lógica para actualizar los KPIs detallados
}

