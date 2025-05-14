// Actualización de KPIs en la interfaz de usuario

import { getFilteredData } from '../dataDashboard.js';
import { formatNumber } from '../utilsDashboard.js';

/**
 * Actualiza todos los KPIs con los datos filtrados
 */
export function updateKPIs() {
    const filteredData = getFilteredData();
    
    // Total de envíos
    document.getElementById('kpiTotalEnvios').textContent = formatNumber(filteredData.length);
    
    // Costo total en euros
    const costoTotal = filteredData.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
    document.getElementById('kpiCostoTotal').textContent = formatNumber(costoTotal);
    
    // Tasa de aprobación
    const aprobados = filteredData.filter(item => item.status_name === 'aprobado').length;
    const apprRate = filteredData.length > 0 ? (aprobados / filteredData.length) * 100 : 0;
    document.getElementById('kpiApprovalRate').textContent = apprRate.toFixed(1) + '%';
    
    // Tasa de recovery
    const conRecovery = filteredData.filter(item => 
        item.recovery && item.recovery !== 'NO RECOVERY'
    ).length;
    const recoveryRate = filteredData.length > 0 ? (conRecovery / filteredData.length) * 100 : 0;
    document.getElementById('kpiRecoveryRate').textContent = recoveryRate.toFixed(1) + '%';
    
    // KPIs detallados
    updateDetailedKPIs(filteredData, costoTotal);
}

/**
 * Actualiza los KPIs detallados
 * @param {Array} data - Datos filtrados
 * @param {number} costoTotal - Costo total calculado
 */
function updateDetailedKPIs(data, costoTotal) {
    // Costo promedio
    const costoPromedio = data.length > 0 ? costoTotal / data.length : 0;
    document.getElementById('kpiAvgCost').textContent = '€' + formatNumber(costoPromedio, 2);
    
    // Ratio interno/externo
    const internos = data.filter(item => (item.int_ext || '').includes('INTERNAL')).length;
    const externos = data.filter(item => (item.int_ext || '').includes('EXTERNAL')).length;
    document.getElementById('kpiIntExtRatio').textContent = `${internos}:${externos}`;
    
    // Tiempo promedio de aprobación
    const tiempoPromedio = calcularTiempoPromedioAprobacion(data);
    document.getElementById('kpiAvgApprovalTime').textContent = tiempoPromedio.toFixed(1) + ' días';
    
    // Peso total
    const pesoTotal = data.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
    document.getElementById('kpiTotalWeight').textContent = formatNumber(pesoTotal) + ' kg';
}

/**
 * Calcula el tiempo promedio de aprobación
 * @param {Array} data - Datos filtrados
 * @returns {number} Tiempo promedio en días
 */
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