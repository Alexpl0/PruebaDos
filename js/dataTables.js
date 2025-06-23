/**
 * Premium Freight - Shared DataTables Utilities
 * Funciones compartidas para las páginas de histórico semanal y total
 */

// Variables globales compartidas
let isLoading = false;
let allOrdersData = [];
let dataCache = new Map();

// Configuración común  
const BATCH_SIZE = 50;
const DEBOUNCE_DELAY = 300;
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

/**
 * Get base URL helper function with fallback
 * @returns {string} The base URL for API calls
 */
function getBaseURL() {
    if (typeof URLPF !== 'undefined' && URLPF) {
        return URLPF;
    }
    if (typeof window !== 'undefined' && window.URLPF) {
        return window.URLPF;
    }
    return '/';
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
        
        if (isNaN(dateObj.getTime())) {
            return 'N/A';
        }
        
        // Crear una copia para no modificar la fecha original
        const tempDate = new Date(dateObj.getTime());
        
        // ISO week date (Monday as first day)
        tempDate.setHours(0, 0, 0, 0);
        tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
        
        // January 4 is always in week 1
        const week1 = new Date(tempDate.getFullYear(), 0, 4);
        
        // Calculate week number
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
        buttons: [
            {
                extend: 'excel',
                text: '<i class="fas fa-file-excel"></i> Excel',
                className: 'btn btn-success btn-sm buttons-excel',
                filename: `${filename}_${new Date().toISOString().split('T')[0]}`,
                title: title,
                exportOptions: { columns: ':not(:last-child)' }
            },
            {
                extend: 'csv',
                text: '<i class="fas fa-file-csv"></i> CSV',
                className: 'btn btn-info btn-sm buttons-csv',
                filename: `${filename}_${new Date().toISOString().split('T')[0]}`,
                title: title,
                exportOptions: { columns: ':not(:last-child)' }
            },
            {
                extend: 'print',
                text: '<i class="fas fa-print"></i> Print',
                className: 'btn btn-secondary btn-sm buttons-print',
                title: title,
                exportOptions: { columns: ':not(:last-child)' }
            },
            {
                text: '<i class="fas fa-file-pdf"></i> SVG',
                className: 'btn btn-danger btn-sm buttons-svg',
                action: async function () {
                    const ordersToExport = filteredOrdersData.length ? filteredOrdersData : allOrdersData;
                    for (const order of ordersToExport) {
                        await generatePDF(order);
                    }
                    showSuccessToast('PDFs generated successfully!');
                }
            }
        ],
        pageLength: 25,
        responsive: true,
        columnDefs: [
            { targets: [0], width: "80px", className: "text-center" }, // ID
            { targets: [1, 2, 3], width: "100px", className: "text-center" }, // Division, Plant Code, Plant Name
            { targets: [4], width: "120px", className: "text-center" }, // Issue Date
            {
                targets: [10], // Description column
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
 * @param {Array} ordersData - Array of orders to export
 * @returns {Array} Buttons configuration
 */
function getDataTableButtons(ordersData) {
    return [
        {
            extend: 'excel',
            text: '<i class="fas fa-file-excel"></i> Excel',
            className: 'btn btn-success btn-sm buttons-excel',
            filename: `Orders_${new Date().toISOString().split('T')[0]}`,
            title: 'Orders History',
            exportOptions: { columns: ':not(:last-child)' }
        },
        {
            extend: 'csv',
            text: '<i class="fas fa-file-csv"></i> CSV',
            className: 'btn btn-info btn-sm buttons-csv',
            filename: `Orders_${new Date().toISOString().split('T')[0]}`,
            title: 'Orders History',
            exportOptions: { columns: ':not(:last-child)' }
        },
        {
            text: '<i class="fas fa-file-pdf"></i> SVG',
            className: 'btn btn-danger btn-sm buttons-svg',
            action: async function () {
                const ordersToExport = ordersData.length ? ordersData : [];
                for (const order of ordersToExport) {
                    await generatePDF(order);
                }
                showSuccessToast('PDFs generated successfully!');
            }
        }
    ];
}

/**
 * Load orders data from API
 * @returns {Promise<Array>} Promise resolving to orders array
 */
async function loadOrdersData() {
    try {
        console.log('[DataTables] 🔄 Loading orders data...');
        
        const baseUrl = getBaseURL();
        const response = await fetch(`${baseUrl}dao/conections/daoPremiumFreight.php`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[DataTables] 📋 Server response:', data);
        
        if (data.status === 'error') {
            throw new Error(data.message || 'Unknown server error');
        }
        
        const orders = Array.isArray(data) ? data : (data.data || []);
        console.log('[DataTables] ✅ Orders loaded:', orders);
        
        return orders;
    } catch (error) {
        console.error('[DataTables] ❌ Error loading orders data:', error);
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
    if (isNaN(numericCost)) return '-';
    
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numericCost);
}

/**
 * Format weight value for display
 * @param {number|string} weight - Weight value
 * @returns {string} Formatted weight
 */
function formatWeight(weight) {
    if (!weight || weight === '-' || isNaN(weight)) return '-';
    
    const numericWeight = parseFloat(weight);
    if (isNaN(numericWeight)) return '-';
    
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numericWeight) + ' kg';
}

/**
 * Show loading message
 * @param {string} title - Loading title
 * @param {string} text - Loading text
 */
function showLoading(title, text) {
    Swal.fire({
        title: title,
        text: text,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

/**
 * Show success toast
 * @param {string} message - Success message
 */
function showSuccessToast(message) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

/**
 * Show error message
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showErrorMessage(title, message) {
    Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        confirmButtonText: 'OK',
        confirmButtonColor: '#034C8C'
    });
}

/**
 * Show informational toast
 * @param {string} message - Informational message
 */
function showInfoToast(message) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

/**
 * Add notification styles
 */
function addNotificationStyles() {
    console.log('[DataTables] Adding notification styles...');
    const style = document.createElement('style');
    style.innerHTML = `
        .toast-success {
            background-color: #28a745;
            color: #fff;
            padding: 10px;
            border-radius: 5px;
        }
        .toast-error {
            background-color: #dc3545;
            color: #fff;
            padding: 10px;
            border-radius: 5px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    console.log('[TotalHistory] Setting up keyboard shortcuts...');
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            const filterPanel = document.getElementById('filterPanelBody');
            if (filterPanel) {
                filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
            }
        }
    });
}

console.log('[DataTables] 📊 DataTables utilities module loaded successfully');