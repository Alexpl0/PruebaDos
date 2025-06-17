/**
 * Premium Freight - Weekly Orders Module
 * Manages weekly order history display and navigation
 */

import { getWeekNumber, showLoading } from './utils.js';
import { loadAndPopulateSVG, generatePDF } from './svgOrders.js';

/**
 * Configuration and global variables
 */
let ordersData = [];
let currentWeekOffset = 0;
let dataTableWeekly = null;

/**
 * Initialize the weekly orders page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing weekly orders page...');
    
    try {
        await initializeWeeklyOrders();
    } catch (error) {
        console.error('Error initializing weekly orders:', error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: 'Failed to initialize the weekly orders page: ' + error.message
        });
    }
});

/**
 * Load orders data from the existing daoPremiumFreight.php endpoint
 */
async function loadOrdersData() {
    try {
        const baseURL = getBaseURL(); // USAR LA FUNCIÓN HELPER
        const apiUrl = baseURL + 'dao/conections/daoPremiumFreight.php';
        
        console.log('Loading orders from:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || data.status !== 'success' || !Array.isArray(data.data)) {
            throw new Error('Invalid data format received from API');
        }
        
        ordersData = data.data;
        console.log(`Loaded ${ordersData.length} orders successfully`);
        
        return ordersData;
        
    } catch (error) {
        console.error('Error loading orders data:', error);
        throw error;
    }
}

/**
 * Calculate week number using ISO 8601 standard
 */
function getISOWeekNumber(date) {
    if (!date) return null;
    
    try {
        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) return null;
        
        // Copy date so we don't modify original
        const d = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
        
        // Set to nearest Thursday: current date + 4 - current day number
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        
        // Get first day of year
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        
        // Calculate full weeks to nearest Thursday
        const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        
        return weekNum;
    } catch (error) {
        console.error('Error calculating week number:', error);
        return null;
    }
}

/**
 * Get target week based on current week and offset
 */
function getTargetWeek() {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - (currentWeekOffset * 7));
    
    return {
        week: getISOWeekNumber(currentDate),
        year: currentDate.getFullYear(),
        date: currentDate
    };
}

/**
 * Filter orders by target week
 */
function filterOrdersByWeek(orders, targetWeek, targetYear) {
    return orders.filter(order => {
        if (!order.date) return false;
        
        const orderWeek = getISOWeekNumber(order.date);
        const orderYear = new Date(order.date).getFullYear();
        
        return orderWeek === targetWeek && orderYear === targetYear;
    });
}

/**
 * Generate the weekly table with filtered data
 */
async function generateWeeklyTable() {
    try {
        console.log(`Generating weekly table for week offset: ${currentWeekOffset}`);
        
        // Show loading
        showLoading('Loading Weekly Data', 'Preparing weekly orders table...');
        
        // Get target week information
        const target = getTargetWeek();
        console.log(`Target week: ${target.week} of ${target.year}`);
        
        // Filter orders for the target week
        const filteredOrders = filterOrdersByWeek(ordersData, target.week, target.year);
        console.log(`Found ${filteredOrders.length} orders for week ${target.week}`);
        
        // Update page title
        updatePageTitle(target.week, target.year);
        
        // Update navigation buttons
        updateNavigationButtons();
        
        // Generate table content
        await populateWeeklyTable(filteredOrders);
        
        // Initialize DataTable
        initializeWeeklyDataTable();
        
        // Close loading
        Swal.close();
        
        console.log('Weekly table generated successfully');
        
    } catch (error) {
        console.error('Error generating weekly table:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to generate weekly table: ' + error.message
        });
    }
}

/**
 * Update page title with week information
 */
function updatePageTitle(week, year) {
    const titleElement = document.querySelector('.history-title');
    if (titleElement) {
        titleElement.textContent = `Weekly Premium Freight History - Week ${week} of ${year}`;
    }
    
    const subtitleElement = document.querySelector('.history-subtitle');
    if (subtitleElement) {
        const weekText = currentWeekOffset === 0 ? 'Current Week' : `${currentWeekOffset} week(s) ago`;
        subtitleElement.textContent = `Showing orders from ${weekText}`;
    }
}

/**
 * Update navigation button states
 */
function updateNavigationButtons() {
    const nextBtn = document.getElementById('nextWeek');
    const prevBtn = document.getElementById('prevWeek');
    
    if (nextBtn) {
        nextBtn.disabled = currentWeekOffset === 0;
    }
    
    // Previous week button is always enabled (we can go back indefinitely)
    if (prevBtn) {
        prevBtn.disabled = false;
    }
}

/**
 * Populate the weekly table with order data
 */
async function populateWeeklyTable(orders) {
    const tableBody = document.getElementById('weeklyTableBody');
    if (!tableBody) {
        throw new Error('Weekly table body element not found');
    }
    
    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="33" class="text-center">No orders found for this week</td></tr>';
        return;
    }
    
    let content = '';
    
    orders.forEach(order => {
        const issueDate = order.date ? new Date(order.date) : null;
        const formattedDate = issueDate ? issueDate.toLocaleDateString('en-US') : '-';
        const weekNum = issueDate ? getISOWeekNumber(order.date) : '-';
        const monthName = issueDate ? issueDate.toLocaleDateString('en-US', { month: 'long' }) : '-';
        
        content += `
            <tr>
                <td>${order.id || '-'}</td>
                <td>Grammer AG</td>
                <td>${order.creator_plant || '-'}</td>
                <td>${order.creator_plant || '-'}</td>
                <td>${formattedDate}</td>
                <td>${order.in_out_bound || '-'}</td>
                <td>${weekNum}</td>
                <td>${monthName}</td>
                <td>${order.reference_number || '-'}</td>
                <td>${formatCreatorName(order.creator_name)}</td>
                <td>${order.area || '-'}</td>
                <td class="truncated-text" title="${order.description || ''}">${truncateText(order.description, 50)}</td>
                <td>${order.category_cause || '-'}</td>
                <td>${order.cost_euros ? `€${parseFloat(order.cost_euros).toFixed(2)}` : '-'}</td>
                <td>${order.transport || '-'}</td>
                <td>${order.int_ext || '-'}</td>
                <td>${order.carrier || '-'}</td>
                <td>${order.origin_company_name || '-'}</td>
                <td>${order.origin_city || '-'}</td>
                <td>${order.destiny_company_name || '-'}</td>
                <td>${order.destiny_city || '-'}</td>
                <td>${order.weight ? `${order.weight} kg` : '-'}</td>
                <td>${order.project_status || '-'}</td>
                <td>${order.approver_name || '-'}</td>
                <td>${order.recovery || '-'}</td>
                <td>${order.paid_by || '-'}</td>
                <td>${order.products || '-'}</td>
                <td>${order.status_name || '-'}</td>
                <td>${order.required_auth_level || '-'}</td>
                <td>${order.recovery_file ? 'Yes' : 'No'}</td>
                <td>${order.recovery_evidence ? 'Yes' : 'No'}</td>
                <td>${order.approval_date || '-'}</td>
                <td>${order.approval_status !== null ? order.approval_status : '-'}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = content;
}

/**
 * Initialize or reinitialize the weekly DataTable
 */
function initializeWeeklyDataTable() {
    // Destroy existing DataTable if it exists
    if (dataTableWeekly) {
        try {
            dataTableWeekly.destroy();
            dataTableWeekly = null;
        } catch (error) {
            console.warn('Error destroying existing DataTable:', error);
        }
    }
    
    // Initialize new DataTable
    try {
        const baseURL = getBaseURL(); // USAR LA FUNCIÓN HELPER
        
        dataTableWeekly = $('#weeklyOrdersTable').DataTable({
            lengthMenu: [10, 25, 50, 100],
            pageLength: 10,
            scrollX: true,
            scrollCollapse: true,
            order: [[0, 'desc']], // Order by ID descending
            language: {
                lengthMenu: "Show _MENU_ records per page",
                zeroRecords: "No records found",
                info: "Showing _START_ to _END_ of _TOTAL_ records",
                infoEmpty: "No records available",
                infoFiltered: "(filtered from _MAX_ total records)",
                search: "Search:",
                paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                }
            },
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excel',
                    text: '<i class="fas fa-file-excel"></i> Excel',
                    className: 'btn-success',
                    title: 'Weekly_Premium_Freight_Report',
                    filename: function() {
                        const target = getTargetWeek();
                        return `Weekly_Premium_Freight_W${target.week}_${target.year}`;
                    }
                },
                {
                    extend: 'pdf',
                    text: '<i class="fas fa-file-pdf"></i> PDF',
                    className: 'btn-danger',
                    orientation: 'landscape',
                    pageSize: 'LEGAL',
                    title: function() {
                        const target = getTargetWeek();
                        return `Weekly Premium Freight Report - Week ${target.week} of ${target.year}`;
                    },
                    filename: function() {
                        const target = getTargetWeek();
                        return `Weekly_Premium_Freight_W${target.week}_${target.year}`;
                    }
                },
                {
                    text: '<i class="fas fa-file-image"></i> Generate SVGs',
                    className: 'btn-info',
                    action: async function(e, dt, node, config) {
                        await handleBulkSVGGeneration(dt);
                    }
                }
            ]
        });
        
        console.log('Weekly DataTable initialized successfully');
        
    } catch (error) {
        console.error('Error initializing weekly DataTable:', error);
    }
}

/**
 * Handle bulk SVG/PDF generation
 */
async function handleBulkSVGGeneration(dataTable) {
    try {
        const exportData = dataTable.rows({search: 'applied'}).data().toArray();
        
        if (exportData.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No Data',
                text: 'There are no records to export'
            });
            return;
        }
        
        if (exportData.length > 10) {
            const confirm = await Swal.fire({
                icon: 'warning',
                title: 'Many Records',
                html: `You are about to generate ${exportData.length} PDF documents. Do you want to continue?`,
                showCancelButton: true,
                confirmButtonText: 'Yes, generate all',
                cancelButtonText: 'Cancel'
            });
            
            if (!confirm.isConfirmed) return;
        }
        
        showLoading('Generating PDFs', 'Please wait while documents are being generated...');
        
        const ids = exportData.map(row => row[0]);
        const visibleOrders = ordersData.filter(order => ids.includes(String(order.id)));
        
        for (let i = 0; i < visibleOrders.length; i++) {
            const order = visibleOrders[i];
            
            Swal.update({
                html: `Processing document ${i + 1} of ${visibleOrders.length}...`
            });
            
            try {
                const fileName = await generatePDF(order, `PF_Weekly_${order.id}`);
                console.log(`Generated PDF for order ${order.id}: ${fileName}`);
            } catch (error) {
                console.error(`Error generating PDF for order ${order.id}:`, error);
            }
            
            // Small delay between generations
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        Swal.fire({
            icon: 'success',
            title: 'Documents Generated',
            html: `${visibleOrders.length} PDF documents have been generated.<br>Check your downloads folder.`
        });
        
    } catch (error) {
        console.error('Error in bulk SVG generation:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while generating documents: ' + error.message
        });
    }
}

/**
 * Initialize the weekly orders functionality
 */
async function initializeWeeklyOrders() {
    try {
        console.log('Loading orders data...');
        await loadOrdersData();
        
        console.log('Setting up navigation...');
        setupNavigation();
        
        console.log('Generating initial weekly table...');
        await generateWeeklyTable();
        
        console.log('Weekly orders initialized successfully');
        
    } catch (error) {
        console.error('Error initializing weekly orders:', error);
        throw error;
    }
}

/**
 * Setup navigation button event listeners
 */
function setupNavigation() {
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            currentWeekOffset++;
            await generateWeeklyTable();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            if (currentWeekOffset > 0) {
                currentWeekOffset--;
                await generateWeeklyTable();
            }
        });
    }
}

/**
 * Helper function to format creator names
 */
function formatCreatorName(fullName) {
    if (!fullName || typeof fullName !== 'string') return fullName || '-';
    
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) return fullName;
    
    const firstInitial = nameParts[0].charAt(0).toUpperCase();
    const lastName = nameParts[nameParts.length - 1];
    
    return `${firstInitial}. ${lastName}`;
}

/**
 * Helper function to truncate text
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
}

// Export functions for potential use by other modules
export { 
    initializeWeeklyOrders, 
    generateWeeklyTable, 
    getISOWeekNumber 
};