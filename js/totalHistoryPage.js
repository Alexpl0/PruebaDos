/**
 * Premium Freight - Total History Page
 * Manages the complete orders history page with advanced features:
 * - Real-time statistics and analytics
 * - Advanced filtering and search capabilities
 * - Batch operations with progress tracking
 * - Data export in multiple formats
 * - Performance optimization with virtual scrolling
 * - Enhanced user experience with smooth animations
 * - Comprehensive error handling and recovery
 */

// Import required utilities
import { getWeekNumber, showLoading, addNotificationStyles } from './utils.js';
import { generatePDF } from './svgOrders.js';

/**
 * Configuration and global variables
 */
let allOrdersData = [];
let filteredOrdersData = [];
let totalDataTable = null;
let isLoading = false;
let statisticsCache = null;
let lastRefreshTime = null;
let refreshInterval = null;

// Advanced filtering options
let currentFilters = {
    dateRange: null,
    status: 'all',
    plant: 'all',
    approvalStatus: 'all',
    costRange: null,
    creator: 'all',
    carrier: 'all'
};

// Performance optimization settings
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
 * Initialize the total history page
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('[TotalHistory] 🚀 Initializing total history page...');
    
    try {
        // Add notification styles
        addNotificationStyles();
        
        // Setup advanced filters
        setupAdvancedFilters();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Load all orders data
        loadTotalHistoryData();
        
        // Setup auto-refresh
        setupAutoRefresh();
        
        // Setup statistics refresh
        setupStatisticsRefresh();
        
        // Setup performance monitoring
        setupPerformanceMonitoring();
        
        console.log('[TotalHistory] ✅ Initialization completed successfully');
    } catch (error) {
        console.error('[TotalHistory] ❌ Error during initialization:', error);
        showErrorMessage('Initialization Error', 'Failed to initialize the total history page.');
    }
});

/**
 * Setup advanced filtering options with enhanced UI
 */
function setupAdvancedFilters() {
    // Create advanced filter panel
    const filterPanel = createAdvancedFilterPanel();
    const mainContainer = document.querySelector('.container-fluid');
    
    if (mainContainer && filterPanel) {
        mainContainer.insertBefore(filterPanel, mainContainer.firstChild.nextSibling);
    }
    
    // Setup filter event listeners
    setupFilterEventListeners();
    
    // Setup real-time search
    setupRealTimeSearch();
    
    console.log('[TotalHistory] 🔍 Advanced filters setup completed');
}

/**
 * Create advanced filter panel with enhanced UI
 * @returns {HTMLElement} The filter panel element
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
                            <small class="form-text text-muted">Filter by issue date</small>
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
                        
                        <!-- Plant Filter -->
                        <div class="col-md-2">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-building text-muted me-1"></i>Plant
                            </label>
                            <select class="form-select" id="plantFilter">
                                <option value="all">All Plants</option>
                            </select>
                        </div>
                        
                        <!-- Approval Status Filter -->
                        <div class="col-md-2">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-check-circle text-muted me-1"></i>Approval
                            </label>
                            <select class="form-select" id="approvalFilter">
                                <option value="all">All</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Fully Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        
                        <!-- Cost Range Filter -->
                        <div class="col-md-2">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-euro-sign text-muted me-1"></i>Cost Range (€)
                            </label>
                            <div class="input-group">
                                <input type="number" class="form-control" id="costMin" placeholder="Min" min="0" step="0.01">
                                <input type="number" class="form-control" id="costMax" placeholder="Max" min="0" step="0.01">
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="col-md-1">
                            <label class="form-label">&nbsp;</label>
                            <div class="d-flex gap-1">
                                <button class="btn btn-primary btn-sm" id="applyFilters" title="Apply Filters">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" id="clearFilters" title="Clear All Filters">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Additional Filter Row -->
                    <div class="row g-3 mt-2">
                        <!-- Creator Filter -->
                        <div class="col-md-3">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-user text-muted me-1"></i>Creator
                            </label>
                            <select class="form-select" id="creatorFilter">
                                <option value="all">All Creators</option>
                            </select>
                        </div>
                        
                        <!-- Carrier Filter -->
                        <div class="col-md-3">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-truck text-muted me-1"></i>Carrier
                            </label>
                            <select class="form-select" id="carrierFilter">
                                <option value="all">All Carriers</option>
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
                        
                        <!-- Filter Presets -->
                        <div class="col-md-2">
                            <label class="form-label fw-semibold">
                                <i class="fas fa-bookmark text-muted me-1"></i>Presets
                            </label>
                            <select class="form-select" id="filterPresets">
                                <option value="">Select Preset</option>
                                <option value="thisMonth">This Month</option>
                                <option value="lastMonth">Last Month</option>
                                <option value="thisWeek">This Week</option>
                                <option value="pendingApproval">Pending Approval</option>
                                <option value="highValue">High Value (>€1000)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return panel;
}

/**
 * Setup filter event listeners with debouncing
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
    
    // Filter presets
    document.getElementById('filterPresets')?.addEventListener('change', function() {
        applyFilterPreset(this.value);
    });
    
    // Real-time filtering with debouncing
    const filterInputs = [
        'dateFrom', 'dateTo', 'statusFilter', 'plantFilter', 
        'approvalFilter', 'costMin', 'costMax', 'creatorFilter', 
        'carrierFilter', 'quickSearch'
    ];
    
    filterInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', debounce(() => {
                if (element.id === 'quickSearch') {
                    performQuickSearch();
                } else {
                    updateFilterCount();
                }
            }, DEBOUNCE_DELAY));
        }
    });
}

/**
 * Setup real-time search functionality
 */
function setupRealTimeSearch() {
    const quickSearchInput = document.getElementById('quickSearch');
    if (quickSearchInput) {
        quickSearchInput.addEventListener('input', debounce(() => {
            performQuickSearch();
        }, DEBOUNCE_DELAY));
    }
}

/**
 * Perform quick search across multiple fields
 */
function performQuickSearch() {
    const query = document.getElementById('quickSearch')?.value?.toLowerCase().trim();
    
    if (!query) {
        filteredOrdersData = [...allOrdersData];
        populateDataTable(filteredOrdersData);
        updateStatistics(filteredOrdersData);
        return;
    }
    
    const searchResults = allOrdersData.filter(order => {
        const searchFields = [
            String(order.id || ''),
            order.description || '',
            order.reference_number || '',
            order.creator_name || '',
            order.carrier || '',
            order.origin_company_name || '',
            order.destiny_company_name || '',
            order.products || ''
        ];
        
        return searchFields.some(field => 
            field.toLowerCase().includes(query)
        );
    });
    
    filteredOrdersData = searchResults;
    populateDataTable(filteredOrdersData);
    updateStatistics(filteredOrdersData);
    
    // Show search results count
    const count = searchResults.length;
    showInfoToast(`Found ${count} order${count !== 1 ? 's' : ''} matching "${query}"`);
}

/**
 * Apply filter preset
 * @param {string} presetType - Type of preset to apply
 */
function applyFilterPreset(presetType) {
    if (!presetType) return;
    
    const now = new Date();
    
    switch (presetType) {
        case 'thisMonth':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            document.getElementById('dateFrom').value = startOfMonth.toISOString().split('T')[0];
            document.getElementById('dateTo').value = endOfMonth.toISOString().split('T')[0];
            break;
            
        case 'lastMonth':
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            document.getElementById('dateFrom').value = startOfLastMonth.toISOString().split('T')[0];
            document.getElementById('dateTo').value = endOfLastMonth.toISOString().split('T')[0];
            break;
            
        case 'thisWeek':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
            document.getElementById('dateFrom').value = startOfWeek.toISOString().split('T')[0];
            document.getElementById('dateTo').value = endOfWeek.toISOString().split('T')[0];
            break;
            
        case 'pendingApproval':
            document.getElementById('approvalFilter').value = 'pending';
            break;
            
        case 'highValue':
            document.getElementById('costMin').value = '1000';
            break;
    }
    
    // Reset preset selector
    document.getElementById('filterPresets').value = '';
    
    // Apply the filters
    applyFilters();
}

/**
 * Update filter count display
 */
function updateFilterCount() {
    const filters = collectFilterValues();
    let activeCount = 0;
    
    Object.entries(filters).forEach(([key, value]) => {
        if (key === 'dateRange' && (filters.dateFrom || filters.dateTo)) activeCount++;
        else if (key === 'costRange' && (filters.costMin || filters.costMax)) activeCount++;
        else if (value && value !== 'all' && value !== '') activeCount++;
    });
    
    const countBadge = document.getElementById('filterCount');
    if (countBadge) {
        countBadge.textContent = `${activeCount} active`;
        countBadge.className = activeCount > 0 ? 'badge bg-primary ms-2' : 'badge bg-secondary ms-2';
    }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Ignore if user is typing in an input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
            return;
        }
        
        // Handle keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 'f':
                    event.preventDefault();
                    toggleFilters();
                    break;
                case 'r':
                    event.preventDefault();
                    refreshData();
                    break;
                case 'e':
                    event.preventDefault();
                    exportData();
                    break;
                case '/':
                    event.preventDefault();
                    focusQuickSearch();
                    break;
            }
        }
        
        // Escape key to clear search
        if (event.key === 'Escape') {
            clearQuickSearch();
        }
    });
    
    console.log('[TotalHistory] ⌨️ Keyboard shortcuts enabled');
}

/**
 * Toggle filters panel
 */
function toggleFilters() {
    const toggleButton = document.getElementById('toggleFilters');
    if (toggleButton) {
        toggleButton.click();
    }
}

/**
 * Focus on quick search input
 */
function focusQuickSearch() {
    const quickSearch = document.getElementById('quickSearch');
    if (quickSearch) {
        quickSearch.focus();
        quickSearch.select();
    }
}

/**
 * Clear quick search
 */
function clearQuickSearch() {
    const quickSearch = document.getElementById('quickSearch');
    if (quickSearch && quickSearch.value) {
        quickSearch.value = '';
        performQuickSearch();
    }
}

/**
 * Setup auto-refresh functionality
 */
function setupAutoRefresh() {
    // Clear existing interval if any
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Setup new interval
    refreshInterval = setInterval(() => {
        if (!document.hidden && !isLoading) {
            console.log('[TotalHistory] 🔄 Auto-refreshing data...');
            loadTotalHistoryData(false); // Silent refresh
        }
    }, AUTO_REFRESH_INTERVAL);
    
    // Pause auto-refresh when page is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('[TotalHistory] ⏸️ Pausing auto-refresh (page hidden)');
        } else {
            console.log('[TotalHistory] ▶️ Resuming auto-refresh (page visible)');
        }
    });
}

/**
 * Setup statistics refresh
 */
function setupStatisticsRefresh() {
    // Update statistics every 30 seconds if data is available
    setInterval(() => {
        if (!document.hidden && allOrdersData.length > 0) {
            updateStatistics(filteredOrdersData || allOrdersData, true);
        }
    }, 30 * 1000);
}

/**
 * Setup performance monitoring
 */
function setupPerformanceMonitoring() {
    // Monitor memory usage
    if (performance.memory) {
        setInterval(() => {
            const memory = performance.memory;
            const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
            const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
            
            console.log(`[TotalHistory] 📊 Memory usage: ${usedMB}MB / ${totalMB}MB`);
            
            // Warn if memory usage is high
            if (usedMB > 100) {
                console.warn('[TotalHistory] ⚠️ High memory usage detected');
            }
        }, 60000); // Check every minute
    }
    
    // Monitor performance metrics
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.name === 'loadTotalHistoryData') {
                console.log(`[TotalHistory] ⏱️ Data load time: ${entry.duration.toFixed(2)}ms`);
            }
        }
    });
    
    observer.observe({ entryTypes: ['measure'] });
}

/**
 * Load all orders data from API with enhanced error handling and caching
 * @param {boolean} showLoader - Whether to show loading indicator
 */
async function loadTotalHistoryData(showLoader = true) {
    if (isLoading) {
        console.log('[TotalHistory] ⏳ Already loading data, skipping request');
        return;
    }
    
    isLoading = true;
    const startTime = performance.now();
    
    try {
        if (showLoader) {
            showLoading('Loading Complete History', 'Please wait while we fetch all orders data...');
        }
        
        const baseURL = getBaseURL();
        console.log(`[TotalHistory] 🌐 Loading data from: ${baseURL}dao/conections/daoPremiumFreight.php`);
        
        // Add performance marker
        performance.mark('loadTotalHistoryData-start');
        
        const response = await fetch(`${baseURL}dao/conections/daoPremiumFreight.php`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Add performance marker
        performance.mark('loadTotalHistoryData-end');
        performance.measure('loadTotalHistoryData', 'loadTotalHistoryData-start', 'loadTotalHistoryData-end');
        
        console.log('[TotalHistory] 📊 Raw API response received:', { 
            hasData: !!data, 
            dataType: typeof data,
            recordCount: data?.data?.length || 0 
        });
        
        // Extract orders array from response
        let orders = [];
        if (data && data.status === 'success' && Array.isArray(data.data)) {
            orders = data.data;
        } else if (Array.isArray(data)) {
            orders = data;
        } else {
            throw new Error('Invalid data format received from API');
        }
        
        // Validate and clean data
        orders = orders.filter(order => order && order.id).map(order => ({
            ...order,
            cost_euros: parseFloat(order.cost_euros) || 0,
            weight: parseFloat(order.weight) || 0,
            date: order.date || null,
            description: order.description || '',
            creator_name: order.creator_name || 'Unknown',
            status_name: order.status_name || 'Unknown'
        }));
        
        console.log(`[TotalHistory] 📋 Processed ${orders.length} total orders`);
        
        // Store data globally
        allOrdersData = orders;
        filteredOrdersData = [...orders];
        lastRefreshTime = new Date();
        
        // Update UI components
        updateStatistics(orders);
        populateFilterOptions(orders);
        populateDataTable(orders);
        updateLastRefreshTime();
        
        if (showLoader) {
            showSuccessToast(`Loaded ${orders.length.toLocaleString()} orders successfully`);
        }
        
    } catch (error) {
        console.error('[TotalHistory] ❌ Error loading total history data:', error);
        showErrorMessage('Data Loading Error', `Could not load orders data: ${error.message}`);
        
        // Try to use cached data if available
        if (allOrdersData.length > 0) {
            console.log('[TotalHistory] 📦 Using cached data as fallback');
            showWarningToast('Using cached data - some information may be outdated');
        }
    } finally {
        if (showLoader) {
            Swal.close();
        }
        isLoading = false;
        
        const endTime = performance.now();
        console.log(`[TotalHistory] ⏱️ Total execution time: ${(endTime - startTime).toFixed(2)}ms`);
    }
}

/**
 * Update statistics cards with enhanced calculations and animations
 * @param {Array} orders - Array of orders
 * @param {boolean} silent - Whether to animate updates
 */
function updateStatistics(orders, silent = false) {
    try {
        // Calculate comprehensive statistics
        const stats = calculateStatistics(orders);
        
        // Update DOM elements with animations
        updateStatisticCard('totalOrdersCount', stats.total, silent);
        updateStatisticCard('approvedOrdersCount', stats.approved, silent);
        updateStatisticCard('pendingOrdersCount', stats.pending, silent);
        updateStatisticCard('rejectedOrdersCount', stats.rejected, silent);
        
        // Update additional stats if elements exist
        updateStatisticCard('totalCostValue', `€${stats.totalCost.toLocaleString('en-US', {minimumFractionDigits: 2})}`, silent);
        updateStatisticCard('avgCostValue', `€${stats.avgCost.toLocaleString('en-US', {minimumFractionDigits: 2})}`, silent);
        updateStatisticCard('thisMonthCount', stats.thisMonth, silent);
        updateStatisticCard('thisWeekCount', stats.thisWeek, silent);
        
        // Update progress bars for status distribution
        updateStatusDistribution(stats);
        
        // Cache statistics
        statisticsCache = { stats, timestamp: Date.now() };
        
        if (!silent) {
            console.log('[TotalHistory] 📊 Statistics updated:', stats);
        }
        
    } catch (error) {
        console.error('[TotalHistory] ❌ Error updating statistics:', error);
    }
}

/**
 * Calculate comprehensive statistics with enhanced metrics
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
        costByMonth: {},
        trendData: []
    };
    
    orders.forEach(order => {
        // Approval status counts
        const approvalStatus = order.approval_status;
        const requiredLevel = order.required_auth_level || 7;
        
        if (approvalStatus === 99) {
            stats.rejected++;
        } else if (approvalStatus === null || approvalStatus >= requiredLevel) {
            stats.approved++;
        } else {
            stats.pending++;
        }
        
        // Cost calculations
        const cost = parseFloat(order.cost_euros) || 0;
        stats.totalCost += cost;
        
        // Date-based statistics
        if (order.date) {
            const orderDate = new Date(order.date);
            const orderMonth = orderDate.getMonth();
            const orderYear = orderDate.getFullYear();
            const orderWeek = getWeekNumber(orderDate);
            
            // This month count
            if (orderMonth === currentMonth && orderYear === currentYear) {
                stats.thisMonth++;
            }
            
            // This week count
            if (orderWeek === currentWeek && orderYear === currentYear) {
                stats.thisWeek++;
            }
            
            // Cost by month
            const monthKey = `${orderYear}-${orderMonth + 1}`;
            stats.costByMonth[monthKey] = (stats.costByMonth[monthKey] || 0) + cost;
        }
        
        // Group by status
        const status = (order.status_name || 'Unknown').toLowerCase();
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
    
    // Generate trend data for charts
    stats.trendData = generateTrendData(orders);
    
    return stats;
}

/**
 * Generate trend data for visualization
 * @param {Array} orders - Array of orders
 * @returns {Array} Trend data
 */
function generateTrendData(orders) {
    const trendData = [];
    const now = new Date();
    const last12Months = [];
    
    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last12Months.push({
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            key: `${date.getFullYear()}-${date.getMonth() + 1}`,
            orders: 0,
            cost: 0
        });
    }
    
    // Populate with actual data
    orders.forEach(order => {
        if (order.date) {
            const orderDate = new Date(order.date);
            const key = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;
            const monthData = last12Months.find(m => m.key === key);
            
            if (monthData) {
                monthData.orders++;
                monthData.cost += parseFloat(order.cost_euros) || 0;
            }
        }
    });
    
    return last12Months;
}

/**
 * Update status distribution visualization
 * @param {Object} stats - Statistics object
 */
function updateStatusDistribution(stats) {
    const total = stats.total;
    if (total === 0) return;
    
    const approvedPercent = (stats.approved / total) * 100;
    const pendingPercent = (stats.pending / total) * 100;
    const rejectedPercent = (stats.rejected / total) * 100;
    
    // Update progress bars if they exist
    updateProgressBar('approvedProgress', approvedPercent);
    updateProgressBar('pendingProgress', pendingPercent);
    updateProgressBar('rejectedProgress', rejectedPercent);
}

/**
 * Update a progress bar
 * @param {string} elementId - Element ID
 * @param {number} percentage - Percentage value
 */
function updateProgressBar(elementId, percentage) {
    const progressBar = document.getElementById(elementId);
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
        progressBar.textContent = `${percentage.toFixed(1)}%`;
    }
}

/**
 * Update a statistic card with optional animation
 * @param {string} elementId - Element ID to update
 * @param {string|number} value - New value
 * @param {boolean} silent - Whether to skip animation
 */
function updateStatisticCard(elementId, value, silent = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (silent) {
        element.textContent = value;
    } else {
        // Animate counter if it's a number
        if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
            animateCounter(element, parseInt(value) || 0);
        } else {
            // Animate text change
            element.style.opacity = '0.5';
            setTimeout(() => {
                element.textContent = value;
                element.style.opacity = '1';
            }, 150);
        }
    }
}

/**
 * Animate counter from current value to target value
 * @param {HTMLElement} element - Element to animate
 * @param {number} target - Target value
 */
function animateCounter(element, target) {
    const current = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
    const increment = Math.ceil((target - current) / 20);
    const duration = 1000; // 1 second
    const stepTime = duration / 20;
    
    if (current === target) return;
    
    let currentValue = current;
    const timer = setInterval(() => {
        currentValue += increment;
        if ((increment > 0 && currentValue >= target) || (increment < 0 && currentValue <= target)) {
            currentValue = target;
            clearInterval(timer);
        }
        element.textContent = currentValue.toLocaleString();
    }, stepTime);
}

/**
 * Populate filter options based on available data
 * @param {Array} orders - Array of orders
 */
function populateFilterOptions(orders) {
    // Populate plant filter
    const plantFilter = document.getElementById('plantFilter');
    if (plantFilter) {
        const plants = [...new Set(orders.map(order => order.creator_plant).filter(Boolean))].sort();
        plantFilter.innerHTML = '<option value="all">All Plants</option>';
        plants.forEach(plant => {
            const option = document.createElement('option');
            option.value = plant;
            option.textContent = plant;
            plantFilter.appendChild(option);
        });
    }
    
    // Populate creator filter
    const creatorFilter = document.getElementById('creatorFilter');
    if (creatorFilter) {
        const creators = [...new Set(orders.map(order => order.creator_name).filter(Boolean))].sort();
        creatorFilter.innerHTML = '<option value="all">All Creators</option>';
        creators.forEach(creator => {
            const option = document.createElement('option');
            option.value = creator;
            option.textContent = creator;
            creatorFilter.appendChild(option);
        });
    }
    
    // Populate carrier filter
    const carrierFilter = document.getElementById('carrierFilter');
    if (carrierFilter) {
        const carriers = [...new Set(orders.map(order => order.carrier).filter(Boolean))].sort();
        carrierFilter.innerHTML = '<option value="all">All Carriers</option>';
        carriers.forEach(carrier => {
            const option = document.createElement('option');
            option.value = carrier;
            option.textContent = carrier;
            carrierFilter.appendChild(option);
        });
    }
    
    console.log('[TotalHistory] 📋 Filter options populated');
}

/**
 * Collect current filter values
 * @returns {Object} Filter values
 */
function collectFilterValues() {
    return {
        dateFrom: document.getElementById('dateFrom')?.value || '',
        dateTo: document.getElementById('dateTo')?.value || '',
        status: document.getElementById('statusFilter')?.value || 'all',
        plant: document.getElementById('plantFilter')?.value || 'all',
        approvalStatus: document.getElementById('approvalFilter')?.value || 'all',
        costMin: parseFloat(document.getElementById('costMin')?.value) || null,
        costMax: parseFloat(document.getElementById('costMax')?.value) || null,
        creator: document.getElementById('creatorFilter')?.value || 'all',
        carrier: document.getElementById('carrierFilter')?.value || 'all'
    };
}

/**
 * Apply filters to the data with enhanced filtering logic
 */
function applyFilters() {
    if (!allOrdersData.length) return;
    
    try {
        // Collect filter values
        const filters = collectFilterValues();
        
        // Apply filters
        filteredOrdersData = allOrdersData.filter(order => {
            // Date range filter
            if (filters.dateFrom || filters.dateTo) {
                const orderDate = new Date(order.date);
                if (filters.dateFrom && orderDate < new Date(filters.dateFrom)) return false;
                if (filters.dateTo && orderDate > new Date(filters.dateTo + 'T23:59:59')) return false;
            }
            
            // Status filter
            if (filters.status !== 'all') {
                const orderStatus = (order.status_name || '').toLowerCase();
                if (orderStatus !== filters.status) return false;
            }
            
            // Plant filter
            if (filters.plant !== 'all') {
                if (order.creator_plant !== filters.plant) return false;
            }
            
            // Approval status filter
            if (filters.approvalStatus !== 'all') {
                const approvalStatus = order.approval_status;
                const requiredLevel = order.required_auth_level || 7;
                
                switch (filters.approvalStatus) {
                    case 'pending':
                        if (approvalStatus === null || approvalStatus >= requiredLevel || approvalStatus === 99) return false;
                        break;
                    case 'approved':
                        if (approvalStatus !== null && approvalStatus < requiredLevel) return false;
                        break;
                    case 'rejected':
                        if (approvalStatus !== 99) return false;
                        break;
                }
            }
            
            // Cost range filter
            const orderCost = parseFloat(order.cost_euros) || 0;
            if (filters.costMin !== null && orderCost < filters.costMin) return false;
            if (filters.costMax !== null && orderCost > filters.costMax) return false;
            
            // Creator filter
            if (filters.creator !== 'all') {
                if (order.creator_name !== filters.creator) return false;
            }
            
            // Carrier filter
            if (filters.carrier !== 'all') {
                if (order.carrier !== filters.carrier) return false;
            }
            
            return true;
        });
        
        // Update current filters
        currentFilters = filters;
        
        // Update UI
        populateDataTable(filteredOrdersData);
        updateStatistics(filteredOrdersData);
        updateFilterCount();
        
        const filterCount = allOrdersData.length - filteredOrdersData.length;
        if (filterCount > 0) {
            showInfoToast(`Filtered out ${filterCount.toLocaleString()} order${filterCount !== 1 ? 's' : ''}`);
        } else {
            showSuccessToast('All filters applied successfully');
        }
        
        console.log(`[TotalHistory] 🔍 Filters applied: ${filteredOrdersData.length}/${allOrdersData.length} orders`);
        
    } catch (error) {
        console.error('[TotalHistory] ❌ Error applying filters:', error);
        showErrorMessage('Filter Error', 'An error occurred while applying filters.');
    }
}

/**
 * Clear all filters
 */
function clearFilters() {
    try {
        // Reset filter form
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('plantFilter').value = 'all';
        document.getElementById('approvalFilter').value = 'all';
        document.getElementById('costMin').value = '';
        document.getElementById('costMax').value = '';
        document.getElementById('creatorFilter').value = 'all';
        document.getElementById('carrierFilter').value = 'all';
        document.getElementById('quickSearch').value = '';
        document.getElementById('filterPresets').value = '';
        
        // Clear current filters
        currentFilters = {
            dateRange: null,
            status: 'all',
            plant: 'all',
            approvalStatus: 'all',
            costRange: null,
            creator: 'all',
            carrier: 'all'
        };
        
        // Reset to all data
        filteredOrdersData = [...allOrdersData];
        populateDataTable(allOrdersData);
        updateStatistics(allOrdersData);
        updateFilterCount();
        
        showSuccessToast('All filters cleared');
        
        console.log('[TotalHistory] 🔄 All filters cleared');
    } catch (error) {
        console.error('[TotalHistory] ❌ Error clearing filters:', error);
        showErrorMessage('Filter Clear Error', 'An error occurred while clearing filters.');
    }
}

/**
 * Populate the DataTable with all orders
 * @param {Array} orders - Array of orders to display
 */
function populateDataTable(orders) {
    try {
        // Initialize or refresh DataTable
        initializeDataTable(orders);
        
        console.log(`[TotalHistory] 📊 DataTable populated with ${orders.length} orders`);
    } catch (error) {
        console.error('[TotalHistory] ❌ Error populating DataTable:', error);
        showErrorMessage('Table Error', 'An error occurred while updating the table.');
    }
}

/**
 * Initialize DataTable with enhanced configuration and export functionality
 * @param {Array} orders - Array of orders
 */
function initializeDataTable(orders = []) {
    // Destroy existing DataTable if it exists
    if (totalDataTable && $.fn.DataTable.isDataTable('#totalHistoryTable')) {
        totalDataTable.destroy();
        totalDataTable = null;
    }
    
    // Prepare data for DataTable
    const tableData = orders.map(order => {
        const orderDate = order.date ? new Date(order.date) : null;
        const formattedDate = orderDate ? orderDate.toLocaleDateString('en-US') : '-';
        const monthName = orderDate ? orderDate.toLocaleDateString('en-US', { month: 'long' }) : '-';
        const weekNumber = orderDate ? getWeekNumber(orderDate) : '-';
        
        // Format creator name
        const formatCreatorName = (fullName) => {
            if (!fullName) return '-';
            const parts = fullName.trim().split(' ');
            if (parts.length < 2) return fullName;
            return `${parts[0].charAt(0).toUpperCase()}. ${parts[parts.length - 1]}`;
        };
        
        // Get approval status
        const getApprovalStatus = (order) => {
            const approvalStatus = order.approval_status;
            const requiredLevel = order.required_auth_level || 7;
            
            if (approvalStatus === 99) {
                return '<span class="badge bg-danger">Rejected</span>';
            } else if (approvalStatus === null || approvalStatus >= requiredLevel) {
                return '<span class="badge bg-success">Fully Approved</span>';
            } else {
                return `<span class="badge bg-warning">Pending Level ${approvalStatus + 1}</span>`;
            }
        };
        
        return [
            order.id || '-',
            'Grammer AG',
            order.creator_plant || '-',
            order.creator_plant || '-',
            formattedDate,
            order.in_out_bound || '-',
            weekNumber,
            monthName,
            order.reference_number || '-',
            formatCreatorName(order.creator_name),
            order.area || '-',
            order.description || '-',
            order.category_cause || '-',
            order.cost_euros ? `€${parseFloat(order.cost_euros).toFixed(2)}` : '-',
            order.transport || '-',
            order.int_ext || '-',
            order.carrier || '-',
            order.origin_company_name || '-',
            order.origin_city || '-',
            order.destiny_company_name || '-',
            order.destiny_city || '-',
            order.weight ? `${order.weight} kg` : '-',
            order.project_status || '-',
            order.approver_name || '-',
            order.recovery || '-',
            order.paid_by || '-',
            order.products || '-',
            order.status_name || '-',
            order.required_auth_level || '-',
            order.recovery_file ? 'Yes' : 'No',
            order.recovery_evidence ? 'Yes' : 'No',
            order.approval_date || '-',
            getApprovalStatus(order),
            `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" 
                    onclick="generateSinglePDF(${order.id})" 
                    title="Generate PDF for Order ${order.id}">
                <i class="fas fa-file-pdf"></i>
            </button>`
        ];
    });
    
    // Initialize DataTable
    totalDataTable = $('#totalHistoryTable').DataTable({
        data: tableData,
        columns: [
            { title: 'ID', className: 'text-center' },
            { title: 'Division' },
            { title: 'Plant Code', className: 'text-center' },
            { title: 'Plant Name' },
            { title: 'Issue Date', className: 'text-center' },
            { title: 'Inbound/Outbound', className: 'text-center' },
            { title: 'Issue CW', className: 'text-center' },
            { title: 'Issue Month', className: 'text-center' },
            { title: 'Reference Number', className: 'text-center' },
            { title: 'Creator' },
            { title: 'Area', className: 'text-center' },
            { title: 'Description', className: 'text-left' },
            { title: 'Category Cause', className: 'text-center' },
            { title: 'Cost [€]', className: 'text-end' },
            { title: 'Transport', className: 'text-center' },
            { title: 'Int/Ext', className: 'text-center' },
            { title: 'Carrier' },
            { title: 'Origin Company' },
            { title: 'Origin City' },
            { title: 'Destination Company' },
            { title: 'Destination City' },
            { title: 'Weight [kg]', className: 'text-end' },
            { title: 'Project Status', className: 'text-center' },
            { title: 'Approver' },
            { title: 'Recovery', className: 'text-center' },
            { title: 'Paid By', className: 'text-center' },
            { title: 'Products', className: 'text-left' },
            { title: 'Status', className: 'text-center' },
            { title: 'Required Auth Level', className: 'text-center' },
            { title: 'Recovery File', className: 'text-center' },
            { title: 'Recovery Evidence', className: 'text-center' },
            { title: 'Approval Date', className: 'text-center' },
            { title: 'Approval Status', className: 'text-center' },
            { title: 'Actions', className: 'text-center', orderable: false }
        ],
        lengthMenu: [[10, 25, 50, 100, 200, 500, -1], [10, 25, 50, 100, 200, 500, "All"]],
        pageLength: 25,
        order: [[0, 'desc']], // Sort by ID descending
        responsive: true,
        processing: true,
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
                title: `Total_Premium_Freight_Report`,
                filename: function() {
                    return `Total_Premium_Freight_Report_${new Date().toISOString().split('T')[0]}`;
                },
                exportOptions: {
                    columns: ':visible:not(:last-child)'
                }
            },
            {
                extend: 'pdf',
                text: '<i class="fas fa-file-pdf"></i> Export PDF',
                className: 'btn btn-danger btn-sm',
                orientation: 'landscape',
                pageSize: 'A3',
                title: `Total Premium Freight Report`,
                filename: function() {
                    return `Total_Premium_Freight_Report_${new Date().toISOString().split('T')[0]}`;
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
                                text: `Total Historical Report`,
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
                                    text: 'Page ' + currentPage.toString() + ' of ' + pageCount, 
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
                    columns: ':visible:not(:last-child)'
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
                    refreshData();
                }
            }
        ],
        scrollX: true,
        scrollCollapse: true,
        stateSave: true,
        stateDuration: 60 * 60 * 24, // 24 hours
        initComplete: function(settings, json) {
            console.log('[TotalHistory] 📊 DataTable initialized successfully');
            
            // Add custom styling to buttons
            $('.dt-buttons-wrapper .btn').addClass('me-2 mb-2');
            
            // Add tooltips to action buttons
            $('[data-bs-toggle="tooltip"]').tooltip();
            
            // Update search input styling
            $('.dataTables_filter input').addClass('form-control form-control-sm');
            $('.dataTables_filter input').attr('placeholder', 'Search orders...');
        }
    });
}

/**
 * Handle batch SVG generation for filtered/visible orders
 */
async function handleBatchSVGGeneration() {
    try {
        const ordersToProcess = filteredOrdersData.length > 0 ? filteredOrdersData : allOrdersData;
        
        if (ordersToProcess.length === 0) {
            showInfoMessage('No Data', 'No orders available to generate PDFs.');
            return;
        }
        
        // Show confirmation dialog
        const result = await Swal.fire({
            icon: 'question',
            title: 'Generate PDFs',
            html: `
                <p>You are about to generate <strong>${ordersToProcess.length}</strong> PDF documents.</p>
                <p>This process may take several minutes. Do you want to continue?</p>
            `,
            showCancelButton: true,
            confirmButtonText: 'Yes, Generate All',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33'
        });
        
        if (!result.isConfirmed) return;
        
        // Show progress modal
        Swal.fire({
            title: 'Generating PDFs',
            html: `
                <div class="progress mb-3">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         role="progressbar" style="width: 0%" id="batchProgress"></div>
                </div>
                <p id="batchStatus">Preparing documents...</p>
                <small class="text-muted">Please do not close this window.</small>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        let successCount = 0;
        let errorCount = 0;
        
        // Process orders in batches to avoid overwhelming the browser
        for (let i = 0; i < ordersToProcess.length; i += BATCH_SIZE) {
            const batch = ordersToProcess.slice(i, i + BATCH_SIZE);
            
            for (const order of batch) {
                try {
                    const progress = ((i + batch.indexOf(order) + 1) / ordersToProcess.length) * 100;
                    
                    // Update progress
                    document.getElementById('batchProgress').style.width = `${progress}%`;
                    document.getElementById('batchStatus').textContent = 
                        `Processing order ${order.id} (${i + batch.indexOf(order) + 1}/${ordersToProcess.length})...`;
                    
                    // Generate PDF
                    await generatePDF(order, `PF_${order.id}_${order.creator_plant || 'Order'}`);
                    successCount++;
                    
                    // Small delay to prevent browser freezing
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`[TotalHistory] Error generating PDF for order ${order.id}:`, error);
                    errorCount++;
                }
            }
            
            // Longer delay between batches
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Show completion message
        Swal.fire({
            icon: successCount > 0 ? 'success' : 'error',
            title: 'PDF Generation Complete',
            html: `
                <div class="alert alert-info">
                    <strong>Results:</strong><br>
                    ✅ Successfully generated: ${successCount} PDFs<br>
                    ${errorCount > 0 ? `❌ Failed: ${errorCount} PDFs` : ''}
                </div>
                <p>Check your downloads folder for the generated files.</p>
            `,
            confirmButtonText: 'OK'
        });
        
    } catch (error) {
        console.error('[TotalHistory] ❌ Error in batch PDF generation:', error);
        Swal.fire({
            icon: 'error',
            title: 'Generation Error',
            text: 'An error occurred while generating PDFs: ' + error.message
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
            showErrorMessage('Order Not Found', `Order with ID ${orderId} not found.`);
            return;
        }
        
        showLoading('Generating PDF', `Creating PDF for order ${orderId}...`);
        
        const fileName = await generatePDF(order, `PF_${orderId}_${order.creator_plant || 'Order'}`);
        
        Swal.fire({
            icon: 'success',
            title: 'PDF Generated',
            text: `Successfully generated: ${fileName}`,
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error(`[TotalHistory] Error generating PDF for order ${orderId}:`, error);
        showErrorMessage('PDF Generation Error', `Failed to generate PDF: ${error.message}`);
    }
};

/**
 * Refresh data from server
 */
function refreshData() {
    console.log('[TotalHistory] 🔄 Manual refresh triggered');
    loadTotalHistoryData(true);
}

/**
 * Export data in various formats
 */
function exportData() {
    // Trigger the Excel export from DataTable
    if (totalDataTable) {
        totalDataTable.button(0).trigger();
    }
}

/**
 * Update last refresh time display
 */
function updateLastRefreshTime() {
    const refreshElement = document.getElementById('lastRefreshTime');
    if (refreshElement && lastRefreshTime) {
        refreshElement.textContent = `Last updated: ${lastRefreshTime.toLocaleTimeString()}`;
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
 * Utility function to show info messages
 * @param {string} title - Info title
 * @param {string} message - Info message
 */
function showInfoMessage(title, message) {
    Swal.fire({
        icon: 'info',
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
        timer: 3000,
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
        timer: 2000,
        timerProgressBar: true
    });
}

/**
 * Utility function to show warning toast
 * @param {string} message - Warning message
 */
function showWarningToast(message) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}