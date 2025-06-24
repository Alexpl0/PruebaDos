import { generatePDF } from './svgOrders.js';
import { addNotificationStyles } from './utils.js';
import {
    showErrorMessage,
    showInfoToast,
    showSuccessToast,
    showLoading,
    setupToggleFilters,
    getBaseURL,
    generateFilters,
    applyFilters,
    clearFilters,
    loadOrdersData,
    getDataTableButtons
} from './dataTables.js';

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
document.addEventListener('DOMContentLoaded', function () {
    console.log('[WeeklyHistory] 🚀 Initializing weekly history page...');

    try {
        // Add notification styles
        addNotificationStyles();

        // Setup toggle filters functionality
        setupToggleFilters('toggleFilters', 'filterPanelBody');

        // Setup week navigation
        setupWeekNavigation();

        // Load current week data
        loadWeeklyHistoryData(currentWeekOffset);

        console.log('[WeeklyHistory] ✅ Initialization completed successfully');
    } catch (error) {
        console.error('[WeeklyHistory] ❌ Error during initialization:', error);
        showErrorMessage('Initialization Error', 'Failed to initialize the weekly history page.');
    }
});

/**
 * Setup week navigation buttons
 */
function setupWeekNavigation() {
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');

    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            if (currentWeekOffset < 52) { // Limit to 1 year back
                currentWeekOffset++;
                await loadWeeklyHistoryData(currentWeekOffset);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            if (currentWeekOffset > 0) {
                currentWeekOffset--;
                await loadWeeklyHistoryData(currentWeekOffset);
            }
        });
    }

    console.log('[WeeklyHistory] 🔄 Week navigation setup completed');
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
        applyBtn.addEventListener('click', applyWeeklyFilters);
    }

    // Clear filters button
    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearWeeklyFilters);
    }
}

/**
 * Apply weekly filters
 */
function applyWeeklyFilters() {
    const filters = {
        date: document.getElementById('filterDate').value,
        plant: document.getElementById('filterPlant').value,
        approvalStatus: document.getElementById('filterApprovalStatus').value,
        costRange: document.getElementById('filterCostRange').value
    };

    filteredOrdersData = applyFilters(allOrdersData, filters);
    populateWeeklyDataTable(filteredOrdersData);
    showInfoToast(`Applied filters - ${filteredOrdersData.length} orders found`);
}

/**
 * Clear weekly filters
 */
function clearWeeklyFilters() {
    // Reset filters in the UI
    document.getElementById('filterDate').value = 'all';
    document.getElementById('filterPlant').value = 'all';
    document.getElementById('filterApprovalStatus').value = 'all';
    document.getElementById('filterCostRange').value = 'all';

    // Reset filtered data
    filteredOrdersData = clearFilters(allOrdersData);
    populateWeeklyDataTable(allOrdersData);
    showInfoToast('Filters cleared - showing all orders');
}

/**
 * Load weekly data
 * @param {number} weekOffset - Number of weeks to go back from current week
 */
async function loadWeeklyHistoryData(weekOffset = 0) {
    try {
        showLoading('Loading Weekly History', 'Please wait while we fetch the weekly orders...');

        // Load all orders
        const orders = await loadOrdersData();

        // Calculate target week
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (weekOffset * 7));
        const targetWeek = getWeekNumber(currentDate);
        const targetYear = currentDate.getFullYear();

        console.log(`[WeeklyHistory] 📅 Filtering for week ${targetWeek} of year ${targetYear}`);

        // Filter orders for target week
        const weeklyOrders = orders.filter(order => {
            if (!order.date) return false;

            const orderDate = new Date(order.date);
            const orderWeek = getWeekNumber(orderDate);
            const orderYear = orderDate.getFullYear();

            return orderWeek === targetWeek && orderYear === targetYear;
        });

        console.log(`[WeeklyHistory] 📋 Found ${weeklyOrders.length} orders for week ${targetWeek}`);

        // Store data globally
        allOrdersData = weeklyOrders;
        filteredOrdersData = weeklyOrders;

        // Update UI components
        updateWeekInfo(targetWeek, targetYear, weeklyOrders.length, currentDate);
        updateNavigationButtons();
        populateWeeklyDataTable(weeklyOrders);

        showSuccessToast(`Loaded ${weeklyOrders.length} orders for week ${targetWeek}`);
    } catch (error) {
        console.error('[WeeklyHistory] ❌ Error loading weekly history data:', error);
        showErrorMessage('Data Loading Error', `Could not load weekly orders data: ${error.message}`);
    } finally {
        Swal.close();
    }
}

/**
 * Update week information display
 * @param {number} weekNumber - Week number
 * @param {number} year - Year
 * @param {number} orderCount - Number of orders
 * @param {Date} weekDate - Date representing the week
 */
function updateWeekInfo(weekNumber, year, orderCount, weekDate) {
    const currentWeekDisplay = document.getElementById('currentWeekDisplay');

    // Calculate week date range
    const startOfWeek = new Date(weekDate);
    const dayOfWeek = startOfWeek.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
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
                <div class="badge bg-primary mt-1">${orderCount} order${orderCount !== 1 ? 's' : ''}</div>
            </div>
        `;
    }
}

/**
 * Update navigation buttons state
 */
function updateNavigationButtons() {
    const nextBtn = document.getElementById('nextWeek');
    const prevBtn = document.getElementById('prevWeek');

    if (nextBtn) {
        nextBtn.disabled = currentWeekOffset === 0;
        nextBtn.innerHTML = currentWeekOffset === 0 ?
            'Current Week <i class="fas fa-chevron-right"></i>' :
            'Next Week <i class="fas fa-chevron-right"></i>';
    }

    if (prevBtn) {
        prevBtn.disabled = currentWeekOffset >= 52;
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous Week';
    }
}

/**
 * Populate the DataTable with weekly orders
 * @param {Array} orders - Array of orders to display
 */
function populateWeeklyDataTable(orders) {
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
            `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" data-order-id="${order.id}">
                <i class="fas fa-file-pdf"></i>
            </button>`
        ];
    });

    if ($.fn.DataTable.isDataTable('#weeklyHistoryTable')) {
        $('#weeklyHistoryTable').DataTable().clear().destroy();
    }

    weeklyDataTable = $('#weeklyHistoryTable').DataTable({
        data: tableData,
        scrollX: true,
        scrollY: '400px',
        responsive: false
    });

    // Después de poblar la DataTable, agrega:
    document.querySelectorAll('.generate-pdf-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const orderId = btn.getAttribute('data-order-id');
            const order = allOrdersData.find(o => o.id == orderId);
            if (order) await generatePDF(order);
        });
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