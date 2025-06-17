/**
 * Premium Freight - Weekly Orders History Page
 * Manages the weekly orders history page functionality with enhanced features:
 * - Week navigation with smooth transitions
 * - Advanced filtering and search capabilities
 * - Batch PDF generation with progress tracking
 * - Responsive design with mobile optimization
 * - Real-time data updates and caching
 * - Enhanced error handling and user feedback
 */

import { getWeekNumber, showLoading, addNotificationStyles } from './utils.js';
import { generatePDF } from './svgOrders.js';

/**
 * Configuration and global variables
 */
let currentWeekOffset = 0;
let allOrdersData = [];
let weeklyDataTable = null;
let isLoading = false;
let dataCache = new Map(); // Cache for API responses

/**
 * Get base URL helper function with fallback
 * @returns {string} The base URL for API calls
 */
function getBaseURL() {
    return window.URLPF || window.URL_BASE || window.BASE_URL || 'https://grammermx.com/Jesus/PruebaDos/';
}

/**
 * Initialize the weekly orders page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('[WeekOrders] 🚀 Initializing weekly orders page...');
    
    try {
        // Add notification styles
        addNotificationStyles();
        
        // Load initial data for current week
        loadWeeklyData(currentWeekOffset);
        
        // Setup navigation buttons
        setupWeekNavigation();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Setup periodic data refresh
        setupPeriodicRefresh();
        
        console.log('[WeekOrders] ✅ Initialization completed successfully');
    } catch (error) {
        console.error('[WeekOrders] ❌ Error during initialization:', error);
        showErrorMessage('Initialization Error', 'Failed to initialize the weekly orders page.');
    }
});

/**
 * Setup week navigation buttons with enhanced functionality
 */
function setupWeekNavigation() {
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            if (isLoading) return;
            
            currentWeekOffset++;
            await loadWeeklyData(currentWeekOffset);
            
            // Smooth scroll to top of table
            document.querySelector('.card').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            if (isLoading || currentWeekOffset <= 0) return;
            
            currentWeekOffset--;
            await loadWeeklyData(currentWeekOffset);
            
            // Smooth scroll to top of table
            document.querySelector('.card').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        });
    }
    
    console.log('[WeekOrders] 🔄 Week navigation setup completed');
}

/**
 * Setup keyboard shortcuts for better user experience
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Ignore if user is typing in an input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.key) {
            case 'ArrowLeft':
                if (!isLoading) {
                    event.preventDefault();
                    document.getElementById('prevWeek')?.click();
                }
                break;
            case 'ArrowRight':
                if (!isLoading && currentWeekOffset > 0) {
                    event.preventDefault();
                    document.getElementById('nextWeek')?.click();
                }
                break;
            case 'r':
            case 'R':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    refreshCurrentWeek();
                }
                break;
        }
    });
    
    console.log('[WeekOrders] ⌨️ Keyboard shortcuts enabled (← → for navigation, Ctrl+R for refresh)');
}

/**
 * Setup periodic data refresh every 5 minutes
 */
function setupPeriodicRefresh() {
    setInterval(() => {
        if (!document.hidden && !isLoading) {
            console.log('[WeekOrders] 🔄 Performing periodic refresh...');
            refreshCurrentWeek(true); // Silent refresh
        }
    }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Load weekly data from API with enhanced caching and error handling
 * @param {number} weekOffset - Number of weeks to go back from current week
 * @param {boolean} useCache - Whether to use cached data if available
 */
async function loadWeeklyData(weekOffset = 0, useCache = true) {
    if (isLoading) {
        console.log('[WeekOrders] ⏳ Already loading data, skipping request');
        return;
    }
    
    isLoading = true;
    
    try {
        const loadingMessage = weekOffset === 0 ? 'Loading Current Week' : `Loading Week Data (${Math.abs(weekOffset)} weeks ago)`;
        showLoading(loadingMessage, 'Please wait while we fetch the orders...');
        
        const baseURL = getBaseURL();
        const cacheKey = `weekly_data_${weekOffset}`;
        
        // Check cache first
        if (useCache && dataCache.has(cacheKey)) {
            const cachedData = dataCache.get(cacheKey);
            const cacheAge = Date.now() - cachedData.timestamp;
            
            // Use cache if less than 2 minutes old
            if (cacheAge < 2 * 60 * 1000) {
                console.log('[WeekOrders] 💾 Using cached data');
                processWeeklyData(cachedData.data, weekOffset);
                Swal.close();
                isLoading = false;
                return;
            }
        }
        
        console.log(`[WeekOrders] 🌐 Loading data from: ${baseURL}dao/conections/daoPremiumFreight.php`);
        
        const response = await fetch(`${baseURL}dao/conections/daoPremiumFreight.php`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[WeekOrders] 📊 Raw API response received:', { 
            hasData: !!data, 
            dataType: typeof data,
            recordCount: data?.data?.length || 0 
        });
        
        // Cache the response
        dataCache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
        
        // Process the data
        processWeeklyData(data, weekOffset);
        
    } catch (error) {
        console.error('[WeekOrders] ❌ Error loading weekly data:', error);
        showErrorMessage('Data Loading Error', `Could not load weekly orders data: ${error.message}`);
    } finally {
        Swal.close();
        isLoading = false;
    }
}

/**
 * Process and filter weekly data
 * @param {Object} data - Raw API response
 * @param {number} weekOffset - Week offset from current week
 */
function processWeeklyData(data, weekOffset) {
    try {
        // Extract orders array from response
        let orders = [];
        if (data && data.status === 'success' && Array.isArray(data.data)) {
            orders = data.data;
        } else if (Array.isArray(data)) {
            orders = data;
        } else {
            throw new Error('Invalid data format received from API');
        }
        
        // Calculate target week
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (weekOffset * 7));
        const targetWeek = getWeekNumber(currentDate);
        const targetYear = currentDate.getFullYear();
        
        console.log(`[WeekOrders] 📅 Filtering for week ${targetWeek} of year ${targetYear}`);
        
        // Filter orders for target week with enhanced validation
        const weeklyOrders = orders.filter(order => {
            if (!order || !order.date) return false;
            
            try {
                const orderDate = new Date(order.date);
                if (isNaN(orderDate.getTime())) return false;
                
                const orderWeek = getWeekNumber(orderDate);
                const orderYear = orderDate.getFullYear();
                
                return orderWeek === targetWeek && orderYear === targetYear;
            } catch (error) {
                console.error('[WeekOrders] ⚠️ Error processing order date:', order.date, error);
                return false;
            }
        });
        
        console.log(`[WeekOrders] 📋 Found ${weeklyOrders.length} orders for week ${targetWeek}`);
        
        // Store data globally
        allOrdersData = weeklyOrders;
        
        // Update UI components
        updateWeekInfo(targetWeek, targetYear, weeklyOrders.length, currentDate);
        updateNavigationButtons();
        populateDataTable(weeklyOrders);
        
        // Show success notification for manual refreshes
        if (weekOffset === currentWeekOffset && weeklyOrders.length > 0) {
            showSuccessToast(`Loaded ${weeklyOrders.length} orders for week ${targetWeek}`);
        }
        
    } catch (error) {
        console.error('[WeekOrders] ❌ Error processing weekly data:', error);
        showErrorMessage('Data Processing Error', error.message);
    }
}

/**
 * Update week information display with enhanced details
 * @param {number} weekNumber - Week number
 * @param {number} year - Year
 * @param {number} orderCount - Number of orders
 * @param {Date} weekDate - Date representing the week
 */
function updateWeekInfo(weekNumber, year, orderCount, weekDate) {
    const currentWeekDisplay = document.getElementById('currentWeekDisplay');
    const weeklySubtitle = document.getElementById('weeklySubtitle');
    
    // Calculate week date range
    const startOfWeek = new Date(weekDate);
    const dayOfWeek = startOfWeek.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as first day
    startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    const formatOptions = { month: 'short', day: 'numeric' };
    const startStr = startOfWeek.toLocaleDateString('en-US', formatOptions);
    const endStr = endOfWeek.toLocaleDateString('en-US', formatOptions);
    
    if (currentWeekDisplay) {
        currentWeekDisplay.innerHTML = `
            <div class="text-center">
                <h5 class="mb-1">Week ${weekNumber}, ${year}</h5>
                <small class="text-muted">${startStr} - ${endStr}</small>
            </div>
        `;
    }
    
    if (weeklySubtitle) {
        const statusText = orderCount === 0 ? 'No orders found' : 
                          orderCount === 1 ? '1 order found' : 
                          `${orderCount.toLocaleString()} orders found`;
        
        weeklySubtitle.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>Premium Freight Weekly Report</span>
                <span class="badge bg-primary">${statusText}</span>
            </div>
        `;
    }
}

/**
 * Update navigation buttons state with enhanced visual feedback
 */
function updateNavigationButtons() {
    const nextBtn = document.getElementById('nextWeek');
    const prevBtn = document.getElementById('prevWeek');
    
    if (nextBtn) {
        nextBtn.disabled = currentWeekOffset === 0 || isLoading;
        nextBtn.innerHTML = isLoading ? 
            '<i class="fas fa-spinner fa-spin"></i> Loading...' : 
            'Next Week <i class="fas fa-chevron-right"></i>';
    }
    
    if (prevBtn) {
        prevBtn.disabled = isLoading;
        prevBtn.innerHTML = isLoading ? 
            '<i class="fas fa-spinner fa-spin"></i> Loading...' : 
            '<i class="fas fa-chevron-left"></i> Previous Week';
    }
}

/**
 * Populate the DataTable with weekly orders
 * @param {Array} orders - Array of order objects
 */
function populateDataTable(orders) {
    const tableBody = document.getElementById('weeklyTableBody');
    if (!tableBody) {
        console.error('[WeekOrders] ❌ Table body element not found');
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (orders.length === 0) {
        const noDataMessage = currentWeekOffset === 0 ? 
            'No orders found for the current week' : 
            `No orders found for the selected week`;
            
        tableBody.innerHTML = `
            <tr>
                <td colspan="34" class="text-center py-5">
                    <div class="text-muted">
                        <i class="fas fa-inbox fa-3x mb-3"></i>
                        <h5>${noDataMessage}</h5>
                        <p>Try selecting a different week or check back later.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Generate table rows with enhanced data
    orders.forEach((order, index) => {
        try {
            const row = createTableRow(order, index);
            tableBody.appendChild(row);
        } catch (error) {
            console.error('[WeekOrders] ⚠️ Error creating row for order:', order.id, error);
        }
    });
    
    // Initialize or refresh DataTable
    initializeDataTable();
    
    console.log(`[WeekOrders] 📊 Populated table with ${orders.length} orders`);
}

/**
 * Create a table row for an order with enhanced formatting
 * @param {Object} order - Order data
 * @param {number} index - Row index for alternating colors
 * @returns {HTMLTableRowElement} The created table row
 */
function createTableRow(order, index) {
    const row = document.createElement('tr');
    
    // Add zebra striping class
    if (index % 2 === 0) {
        row.classList.add('table-row-even');
    }
    
    const orderDate = order.date ? new Date(order.date) : null;
    const formattedDate = orderDate ? orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }) : '-';
    
    const monthName = orderDate ? orderDate.toLocaleDateString('en-US', { 
        month: 'long' 
    }) : '-';
    
    const weekNumber = orderDate ? getWeekNumber(orderDate) : '-';
    
    // Format creator name (first initial + last name)
    const formatCreatorName = (fullName) => {
        if (!fullName) return '-';
        const parts = fullName.trim().split(' ');
        if (parts.length < 2) return fullName;
        return `${parts[0].charAt(0).toUpperCase()}. ${parts[parts.length - 1]}`;
    };
    
    // Format cost with proper currency
    const formatCost = (cost) => {
        if (!cost || cost === '0') return '-';
        const numCost = parseFloat(cost);
        return isNaN(numCost) ? '-' : `€${numCost.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };
    
    // Format weight
    const formatWeight = (weight) => {
        if (!weight || weight === '0') return '-';
        const numWeight = parseFloat(weight);
        return isNaN(numWeight) ? '-' : `${numWeight.toLocaleString()} kg`;
    };
    
    // Get approval status with enhanced formatting
    const getApprovalStatus = (order) => {
        const approvalStatus = order.approval_status;
        const requiredLevel = order.required_auth_level || 7;
        
        if (approvalStatus === null || approvalStatus >= requiredLevel) {
            return '<span class="badge bg-success">Fully Approved</span>';
        } else if (approvalStatus === 99) {
            return '<span class="badge bg-danger">Rejected</span>';
        } else {
            const level = Number(approvalStatus) + 1;
            return `<span class="badge bg-warning">Pending Level ${level}</span>`;
        }
    };
    
    row.innerHTML = `
        <td class="text-center fw-bold">${order.id || '-'}</td>
        <td>Grammer AG</td>
        <td class="text-center">${order.creator_plant || '-'}</td>
        <td>${order.creator_plant || '-'}</td>
        <td class="text-center">${formattedDate}</td>
        <td class="text-center">
            <span class="badge ${order.in_out_bound === 'Inbound' ? 'bg-info' : 'bg-secondary'}">
                ${order.in_out_bound || '-'}
            </span>
        </td>
        <td class="text-center fw-bold">${weekNumber}</td>
        <td class="text-center">${monthName}</td>
        <td class="text-center">${order.reference_number || '-'}</td>
        <td>${formatCreatorName(order.creator_name)}</td>
        <td class="text-center">${order.area || '-'}</td>
        <td class="truncated-text" title="${(order.description || '').replace(/"/g, '&quot;')}" style="max-width: 300px;">
            ${order.description || '-'}
        </td>
        <td class="text-center">${order.category_cause || '-'}</td>
        <td class="text-end fw-bold text-success">${formatCost(order.cost_euros)}</td>
        <td class="text-center">${order.transport || '-'}</td>
        <td class="text-center">
            <span class="badge ${order.int_ext === 'Internal' ? 'bg-primary' : 'bg-secondary'}">
                ${order.int_ext || '-'}
            </span>
        </td>
        <td>${order.carrier || '-'}</td>
        <td>${order.origin_company_name || '-'}</td>
        <td>${order.origin_city || '-'}</td>
        <td>${order.destiny_company_name || '-'}</td>
        <td>${order.destiny_city || '-'}</td>
        <td class="text-end">${formatWeight(order.weight)}</td>
        <td class="text-center">${order.project_status || '-'}</td>
        <td>${order.approver_name || '-'}</td>
        <td class="text-center">${order.recovery || '-'}</td>
        <td class="text-center">${order.paid_by || '-'}</td>
        <td class="truncated-text" title="${(order.products || '').replace(/"/g, '&quot;')}" style="max-width: 200px;">
            ${order.products || '-'}
        </td>
        <td class="text-center">${order.status_name || '-'}</td>
        <td class="text-center">${order.required_auth_level || '-'}</td>
        <td class="text-center">
            <span class="badge ${order.recovery_file ? 'bg-success' : 'bg-secondary'}">
                ${order.recovery_file ? 'Yes' : 'No'}
            </span>
        </td>
        <td class="text-center">
            <span class="badge ${order.recovery_evidence ? 'bg-success' : 'bg-secondary'}">
                ${order.recovery_evidence ? 'Yes' : 'No'}
            </span>
        </td>
        <td class="text-center">${order.approval_date ? new Date(order.approval_date).toLocaleDateString('en-US') : '-'}</td>
        <td class="text-center">${getApprovalStatus(order)}</td>
        <td class="text-center">
            <button class="btn btn-sm btn-outline-primary generate-pdf-btn" 
                    onclick="generateSinglePDF(${order.id})" 
                    title="Generate PDF for Order ${order.id}">
                <i class="fas fa-file-pdf"></i>
            </button>
        </td>
    `;
    
    return row;
}

/**
 * Initialize DataTable with enhanced configuration and export functionality
 */
function initializeDataTable() {
    // Destroy existing DataTable if it exists
    if (weeklyDataTable && $.fn.DataTable.isDataTable('#weeklyHistoryTable')) {
        weeklyDataTable.destroy();
        weeklyDataTable = null;
    }
    
    // Get current week info for export filenames
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - (currentWeekOffset * 7));
    const targetWeek = getWeekNumber(currentDate);
    const targetYear = currentDate.getFullYear();
    
    // Initialize new DataTable with enhanced configuration
    weeklyDataTable = $('#weeklyHistoryTable').DataTable({
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
                        return data.substr(0, 50) + '...';
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
                title: `Weekly_Premium_Freight_W${targetWeek}_${targetYear}`,
                filename: function() {
                    return `Weekly_Premium_Freight_W${targetWeek}_${targetYear}_${new Date().toISOString().split('T')[0]}`;
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
                title: `Weekly Premium Freight Report - Week ${targetWeek}, ${targetYear}`,
                filename: function() {
                    return `Weekly_Premium_Freight_W${targetWeek}_${targetYear}_${new Date().toISOString().split('T')[0]}`;
                },
                customize: function(doc) {
                    // Enhanced PDF styling
                    doc.defaultStyle.fontSize = 8;
                    doc.styles.tableHeader.fontSize = 9;
                    doc.styles.tableHeader.fillColor = '#A7CAC3';
                    doc.styles.tableHeader.color = '#000';
                    doc.pageMargins = [15, 40, 15, 40];
                    
                    // Dynamic column widths
                    if (doc.content[1] && doc.content[1].table && doc.content[1].table.body[0]) {
                        const colCount = doc.content[1].table.body[0].length;
                        doc.content[1].table.widths = Array(colCount).fill('*');
                    }
                    
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
                                text: `Weekly Report - Week ${targetWeek}, ${targetYear}`,
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
                                    text: `Generated: ${new Date().toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}`, 
                                    alignment: 'left', 
                                    margin: [15, 0], 
                                    fontSize: 8 
                                },
                                { 
                                    text: `Page ${currentPage} of ${pageCount}`, 
                                    alignment: 'right', 
                                    margin: [0, 0, 15, 0], 
                                    fontSize: 8 
                                }
                            ],
                            margin: [15, 10]
                        };
                    };
                },
                exportOptions: {
                    columns: ':visible:not(:last-child)' // Exclude actions column
                }
            },
            {
                text: '<i class="fas fa-file-pdf"></i> Generate All PDFs',
                className: 'btn btn-info btn-sm',
                action: async function(e, dt, node, config) {
                    await handleBatchSVGGeneration();
                }
            },
            {
                text: '<i class="fas fa-sync-alt"></i> Refresh',
                className: 'btn btn-outline-primary btn-sm',
                action: function(e, dt, node, config) {
                    refreshCurrentWeek();
                }
            }
        ],
        scrollX: true,
        scrollCollapse: true,
        stateSave: true,
        stateDuration: 60 * 60 * 24, // 24 hours
        initComplete: function(settings, json) {
            console.log('[WeekOrders] 📊 DataTable initialized successfully');
            
            // Add custom styling to buttons
            $('.dt-buttons-wrapper .btn').addClass('me-2 mb-2');
            
            // Add tooltips to action buttons
            $('[data-bs-toggle="tooltip"]').tooltip();
        }
    });
    
    // Add search enhancement
    $('.dataTables_filter input').attr('placeholder', 'Search orders...');
}

/**
 * Handle batch SVG generation for visible orders with progress tracking
 */
async function handleBatchSVGGeneration() {
    try {
        if (allOrdersData.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No Data',
                text: 'There are no orders to export for this week',
                customClass: { container: 'swal-on-top' }
            });
            return;
        }
        
        // Show confirmation dialog with details
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (currentWeekOffset * 7));
        const targetWeek = getWeekNumber(currentDate);
        const targetYear = currentDate.getFullYear();
        
        const confirm = await Swal.fire({
            icon: 'question',
            title: 'Generate PDF Documents',
            html: `
                <div class="text-start">
                    <p><strong>Week:</strong> ${targetWeek}, ${targetYear}</p>
                    <p><strong>Orders:</strong> ${allOrdersData.length}</p>
                    <p>This will generate ${allOrdersData.length} individual PDF documents.</p>
                    <p class="text-warning"><small><i class="fas fa-exclamation-triangle"></i> This process may take several minutes.</small></p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-download"></i> Generate All PDFs',
            cancelButtonText: '<i class="fas fa-times"></i> Cancel',
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d',
            customClass: { container: 'swal-on-top' }
        });
        
        if (!confirm.isConfirmed) return;
        
        // Show progress dialog
        let currentIndex = 0;
        const totalOrders = allOrdersData.length;
        
        const progressSwal = Swal.fire({
            title: 'Generating PDF Documents',
            html: `
                <div class="text-center">
                    <div class="progress mb-3" style="height: 25px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" style="width: 0%" id="progressBar">
                            0%
                        </div>
                    </div>
                    <p class="mb-1">Processing order <span id="currentOrder">1</span> of ${totalOrders}</p>
                    <p class="text-muted" id="currentOrderId">Initializing...</p>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: false,
            showConfirmButton: false,
            customClass: { container: 'swal-on-top' }
        });
        
        const successfulDownloads = [];
        const failedDownloads = [];
        
        // Process each order
        for (let i = 0; i < allOrdersData.length; i++) {
            const order = allOrdersData[i];
            currentIndex = i + 1;
            
            // Update progress
            const progress = Math.round((currentIndex / totalOrders) * 100);
            document.getElementById('progressBar').style.width = `${progress}%`;
            document.getElementById('progressBar').textContent = `${progress}%`;
            document.getElementById('currentOrder').textContent = currentIndex;
            document.getElementById('currentOrderId').textContent = `Order ID: ${order.id}`;
            
            try {
                const fileName = await generatePDF(order, `Weekly_W${targetWeek}_PF_${order.id}_Order`);
                successfulDownloads.push({ orderId: order.id, fileName });
                console.log(`[WeekOrders] ✅ Generated PDF for order ${order.id}: ${fileName}`);
            } catch (error) {
                console.error(`[WeekOrders] ❌ Error generating PDF for order ${order.id}:`, error);
                failedDownloads.push({ orderId: order.id, error: error.message });
            }
            
            // Small delay between generations to prevent browser overload
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Show completion dialog
        const successCount = successfulDownloads.length;
        const failureCount = failedDownloads.length;
        
        if (failureCount === 0) {
            Swal.fire({
                icon: 'success',
                title: 'All PDFs Generated Successfully!',
                html: `
                    <div class="text-center">
                        <p class="mb-3"><strong>${successCount}</strong> PDF documents have been generated and downloaded.</p>
                        <p class="text-muted">Check your downloads folder for the files.</p>
                    </div>
                `,
                confirmButtonText: 'Perfect!',
                customClass: { container: 'swal-on-top' }
            });
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'PDF Generation Completed with Issues',
                html: `
                    <div class="text-start">
                        <p><span class="text-success"><strong>✅ Successful:</strong> ${successCount}</span></p>
                        <p><span class="text-danger"><strong>❌ Failed:</strong> ${failureCount}</span></p>
                        <hr>
                        <p class="text-muted small">Check the browser console for detailed error information.</p>
                    </div>
                `,
                confirmButtonText: 'Understood',
                customClass: { container: 'swal-on-top' }
            });
        }
        
    } catch (error) {
        console.error('[WeekOrders] ❌ Error in batch SVG generation:', error);
        Swal.fire({
            icon: 'error',
            title: 'Generation Error',
            text: 'An error occurred while generating the documents: ' + error.message,
            customClass: { container: 'swal-on-top' }
        });
    }
}

/**
 * Generate PDF for a single order (called from table button)
 * @param {number} orderId - The order ID
 */
window.generateSinglePDF = async function(orderId) {
    try {
        const order = allOrdersData.find(o => o.id === parseInt(orderId));
        if (!order) {
            throw new Error('Order not found');
        }
        
        showLoading('Generating PDF', `Creating PDF for Order ${orderId}...`);
        
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (currentWeekOffset * 7));
        const targetWeek = getWeekNumber(currentDate);
        
        const fileName = await generatePDF(order, `Weekly_W${targetWeek}_PF_${orderId}_Order`);
        
        Swal.fire({
            icon: 'success',
            title: 'PDF Generated!',
            html: `The PDF for Order ${orderId} has been downloaded successfully.<br><small class="text-muted">File: ${fileName}</small>`,
            timer: 3000,
            timerProgressBar: true,
            customClass: { container: 'swal-on-top' }
        });
        
    } catch (error) {
        console.error(`[WeekOrders] ❌ Error generating single PDF:`, error);
        Swal.fire({
            icon: 'error',
            title: 'PDF Generation Failed',
            text: error.message,
            customClass: { container: 'swal-on-top' }
        });
    }
};

/**
 * Refresh current week data
 * @param {boolean} silent - Whether to show loading indicator
 */
async function refreshCurrentWeek(silent = false) {
    if (isLoading) return;
    
    // Clear cache for current week
    const cacheKey = `weekly_data_${currentWeekOffset}`;
    dataCache.delete(cacheKey);
    
    if (!silent) {
        showSuccessToast('Refreshing data...');
    }
    
    await loadWeeklyData(currentWeekOffset, false);
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

// Export functions for use by other modules
export {
    loadWeeklyData,
    handleBatchSVGGeneration,
    refreshCurrentWeek
};

console.log('[WeekOrders] 📋 Module loaded successfully');