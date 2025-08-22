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
    const toggleButton = document.getElementById(toggleButtonId);
    const panelBody = document.getElementById(panelBodyId);
    
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
    }
}

/**
 * Genera los filtros dinámicamente desde el backend
 */
async function generateFilters(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}?action=getFilterOptions`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const filterData = await response.json();
        availableFilters = filterData;
        
        // Generar HTML de filtros
        const filterContainer = document.getElementById('filterContainer');
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
        }
        
    } catch (error) {
        console.error('Error generating filters:', error);
        showErrorMessage('Filter Error', 'Could not load filter options');
    }
}

/**
 * Aplica los filtros a los datos
 */
function applyFilters(data) {
    // Obtener valores de filtros
    const filters = {};
    const filterElements = document.querySelectorAll('[id^="filter_"]');
    
    filterElements.forEach(element => {
        const filterKey = element.id.replace('filter_', '');
        const value = element.value.trim();
        if (value) {
            filters[filterKey] = value;
        }
    });
    
    currentFilters = filters;
    
    // Aplicar filtros
    return data.filter(order => {
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
}

/**
 * Limpia todos los filtros
 */
function clearFilters(data) {
    // Limpiar campos de filtro
    const filterElements = document.querySelectorAll('[id^="filter_"]');
    filterElements.forEach(element => {
        element.value = '';
    });
    
    currentFilters = {};
    return data; // Retornar todos los datos sin filtrar
}

/**
 * Carga los datos de órdenes desde el backend
 */
async function loadOrdersData() {
    try {
        const baseURL = window.PF_CONFIG.app.baseURL;
        const response = await fetch(`${baseURL}dao/conections/daoPremiumFreight.php?action=getAllOrders`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.message || 'Unknown server error');
        }
        
        return data.orders || data || [];
        
    } catch (error) {
        console.error('Error loading orders data:', error);
        throw error;
    }
}

/**
 * Genera botones para DataTables (exportar, etc.)
 */
function getDataTableButtons(title, data) {
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

// Exportar las funciones necesarias
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
    loadOrdersData
};