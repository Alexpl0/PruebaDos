/**
 * UTILS.JS - FUNCIONES DE UTILIDAD
 * Este módulo contiene funciones helper comunes utilizadas
 * por todos los otros módulos del dashboard.
 */

// ========================================================================
// FUNCIONES DE FORMATEO
// ========================================================================

/**
 * Formatea números para visualización
 */
export function formatNumber(number, decimals = 0) {
    if (isNaN(number)) return '0';
    return number.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/**
 * Formatea tiempo en segundos a una cadena legible
 */
export function formatTime(seconds) {
    if (seconds === null || seconds < 0) return "N/A";
    if (seconds < 60) return Math.round(seconds) + "s";

    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    let formatted = '';
    if (days > 0) formatted += `${days}d `;
    if (hours > 0) formatted += `${hours}h `;
    if (minutes > 0) formatted += `${minutes}m`;
    
    return formatted.trim() || "0m";
}

// ========================================================================
// FUNCIONES DE UI/UX
// ========================================================================

/**
 * Muestra/oculta el overlay de carga
 */
export function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Muestra mensajes de error
 */
export function showErrorMessage(message) {
    console.error('ERROR:', message);
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
            confirmButtonText: 'Ok'
        });
    } else {
        alert(message);
    }
}

/**
 * Muestra mensajes de éxito
 */
export function showSuccessMessage(title, message, timer = 3000) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            text: message,
            icon: 'success',
            timer: timer,
            showConfirmButton: timer === 0
        });
    } else {
        alert(`${title}: ${message}`);
    }
}

/**
 * Muestra mensajes de advertencia
 */
export function showWarningMessage(title, message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            text: message,
            icon: 'warning',
            confirmButtonText: 'Ok'
        });
    } else {
        alert(`${title}: ${message}`);
    }
}

// ========================================================================
// FUNCIONES DE VALIDACIÓN
// ========================================================================

/**
 * Verifica si un elemento es visible en el DOM
 */
export function isElementVisible(el) {
    if (!el) return false;
    return el.offsetParent !== null && el.style.display !== 'none';
}

/**
 * Verifica si una fecha está en el futuro
 */
export function isFutureDate(date) {
    const today = moment();
    return moment(date).isAfter(today);
}

/**
 * Verifica la disponibilidad de librerías externas
 */
export function checkLibraryAvailability() {
    const libraries = {
        moment: typeof moment !== 'undefined',
        ApexCharts: typeof ApexCharts !== 'undefined',
        XLSX: typeof XLSX !== 'undefined',
        jsPDF: typeof window.jspdf !== 'undefined',
        Swal: typeof Swal !== 'undefined',
        jQuery: typeof $ !== 'undefined'
    };

    console.log('Library availability check:', libraries);
    
    const missing = Object.entries(libraries)
        .filter(([name, available]) => !available)
        .map(([name]) => name);

    if (missing.length > 0) {
        console.warn('Missing libraries:', missing);
    }

    return { available: libraries, missing };
}

// ========================================================================
// FUNCIONES DE CÁLCULOS
// ========================================================================

/**
 * Calcula la diferencia porcentual entre dos valores
 */
export function calculatePercentageChange(current, previous) {
    if (previous === 0 || previous === null) {
        // Si el valor anterior era 0, cualquier aumento es "infinito".
        // Mostramos 100% si el valor actual es positivo, o 0% si no.
        return (current > 0) ? 100 : 0; 
    }
    if (current === null) return null;
    return ((current - previous) / previous) * 100;
}

/**
 * Obtiene el color basado en el tipo de métrica
 */
export function getMetricColor(type) {
    const colors = {
        primary: '#034C8C',
        success: '#218621',
        warning: '#F59E0B',
        danger: '#E41A23',
        info: '#3B82F6'
    };
    return colors[type] || colors.primary;
}

// ========================================================================
// FUNCIONES DE MANEJO DE EVENTOS
// ========================================================================

/**
 * Agrega event listener con manejo de errores
 */
export function addEventListenerSafe(element, event, handler, options = {}) {
    if (!element) {
        console.warn(`Element not found for event listener: ${event}`);
        return;
    }

    try {
        element.addEventListener(event, handler, options);
    } catch (error) {
        console.error(`Error adding event listener for ${event}:`, error);
    }
}

/**
 * Remueve event listener con manejo de errores
 */
export function removeEventListenerSafe(element, event, handler) {
    if (!element) return;

    try {
        element.removeEventListener(event, handler);
    } catch (error) {
        console.error(`Error removing event listener for ${event}:`, error);
    }
}

// ========================================================================
// FUNCIONES DE DEBOUNCE Y THROTTLE
// ========================================================================

/**
 * Función debounce para limitar la frecuencia de ejecución
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Función throttle para limitar la frecuencia de ejecución
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ========================================================================
// FUNCIONES DE DOM
// ========================================================================

/**
 * Busca un elemento de forma segura
 */
export function safeQuerySelector(selector) {
    try {
        return document.querySelector(selector);
    } catch (error) {
        console.error(`Error selecting element: ${selector}`, error);
        return null;
    }
}

/**
 * Busca múltiples elementos de forma segura
 */
export function safeQuerySelectorAll(selector) {
    try {
        return document.querySelectorAll(selector);
    } catch (error) {
        console.error(`Error selecting elements: ${selector}`, error);
        return [];
    }
}

/**
 * Actualiza el contenido de un elemento de forma segura
 */
export function safeUpdateElement(elementId, content, useInnerHTML = true) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Element not found: ${elementId}`);
        return false;
    }

    try {
        if (useInnerHTML) {
            element.innerHTML = content;
        } else {
            element.textContent = content;
        }
        return true;
    } catch (error) {
        console.error(`Error updating element ${elementId}:`, error);
        return false;
    }
}