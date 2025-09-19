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
 * Calcula la categoría de referencia basada en reference_number y reference_name
 */
function calculateReference(referenceNumber, referenceName) {
    console.log('🔢 [calculateReference] Calculating reference for:', { referenceNumber, referenceName });
    
    // Convertir a string para evitar errores
    const refNumber = String(referenceNumber || '');
    const refName = String(referenceName || '');
    
    console.log('🔍 [calculateReference] After string conversion:', { 
        refNumber, 
        refName,
        refNumberType: typeof refNumber,
        refNumberLength: refNumber.length,
        startsWithCheck: refNumber.startsWith('45')
    });
    
    // ✅ NUEVA LÓGICA: Verificar categorías en orden de prioridad
    
    // 1. Verificar si reference_number comienza con "45"
    if (refNumber.startsWith('45')) {
        console.log('✅ [calculateReference] Found 45 in reference_number:', refNumber);
        return '45';
    } else {
        console.log('❌ [calculateReference] reference_number does NOT start with 45:', refNumber);
    }
    
    // 2. ✅ NUEVO: Verificar si reference_name contiene palabras que comienzan con "45"
    if (refName) {
        // Dividir en palabras y buscar cualquiera que comience con "45"
        const words = refName.split(/[\s\-_.,;:]+/); // Dividir por espacios, guiones, puntos, etc.
        console.log('🔍 [calculateReference] Words from reference_name:', words);
        
        const has45Word = words.some(word => {
            const trimmedWord = word.trim();
            const starts45 = trimmedWord.startsWith('45');
            console.log(`  - Word: "${trimmedWord}" starts with 45: ${starts45}`);
            return starts45;
        });
        
        if (has45Word) {
            console.log('✅ [calculateReference] Found word starting with 45 in reference_name:', refName);
            return '45';
        } else {
            console.log('❌ [calculateReference] No word starts with 45 in reference_name:', refName);
        }
    }
    
    // 3. Verificar si reference_number comienza con "3"
    if (refNumber.startsWith('3')) {
        console.log('✅ [calculateReference] Found 3 in reference_number:', refNumber);
        return '3';
    }
    
    // 4. Verificar si reference_name incluye "CC"
    if (refName.toUpperCase().includes('CC')) {
        console.log('✅ [calculateReference] Found CC in reference_name:', refName);
        return 'CC';
    }
    
    // 5. Categoría por defecto
    console.log('⚠️ [calculateReference] Default category: Order (no match found)');
    return 'Order';
}

/**
 * Procesa los datos de órdenes agregando campos calculados
 */
function processOrdersData(orders) {
    console.log('⚙️ [processOrdersData] Processing orders data...');
    console.log('- Total orders to process:', orders.length);
    
    return orders.map((order, index) => {
        // Log algunos casos para debugging
        if (index < 5 || order.reference_number?.toString().startsWith('45')) {
            console.log(`📋 [processOrdersData] Processing order ${index + 1}:`, {
                id: order.id,
                reference_number: order.reference_number,
                reference_name: order.reference_name,
                reference_number_type: typeof order.reference_number
            });
        }
        
        // Agregar campo Reference calculado
        order.reference = calculateReference(order.reference_number, order.reference_name);
        
        // Log el resultado
        if (index < 5 || order.reference_number?.toString().startsWith('45')) {
            console.log(`✅ [processOrdersData] Order ${index + 1} result:`, {
                id: order.id,
                calculated_reference: order.reference
            });
        }
        
        // Asegurar que recovery existe (viene del endpoint)
        if (!order.recovery) {
            order.recovery = '';
        }
        
        return order;
    });
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
        
        // 🔍 DEBUG: Buscar específicamente el reference_number que mencionas
        const debugOrder = orders.find(order => order.reference_number?.toString() === '4500948690');
        if (debugOrder) {
            console.log('🔍 [DEBUG] Found order with reference_number 4500948690:', {
                id: debugOrder.id,
                reference_number: debugOrder.reference_number,
                reference_name: debugOrder.reference_name,
                reference_number_type: typeof debugOrder.reference_number,
                reference_number_value: debugOrder.reference_number,
                full_order: debugOrder
            });
        } else {
            console.log('🔍 [DEBUG] Order with reference_number 4500948690 NOT found');
            // Buscar orders que contengan "4500948690" en cualquier campo
            const similarOrders = orders.filter(order => 
                JSON.stringify(order).includes('4500948690')
            );
            console.log('🔍 [DEBUG] Orders containing 4500948690:', similarOrders);
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
 * Genera botones para DataTables (exportar, etc.) con estilos incluidos
 */
function getDataTableButtons(title, data) {
    console.log('🔘 [getDataTableButtons] Generating buttons for:', title, 'with', data?.length || 'unknown', 'items');
    
    return [
        {
            extend: 'excelHtml5',
            title: title,
            text: '<i class="fas fa-file-excel"></i> Excel',
            className: 'btn btn-success btn-sm',
            customize: function(xlsx) {
                var sheet = xlsx.xl.worksheets['sheet1.xml'];
                
                // Aplicar estilos basados en el estado de la orden
                $('row c[r*="21"]', sheet).each(function (index) { // Columna de Status (índice 20 = columna U)
                    var cellValue = $(this).text();
                    var rowIndex = index + 2; // +2 porque empezamos desde la fila 2 (después del header)
                    
                    if (cellValue.includes('Approved')) {
                        // Verde para aprobados
                        $('row[r="' + rowIndex + '"] c', sheet).attr('s', '10');
                    } else if (cellValue.includes('Rejected')) {
                        // Rojo para rechazados
                        $('row[r="' + rowIndex + '"] c', sheet).attr('s', '11');
                    } else if (cellValue.includes('In Review') || cellValue.includes('Pending')) {
                        // Amarillo para pendientes
                        $('row[r="' + rowIndex + '"] c', sheet).attr('s', '12');
                    }
                });
            }
        },
        {
            extend: 'csvHtml5',
            title: title,
            text: '<i class="fas fa-file-csv"></i> CSV',
            className: 'btn btn-info btn-sm',
            exportOptions: {
                format: {
                    body: function (data, row, column, node) {
                        // Para CSV, agregar indicadores de estado
                        if (column === 20) { // Columna de Status
                            var $node = $(node);
                            if ($node.closest('tr').hasClass('status-approved')) {
                                return '[APPROVED] ' + data;
                            } else if ($node.closest('tr').hasClass('status-rejected')) {
                                return '[REJECTED] ' + data;
                            } else if ($node.closest('tr').hasClass('status-review')) {
                                return '[PENDING] ' + data;
                            }
                        }
                        return data;
                    }
                }
            }
        },
        {
            extend: 'pdfHtml5',
            title: title,
            text: '<i class="fas fa-file-pdf"></i> PDF',
            className: 'btn btn-danger btn-sm',
            orientation: 'landscape',
            pageSize: 'A4',
            customize: function(doc) {
                // Aplicar estilos de color en PDF
                var rowCount = doc.content[1].table.body.length;
                
                for (var i = 1; i < rowCount; i++) {
                    var statusCell = doc.content[1].table.body[i][20]; // Columna de Status
                    
                    if (statusCell && statusCell.text) {
                        var statusText = statusCell.text.toString();
                        
                        if (statusText.includes('Approved')) {
                            // Verde para aprobados
                            for (var j = 0; j < doc.content[1].table.body[i].length; j++) {
                                doc.content[1].table.body[i][j].fillColor = '#d4edda';
                            }
                        } else if (statusText.includes('Rejected')) {
                            // Rojo para rechazados
                            for (var j = 0; j < doc.content[1].table.body[i].length; j++) {
                                doc.content[1].table.body[i][j].fillColor = '#f8d7da';
                            }
                        } else if (statusText.includes('In Review') || statusText.includes('Pending')) {
                            // Amarillo para pendientes
                            for (var j = 0; j < doc.content[1].table.body[i].length; j++) {
                                doc.content[1].table.body[i][j].fillColor = '#fff3cd';
                            }
                        }
                    }
                }
            }
        },
        {
            extend: 'print',
            title: title,
            text: '<i class="fas fa-print"></i> Print',
            className: 'btn btn-secondary btn-sm',
            customize: function(win) {
                // Agregar estilos CSS para impresión
                $(win.document.body).prepend(`
                    <style>
                        .status-approved { background-color: #d4edda !important; }
                        .status-rejected { background-color: #f8d7da !important; }
                        .status-review { background-color: #fff3cd !important; }
                        @media print {
                            .status-approved { background-color: #d4edda !important; -webkit-print-color-adjust: exact; }
                            .status-rejected { background-color: #f8d7da !important; -webkit-print-color-adjust: exact; }
                            .status-review { background-color: #fff3cd !important; -webkit-print-color-adjust: exact; }
                        }
                    </style>
                `);
                
                // Aplicar clases CSS a las filas
                $(win.document.body).find('table tbody tr').each(function(index) {
                    var statusCell = $(this).find('td').eq(20);
                    if (statusCell.length) {
                        var statusText = statusCell.text();
                        if (statusText.includes('Approved')) {
                            $(this).addClass('status-approved');
                        } else if (statusText.includes('Rejected')) {
                            $(this).addClass('status-rejected');
                        } else if (statusText.includes('In Review') || statusText.includes('Pending')) {
                            $(this).addClass('status-review');
                        }
                    }
                });
            }
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