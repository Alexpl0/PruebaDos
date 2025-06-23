/**
 * Premium Freight - Weekly History Page
 * Manages the weekly orders history page
 */

// Variables específicas para la página semanal
let weeklyDataTable = null;
let filteredOrdersData = [];
let currentWeekOffset = 0;
let currentFilters = {
    date: 'all',
    plant: 'all',
    approvalStatus: 'all',
    costRange: 'all'
};

/**
 * Initialize the weekly history page
 */
document.addEventListener('DOMContentLoaded', async function () {
    console.log('[WeeklyHistory] 🚀 Initializing weekly history page...');

    try {
        // Load weekly data
        await loadWeeklyHistoryData(currentWeekOffset);

        // Usa las funciones globales de svgOrders.js para cargar y poblar el SVG
        const selectedOrder = filteredOrdersData[0]; // Ejemplo: selecciona el primer pedido visible
        const containerId = 'svgPreview'; // ID del contenedor donde se renderizará el SVG
        await window.svgOrders.loadAndPopulateSVG(selectedOrder, containerId);

        console.log('[WeeklyHistory] ✅ Initialization completed successfully');
    } catch (error) {
        console.error('[WeeklyHistory] ❌ Error during initialization:', error);
        showErrorMessage('Initialization Error', 'Failed to initialize the weekly history page.');
    }
});

/**
 * Load weekly data
 * @param {number} weekOffset - Number of weeks to go back from current week
 */
async function loadWeeklyHistoryData(weekOffset = 0) {
    try {
        showLoading('Loading Weekly History', 'Please wait while we fetch weekly orders...');

        const orders = await loadOrdersData(weekOffset);

        console.log(`[WeeklyHistory] 📋 Found ${orders.length} weekly orders`);

        filteredOrdersData = orders;

        populateWeeklyDataTable(orders);
        showSuccessToast(`Loaded ${orders.length} weekly orders`);
    } catch (error) {
        console.error('[WeeklyHistory] ❌ Error loading weekly history data:', error);
        showErrorMessage('Data Loading Error', `Could not load weekly orders data: ${error.message}`);
    } finally {
        Swal.close();
    }
}

/**
 * Populate the DataTable with weekly orders
 * @param {Array} orders - Array of orders to display
 */
function populateWeeklyDataTable(orders) {
    console.log('[WeeklyHistory] 📋 Populating DataTable with orders:', orders);

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

    console.log('[WeeklyHistory] 📋 Table data:', tableData);

    if ($.fn.DataTable.isDataTable('#weeklyHistoryTable')) {
        $('#weeklyHistoryTable').DataTable().clear().destroy();
    }

    weeklyDataTable = $('#weeklyHistoryTable').DataTable({
        data: tableData,
        dom: 'Bfrtip',
        buttons: getDataTableButtons(orders),
        scrollX: true,
        scrollY: '400px',
        responsive: false
    });
}