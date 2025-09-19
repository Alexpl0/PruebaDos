/**
 * Premium Freight - DataTables Utilities (Refactored)
 * Shared utilities for DataTables across different pages
 */
import { generatePDF } from './svgOrders.js';
import { addNotificationStyles } from './utils.js';

// Variables globales para filtros (solo si es necesario)
let availableFilters = {};
let currentFilters = {};

// ==========================================
// FUNCIONES AUXILIARES COMPARTIDAS
// ==========================================

/**
 * Muestra un mensaje de error usando SweetAlert2
 */
function showErrorMessage(title, message) {
    console.log('🚨 [showErrorMessage]', title, message);
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            confirmButtonColor: '#d33'
        });
    } else {
        alert(`${title}: ${message}`);
    }
}

/**
 * Muestra un toast de información
 */
function showInfoToast(message) {
    console.log('ℹ️ [showInfoToast]', message);
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: message,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    } else {
        console.info(message);
    }
}

/**
 * Muestra un toast de éxito
 */
function showSuccessToast(message) {
    console.log('✅ [showSuccessToast]', message);
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: message,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    } else {
        console.log(message);
    }
}

/**
 * Muestra una ventana de carga
 */
function showLoading(title, message) {
    console.log('⏳ [showLoading]', title, message);
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            html: message,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    } else {
        console.log(`${title}: ${message}`);
    }
}

/**
 * Configura el toggle para mostrar/ocultar filtros
 */
function setupToggleFilters(toggleButtonId, panelBodyId) {
    console.log('🔀 [setupToggleFilters] Setting up toggle for:', toggleButtonId, panelBodyId);
    const toggleButton = document.getElementById(toggleButtonId);
    const panelBody = document.getElementById(panelBodyId);
    
    console.log('- Toggle button found:', !!toggleButton);
    console.log('- Panel body found:', !!panelBody);
    
    if (toggleButton && panelBody) {
        toggleButton.addEventListener('click', function() {
            const isHidden = panelBody.style.display === 'none';
            panelBody.style.display = isHidden ? 'block' : 'none';
            
            // Cambiar texto del botón
            const icon = toggleButton.querySelector('i');
            if (icon) {
                if (isHidden) {
                    icon.className = 'fas fa-chevron-up';
                } else {
                    icon.className = 'fas fa-chevron-down';
                }
            }
        });
        
        // Inicialmente oculto
        panelBody.style.display = 'none';
        console.log('✅ [setupToggleFilters] Toggle setup completed');
    } else {
        console.warn('⚠️ [setupToggleFilters] Toggle elements not found');
    }
}

/**
 * Genera los filtros dinámicamente desde el backend
 */
async function generateFilters(apiUrl) {
    console.log('🔧 [generateFilters] Generating filters from:', apiUrl);
    try {
        const response = await fetch(`${apiUrl}?action=getFilterOptions`);
        console.log('- Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const filterData = await response.json();
        console.log('- Filter data received:', filterData);
        availableFilters = filterData;
        
        // Generar HTML de filtros
        const filterContainer = document.getElementById('filterContainer');
        console.log('- Filter container found:', !!filterContainer);
        
        if (filterContainer && filterData) {
            let filtersHTML = '';
            
            // Filtro de fecha
            filtersHTML += `
                <div class="col-md-3 mb-3">
                    <label class="form-label">Date Range</label>
                    <input type="date" class="form-control" id="filter_date_from" placeholder="From">
                    <input type="date" class="form-control mt-1" id="filter_date_to" placeholder="To">
                </div>
            `;
            
            // Otros filtros basados en los datos
            Object.keys(filterData).forEach(key => {
                if (Array.isArray(filterData[key]) && filterData[key].length > 0) {
                    filtersHTML += `
                        <div class="col-md-3 mb-3">
                            <label class="form-label">${key.charAt(0).toUpperCase() + key.slice(1)}</label>
                            <select class="form-select" id="filter_${key}">
                                <option value="">All ${key}</option>
                                ${filterData[key].map(item => `<option value="${item}">${item}</option>`).join('')}
                            </select>
                        </div>
                    `;
                }
            });
            
            filterContainer.innerHTML = filtersHTML;
            console.log('✅ [generateFilters] Filters HTML generated');
        }
        
    } catch (error) {
        console.error('💥 [generateFilters] Error generating filters:', error);
        showErrorMessage('Filter Error', 'Could not load filter options');
    }
}

/**
 * Aplica los filtros a los datos
 */
function applyFilters(data) {
    console.log('🔍 [applyFilters] Applying filters to data:', data?.length || 'unknown length');
    
    // Obtener valores de filtros
    const filters = {};
    const filterElements = document.querySelectorAll('[id^="filter_"]');
    console.log('- Filter elements found:', filterElements.length);
    
    filterElements.forEach(element => {
        const filterKey = element.id.replace('filter_', '');
        const value = element.value.trim();
        if (value) {
            filters[filterKey] = value;
        }
    });
    
    console.log('- Active filters:', filters);
    currentFilters = filters;
    
    // Aplicar filtros
    const filteredData = data.filter(order => {
        let matches = true;
        
        Object.keys(filters).forEach(filterKey => {
            const filterValue = filters[filterKey];
            
            if (filterKey === 'date_from') {
                matches = matches && (new Date(order.date) >= new Date(filterValue));
            } else if (filterKey === 'date_to') {
                matches = matches && (new Date(order.date) <= new Date(filterValue));
            } else {
                // Filtro genérico por campo
                const orderValue = order[filterKey] || '';
                matches = matches && orderValue.toString().toLowerCase().includes(filterValue.toLowerCase());
            }
        });
        
        return matches;
    });
    
    console.log('✅ [applyFilters] Filters applied, result:', filteredData.length, 'items');
    return filteredData;
}

/**
 * Limpia todos los filtros
 */
function clearFilters(data) {
    console.log('🧹 [clearFilters] Clearing all filters');
    
    // Limpiar campos de filtro
    const filterElements = document.querySelectorAll('[id^="filter_"]');
    console.log('- Filter elements to clear:', filterElements.length);
    
    filterElements.forEach(element => {
        element.value = '';
    });
    
    currentFilters = {};
    console.log('✅ [clearFilters] All filters cleared');
    return data; // Retornar todos los datos sin filtrar
}

/**
 * Procesa los datos de órdenes agregando campos calculados
 */
function processOrdersData(orders) {
    console.log('⚙️ [processOrdersData] Processing orders data...');
    
    return orders.map(order => {
        // Agregar campo Reference calculado
        order.reference = calculateReference(order.reference_number, order.reference_name);
        
        // Asegurar que recovery existe (viene del endpoint)
        if (!order.recovery) {
            order.recovery = '';
        }
        
        return order;
    });
}

/**
 * Calcula la categoría de referencia basada en reference_number y reference_name
 */
function calculateReference(referenceNumber, referenceName) {
    console.log('🔢 [calculateReference] Calculating reference for:', { referenceNumber, referenceName });
    
    // Convertir a string para evitar errores
    const refNumber = String(referenceNumber || '');
    const refName = String(referenceName || '');
    
    // Verificar categorías en orden de prioridad
    if (refNumber.startsWith('45')) {
        return '45';
    }
    
    if (refNumber.startsWith('3')) {
        return '3';
    }
    
    if (refName.toUpperCase().includes('CC')) {
        return 'CC';
    }
    
    // Categoría por defecto
    return 'Order';
}

/**
 * Carga los datos de órdenes desde el backend (modificada)
 */
async function loadOrdersData() {
    console.log('🌐 [loadOrdersData] Starting data load...');
    
    try {
        const baseURL = window.PF_CONFIG.app.baseURL;
        const url = `${baseURL}dao/conections/daoPremiumFreight.php?action=getAllOrders`;
        console.log('- Request URL:', url);
        
        const response = await fetch(url);
        console.log('- Response status:', response.status);
        console.log('- Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('- Raw response data:', data);
        console.log('- Data type:', typeof data);
        console.log('- Data structure:', {
            hasStatus: 'status' in data,
            hasData: 'data' in data,
            hasOrders: 'orders' in data,
            isArray: Array.isArray(data)
        });
        
        // ✅ AQUÍ ESTÁ EL FIX: Extraer correctamente los datos del objeto respuesta
        let orders = [];
        
        if (data.error) {
            throw new Error(data.message || 'Unknown server error');
        }
        
        // El backend devuelve: {status: 'success', data: Array(83), user_info: {...}}
        if (data.status === 'success' && data.data && Array.isArray(data.data)) {
            orders = data.data;
            console.log('✅ [loadOrdersData] Orders extracted from data.data');
        } 
        // Fallback para otras estructuras posibles
        else if (data.orders && Array.isArray(data.orders)) {
            orders = data.orders;
            console.log('✅ [loadOrdersData] Orders extracted from data.orders');
        }
        // Si la respuesta directa es un array
        else if (Array.isArray(data)) {
            orders = data;
            console.log('✅ [loadOrdersData] Direct array response');
        }
        // Si no encuentra estructura conocida
        else {
            console.warn('⚠️ [loadOrdersData] Unknown response structure, returning empty array');
            orders = [];
        }
        
        // ✅ NUEVO: Procesar los datos agregando campos calculados
        const processedOrders = processOrdersData(orders);
        
        console.log('✅ [loadOrdersData] Final processed orders array:', {
            length: processedOrders.length,
            firstOrder: processedOrders[0] || 'No orders',
            type: typeof processedOrders,
            isArray: Array.isArray(processedOrders),
            sampleReference: processedOrders[0]?.reference || 'No reference',
            sampleRecovery: processedOrders[0]?.recovery || 'No recovery'
        });
        
        return processedOrders;
        
    } catch (error) {
        console.error('💥 [loadOrdersData] Error loading orders data:', error);
        console.error('- Error stack:', error.stack);
        throw error;
    }
}

/**
 * Genera botones para DataTables (exportar, etc.)
 */
function getDataTableButtons(title, data) {
    console.log('🔘 [getDataTableButtons] Generating buttons for:', title, 'with', data?.length || 'unknown', 'items');
    
    return [
        {
            extend: 'excelHtml5',
            title: title,
            text: '<i class="fas fa-file-excel"></i> Excel',
            className: 'btn btn-success btn-sm'
        },
        {
            extend: 'csvHtml5',
            title: title,
            text: '<i class="fas fa-file-csv"></i> CSV',
            className: 'btn btn-info btn-sm'
        },
        {
            extend: 'pdfHtml5',
            title: title,
            text: '<i class="fas fa-file-pdf"></i> PDF',
            className: 'btn btn-danger btn-sm',
            orientation: 'landscape',
            pageSize: 'A4'
        },
        {
            extend: 'print',
            title: title,
            text: '<i class="fas fa-print"></i> Print',
            className: 'btn btn-secondary btn-sm'
        }
    ];
}

// Exportar las funciones necesarias (actualizada)
export { 
    getDataTableButtons,
    showErrorMessage,
    showInfoToast,
    showSuccessToast,
    showLoading,
    setupToggleFilters,
    generateFilters,
    applyFilters,
    clearFilters,
    loadOrdersData,
    processOrdersData,
    calculateReference
};