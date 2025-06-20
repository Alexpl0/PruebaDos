/**
 * Premium Freight - Total History Page
 * Manages the complete orders history page
 */

// Variables específicas para la página total
let totalDataTable = null;
let filteredOrdersData = [];
let currentFilters = {
    dateRange: null,
    status: 'all',
    plant: 'all',
    approvalStatus: 'all',
    costRange: null,
    creator: 'all',
    carrier: 'all'
};

/**
 * Initialize the total history page
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('[TotalHistory] 🚀 Initializing total history page...');
    
    try {
        // Add notification styles
        addNotificationStyles();
        
        // Setup advanced filters
        setupAdvancedFilters();
        
        // Load total history data
        loadTotalHistoryData();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        console.log('[TotalHistory] ✅ Initialization completed successfully');
    } catch (error) {
        console.error('[TotalHistory] ❌ Error during initialization:', error);
        showErrorMessage('Initialization Error', 'Failed to initialize the total history page.');
    }
});

/**
 * Setup advanced filtering options
 */
function setupAdvancedFilters() {
    // Add filter panel if it doesn't exist
    createAdvancedFilterPanel();
    
    // Setup filter event listeners
    setupFilterEventListeners();
    
    console.log('[TotalHistory] 🔍 Advanced filters setup completed');
}

/**
 * Create advanced filter panel
 */
function createAdvancedFilterPanel() {
    const mainContainer = document.querySelector('main .container-fluid');
    if (!mainContainer) return;
    
    const filterPanel = document.createElement('div');
    filterPanel.className = 'row mb-4';
    filterPanel.innerHTML = `
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-filter me-2"></i>Advanced Filters
                        <button class="btn btn-sm btn-outline-secondary float-end" id="toggleFilters">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </h6>
                </div>
                <div class="card-body" id="filterPanelBody" style="display: none;">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label for="filterDateRange" class="form-label">Date Range</label>
                            <select class="form-select" id="filterDateRange">
                                <option value="all">All Dates</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="quarter">This Quarter</option>
                                <option value="year">This Year</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label for="filterStatus" class="form-label">Status</label>
                            <select class="form-select" id="filterStatus">
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label for="filterApprovalStatus" class="form-label">Approval Status</label>
                            <select class="form-select" id="filterApprovalStatus">
                                <option value="all">All</option>
                                <option value="approved">Approved</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label for="filterCostRange" class="form-label">Cost Range (€)</label>
                            <select class="form-select" id="filterCostRange">
                                <option value="all">All Costs</option>
                                <option value="0-100">0 - 100€</option>
                                <option value="100-500">100 - 500€</option>
                                <option value="500-1000">500 - 1,000€</option>
                                <option value="1000-5000">1,000 - 5,000€</option>
                                <option value="5000+">5,000€+</option>
                            </select>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-12">
                            <button class="btn btn-primary btn-sm me-2" id="applyFilters">
                                <i class="fas fa-check"></i> Apply Filters
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" id="clearFilters">
                                <i class="fas fa-times"></i> Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Insert before the statistics cards
    const statsRow = mainContainer.querySelector('.row');
    mainContainer.insertBefore(filterPanel, statsRow);
}

/**
 * Setup filter event listeners
 */
function setupFilterEventListeners() {
    // Toggle filter panel
    const toggleBtn = document.getElementById('toggleFilters');
    const filterBody = document.getElementById('filterPanelBody');
    
    if (toggleBtn && filterBody) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = filterBody.style.display !== 'none';
            filterBody.style.display = isVisible ? 'none' : 'block';
            toggleBtn.innerHTML = isVisible ? 
                '<i class="fas fa-chevron-down"></i>' : 
                '<i class="fas fa-chevron-up"></i>';
        });
    }
    
    // Apply filters button
    const applyBtn = document.getElementById('applyFilters');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyAdvancedFilters);
    }
    
    // Clear filters button
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAdvancedFilters);
    }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.key) {
            case 'r':
            case 'R':
                if (event.ctrlKey) {
                    event.preventDefault();
                    refreshTotalData();
                }
                break;
            case 'f':
            case 'F':
                if (event.ctrlKey) {
                    event.preventDefault();
                    document.getElementById('toggleFilters')?.click();
                }
                break;
        }
    });
    
    console.log('[TotalHistory] ⌨️ Keyboard shortcuts enabled');
}

/**
 * Apply advanced filters
 */
function applyAdvancedFilters() {
    // Get filter values
    currentFilters.dateRange = document.getElementById('filterDateRange')?.value || 'all';
    currentFilters.status = document.getElementById('filterStatus')?.value || 'all';
    currentFilters.approvalStatus = document.getElementById('filterApprovalStatus')?.value || 'all';
    currentFilters.costRange = document.getElementById('filterCostRange')?.value || 'all';
    
    // Apply filters to data
    filteredOrdersData = allOrdersData.filter(order => {
        // Date range filter
        if (currentFilters.dateRange !== 'all') {
            const orderDate = new Date(order.issue_date);
            const now = new Date();
            
            switch (currentFilters.dateRange) {
                case 'today':
                    if (orderDate.toDateString() !== now.toDateString()) return false;
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (orderDate < weekAgo) return false;
                    break;
                case 'month':
                    if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
                    break;
                case 'quarter':
                    const currentQuarter = Math.floor(now.getMonth() / 3);
                    const orderQuarter = Math.floor(orderDate.getMonth() / 3);
                    if (orderQuarter !== currentQuarter || orderDate.getFullYear() !== now.getFullYear()) return false;
                    break;
                case 'year':
                    if (orderDate.getFullYear() !== now.getFullYear()) return false;
                    break;
            }
        }
        
        // Status filter
        if (currentFilters.status !== 'all') {
            const orderStatus = (order.status_name || '').toLowerCase();
            switch (currentFilters.status) {
                case 'pending':
                    if (!orderStatus.includes('pending') && !orderStatus.includes('waiting')) return false;
                    break;
                case 'approved':
                    if (!orderStatus.includes('approved') && !order.approval_date) return false;
                    break;
                case 'rejected':
                    if (!orderStatus.includes('reject') && !orderStatus.includes('denied')) return false;
                    break;
            }
        }
        
        // Approval status filter
        if (currentFilters.approvalStatus !== 'all') {
            const hasApproval = order.approval_date && order.approver_name;
            const isRejected = (order.status_name || '').toLowerCase().includes('reject');
            
            switch (currentFilters.approvalStatus) {
                case 'approved':
                    if (!hasApproval) return false;
                    break;
                case 'pending':
                    if (hasApproval || isRejected) return false;
                    break;
                case 'rejected':
                    if (!isRejected) return false;
                    break;
            }
        }
        
        // Cost range filter
        if (currentFilters.costRange !== 'all') {
            const cost = parseFloat(order.cost_euros) || 0;
            switch (currentFilters.costRange) {
                case '0-100':
                    if (cost < 0 || cost > 100) return false;
                    break;
                case '100-500':
                    if (cost < 100 || cost > 500) return false;
                    break;
                case '500-1000':
                    if (cost < 500 || cost > 1000) return false;
                    break;
                case '1000-5000':
                    if (cost < 1000 || cost > 5000) return false;
                    break;
                case '5000+':
                    if (cost < 5000) return false;
                    break;
            }
        }
        
        return true;
    });
    
    // Update table with filtered data
    populateTotalDataTable(filteredOrdersData);
    updateStatistics(filteredOrdersData);
    
    showInfoToast(`Applied filters - ${filteredOrdersData.length} orders found`);
}

/**
 * Clear advanced filters
 */
function clearAdvancedFilters() {
    // Reset filter values
    currentFilters = {
        dateRange: 'all',
        status: 'all',
        plant: 'all',
        approvalStatus: 'all',
        costRange: 'all',
        creator: 'all',
        carrier: 'all'
    };
    
    // Reset form controls
    document.getElementById('filterDateRange').value = 'all';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterApprovalStatus').value = 'all';
    document.getElementById('filterCostRange').value = 'all';
    
    // Reset filtered data to all data
    filteredOrdersData = allOrdersData;
    
    // Update table with all data
    populateTotalDataTable(allOrdersData);
    updateStatistics(allOrdersData);
    
    showInfoToast('Filters cleared - showing all orders');
}

/**
 * Load total history data
 */
async function loadTotalHistoryData() {
    try {
        showLoading('Loading Total History', 'Please wait while we fetch all orders...');
        
        // Load all orders
        const orders = await loadOrdersData();
        
        console.log(`[TotalHistory] 📋 Found ${orders.length} total orders`);
        
        // Store data globally
        allOrdersData = orders;
        filteredOrdersData = orders;
        
        // Update UI components
        updateStatistics(orders);
        populateTotalDataTable(orders);
        
        showSuccessToast(`Loaded ${orders.length} total orders`);
        
    } catch (error) {
        console.error('[TotalHistory] ❌ Error loading total history data:', error);
        showErrorMessage('Data Loading Error', `Could not load orders data: ${error.message}`);
    } finally {
        Swal.close();
    }
}

/**
 * Update statistics cards
 * @param {Array} orders - Array of orders to analyze
 */
function updateStatistics(orders) {
    const totalCount = orders.length;
    const approvedCount = orders.filter(order => 
        order.approval_date && order.approver_name
    ).length;
    const rejectedCount = orders.filter(order => 
        (order.status_name || '').toLowerCase().includes('reject')
    ).length;
    const pendingCount = totalCount - approvedCount - rejectedCount;
    
    // Update DOM elements
    const totalElement = document.getElementById('totalOrdersCount');
    const approvedElement = document.getElementById('approvedOrdersCount');
    const pendingElement = document.getElementById('pendingOrdersCount');
    const rejectedElement = document.getElementById('rejectedOrdersCount');
    
    if (totalElement) totalElement.textContent = totalCount.toLocaleString();
    if (approvedElement) approvedElement.textContent = approvedCount.toLocaleString();
    if (pendingElement) pendingElement.textContent = pendingCount.toLocaleString();
    if (rejectedElement) rejectedElement.textContent = rejectedCount.toLocaleString();
}

/**
 * Populate the DataTable with total orders
 * @param {Array} orders - Array of orders to display
 */
function populateTotalDataTable(orders) {
    const tableData = orders.map(order => {
        return [
            order.id || '-', // ID
            order.planta || '-', // Plant Name
            order.code_planta || '-', // Plant Code
            order.date || '-', // Issue Date
            order.in_out_bound || '-', // Inbound/Outbound
            getWeekNumber(order.date) || '-', // Issue CW (calculated)
            new Date(order.date).toLocaleString('default', { month: 'long' }) || '-', // Issue Month
            order.reference_number || '-', // Reference Number
            order.creator_name || '-', // Creator Name
            order.area || '-', // Area
            `<span class="table-description" title="${order.description}">${order.description}</span>`, // Description
            order.category_cause || '-', // Category Cause
            formatCost(order.cost_euros) || '-', // Cost (€)
            order.transport || '-', // Transport
            order.int_ext || '-', // Int/Ext
            order.carrier || '-', // Carrier
            order.origin_company_name || '-', // Origin Company
            order.origin_city || '-', // Origin City
            order.destiny_company_name || '-', // Destination Company
            order.destiny_city || '-', // Destination City
            formatWeight(order.weight) || '-', // Weight (kg)
            order.project_status || '-', // Project Status
            order.approver_name || '-', // Approver
            order.recovery || '-', // Recovery
            order.paid_by || '-', // Paid By
            order.products || '-', // Products
            order.status_name || '-', // Status
            order.approval_date || '-', // Approval Date
            // order.approval_status || '-', // Approval Status
            `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" onclick="generateSinglePDF(${order.id})">
                <i class="fas fa-file-pdf"></i>
            </button>` // Actions
        ];
    });

    const config = getDataTableConfig('Total_Premium_Freight', 'Total Premium Freight Report');
    totalDataTable = $('#totalHistoryTable').DataTable({
        ...config,
        data: tableData,
        scrollX: true, // Enable horizontal scrolling
        scrollY: '400px', // Enable vertical scrolling with fixed height
        responsive: false // Disable responsive mode for better scrolling
    });
}

/**
 * Refresh total data
 */
async function refreshTotalData() {
    // Clear cache
    dataCache.clear();
    
    showInfoToast('Refreshing total data...');
    await loadTotalHistoryData();
}

/**
 * Apply filters and update the total DataTable
 */
function applyTotalFilters() {
    filteredOrdersData = applyFilters(allOrdersData, currentFilters);
    populateTotalDataTable(filteredOrdersData);
    showInfoToast(`Applied filters - ${filteredOrdersData.length} orders found`);
}

/**
 * Clear filters and reset the total DataTable
 */
function clearTotalFilters() {
    currentFilters = {
        dateRange: 'all',
        status: 'all',
        plant: 'all',
        approvalStatus: 'all',
        costRange: 'all',
        creator: 'all',
        carrier: 'all'
    };

    filteredOrdersData = allOrdersData;
    populateTotalDataTable(allOrdersData);
    showInfoToast('Filters cleared - showing all orders');
}

console.log('[TotalHistory] 📋 Total history module loaded successfully');