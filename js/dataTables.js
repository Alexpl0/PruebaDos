/**
 * Premium Freight - Shared DataTables Utilities (Version Original y Completa)
 * Todas las funciones originales han sido preservadas y adaptadas para usar window.PF_CONFIG.
 */
import { generatePDF } from './svgOrders.js';

// Variables globales existentes
let isLoading = false;
let allOrdersData = [];
let dataCache = new Map();

// Configuración común
const BATCH_SIZE = 50;
const DEBOUNCE_DELAY = 300;
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

/**
 * Get base URL helper function with fallback.
 * ADAPTADO: Ahora lee la URL desde el objeto centralizado PF_CONFIG.
 * @returns {string} The base URL for API calls
 */
function getBaseURL() {
    // Lee la URL desde el nuevo objeto de configuración.
    // Proporciona un fallback por si algo falla.
    return window.PF_CONFIG?.app?.baseURL || '/';
}

/**
 * Calculate ISO 8601 week number from a date
 * @param {Date|string} date - Date object or string
 * @returns {number|string} Week number or 'N/A' if invalid
 */
function getWeekNumber(date) {
    if (!date) return 'N/A';
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(dateObj.getTime())) return 'N/A';
        const tempDate = new Date(dateObj.getTime());
        tempDate.setHours(0, 0, 0, 0);
        tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
        const week1 = new Date(tempDate.getFullYear(), 0, 4);
        return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    } catch (error) {
        console.error('[DataTables] Error calculating week number:', error);
        return 'N/A';
    }
}

/**
 * Get DataTable configuration for history pages
 * @param {string} filename - Export filename prefix
 * @param {string} title - Export title
 * @returns {Object} DataTable configuration
 */
function getDataTableConfig(filename, title) {
    return {
        dom: 'Bfrtip',
        buttons: getDataTableButtons(title), // Llama a la función de botones
        pageLength: 25,
        lengthMenu: [25, 50, 100, 200],
        responsive: true,
        columnDefs: [
            { targets: [0], width: "80px", className: "text-center" },
            { targets: [1, 2, 3], width: "100px", className: "text-center" },
            { targets: [4], width: "120px", className: "text-center" },
            {
                targets: [10],
                width: "200px",
                className: "text-left",
                render: function(data, type, row) {
                    if (type === 'display') {
                        return `<span class="table-description" title="${data}">${data}</span>`;
                    }
                    return data;
                }
            }
        ],
        language: {
            search: "Search orders:",
            lengthMenu: "Show _MENU_ orders per page",
            info: "Showing _START_ to _END_ of _TOTAL_ orders",
            infoEmpty: "No orders found",
            infoFiltered: "(filtered from _MAX_ total orders)"
        }
    };
}

/**
 * Get DataTable buttons configuration
 * @param {string} exportTitle - The title for the exported files.
 * @param {Array|null} [ordersData=null] - Optional. Full data for orders to be used in custom actions.
 * @returns {Array} Buttons configuration
 */
function getDataTableButtons(exportTitle = 'Orders_History', ordersData = null) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${exportTitle}_${timestamp}`;
    return [
        { extend: 'excel', text: '<i class="fas fa-file-excel"></i> Excel', className: 'btn btn-success btn-sm', filename, title: exportTitle, exportOptions: { columns: ':not(:last-child)' } },
        { extend: 'pdfHtml5', text: '<i class="fas fa-file-pdf"></i> PDF', className: 'btn btn-danger btn-sm', orientation: 'landscape', pageSize: 'A3', filename, title: exportTitle, exportOptions: { columns: ':not(:last-child)' } },
        { extend: 'print', text: '<i class="fas fa-print"></i> Print', className: 'btn btn-secondary btn-sm', title: exportTitle, exportOptions: { columns: ':not(:last-child)' } },
        {
            text: '<i class="fas fa-file-alt"></i> Export SVGs',
            className: 'btn btn-warning btn-sm buttons-svg',
            action: async function (e, dt, node, config) {
                // Get the IDs of the visible rows after filtering
                const visibleData = dt.rows({ filter: 'applied' }).data().toArray();
                const visibleIds = visibleData.map(row => String(row[0])); // Get IDs as strings for reliable matching

                if (visibleIds.length === 0) {
                    showInfoToast("No orders to export.");
                    return;
                }

                // Check if we have the full data to work with
                if (!ordersData || ordersData.length === 0) {
                    showErrorMessage('Export Error', 'Full order data is not available for this action.');
                    return;
                }

                // Find the full order objects corresponding to the visible IDs
                const ordersToExport = ordersData.filter(order => visibleIds.includes(String(order.id)));

                if (ordersToExport.length === 0) {
                    console.warn('Could not match visible IDs to full order data.', { visibleIds, ordersData });
                    showInfoToast("No matching orders found to export.");
                    return;
                }

                showLoading('Generating PDFs...', `Processing ${ordersToExport.length} orders.`);

                try {
                    // Generate PDF for each order with the custom filename
                    for (const order of ordersToExport) {
                        const customFileName = `PD_${order.id}`;
                        await generatePDF(order, customFileName);
                    }
                    Swal.close();
                    showSuccessToast(`${ordersToExport.length} PDFs generated successfully!`);
                } catch (error) {
                    console.error('Error during PDF batch generation:', error);
                    showErrorMessage('Export Failed', 'An error occurred while generating the PDFs.');
                }
            }
        }
    ];
}

/**
 * Load orders data from API
 * @returns {Promise<Array>} Promise resolving to orders array
 */
async function loadOrdersData() {
    const baseURL = getBaseURL();
    try {
        const response = await fetch(`${baseURL}dao/conections/daoPremiumFreight.php`);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message || 'Unknown server error');
        return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
        console.error('[DataTables] Error loading orders data:', error);
        throw error;
    }
}

/**
 * Format cost value for display
 * @param {number|string} cost - Cost value
 * @returns {string} Formatted cost
 */
function formatCost(cost) {
    if (!cost || cost === '-' || isNaN(cost)) return '-';
    const numericCost = parseFloat(cost);
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(numericCost);
}

/**
 * Format weight value for display
 * @param {number|string} weight - Weight value
 * @returns {string} Formatted weight
 */
function formatWeight(weight) {
    if (!weight || weight === '-' || isNaN(weight)) return '-';
    const numericWeight = parseFloat(weight);
    return `${new Intl.NumberFormat('en-US').format(numericWeight)} kg`;
}

/**
 * Show loading message
 * @param {string} title - Loading title
 * @param {string} text - Loading text
 */
function showLoading(title, text) {
    Swal.fire({ title, text, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
}

/**
 * Show success toast
 * @param {string} message - Success message
 */
function showSuccessToast(message) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: message, showConfirmButton: false, timer: 3000, timerProgressBar: true });
}

/**
 * Show error message
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showErrorMessage(title, message) {
    Swal.fire({ icon: 'error', title, text: message, confirmButtonColor: '#034C8C' });
}

/**
 * Show informational toast
 * @param {string} message - Informational message
 */
function showInfoToast(message) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: message, showConfirmButton: false, timer: 3000, timerProgressBar: true });
}

/**
 * Add notification styles
 */
function addNotificationStyles() {
    const styleId = 'custom-notification-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .toast-success { background-color: #28a745; color: #fff; padding: 10px; border-radius: 5px; }
        .toast-error { background-color: #dc3545; color: #fff; padding: 10px; border-radius: 5px; }
    `;
    document.head.appendChild(style);
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            const filterPanel = document.getElementById('filterPanelBody');
            if (filterPanel) filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
        }
    });
}

/**
 * Generate dynamic filters for the filter panel
 * @param {string} endpoint - API endpoint to fetch data
 */
async function generateFilters(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        const orders = data.data || [];
        const populate = (selectId, values) => {
            const select = document.getElementById(selectId);
            if (!select) return;
            const uniqueValues = [...new Set(values.filter(Boolean))];
            while (select.options.length > 1) select.remove(1);
            uniqueValues.forEach(value => select.add(new Option(value, value)));
        };
        populate('filterPlant', orders.map(o => o.planta));
        populate('filterApprovalStatus', orders.map(o => o.status_name));
    } catch (error) {
        console.error('[DataTables] Error generating filters:', error);
    }
}

/**
 * Apply filters to the data
 * @param {Array} data - Array of data to filter
 * @returns {Array} Filtered data
 */
function applyFilters(data) {
    const filters = {
        date: document.getElementById('filterDate').value,
        plant: document.getElementById('filterPlant').value,
        approvalStatus: document.getElementById('filterApprovalStatus').value,
        costRange: document.getElementById('filterCostRange').value
    };
    const today = new Date();
    return data.filter(order => {
        const orderDate = new Date(order.date);
        const cost = parseFloat(order.cost_euros) || 0;
        const dateMatch = (filters.date === 'all') ||
                          (filters.date === 'week' && (today - orderDate) / (1000 * 60 * 60 * 24) <= 7) ||
                          (filters.date === 'month' && today.getMonth() === orderDate.getMonth() && today.getFullYear() === orderDate.getFullYear()) ||
                          (filters.date === 'year' && today.getFullYear() === orderDate.getFullYear());
        const plantMatch = filters.plant === 'all' || order.planta === filters.plant;
        const statusMatch = filters.approvalStatus === 'all' || order.status_name === filters.approvalStatus;
        const costMatch = (filters.costRange === 'all') ||
                          (filters.costRange === '<1500' && cost < 1500) ||
                          (filters.costRange === '1501-5000' && cost >= 1501 && cost <= 5000) ||
                          (filters.costRange === '5001-10000' && cost >= 5001 && cost <= 10000) ||
                          (filters.costRange === '>10000' && cost > 10000);
        return dateMatch && plantMatch && statusMatch && costMatch;
    });
}

/**
 * Clear filters and reset data
 * @param {Array} data - Original data
 * @returns {Array} Reset data
 */
function clearFilters(data) {
    document.getElementById('filterDate').value = 'all';
    document.getElementById('filterPlant').value = 'all';
    document.getElementById('filterApprovalStatus').value = 'all';
    document.getElementById('filterCostRange').value = 'all';
    return data;
}

/**
 * Setup toggle functionality for filter panel
 * @param {string} toggleButtonId - ID of the toggle button
 * @param {string} filterPanelId - ID of the filter panel
 */
function setupToggleFilters(toggleButtonId, filterPanelId) {
    const toggleBtn = document.getElementById(toggleButtonId);
    const filterPanel = document.getElementById(filterPanelId);
    if (toggleBtn && filterPanel) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = filterPanel.style.display !== 'none';
            filterPanel.style.display = isVisible ? 'none' : 'block';
            toggleBtn.innerHTML = isVisible ? '<i class="fas fa-chevron-down"></i>' : '<i class="fas fa-chevron-up"></i>';
        });
    }
}

export {
    getBaseURL,
    getWeekNumber,
    getDataTableConfig,
    getDataTableButtons,
    loadOrdersData,
    formatCost,
    formatWeight,
    showLoading,
    showSuccessToast,
    showErrorMessage,
    showInfoToast,
    addNotificationStyles,
    setupKeyboardShortcuts,
    generateFilters,
    applyFilters,
    clearFilters,
    setupToggleFilters,
};
