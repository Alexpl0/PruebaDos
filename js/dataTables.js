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
    return window.URLPF || window.URL_BASE || window.BASE_URL || 'https://grammermx.com/Jesus/PruebaDos/';
}

/**
 * Calculate ISO 8601 week number from a date
 * @param {Date|string} date - Date object or string
 * @returns {number|string} Week number or 'N/A' if invalid
 */
function getWeekNumber(date) {
    if (!date) return 'N/A';
    
    try {
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) {
            return 'N/A';
        }
        
        const dayNum = dateObj.getDay() || 7;
        dateObj.setDate(dateObj.getDate() + 4 - dayNum);
        const yearStart = new Date(dateObj.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((dateObj - yearStart) / 86400000) + 1) / 7);
        return weekNum;
    } catch (e) {
        console.error("Error calculating week number:", e);
        return 'N/A';
    }
}

/**
 * Shows a loading indicator with SweetAlert
 * @param {string} title - Title of the loading indicator
 * @param {string} text - Descriptive text
 * @param {number} timer - Optional auto-close timer in ms
 */
function showLoading(title = 'Loading', text = 'Please wait...', timer = null) {
    const options = {
        title,
        text,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        customClass: { container: 'swal-on-top' }
    };
    
    if (timer) {
        options.timer = timer;
        options.timerProgressBar = true;
    }
    
    return Swal.fire(options);
}

/**
 * Add notification badge styles to document
 */
function addNotificationStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .notification-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            width: 24px;
            height: 24px;
            background-color: #ff4444;
            color: white;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            z-index: 10;
        }
        .exclamation-icon {
            font-style: normal;
            font-weight: bold;
            font-size: 14px;
        }
    `;
    document.head.appendChild(styleElement);
}

/**
 * Load orders data from API with caching
 * @param {boolean} useCache - Whether to use cached data
 * @returns {Promise<Array>} Orders data
 */
async function loadOrdersData(useCache = true) {
    if (isLoading) {
        console.log('[DataTables] Already loading data, skipping request');
        return [];
    }
    
    isLoading = true;
    const cacheKey = 'orders_data';
    
    try {
        // Check cache first
        if (useCache && dataCache.has(cacheKey)) {
            const cached = dataCache.get(cacheKey);
            const cacheAge = Date.now() - cached.timestamp;
            if (cacheAge < 5 * 60 * 1000) { // 5 minutes
                console.log('[DataTables] Using cached data');
                isLoading = false;
                return cached.data;
            }
        }
        
        const baseURL = getBaseURL();
        console.log(`[DataTables] Loading data from: ${baseURL}dao/conections/daoPremiumFreight.php`);
        
        const response = await fetch(`${baseURL}dao/conections/daoPremiumFreight.php`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[DataTables] Raw API response received:', { 
            hasData: !!data, 
            dataType: typeof data,
            recordCount: data?.data?.length || 0 
        });
        
        // Extract orders array
        let orders = [];
        if (data && data.status === 'success' && Array.isArray(data.data)) {
            orders = data.data;
        } else if (Array.isArray(data)) {
            orders = data;
        } else {
            console.warn('[DataTables] Unexpected data format:', data);
            return [];
        }
        
        // Cache the response
        dataCache.set(cacheKey, {
            data: orders,
            timestamp: Date.now()
        });
        
        return orders;
        
    } catch (error) {
        console.error('[DataTables] Error loading orders data:', error);
        throw error;
    } finally {
        isLoading = false;
    }
}

/**
 * Calculate comprehensive statistics
 * @param {Array} orders - Array of orders
 * @returns {Object} Statistics object
 */
function calculateStatistics(orders) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentWeek = getWeekNumber(now);
    
    const stats = {
        total: orders.length,
        approved: 0,
        pending: 0,
        rejected: 0,
        totalCost: 0,
        avgCost: 0,
        thisMonth: 0,
        thisWeek: 0,
        byStatus: {},
        byPlant: {},
        byCarrier: {},
        costByMonth: {}
    };
    
    orders.forEach(order => {
        // Count by approval status
        const approvalStatus = order.approval_status;
        const requiredAuthLevel = order.required_auth_level || 7;
        
        if (approvalStatus === null || approvalStatus >= requiredAuthLevel) {
            if (order.status_name?.toLowerCase() === 'rechazado') {
                stats.rejected++;
            } else {
                stats.approved++;
            }
        } else if (approvalStatus === 99) {
            stats.rejected++;
        } else {
            stats.pending++;
        }
        
        // Total cost
        const cost = parseFloat(order.cost_euros) || 0;
        stats.totalCost += cost;
        
        // This month count
        const orderDate = new Date(order.date);
        if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
            stats.thisMonth++;
        }
        
        // This week count
        const orderWeek = getWeekNumber(orderDate);
        if (orderWeek === currentWeek && orderDate.getFullYear() === currentYear) {
            stats.thisWeek++;
        }
        
        // Group by status
        const status = order.status_name || 'Unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        
        // Group by plant
        const plant = order.creator_plant || 'Unknown';
        stats.byPlant[plant] = (stats.byPlant[plant] || 0) + 1;
        
        // Group by carrier
        const carrier = order.carrier || 'Unknown';
        stats.byCarrier[carrier] = (stats.byCarrier[carrier] || 0) + 1;
    });
    
    // Calculate average cost
    stats.avgCost = stats.total > 0 ? stats.totalCost / stats.total : 0;
    
    return stats;
}

/**
 * Format creator name (first initial + last name)
 * @param {string} fullName - Full name of the creator
 * @returns {string} Formatted name
 */
function formatCreatorName(fullName) {
    if (!fullName || typeof fullName !== 'string') return fullName || '-';
    
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    
    return `${parts[0].charAt(0).toUpperCase()}. ${parts[parts.length - 1]}`;
}

/**
 * Format cost with proper currency
 * @param {string|number} cost - Cost value
 * @returns {string} Formatted cost
 */
function formatCost(cost) {
    if (!cost || cost === '0') return '-';
    const numCost = parseFloat(cost);
    return isNaN(numCost) ? '-' : `€${numCost.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/**
 * Format weight
 * @param {string|number} weight - Weight value
 * @returns {string} Formatted weight
 */
function formatWeight(weight) {
    if (!weight || weight === '0') return '-';
    const numWeight = parseFloat(weight);
    return isNaN(numWeight) ? '-' : `${numWeight.toLocaleString()} kg`;
}

/**
 * Get approval status with formatting
 * @param {Object} order - Order object
 * @returns {string} HTML string for approval status
 */
function getApprovalStatus(order) {
    const approvalStatus = order.approval_status;
    const requiredLevel = order.required_auth_level || 7;
    
    if (approvalStatus === null || approvalStatus >= requiredLevel) {
        if (order.status_name?.toLowerCase() === 'rechazado') {
            return '<span class="badge bg-danger">Rejected</span>';
        } else {
            return '<span class="badge bg-success">Fully Approved</span>';
        }
    } else if (approvalStatus === 99) {
        return '<span class="badge bg-danger">Rejected</span>';
    } else {
        return '<span class="badge bg-warning">Pending</span>';
    }
}

/**
 * Common DataTable configuration
 * @param {string} exportPrefix - Prefix for export filenames
 * @param {string} title - Title for exports
 * @returns {Object} DataTable configuration
 */
function getDataTableConfig(exportPrefix, title) {
    return {
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        pageLength: 25,
        destroy: true,
        responsive: true,
        processing: true,
        order: [[0, 'desc']], // Sort by ID descending
        columnDefs: [
            { 
                className: "text-center", 
                targets: [0, 2, 4, 5, 6, 7, 8, 10, 12, 15, 22, 27, 28, 29, 30, 31, 32, 33] 
            },
            { 
                className: "text-end", 
                targets: [13, 21] // Cost and Weight columns
            },
            {
                targets: [11, 26], // Description and Products columns
                render: function(data, type, row) {
                    if (type === 'display' && data && data.length > 50) {
                        return '<span title="' + data.replace(/"/g, '&quot;') + '">' + 
                               data.substr(0, 50) + '...</span>';
                    }
                    return data;
                }
            }
        ],
        language: {
            lengthMenu: "Show _MENU_ records per page",
            zeroRecords: "No matching records found",
            info: "Showing _START_ to _END_ of _TOTAL_ records",
            infoEmpty: "No records available",
            infoFiltered: "(filtered from _MAX_ total records)",
            search: "Search orders:",
            searchPlaceholder: "Type to search...",
            loadingRecords: "Loading orders...",
            processing: "Processing...",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        },
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
             '<"row"<"col-sm-12"<"dt-buttons-wrapper"B>>>' +
             '<"row"<"col-sm-12"tr>>' +
             '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        buttons: [
            {
                extend: 'excel',
                text: '<i class="fas fa-file-excel"></i> Export Excel',
                className: 'btn btn-success btn-sm',
                title: title,
                filename: function() {
                    return `${exportPrefix}_${new Date().toISOString().split('T')[0]}`;
                },
                exportOptions: {
                    columns: ':visible:not(:last-child)' // Exclude actions column
                }
            },
            {
                extend: 'pdf',
                text: '<i class="fas fa-file-pdf"></i> Export PDF',
                className: 'btn btn-danger btn-sm',
                orientation: 'landscape',
                pageSize: 'A3',
                title: title,
                filename: function() {
                    return `${exportPrefix}_${new Date().toISOString().split('T')[0]}`;
                },
                customize: function(doc) {
                    doc.defaultStyle.fontSize = 8;
                    doc.styles.tableHeader.fontSize = 9;
                    doc.styles.tableHeader.fillColor = '#A7CAC3';
                    doc.styles.tableHeader.color = '#000';
                    doc.pageMargins = [15, 40, 15, 40];
                    
                    // Custom header
                    doc.content.splice(0, 0, {
                        margin: [0, 0, 0, 20],
                        alignment: 'center',
                        stack: [
                            {
                                text: 'GRAMMER Premium Freight',
                                style: { fontSize: 16, bold: true, color: '#1c4481' }
                            },
                            {
                                text: title,
                                style: { fontSize: 12, color: '#666' },
                                margin: [0, 5, 0, 0]
                            }
                        ]
                    });
                    
                    // Enhanced footer
                    doc.footer = function(currentPage, pageCount) {
                        return {
                            columns: [
                                { 
                                    text: 'Generated: ' + new Date().toLocaleDateString(), 
                                    alignment: 'left', 
                                    margin: [15, 0], 
                                    fontSize: 8 
                                },
                                { 
                                    text: 'Page ' + currentPage + ' of ' + pageCount, 
                                    alignment: 'right', 
                                    margin: [0, 0, 15, 0], 
                                    fontSize: 8 
                                }
                            ],
                            margin: [15, 0]
                        };
                    };
                },
                exportOptions: {
                    columns: ':visible:not(:last-child)' // Exclude actions column
                }
            },
            {
                text: '<i class="fas fa-sync-alt"></i> Refresh',
                className: 'btn btn-outline-primary btn-sm',
                action: function(e, dt, node, config) {
                    window.location.reload();
                }
            }
        ],
        scrollX: true,
        scrollCollapse: true,
        stateSave: true,
        stateDuration: 60 * 60 * 24, // 24 hours
        initComplete: function(settings, json) {
            console.log('[DataTables] DataTable initialized successfully');
            
            // Add custom styling to buttons
            $('.dt-buttons-wrapper .btn').addClass('me-2 mb-2');
            
            // Add tooltips to action buttons
            $('[data-bs-toggle="tooltip"]').tooltip();
        }
    };
}

/**
 * Generate PDF for a single order
 * @param {number} orderId - The order ID
 */
async function generateSinglePDF(orderId) {
    try {
        // Show loading
        Swal.fire({
            title: 'Generating PDF',
            text: 'Please wait while the document is being processed...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        
        // Find the order
        const selectedOrder = allOrdersData.find(order => order.id === parseInt(orderId));
        if (!selectedOrder) {
            throw new Error('Order not found');
        }
        
        // Import SVG module dynamically
        const { generatePDF } = await import('./svgOrders.js');
        
        // Generate PDF
        const fileName = await generatePDF(selectedOrder);
        
        Swal.fire({
            icon: 'success',
            title: 'PDF Generated Successfully!',
            text: `The file ${fileName} has been downloaded.`,
            confirmButtonText: 'OK'
        });
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error Generating PDF',
            text: error.message || 'An unexpected error occurred.',
            confirmButtonText: 'OK'
        });
    }
}

/**
 * Handle batch SVG generation
 * @param {Array} orders - Orders to generate PDFs for
 * @param {string} contextTitle - Title for the context (e.g., "Weekly Orders")
 */
async function handleBatchSVGGeneration(orders, contextTitle = 'Orders') {
    try {
        if (!orders || orders.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No Data',
                text: 'No orders available to generate PDFs.'
            });
            return;
        }
        
        // Show confirmation dialog
        const result = await Swal.fire({
            icon: 'question',
            title: 'Generate All PDFs',
            html: `You are about to generate <strong>${orders.length}</strong> PDF documents for ${contextTitle}.<br><br>This process may take several minutes. Do you want to continue?`,
            showCancelButton: true,
            confirmButtonText: 'Yes, Generate All',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#034C8C',
            cancelButtonColor: '#6c757d'
        });
        
        if (!result.isConfirmed) return;
        
        // Import SVG module
        const { generatePDF } = await import('./svgOrders.js');
        
        let successCount = 0;
        let errorCount = 0;
        
        // Show progress
        Swal.fire({
            title: 'Generating PDFs',
            html: `Processing document <strong>1</strong> of <strong>${orders.length}</strong>...`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        
        // Process each order
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            
            // Update progress
            Swal.update({
                html: `Processing document <strong>${i + 1}</strong> of <strong>${orders.length}</strong>...<br>
                       <small>Order ID: ${order.id}</small>`
            });
            
            try {
                await generatePDF(order, `PF_${order.id}_${contextTitle.replace(/ /g, '_')}`);
                successCount++;
            } catch (error) {
                console.error(`Error generating PDF for order ${order.id}:`, error);
                errorCount++;
            }
            
            // Small delay to prevent overwhelming the browser
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Show completion message
        Swal.fire({
            icon: successCount > 0 ? 'success' : 'error',
            title: 'PDF Generation Complete',
            html: `
                <div class="text-center">
                    <p><strong>Generation Summary:</strong></p>
                    <p>✅ Successfully generated: <strong>${successCount}</strong> PDFs</p>
                    ${errorCount > 0 ? `<p>❌ Failed: <strong>${errorCount}</strong> PDFs</p>` : ''}
                    <p><small>Check your downloads folder for the generated files.</small></p>
                </div>
            `,
            confirmButtonText: 'OK'
        });
        
    } catch (error) {
        console.error('Error in batch PDF generation:', error);
        Swal.fire({
            icon: 'error',
            title: 'Generation Error',
            text: 'An error occurred while generating PDFs: ' + error.message
        });
    }
}

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility function to show error messages
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showErrorMessage(title, message) {
    Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        confirmButtonText: 'OK',
        customClass: { container: 'swal-on-top' }
    });
}

/**
 * Utility function to show success toast
 * @param {string} message - Success message
 */
function showSuccessToast(message) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: message,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
    });
}

/**
 * Utility function to show info toast
 * @param {string} message - Info message
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

// Make functions available globally
window.generateSinglePDF = generateSinglePDF;
window.getWeekNumber = getWeekNumber;
window.formatCreatorName = formatCreatorName;
window.formatCost = formatCost;
window.formatWeight = formatWeight;
window.getApprovalStatus = getApprovalStatus;
window.calculateStatistics = calculateStatistics;
window.loadOrdersData = loadOrdersData;
window.getDataTableConfig = getDataTableConfig;
window.handleBatchSVGGeneration = handleBatchSVGGeneration;
window.showLoading = showLoading;
window.showErrorMessage = showErrorMessage;
window.showSuccessToast = showSuccessToast;
window.showInfoToast = showInfoToast;
window.debounce = debounce;
window.addNotificationStyles = addNotificationStyles;

console.log('[DataTables] Shared utilities loaded successfully');