/**
 * MÓDULO DE MANEJO DE FILTROS DE LA INTERFAZ DE USUARIO
 * * Este módulo implementa toda la funcionalidad relacionada con los filtros interactivos
 * del dashboard. Proporciona mecanismos para filtrar los datos por fecha, planta y 
 * estado, permitiendo al usuario personalizar la visualización según sus necesidades.
 */

// Importación de la configuración del selector de rango de fechas.
import { dateRangeConfig } from '../configDashboard.js';

// Importación de funciones relacionadas con los datos.
import { applyFilters } from '../dataDashboard.js';

// Importación de la función que actualiza todas las visualizaciones del dashboard.
import { updateAllVisualizations } from '../main.js';

// Variable para la referencia al selector de rango de fechas.
let daterangepicker;

/**
 * Inicializa el selector de rango de fechas en la interfaz.
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
 * Inicializa los filtros de planta y status con opciones basadas en los datos.
 * @param {Array} data - Conjunto completo de datos para extraer las opciones de filtrado.
 */
export function initializeFilters(data) {
    // === INICIALIZACIÓN DEL FILTRO DE PLANTAS ===
    const plantaFilter = document.getElementById('plantaFilter');
    const plantas = [...new Set(data.map(item => item.planta))].filter(Boolean).sort();
    
    while (plantaFilter.options.length > 1) {
        plantaFilter.remove(1);
    }
    
    if (plantaFilter.options.length > 0) {
        plantaFilter.options[0].textContent = "All Plants";
    }
    
    plantas.forEach(planta => {
        const option = document.createElement('option');
        option.value = planta;
        option.textContent = planta;
        plantaFilter.appendChild(option);
    });
    
    // === INICIALIZACIÓN DEL FILTRO DE ESTADOS (STATUS) ===
    const statusFilter = document.getElementById('statusFilter');
    const statuses = [...new Set(data.map(item => item.status_name))].filter(Boolean).sort();
    
    while (statusFilter.options.length > 1) {
        statusFilter.remove(1);
    }
    
    if (statusFilter.options.length > 0) {
        statusFilter.options[0].textContent = "All Statuses";
    }
    
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        
        let displayText = status;
        const statusTranslations = {
            'pendiente': 'Pending',
            'aprobado': 'Approved',
            'rechazado': 'Rejected',
            'en proceso': 'In Progress',
            'completado': 'Completed',
            'cancelado': 'Cancelled'
        };
        
        const lowerStatus = status.toLowerCase();
        if (statusTranslations[lowerStatus]) {
            displayText = statusTranslations[lowerStatus];
        } else {
            displayText = status.charAt(0).toUpperCase() + status.slice(1);
        }
        
        option.textContent = displayText;
        statusFilter.appendChild(option);
    });

    // --- ¡CAMBIO MEJORADO! ---
    // Se busca de forma robusta el valor que representa un estado "aprobado".
    // Esto funciona incluso si los datos usan "Approved", "aprobado", etc.
    let approvedOptionValue = null;
    // Iteramos sobre las opciones que acabamos de añadir al <select>
    for (const option of statusFilter.options) {
        const optionValue = option.value.toLowerCase();
        if (optionValue === 'aprobado' || optionValue === 'approved') {
            // Guardamos el valor exacto del dato (respetando mayúsculas/minúsculas)
            approvedOptionValue = option.value;
            break; // Salimos del bucle al encontrar la primera coincidencia
        }
    }

    // Si se encontró un valor para "aprobado", se establece como el valor por defecto.
    if (approvedOptionValue) {
        statusFilter.value = approvedOptionValue;
    } else {
        // Opcional: un aviso en la consola si no se encuentra un estado de aprobación.
        console.warn("No se encontró un estado 'aprobado' o 'approved' para establecer por defecto.");
    }
    
    // === CONFIGURACIÓN DE EVENTOS PARA LOS FILTROS ===
    plantaFilter.addEventListener('change', triggerFilterUpdate);
    statusFilter.addEventListener('change', triggerFilterUpdate);
}

/**
 * Obtiene los valores actuales de todos los filtros en la interfaz.
 * @returns {Object} Objeto con los criterios de filtrado actuales.
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
 * Desencadena el proceso completo de actualización tras un cambio en los filtros.
 */
function triggerFilterUpdate() {
    const filterValues = getFilterValues();
    applyFilters(filterValues);
    updateAllVisualizations();
}