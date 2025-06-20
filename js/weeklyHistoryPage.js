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
            if (!order.issue_date) return false;
            
            const orderDate = new Date(order.issue_date);
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
            order.id || '-', // ID
            order.code_planta || '-', // Plant Code
            order.planta || '-', // Plant Name
            order.date || '-', // Issue Date
            order.in_out_bound || '-', // Inbound/Outbound
            getWeekNumber(order.date) || '-', // Issue CW (calculated)
            order.reference_number || '-', // Reference Number
            order.creator_name || '-', // Creator Name
            `<span class="table-description" title="${order.description}">${order.description}</span>`, // Description
            order.category_cause || '-', // Category Cause
            formatCost(order.cost_euros) || '-', // Cost (€)
            order.transport || '-', // Transport
            order.carrier || '-', // Carrier
            order.origin_company_name || '-', // Origin Company
            order.origin_city || '-', // Origin City
            order.destiny_company_name || '-', // Destination Company
            order.destiny_city || '-', // Destination City
            formatWeight(order.weight) || '-', // Weight (kg)
            order.status_name || '-', // Status Name
            order.approver_name || '-', // Approver Name
            order.approval_date || '-', // Approval Date
            `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" onclick="generateSinglePDF(${order.id})">
                <i class="fas fa-file-pdf"></i>
            </button>` // Actions
        ];
    });

    const config = getDataTableConfig('Weekly_Premium_Freight', 'Weekly Premium Freight Report');
    weeklyDataTable = $('#weeklyHistoryTable').DataTable({
        ...config,
        data: tableData,
        scrollX: true, // Enable horizontal scrolling
        scrollY: '400px', // Enable vertical scrolling with fixed height
        responsive: false // Disable responsive mode for better scrolling
    });
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