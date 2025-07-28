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
}