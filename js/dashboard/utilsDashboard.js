// Funciones de utilidad para el dashboard

/**
 * Muestra u oculta el indicador de carga
 * @param {boolean} show - Indica si se debe mostrar (true) o ocultar (false) el indicador
 */
export function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    } else {
        console.warn('Loading overlay element not found');
    }
    
    // También deshabilitar los botones de filtro durante la carga
    const filterButtons = document.querySelectorAll('#refreshData, #plantaFilter, #statusFilter');
    filterButtons.forEach(button => {
        button.disabled = show;
    });
}

/**
 * Muestra un mensaje de error
 * @param {string} message - Mensaje de error a mostrar
 */
export function showErrorMessage(message) {
    console.error('ERROR:', message);
    
    // Check if SweetAlert2 is available
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
            confirmButtonText: 'Ok'
        });
    } else {
        // Fallback to basic alert
        alert(message);
    }
}

/**
 * Geocodifica una ubicación
 * @param {string} city - Ciudad
 * @param {string} state - Estado
 * @param {string} country - País
 * @returns {Promise} Promesa que resuelve a las coordenadas o null
 */
export async function geocodeLocation(city, state, country) {
    const query = encodeURIComponent(`${city}, ${state || ''}, ${country || ''}`);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        return null;
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

/**
 * Formatea un número para mostrar con separador de miles y decimales
 * @param {number} number - Número a formatear
 * @param {number} maxDecimals - Número máximo de decimales
 * @returns {string} Número formateado
 */
export function formatNumber(number, maxDecimals = 0) {
    return number.toLocaleString(undefined, {maximumFractionDigits: maxDecimals});
}