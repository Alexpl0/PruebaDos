/**
 * Premium Freight - Weekly History Page
 * Manages the weekly orders history page
 */

// Variables específicas para la página semanal
let weeklyDataTable = null;
let filteredOrdersData = [];
let currentWeekOffset = 0;
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
 * Initialize the weekly history page
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('[WeeklyHistory] 🚀 Initializing weekly history page...');
    
    try {
        // Add notification styles
        addNotificationStyles();
        
        // Setup week navigation
        setupWeekNavigation();
        
        // Load current week data
        loadWeeklyHistoryData(currentWeekOffset);
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
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
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.key) {
            case 'ArrowLeft':
                if (currentWeekOffset < 52) {
                    currentWeekOffset++;
                    loadWeeklyHistoryData(currentWeekOffset);
                }
                break;
            case 'ArrowRight':
                if (currentWeekOffset > 0) {
                    currentWeekOffset--;
                    loadWeeklyHistoryData(currentWeekOffset);
                }
                break;
            case 'r':
            case 'R':
                if (event.ctrlKey) {
                    event.preventDefault();
                    refreshWeeklyData();
                }
                break;
        }
    });
    
    console.log('[WeeklyHistory] ⌨️ Keyboard shortcuts enabled');
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
    try {
        // Destroy existing DataTable if it exists
        if (weeklyDataTable && $.fn.DataTable.isDataTable('#weeklyHistoryTable')) {
            weeklyDataTable.destroy();
            weeklyDataTable = null;
        }
        
        if (orders.length === 0) {
            const tableBody = document.querySelector('#weeklyHistoryTable tbody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="34" class="text-center py-5">
                            <div class="text-muted">
                                <i class="fas fa-inbox fa-3x mb-3"></i>
                                <h5>No orders found for this week</h5>
                                <p>Try selecting a different week or check back later.</p>
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
        
        // Get base configuration and customize for weekly
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (currentWeekOffset * 7));
        const targetWeek = getWeekNumber(currentDate);
        const targetYear = currentDate.getFullYear();
        
        const config = getDataTableConfig(
            `Weekly_Premium_Freight_W${targetWeek}_${targetYear}`,
            `Weekly Premium Freight Report - Week ${targetWeek}, ${targetYear}`
        );
        
        // Add batch PDF generation button
        config.buttons.splice(2, 0, {
            text: '<i class="fas fa-file-pdf"></i> Generate All PDFs',
            className: 'btn btn-info btn-sm',
            action: async function(e, dt, node, config) {
                const visibleData = dt.rows({search: 'applied'}).data().toArray();
                const visibleOrderIds = visibleData.map(row => parseInt(row[0]));
                const visibleOrders = orders.filter(order => visibleOrderIds.includes(order.id));
                await handleBatchSVGGeneration(visibleOrders, `Weekly Orders W${targetWeek}`);
            }
        });
        
        // Initialize DataTable
        weeklyDataTable = $('#weeklyHistoryTable').DataTable({
            ...config,
            data: tableData
        });
        
        console.log(`[WeeklyHistory] 📊 Populated table with ${orders.length} orders`);
        
    } catch (error) {
        console.error('[WeeklyHistory] ❌ Error populating DataTable:', error);
        showErrorMessage('Table Error', error.message);
    }
}

/**
 * Refresh weekly data
 */
async function refreshWeeklyData() {
    // Clear cache
    dataCache.clear();
    
    showInfoToast('Refreshing weekly data...');
    await loadWeeklyHistoryData(currentWeekOffset);
}

console.log('[WeeklyHistory] 📋 Weekly history module loaded successfully');