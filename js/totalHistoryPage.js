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
document.addEventListener('DOMContentLoaded', async function () {
    console.log('[TotalHistory] 🚀 Initializing total history page...');

    try {
        // Add notification styles
        addNotificationStyles();

        // Setup toggle filters functionality
        setupToggleFilters('toggleFilters', 'filterPanelBody');

        // Generate dynamic filters
        const baseUrl = getBaseURL();
        await generateFilters(`${baseUrl}dao/conections/daoPremiumFreight.php`);

        // Load total history data
        loadTotalHistoryData();

        console.log('[TotalHistory] ✅ Initialization completed successfully');
    } catch (error) {
        console.error('[TotalHistory] ❌ Error during initialization:', error);
        showErrorMessage('Initialization Error', 'Failed to initialize the total history page.');
    }
});

/**
 * Apply advanced filters
 */
function applyAdvancedFilters() {
    const filters = {
        date: document.getElementById('filterDate').value,
        plant: document.getElementById('filterPlant').value,
        approvalStatus: document.getElementById('filterApprovalStatus').value,
        costRange: document.getElementById('filterCostRange').value
    };

    filteredOrdersData = applyFilters(allOrdersData, filters);
    populateTotalDataTable(filteredOrdersData);
    showInfoToast(`Applied filters - ${filteredOrdersData.length} orders found`);
}

/**
 * Clear advanced filters
 */
function clearAdvancedFilters() {
    // Reset filters in the UI
    document.getElementById('filterDate').value = 'all';
    document.getElementById('filterPlant').value = 'all';
    document.getElementById('filterApprovalStatus').value = 'all';
    document.getElementById('filterCostRange').value = 'all';

    // Reset filtered data
    filteredOrdersData = clearFilters(allOrdersData);
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
    console.log('[TotalHistory] 📋 Populating DataTable with orders:', orders);

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

    console.log('[TotalHistory] 📋 Table data:', tableData);

    if ($.fn.DataTable.isDataTable('#totalHistoryTable')) {
        $('#totalHistoryTable').DataTable().clear().destroy();
    }

    totalDataTable = $('#totalHistoryTable').DataTable({
        data: tableData,
        dom: 'Bfrtip',
        buttons: getDataTableButtons(orders),
        scrollX: true,
        scrollY: '400px',
        responsive: false
    });
}

/**
 * Attach event listeners to filter buttons
 */
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('applyFilters').addEventListener('click', applyAdvancedFilters);
    document.getElementById('clearFilters').addEventListener('click', clearAdvancedFilters);
});
