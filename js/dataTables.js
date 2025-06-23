import { generatePDF } from './svgOrders.js';

/**
 * Premium Freight - Shared DataTables Utilities
 * Functions shared between TotalHistory and WeeklyHistory pages
 */

// Existing global variables
let isLoading = false;
let allOrdersData = [];
let dataCache = new Map();

// Configuración común  
const BATCH_SIZE = 50;
const DEBOUNCE_DELAY = 300;
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

/**
 * Get base URL helper function with fallback
 * @returns {string} The base URL for API calls
 */
function getBaseURL() {
    if (typeof URLPF !== 'undefined' && URLPF) {
        return URLPF;
    }
    if (typeof window !== 'undefined' && window.URLPF) {
        return window.URLPF;
    }
    return '/';
}

/**
 * Calculate ISO 8601 week number from a date
 * @param {Date|string} date - Date object or string
 * @returns {number|string} Week number or 'N/A' if invalid
 */
function getWeekNumber(date) {
    if (!date) return 'N/A';
    
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        if (isNaN(dateObj.getTime())) {
            return 'N/A';
        }
        
        // Crear una copia para no modificar la fecha original
        const tempDate = new Date(dateObj.getTime());
        
        // ISO week date (Monday as first day)
        tempDate.setHours(0, 0, 0, 0);
        tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
        
        // January 4 is always in week 1
        const week1 = new Date(tempDate.getFullYear(), 0, 4);
        
        // Calculate week number
        return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    } catch (error) {
        console.error('[DataTables] Error calculating week number:', error);
        return 'N/A';
    }
}

/**
 * Get DataTable configuration for history pages
 * @param {string} filename - Export filename prefix
 * @param {string} title - Export title
 * @returns {Object} DataTable configuration
 */
function getDataTableConfig(filename, title) {
    return {
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excel',
                text: '<i class="fas fa-file-excel"></i> Excel',
                className: 'btn btn-success btn-sm buttons-excel',
                filename: `${filename}_${new Date().toISOString().split('T')[0]}`,
                title: title,
                exportOptions: { columns: ':not(:last-child)' }
            },
            {
                extend: 'csv',
                text: '<i class="fas fa-file-csv"></i> CSV',
                className: 'btn btn-info btn-sm buttons-csv',
                filename: `${filename}_${new Date().toISOString().split('T')[0]}`,
                title: title,
                exportOptions: { columns: ':not(:last-child)' }
            },
            {
                extend: 'print',
                text: '<i class="fas fa-print"></i> Print',
                className: 'btn btn-secondary btn-sm buttons-print',
                title: title,
                exportOptions: { columns: ':not(:last-child)' }
            },
            {
                text: '<i class="fas fa-file-pdf"></i> SVG',
                className: 'btn btn-danger btn-sm buttons-svg',
                action: async function () {
                    const ordersToExport = filteredOrdersData.length ? filteredOrdersData : allOrdersData;
                    for (const order of ordersToExport) {
                        await generatePDF(order);
                    }
                    showSuccessToast('PDFs generated successfully!');
                }
            }
        ],
        pageLength: 25,
        responsive: true,
        columnDefs: [
            { targets: [0], width: "80px", className: "text-center" }, // ID
            { targets: [1, 2, 3], width: "100px", className: "text-center" }, // Division, Plant Code, Plant Name
            { targets: [4], width: "120px", className: "text-center" }, // Issue Date
            {
                targets: [10], // Description column
                width: "200px",
                className: "text-left",
                render: function(data, type, row) {
                    if (type === 'display') {
                        return `<span class="table-description" title="${data}">${data}</span>`;
                    }
                    return data;
                }
            }
        ],
        language: {
            search: "Search orders:",
            lengthMenu: "Show _MENU_ orders per page",
            info: "Showing _START_ to _END_ of _TOTAL_ orders",
            infoEmpty: "No orders found",
            infoFiltered: "(filtered from _MAX_ total orders)"
        }
    };
}

/**
 * Get DataTable buttons configuration
 * @param {Array} ordersData - Array of orders to export
 * @returns {Array} Buttons configuration
 */
function getDataTableButtons(ordersData) {
    return [
        {
            extend: 'excel',
            text: '<i class="fas fa-file-excel"></i> Excel',
            className: 'btn btn-success btn-sm buttons-excel',
            filename: `Orders_${new Date().toISOString().split('T')[0]}`,
            title: 'Orders History',
            exportOptions: { columns: ':not(:last-child)' }
        },
        {
            extend: 'csv',
            text: '<i class="fas fa-file-csv"></i> CSV',
            className: 'btn btn-info btn-sm buttons-csv',
            filename: `Orders_${new Date().toISOString().split('T')[0]}`,
            title: 'Orders History',
            exportOptions: { columns: ':not(:last-child)' }
        },
        {
            text: '<i class="fas fa-file-pdf"></i> SVG',
            className: 'btn btn-danger btn-sm buttons-svg',
            action: async function () {
                const ordersToExport = ordersData.length ? ordersData : [];
                for (const order of ordersToExport) {
                    await generatePDF(order);
                }
                showSuccessToast('PDFs generated successfully!');
            }
        }
    ];
}

/**
 * Load orders data from API
 * @returns {Promise<Array>} Promise resolving to orders array
 */
async function loadOrdersData() {
    try {
        console.log('[DataTables] 🔄 Loading orders data...');
        
        const baseUrl = getBaseURL();
        const response = await fetch(`${baseUrl}dao/conections/daoPremiumFreight.php`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[DataTables] 📋 Server response:', data);
        
        if (data.status === 'error') {
            throw new Error(data.message || 'Unknown server error');
        }
        
        const orders = Array.isArray(data) ? data : (data.data || []);
        console.log('[DataTables] ✅ Orders loaded:', orders);
        
        return orders;
    } catch (error) {
        console.error('[DataTables] ❌ Error loading orders data:', error);
        throw error;
    }
}

/**
 * Format cost value for display
 * @param {number|string} cost - Cost value
 * @returns {string} Formatted cost
 */
function formatCost(cost) {
    if (!cost || cost === '-' || isNaN(cost)) return '-';
    
    const numericCost = parseFloat(cost);
    if (isNaN(numericCost)) return '-';
    
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numericCost);
}

/**
 * Format weight value for display
 * @param {number|string} weight - Weight value
 * @returns {string} Formatted weight
 */
function formatWeight(weight) {
    if (!weight || weight === '-' || isNaN(weight)) return '-';
    
    const numericWeight = parseFloat(weight);
    if (isNaN(numericWeight)) return '-';
    
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numericWeight) + ' kg';
}

/**
 * Show loading message
 * @param {string} title - Loading title
 * @param {string} text - Loading text
 */
function showLoading(title, text) {
    Swal.fire({
        title: title,
        text: text,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

/**
 * Show success toast
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
 * Show error message
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showErrorMessage(title, message) {
    Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        confirmButtonText: 'OK',
        confirmButtonColor: '#034C8C'
    });
}

/**
 * Show informational toast
 * @param {string} message - Informational message
 */
function showInfoToast(message) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

/**
 * Add notification styles
 */
function addNotificationStyles() {
    console.log('[DataTables] Adding notification styles...');
    const style = document.createElement('style');
    style.innerHTML = `
        .toast-success {
            background-color: #28a745;
            color: #fff;
            padding: 10px;
            border-radius: 5px;
        }
        .toast-error {
            background-color: #dc3545;
            color: #fff;
            padding: 10px;
            border-radius: 5px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    console.log('[TotalHistory] Setting up keyboard shortcuts...');
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            const filterPanel = document.getElementById('filterPanelBody');
            if (filterPanel) {
                filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
            }
        }
    });
}

/**
 * Generate dynamic filters for the filter panel
 * @param {string} endpoint - API endpoint to fetch data
 */
async function generateFilters(endpoint) {
    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const orders = data.data || [];

        // Populate Plant filter
        const plantSelect = document.getElementById('filterPlant');
        const uniquePlants = [...new Set(orders.map(order => order.planta))];
        uniquePlants.forEach(plant => {
            const option = document.createElement('option');
            option.value = plant;
            option.textContent = plant;
            plantSelect.appendChild(option);
        });

        // Populate Approval Status filter
        const statusSelect = document.getElementById('filterApprovalStatus');
        const uniqueStatuses = [...new Set(orders.map(order => order.status_name))];
        const statusTranslations = {
            nuevo: 'New',
            revision: 'Review',
            aprobado: 'Approved',
            rechazado: 'Rejected'
        };
        uniqueStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = statusTranslations[status] || status;
            option.textContent = statusTranslations[status] || status;
            statusSelect.appendChild(option);
        });

        console.log('[DataTables] Filters generated successfully');
    } catch (error) {
        console.error('[DataTables] Error generating filters:', error);
    }
}

/**
 * Apply filters to the data
 * @param {Array} data - Array of data to filter
 * @param {Object} filters - Filters to apply
 * @returns {Array} Filtered data
 */
function applyFilters(data, filters) {
    const today = new Date();

    console.log('[DataTables] Applying filters:', filters);

    return data.filter(order => {
        const orderDate = new Date(order.date);
        const cost = parseFloat(order.cost_euros) || 0;

        // Date filter logic
        console.log(`[DataTables] Date filter selected: ${filters.date}`);
        const dateMatch = (filters.date === 'week' && (today - orderDate) / (1000 * 60 * 60 * 24) <= 7) ||
                          (filters.date === 'month' && today.getMonth() === orderDate.getMonth() && today.getFullYear() === orderDate.getFullYear()) ||
                          (filters.date === 'four-month' && (today - orderDate) / (1000 * 60 * 60 * 24) <= 120) ||
                          (filters.date === 'semester' && (today - orderDate) / (1000 * 60 * 60 * 24) <= 180) ||
                          (filters.date === 'year' && today.getFullYear() === orderDate.getFullYear()) ||
                          (filters.date === '5-year' && today.getFullYear() - orderDate.getFullYear() <= 5) ||
                          (filters.date === '10-year' && today.getFullYear() - orderDate.getFullYear() <= 10) ||
                          filters.date === 'all'; // Match all dates if "All" is selected
        console.log(`[DataTables] Date filter result for order ${order.id}: ${dateMatch}`);

        // Plant filter logic
        console.log(`[DataTables] Plant filter selected: ${filters.plant}`);
        const plantMatch = filters.plant === 'all' || order.planta === filters.plant;
        console.log(`[DataTables] Plant filter result for order ${order.id}: ${plantMatch}`);

        // Approval status filter logic
        console.log(`[DataTables] Approval status filter selected: ${filters.approvalStatus}`);
        const statusTranslations = {
            nuevo: 'New',
            revision: 'Review',
            aprobado: 'Approved',
            rechazado: 'Rejected'
        };
        const approvalStatusMatch = filters.approvalStatus === 'all' || statusTranslations[order.status_name] === filters.approvalStatus;
        console.log(`[DataTables] Approval status filter result for order ${order.id}: ${approvalStatusMatch}`);

        // Cost range filter logic
        console.log(`[DataTables] Cost range filter selected: ${filters.costRange}`);
        const costMatch = filters.costRange === '<1500' ? cost < 1500 :
                          filters.costRange === '1501-5000' ? cost >= 1501 && cost <= 5000 :
                          filters.costRange === '5001-10000' ? cost >= 5001 && cost <= 10000 :
                          filters.costRange === '>10000' ? cost > 10000 :
                          filters.costRange === 'all'; // Match all costs if "All" is selected
        console.log(`[DataTables] Cost range filter result for order ${order.id}: ${costMatch}`);

        const result = dateMatch && plantMatch && approvalStatusMatch && costMatch;
        console.log(`[DataTables] Final filter result for order ${order.id}: ${result}`);
        return result;
    });
}

/**
 * Clear filters and reset data
 * @param {Array} data - Original data
 * @returns {Array} Reset data
 */
function clearFilters(data) {
    console.log('[DataTables] Clearing filters and resetting data');
    return data; // Return the original data without filters
}

/**
 * Setup toggle functionality for filter panel
 * @param {string} toggleButtonId - ID of the toggle button
 * @param {string} filterPanelId - ID of the filter panel
 */
function setupToggleFilters(toggleButtonId, filterPanelId) {
    const toggleBtn = document.getElementById(toggleButtonId);
    const filterPanel = document.getElementById(filterPanelId);

    if (toggleBtn && filterPanel) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = filterPanel.style.display !== 'none';
            filterPanel.style.display = isVisible ? 'none' : 'block';
            toggleBtn.innerHTML = isVisible ?
                '<i class="fas fa-chevron-down"></i>' :
                '<i class="fas fa-chevron-up"></i>';
        });

        console.log(`[DataTables] Toggle functionality set up for ${toggleButtonId}`);
    } else {
        console.warn(`[DataTables] Toggle button or filter panel not found: ${toggleButtonId}, ${filterPanelId}`);
    }
}

/**
 * Generate PDFs for all visible orders in the DataTable
 * @param {Array} ordersData - Array of orders currently visible in the DataTable
 */
async function generatePDFsForVisibleOrders(ordersData) {
    try {
        let totalOrders = ordersData.length;
        let completedOrders = 0;
        let failedOrders = [];

        Swal.fire({
            title: 'Generating PDFs',
            html: `<p>Generating <strong>0/${totalOrders}</strong></p><div id="progress-bar" style="width: 100%; height: 20px; background: var(--gray-200); border-radius: 8px;"><div id="progress-bar-fill" style="width: 0%; height: 100%; background: var(--grammer-blue); border-radius: 8px;"></div></div>`,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        for (const order of ordersData) {
            const orderId = order.id;
            const customFileName = `PF_${orderId}`;
            try {
                await generatePDF(orderId, customFileName); // Directly use the imported function
                completedOrders++;
            } catch (error) {
                console.error(`[DataTables] Error generating PDF for order ${orderId}:`, error);
                failedOrders.push(customFileName);
            }

            const progressPercentage = Math.round((completedOrders / totalOrders) * 100);
            document.getElementById('progress-bar-fill').style.width = `${progressPercentage}%`;
            Swal.getHtmlContainer().querySelector('p').innerHTML = `Generating <strong>${completedOrders}/${totalOrders}</strong>`;
        }

        Swal.close();

        if (failedOrders.length === 0) {
            Swal.fire({
                icon: 'success',
                title: 'PDF Generation Complete',
                text: `All PDFs generated successfully (${completedOrders}/${totalOrders}).`,
                confirmButtonColor: 'var(--grammer-blue)'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'PDF Generation Complete with Errors',
                html: `Generated ${completedOrders}/${totalOrders} PDFs.<br>Failed: ${failedOrders.join(', ')}`,
                confirmButtonColor: 'var(--grammer-blue)'
            });
        }
    } catch (error) {
        console.error('[DataTables] Error during PDF generation:', error);
        Swal.fire({
            icon: 'error',
            title: 'PDF Generation Failed',
            text: 'An unexpected error occurred during PDF generation.',
            confirmButtonColor: 'var(--grammer-blue)'
        });
    }
}

/**
 * Extract all visible IDs from the DataTable
 * @param {string} tableId - ID of the DataTable
 * @returns {Array} Array of visible orders
 */
function getVisibleOrdersFromDataTable(tableId) {
    const table = $(`#${tableId}`).DataTable();
    const visibleData = table.rows({ filter: 'applied' }).data().toArray();
    return visibleData.map(row => ({
        id: row[0], // Assuming the ID is in the first column
        ...row // Include other data if needed
    }));
}

// Attach SVG button functionality
document.addEventListener('DOMContentLoaded', function () {
    const svgButton = document.querySelector('.buttons-svg');
    if (svgButton) {
        svgButton.addEventListener('click', async () => {
            const tableId = svgButton.closest('table').id; // Get the table ID dynamically
            const visibleOrders = getVisibleOrdersFromDataTable(tableId);
            await generatePDFsForVisibleOrders(visibleOrders);
        });
    }
});

console.log('[DataTables] 📊 DataTables utilities module updated successfully');