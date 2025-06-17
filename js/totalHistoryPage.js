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
        
        // Setup advanced filtering
        setupAdvancedFilters();
        
        // Load all orders data
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
    // Create advanced filter panel
    const filterPanel = createAdvancedFilterPanel();
    const mainContainer = document.querySelector('.container-fluid');
    
    if (mainContainer && filterPanel) {
        // Insert after the first row (statistics cards)
        const firstRow = mainContainer.querySelector('.row');
        if (firstRow && firstRow.nextSibling) {
            mainContainer.insertBefore(filterPanel, firstRow.nextSibling);
        } else {
            mainContainer.appendChild(filterPanel);
        }
    }
    
    // Setup filter event listeners
    setupFilterEventListeners();
    
    console.log('[TotalHistory] 🔍 Advanced filters setup completed');
}

/**
 * Create advanced filter panel
 */
function createAdvancedFilterPanel() {
    const panel = document.createElement('div');
    panel.className = 'row mb-4';
    panel.id = 'advancedFilters';
    
    panel.innerHTML = `
        <div class="col-12">
            <div class="card shadow-sm">
                <div class="card-header bg-light">
                    <h6 class="mb-0 d-flex justify-content-between align-items-center">
                        <span>
                            <i class="fas fa-filter text-primary"></i> Advanced Filters
                            <span class="badge bg-secondary ms-2" id="filterCount">0 active</span>
                        </span>
                        <button class="btn btn-sm btn-outline-secondary" id="toggleFilters">
                            <i class="fas fa-chevron-down" id="filterToggleIcon"></i> Show Filters
                        </button>
                    </h6>
                </div>
                <div class="card-body collapse" id="filterContent">
                    <div class="row g-3">
                        <!-- Date Range Filter -->
                        <div class="col-md-3">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-calendar-alt text-muted me-1"></i>Date Range
                            </label>
                            <div class="input-group">
                                <input type="date" class="form-control" id="dateFrom" placeholder="From">
                                <input type="date" class="form-control" id="dateTo" placeholder="To">
                            </div>
                        </div>
                        
                        <!-- Status Filter -->
                        <div class="col-md-2">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-tag text-muted me-1"></i>Status
                            </label>
                            <select class="form-select" id="statusFilter">
                                <option value="all">All Status</option>
                                <option value="nuevo">New</option>
                                <option value="revision">Under Review</option>
                                <option value="aprobado">Approved</option>
                                <option value="rechazado">Rejected</option>
                            </select>
                        </div>
                        
                        <!-- Quick Search -->
                        <div class="col-md-4">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-search text-muted me-1"></i>Quick Search
                            </label>
                            <input type="text" class="form-control" id="quickSearch" 
                                   placeholder="Search by ID, description, reference...">
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="col-md-3">
                            <label class="form-label">&nbsp;</label>
                            <div class="d-flex gap-2">
                                <button class="btn btn-primary btn-sm" id="applyFilters">
                                    <i class="fas fa-check"></i> Apply
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" id="clearFilters">
                                    <i class="fas fa-times"></i> Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return panel;
}

/**
 * Setup filter event listeners
 */
function setupFilterEventListeners() {
    // Toggle filters
    document.getElementById('toggleFilters')?.addEventListener('click', function() {
        const content = document.getElementById('filterContent');
        const icon = document.getElementById('filterToggleIcon');
        
        if (content.classList.contains('show')) {
            content.classList.remove('show');
            icon.className = 'fas fa-chevron-down';
            this.innerHTML = '<i class="fas fa-chevron-down"></i> Show Filters';
        } else {
            content.classList.add('show');
            icon.className = 'fas fa-chevron-up';
            this.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Filters';
        }
    });
    
    // Apply filters
    document.getElementById('applyFilters')?.addEventListener('click', applyFilters);
    
    // Clear filters
    document.getElementById('clearFilters')?.addEventListener('click', clearFilters);
    
    // Quick search with debouncing
    const quickSearchInput = document.getElementById('quickSearch');
    if (quickSearchInput) {
        quickSearchInput.addEventListener('input', debounce(performQuickSearch, DEBOUNCE_DELAY));
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
            case 'f':
            case 'F':
                if (event.ctrlKey) {
                    event.preventDefault();
                    document.getElementById('quickSearch')?.focus();
                }
                break;
            case 'r':
            case 'R':
                if (event.ctrlKey) {
                    event.preventDefault();
                    refreshData();
                }
                break;
        }
    });
    
    console.log('[TotalHistory] ⌨️ Keyboard shortcuts enabled');
}

/**
 * Load all orders data
 */
async function loadTotalHistoryData() {
    try {
        showLoading('Loading Total History', 'Please wait while we fetch all orders...');
        
        // Load all orders
        const orders = await loadOrdersData();
        
        // Store data globally
        allOrdersData = orders;
        filteredOrdersData = orders;
        
        // Update statistics
        updateStatistics(orders);
        
        // Populate DataTable
        populateDataTable(orders);
        
        showSuccessToast(`Loaded ${orders.length} orders successfully`);
        
    } catch (error) {
        console.error('[TotalHistory] ❌ Error loading total history data:', error);
        showErrorMessage('Data Loading Error', `Could not load orders data: ${error.message}`);
    } finally {
        Swal.close();
    }
}

/**
 * Update statistics cards
 * @param {Array} orders - Array of orders
 */
function updateStatistics(orders) {
    try {
        const stats = calculateStatistics(orders);
        
        // Update statistic cards with animation
        updateStatisticCard('totalOrdersCount', stats.total);
        updateStatisticCard('approvedOrdersCount', stats.approved);
        updateStatisticCard('pendingOrdersCount', stats.pending);
        updateStatisticCard('rejectedOrdersCount', stats.rejected);
        
        console.log('[TotalHistory] 📊 Statistics updated:', stats);
    } catch (error) {
        console.error('[TotalHistory] ❌ Error updating statistics:', error);
    }
}

/**
 * Update a statistic card with animation
 * @param {string} elementId - Element ID to update
 * @param {number} value - New value
 */
function updateStatisticCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const current = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
    
    if (current === value) return;
    
    // Simple counter animation
    const increment = Math.ceil((value - current) / 20);
    const duration = 1000;
    const stepTime = duration / 20;
    
    let currentValue = current;
    const timer = setInterval(() => {
        currentValue += increment;
        if ((increment > 0 && currentValue >= value) || (increment < 0 && currentValue <= value)) {
            currentValue = value;
            clearInterval(timer);
        }
        element.textContent = currentValue.toLocaleString();
    }, stepTime);
}

/**
 * Apply filters to the data
 */
function applyFilters() {
    if (!allOrdersData.length) return;
    
    try {
        const filters = collectFilterValues();
        
        let filtered = allOrdersData.filter(order => {
            // Date range filter
            if (filters.dateFrom || filters.dateTo) {
                const orderDate = new Date(order.date);
                if (filters.dateFrom && orderDate < new Date(filters.dateFrom)) return false;
                if (filters.dateTo && orderDate > new Date(filters.dateTo)) return false;
            }
            
            // Status filter
            if (filters.status !== 'all') {
                if ((order.status_name || '').toLowerCase() !== filters.status.toLowerCase()) return false;
            }
            
            return true;
        });
        
        filteredOrdersData = filtered;
        updateStatistics(filtered);
        populateDataTable(filtered);
        updateFilterCount();
        
        showInfoToast(`Applied filters: ${filtered.length} orders found`);
    } catch (error) {
        console.error('[TotalHistory] ❌ Error applying filters:', error);
        showErrorMessage('Filter Error', error.message);
    }
}

/**
 * Clear all filters
 */
function clearFilters() {
    try {
        // Reset filter inputs
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('quickSearch').value = '';
        
        // Reset filters object
        currentFilters = {
            dateRange: null,
            status: 'all',
            plant: 'all',
            approvalStatus: 'all',
            costRange: null,
            creator: 'all',
            carrier: 'all'
        };
        
        // Reset data
        filteredOrdersData = allOrdersData;
        updateStatistics(allOrdersData);
        populateDataTable(allOrdersData);
        updateFilterCount();
        
        showInfoToast('Filters cleared');
    } catch (error) {
        console.error('[TotalHistory] ❌ Error clearing filters:', error);
    }
}

/**
 * Perform quick search
 */
function performQuickSearch() {
    const query = document.getElementById('quickSearch')?.value?.toLowerCase().trim();
    
    if (!query) {
        filteredOrdersData = allOrdersData;
    } else {
        filteredOrdersData = allOrdersData.filter(order => {
            const idMatch = String(order.id).toLowerCase().includes(query);
            const descMatch = (order.description || '').toLowerCase().includes(query);
            const refMatch = (order.reference_number || '').toLowerCase().includes(query);
            return idMatch || descMatch || refMatch;
        });
    }
    
    populateDataTable(filteredOrdersData);
    updateStatistics(filteredOrdersData);
    
    if (query) {
        const count = filteredOrdersData.length;
        showInfoToast(`Found ${count} order${count !== 1 ? 's' : ''} matching "${query}"`);
    }
}

/**
 * Collect current filter values
 */
function collectFilterValues() {
    return {
        dateFrom: document.getElementById('dateFrom')?.value || '',
        dateTo: document.getElementById('dateTo')?.value || '',
        status: document.getElementById('statusFilter')?.value || 'all'
    };
}

/**
 * Update filter count display
 */
function updateFilterCount() {
    const filters = collectFilterValues();
    let activeCount = 0;
    
    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
            activeCount++;
        }
    });
    
    const countBadge = document.getElementById('filterCount');
    if (countBadge) {
        countBadge.textContent = `${activeCount} active`;
        countBadge.className = activeCount > 0 ? 'badge bg-primary ms-2' : 'badge bg-secondary ms-2';
    }
}

/**
 * Populate the DataTable with orders
 * @param {Array} orders - Array of orders to display
 */
function populateDataTable(orders) {
    try {
        // Destroy existing DataTable if it exists
        if (totalDataTable && $.fn.DataTable.isDataTable('#totalHistoryTable')) {
            totalDataTable.destroy();
            totalDataTable = null;
        }
        
        if (orders.length === 0) {
            const tableBody = document.querySelector('#totalHistoryTable tbody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="34" class="text-center py-5">
                            <div class="text-muted">
                                <i class="fas fa-inbox fa-3x mb-3"></i>
                                <h5>No orders found</h5>
                                <p>Try adjusting your filters or check back later.</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            return;
        }
        
        // Prepare data for DataTable
        const tableData = orders.map(order => {
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
            
            return [
                order.id || '-',
                'Grammer AG',
                order.creator_plant || '-',
                order.creator_plant || '-',
                formattedDate,
                `<span class="badge ${order.in_out_bound === 'Inbound' ? 'bg-info' : 'bg-secondary'}">${order.in_out_bound || '-'}</span>`,
                weekNumber,
                monthName,
                order.reference_number || '-',
                formatCreatorName(order.creator_name),
                order.area || '-',
                order.description || '-',
                order.category_cause || '-',
                formatCost(order.cost_euros),
                order.transport || '-',
                `<span class="badge ${order.int_ext === 'Internal' ? 'bg-primary' : 'bg-secondary'}">${order.int_ext || '-'}</span>`,
                order.carrier || '-',
                order.origin_company_name || '-',
                order.origin_city || '-',
                order.destiny_company_name || '-',
                order.destiny_city || '-',
                formatWeight(order.weight),
                order.project_status || '-',
                order.approver_name || '-',
                order.recovery || '-',
                order.paid_by || '-',
                order.products || '-',
                order.status_name || '-',
                order.required_auth_level || '-',
                `<span class="badge ${order.recovery_file ? 'bg-success' : 'bg-secondary'}">${order.recovery_file ? 'Yes' : 'No'}</span>`,
                `<span class="badge ${order.recovery_evidence ? 'bg-success' : 'bg-secondary'}">${order.recovery_evidence ? 'Yes' : 'No'}</span>`,
                order.approval_date ? new Date(order.approval_date).toLocaleDateString('en-US') : '-',
                getApprovalStatus(order),
                `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" 
                        onclick="generateSinglePDF(${order.id})" 
                        title="Generate PDF for Order ${order.id}">
                    <i class="fas fa-file-pdf"></i>
                </button>`
            ];
        });
        
        // Get base configuration and customize for total
        const config = getDataTableConfig(
            'Total_Premium_Freight_Report',
            'Total Premium Freight Historical Report'
        );
        
        // Add batch PDF generation button
        config.buttons.splice(2, 0, {
            text: '<i class="fas fa-file-pdf"></i> Generate All PDFs',
            className: 'btn btn-info btn-sm',
            action: async function(e, dt, node, config) {
                const visibleData = dt.rows({search: 'applied'}).data().toArray();
                const visibleOrderIds = visibleData.map(row => parseInt(row[0]));
                const visibleOrders = orders.filter(order => visibleOrderIds.includes(order.id));
                await handleBatchSVGGeneration(visibleOrders, 'Total History');
            }
        });
        
        // Initialize DataTable
        totalDataTable = $('#totalHistoryTable').DataTable({
            ...config,
            data: tableData
        });
        
        console.log(`[TotalHistory] 📊 Populated table with ${orders.length} orders`);
        
    } catch (error) {
        console.error('[TotalHistory] ❌ Error populating DataTable:', error);
        showErrorMessage('Table Error', error.message);
    }
}

/**
 * Refresh data from server
 */
async function refreshData() {
    if (isLoading) return;
    
    // Clear cache
    dataCache.clear();
    
    showInfoToast('Refreshing data...');
    await loadTotalHistoryData();
}

console.log('[TotalHistory] 📋 Module loaded successfully');