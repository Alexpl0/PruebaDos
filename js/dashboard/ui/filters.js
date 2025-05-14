// Manejo de filtros de la interfaz de usuario

import { dateRangeConfig } from '../configDashboard.js';
import { getRawData, applyFilters } from '../dataDashboard.js';
import { updateAllVisualizations } from '../main.js';

let daterangepicker;

/**
 * Inicializa el selector de rango de fechas
 */
export function initializeDateRangePicker() {
    $('#dateRange').daterangepicker({
        startDate: dateRangeConfig.defaultRange.startDate,
        endDate: dateRangeConfig.defaultRange.endDate,
        ranges: dateRangeConfig.ranges,
        opens: 'left',
        showDropdowns: true,
        autoApply: false,
        locale: dateRangeConfig.locale
    });
    
    daterangepicker = $('#dateRange').data('daterangepicker');
    
    $('#dateRange').on('apply.daterangepicker', function(ev, picker) {
        triggerFilterUpdate();
    });
}

/**
 * Inicializa los filtros de planta y status
 * @param {Array} data - Datos para inicializar los filtros
 */
export function initializeFilters(data) {
    // Filtro de plantas
    const plantaFilter = document.getElementById('plantaFilter');
    const plantas = [...new Set(data.map(item => item.planta))].filter(Boolean).sort();
    
    // Limpiar opciones existentes
    while (plantaFilter.options.length > 1) {
        plantaFilter.remove(1);
    }
    
    // Agregar nuevas opciones
    plantas.forEach(planta => {
        const option = document.createElement('option');
        option.value = planta;
        option.textContent = planta;
        plantaFilter.appendChild(option);
    });
    
    // Filtro de status
    const statusFilter = document.getElementById('statusFilter');
    const statuses = [...new Set(data.map(item => item.status_name))].filter(Boolean).sort();
    
    // Limpiar opciones existentes
    while (statusFilter.options.length > 1) {
        statusFilter.remove(1);
    }
    
    // Agregar nuevas opciones
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        statusFilter.appendChild(option);
    });
    
    // Agregar eventos a los filtros
    plantaFilter.addEventListener('change', triggerFilterUpdate);
    statusFilter.addEventListener('change', triggerFilterUpdate);
}

/**
 * Obtiene los valores actuales de los filtros
 * @returns {Object} Objeto con los valores de los filtros
 */
export function getFilterValues() {
    return {
        startDate: daterangepicker.startDate.format('YYYY-MM-DD'),
        endDate: daterangepicker.endDate.format('YYYY-MM-DD'),
        planta: document.getElementById('plantaFilter').value,
        status: document.getElementById('statusFilter').value
    };
}

/**
 * Desencadena la actualización de filtros y visualizaciones
 */
export function triggerFilterUpdate() {
    const filterValues = getFilterValues();
    applyFilters(filterValues);
    updateAllVisualizations();
}