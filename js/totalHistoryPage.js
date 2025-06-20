/**
 * Premium Freight - Total History Page
 * Manages the complete orders history page
 */

// Variables específicas para la página total
let totalDataTable = null;
let filteredOrdersData = [];
let currentFilters = {
    date: 'all',
    plant: 'all',
    approvalStatus: 'all',
    costRange: 'all'
};

/**
 * Initialize the total history page
 */
document.addEventListener('DOMContentLoaded', function () {
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
                        <i class="fas fa-filter me-2"></i>Filters
                        <button class="btn btn-sm btn-outline-secondary float-end" id="toggleFilters">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </h6>
                </div>
                <div class="card-body" id="filterPanelBody" style="display: none;">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label for="filterDate" class="form-label">Date</label>
                            <input type="date" class="form-control" id="filterDate">
                        </div>
                        <div class="col-md-3">
                            <label for="filterPlant" class="form-label">Plant</label>
                            <select class="form-select" id="filterPlant">
                                <option value="all">All Plants</option>
                                <option value="Querétaro">Querétaro</option>
                                <option value="Puebla">Puebla</option>
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
 * Apply advanced filters
 */
function applyAdvancedFilters() {
    const date = document.getElementById('filterDate').value;
    const plant = document.getElementById('filterPlant').value;
    const approvalStatus = document.getElementById('filterApprovalStatus').value;
    const costRange = document.getElementById('filterCostRange').value;

    currentFilters = { date, plant, approvalStatus, costRange };

    filteredOrdersData = allOrdersData.filter(order => {
        if (currentFilters.date !== 'all' && order.date !== currentFilters.date) return false;
        if (currentFilters.plant !== 'all' && order.planta !== currentFilters.plant) return false;
        if (currentFilters.approvalStatus !== 'all' && order.approval_status !== currentFilters.approvalStatus) return false;
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

    populateTotalDataTable(filteredOrdersData);
    showInfoToast(`Applied filters - ${filteredOrdersData.length} orders found`);
}

/**
 * Clear advanced filters
 */
function clearAdvancedFilters() {
    currentFilters = {
        date: 'all',
        plant: 'all',
        approvalStatus: 'all',
        costRange: 'all'
    };

    filteredOrdersData = allOrdersData;
    populateTotalDataTable(allOrdersData);
    showInfoToast('Filters cleared - showing all orders');
}

/**
 * Load total history data
 */
async function loadTotalHistoryData() {
    try {
        showLoading('Loading Total History', 'Please wait while we fetch all orders...');

        const orders = await loadOrdersData();

        console.log(`[TotalHistory] 📋 Found ${orders.length} total orders`);

        allOrdersData = orders;
        filteredOrdersData = orders;

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
 * Populate the DataTable with total orders
 * @param {Array} orders - Array of orders to display
 */
function populateTotalDataTable(orders) {
    const tableData = orders.map(order => {
        return [
            order.id || '-',
            order.planta || '-',
            order.code_planta || '-',
            order.date || '-',
            order.in_out_bound || '-',
            order.reference_number || '-',
            order.creator_name || '-',
            order.area || '-',
            order.description || '-',
            order.category_cause || '-',
            order.cost_euros || '-',
            order.transport || '-',
            order.carrier || '-',
            order.origin_company_name || '-',
            order.origin_city || '-',
            order.destiny_company_name || '-',
            order.destiny_city || '-',
            `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" onclick="generateSinglePDF(${order.id})">
                <i class="fas fa-file-pdf"></i>
            </button>`
        ];
    });

    if ($.fn.DataTable.isDataTable('#totalHistoryTable')) {
        $('#totalHistoryTable').DataTable().clear().destroy();
    }

    totalDataTable = $('#totalHistoryTable').DataTable({
        data: tableData,
        scrollX: true,
        scrollY: '400px',
        responsive: false
    });
}

/**
 * Generate PDFs for all filtered orders
 */
document.querySelector('.buttons-svg').addEventListener('click', async () => {
    const ordersToExport = filteredOrdersData.length ? filteredOrdersData : allOrdersData;
    for (const order of ordersToExport) {
        await generatePDF(order);
    }
    showSuccessToast('PDFs generated successfully!');
});