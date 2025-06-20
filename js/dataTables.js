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
    return '/dao/conections/';
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
                className: 'btn btn-success btn-sm',
                filename: `${filename}_${new Date().toISOString().split('T')[0]}`,
                title: title,
                exportOptions: {
                    columns: ':not(:last-child)' // Exclude Actions column
                }
            },
            {
                extend: 'csv',
                text: '<i class="fas fa-file-csv"></i> CSV',
                className: 'btn btn-info btn-sm',
                filename: `${filename}_${new Date().toISOString().split('T')[0]}`,
                title: title,
                exportOptions: {
                    columns: ':not(:last-child)'
                }
            },
            {
                extend: 'print',
                text: '<i class="fas fa-print"></i> Print',
                className: 'btn btn-secondary btn-sm',
                title: title,
                exportOptions: {
                    columns: ':not(:last-child)'
                }
            }
        ],
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        responsive: true,
        scrollX: true,
        columnDefs: [
            {
                targets: [0], // ID column
                width: "60px"
            },
            {
                targets: [13], // Cost column
                render: function(data, type, row) {
                    if (type === 'display' || type === 'type') {
                        return formatCost(data);
                    }
                    return data;
                }
            },
            {
                targets: [21], // Weight column
                render: function(data, type, row) {
                    if (type === 'display' || type === 'type') {
                        return formatWeight(data);
                    }
                    return data;
                }
            },
            {
                targets: [31], // Approval Date column
                render: function(data, type, row) {
                    if (type === 'display' || type === 'type') {
                        return data && data !== '-' ? new Date(data).toLocaleDateString('en-US') : '-';
                    }
                    return data;
                }
            },
            {
                targets: [11], // Description column
                render: function(data, type, row) {
                    if (type === 'display') {
                        return `<span class="table-description" title="${data}">${data}</span>`;
                    }
                    return data;
                }
            },
            {
                targets: [-1], // Actions column (last column)
                orderable: false,
                searchable: false,
                width: "80px"
            }
        ],
        order: [[0, 'desc']], // Order by ID descending
        language: {
            search: "Search orders:",
            lengthMenu: "Show _MENU_ orders per page",
            info: "Showing _START_ to _END_ of _TOTAL_ orders",
            infoEmpty: "No orders found",
            infoFiltered: "(filtered from _MAX_ total orders)",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            },
            emptyTable: "No orders data available",
            zeroRecords: "No matching orders found"
        },
        processing: true,
        stateSave: true,
        stateDuration: 60 * 60 * 24, // 24 hours
        searchHighlight: true
    };
}

/**
 * Load orders data from API
 * @returns {Promise<Array>} Promise resolving to orders array
 */
async function loadOrdersData() {
    try {
        console.log('[DataTables] 🔄 Loading orders data...');
        
        // Check cache first
        const cacheKey = 'all_orders';
        if (dataCache.has(cacheKey)) {
            const cachedData = dataCache.get(cacheKey);
            const now = Date.now();
            if (now - cachedData.timestamp < 5 * 60 * 1000) { // 5 minutes cache
                console.log('[DataTables] 📋 Using cached data');
                return cachedData.data;
            }
        }
        
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
        
        if (data.status === 'error') {
            throw new Error(data.message || 'Unknown server error');
        }
        
        const orders = Array.isArray(data) ? data : (data.data || []);
        
        // Cache the data
        dataCache.set(cacheKey, {
            data: orders,
            timestamp: Date.now()
        });
        
        console.log(`[DataTables] ✅ Loaded ${orders.length} orders successfully`);
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
 * Format creator name for display
 * @param {string} creatorName - Creator name
 * @returns {string} Formatted creator name
 */
function formatCreatorName(creatorName) {
    if (!creatorName || creatorName === '-') return '-';
    
    // Capitalize first letter of each word
    return creatorName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get approval status badge
 * @param {Object} order - Order object
 * @returns {string} HTML for approval status badge
 */
function getApprovalStatus(order) {
    if (!order) return '<span class="badge bg-secondary">Unknown</span>';
    
    // Check if order has approval data
    if (order.approval_date && order.approver_name) {
        return '<span class="badge bg-success">Approved</span>';
    }
    
    // Check if order was rejected
    if (order.status_name && order.status_name.toLowerCase().includes('reject')) {
        return '<span class="badge bg-danger">Rejected</span>';
    }
    
    // Check status for pending states
    if (order.status_name) {
        const status = order.status_name.toLowerCase();
        if (status.includes('pending') || status.includes('waiting')) {
            return '<span class="badge bg-warning">Pending</span>';
        }
        if (status.includes('approved')) {
            return '<span class="badge bg-success">Approved</span>';
        }
        if (status.includes('reject') || status.includes('denied')) {
            return '<span class="badge bg-danger">Rejected</span>';
        }
    }
    
    return '<span class="badge bg-secondary">Pending</span>';
}

/**
 * Generate single PDF for an order
 * @param {number} orderId - Order ID
 */
async function generateSinglePDF(orderId) {
    try {
        console.log(`[DataTables] 📄 Generating PDF for order ${orderId}`);
        
        // Find the order in the current data
        const order = allOrdersData.find(o => o.id == orderId);
        if (!order) {
            throw new Error(`Order ${orderId} not found in current data`);
        }
        
        showLoading('Generating PDF', `Creating PDF for order ${orderId}...`);
        
        // Call the SVG generation function (assuming it's available globally)
        if (typeof handleBatchSVGGeneration === 'function') {
            await handleBatchSVGGeneration([order], `Order_${orderId}`);
        } else {
            throw new Error('PDF generation function not available');
        }
        
        Swal.close();
        showSuccessToast(`PDF generated successfully for order ${orderId}`);
        
    } catch (error) {
        console.error(`[DataTables] ❌ Error generating PDF for order ${orderId}:`, error);
        Swal.close();
        showErrorMessage('PDF Generation Error', `Failed to generate PDF for order ${orderId}: ${error.message}`);
    }
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
 * Show info toast
 * @param {string} message - Info message
 */
function showInfoToast(message) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: message,
        showConfirmButton: false,
        timer: 2000,
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
 * Add notification styles to document
 */
function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
        .swal2-toast {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
            border-radius: 8px !important;
        }
        
        .swal2-toast .swal2-title {
            font-size: 14px !important;
            font-weight: 500 !important;
        }
        
        .swal2-timer-progress-bar {
            background: rgba(3, 76, 140, 0.8) !important;
        }
    `;
    document.head.appendChild(styles);
}

console.log('[DataTables] 📊 DataTables utilities module loaded successfully');