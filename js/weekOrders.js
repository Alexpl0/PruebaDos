/**
 * Premium Freight - Weekly Orders History Page
 * Manages the weekly orders history page functionality
 */

import { getWeekNumber, showLoading, addNotificationStyles } from './utils.js';
import { loadAndPopulateSVG, generatePDF } from './svgOrders.js';

/**
 * Configuration and global variables
 */
let currentWeekOffset = 0;
let allOrdersData = [];

/**
 * Initialize the weekly orders page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('[WeekOrders] Initializing weekly orders page...');
    
    // Add notification styles
    addNotificationStyles();
    
    // Load initial data
    loadWeeklyData(currentWeekOffset);
    
    // Setup navigation buttons
    setupWeekNavigation();
    
    // Setup export functionality
    setupExportButtons();
});

/**
 * Setup week navigation buttons
 */
function setupWeekNavigation() {
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentWeekOffset++;
            loadWeeklyData(currentWeekOffset);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentWeekOffset > 0) {
                currentWeekOffset--;
                loadWeeklyData(currentWeekOffset);
            }
        });
    }
}

/**
 * Load weekly data from API
 * @param {number} weekOffset - Number of weeks to go back from current week
 */
async function loadWeeklyData(weekOffset = 0) {
    try {
        showLoading('Loading Weekly Data', 'Please wait while we fetch the orders...');
        
        const baseURL = getBaseURL(); // USAR LA FUNCIÓN HELPER
        console.log(`[WeekOrders] Loading data from: ${baseURL}dao/conections/daoPremiumFreight.php`);
        
        const response = await fetch(`${baseURL}dao/conections/daoPremiumFreight.php`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[WeekOrders] Raw API response:', data);
        
        // Extract orders array from response
        let orders = [];
        if (data && data.status === 'success' && Array.isArray(data.data)) {
            orders = data.data;
        } else if (Array.isArray(data)) {
            orders = data;
        } else {
            throw new Error('Invalid data format received from API');
        }
        
        // Calculate target week
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (weekOffset * 7));
        const targetWeek = getWeekNumber(currentDate);
        const targetYear = currentDate.getFullYear();
        
        console.log(`[WeekOrders] Filtering for week ${targetWeek} of year ${targetYear}`);
        
        // Filter orders for target week
        const weeklyOrders = orders.filter(order => {
            if (!order || !order.date) return false;
            
            try {
                const orderDate = new Date(order.date);
                if (isNaN(orderDate.getTime())) return false;
                
                const orderWeek = getWeekNumber(orderDate);
                const orderYear = orderDate.getFullYear();
                
                return orderWeek === targetWeek && orderYear === targetYear;
            } catch (error) {
                console.error('[WeekOrders] Error processing order date:', order.date, error);
                return false;
            }
        });
        
        console.log(`[WeekOrders] Found ${weeklyOrders.length} orders for week ${targetWeek}`);
        
        // Store data globally
        allOrdersData = weeklyOrders;
        
        // Update UI
        updateWeekInfo(targetWeek, targetYear, weeklyOrders.length);
        populateDataTable(weeklyOrders);
        updateNavigationButtons();
        
        Swal.close();
        
    } catch (error) {
        console.error('[WeekOrders] Error loading weekly data:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error Loading Data',
            text: 'Could not load weekly orders data: ' + error.message
        });
    }
}

/**
 * Update week information display
 */
function updateWeekInfo(weekNumber, year, orderCount) {
    const weekInfo = document.getElementById('weekInfo');
    const orderCount_display = document.getElementById('orderCount');
    
    if (weekInfo) {
        weekInfo.textContent = `Week ${weekNumber} of ${year}`;
    }
    
    if (orderCount_display) {
        orderCount_display.textContent = `${orderCount} orders found`;
    }
}

/**
 * Update navigation buttons state
 */
function updateNavigationButtons() {
    const nextBtn = document.getElementById('nextWeek');
    if (nextBtn) {
        nextBtn.disabled = currentWeekOffset === 0;
    }
}

/**
 * Populate the DataTable with weekly orders
 */
function populateDataTable(orders) {
    const tableBody = document.getElementById('weeklyTableBody');
    if (!tableBody) {
        console.error('[WeekOrders] Table body element not found');
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="33" class="text-center">No orders found for this week</td></tr>';
        return;
    }
    
    // Generate table rows
    orders.forEach(order => {
        const row = createTableRow(order);
        tableBody.appendChild(row);
    });
    
    // Initialize or refresh DataTable
    initializeDataTable();
}

/**
 * Create a table row for an order
 */
function createTableRow(order) {
    const row = document.createElement('tr');
    
    const orderDate = new Date(order.date);
    const formattedDate = orderDate.toLocaleDateString('en-US');
    
    // Format creator name (first initial + last name)
    const formatCreatorName = (fullName) => {
        if (!fullName) return '-';
        const parts = fullName.trim().split(' ');
        if (parts.length < 2) return fullName;
        return `${parts[0].charAt(0).toUpperCase()}. ${parts[parts.length - 1]}`;
    };
    
    row.innerHTML = `
        <td>${order.id || '-'}</td>
        <td>Grammer AG</td>
        <td>${order.creator_plant || '-'}</td>
        <td>${order.creator_plant || '-'}</td>
        <td>${formattedDate}</td>
        <td>${order.in_out_bound || '-'}</td>
        <td>${getWeekNumber(orderDate)}</td>
        <td>${orderDate.toLocaleDateString('en-US', { month: 'long' })}</td>
        <td>${order.reference_number || '-'}</td>
        <td>${formatCreatorName(order.creator_name)}</td>
        <td>${order.area || '-'}</td>
        <td class="truncated-text" title="${order.description || ''}">${order.description || '-'}</td>
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
        <td>${order.approval_status || '-'}</td>
    `;
    
    return row;
}

/**
 * Initialize DataTable with export functionality
 */
function initializeDataTable() {
    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#weeklyOrdersTable')) {
        $('#weeklyOrdersTable').DataTable().destroy();
    }
    
    // Initialize new DataTable
    $('#weeklyOrdersTable').DataTable({
        lengthMenu: [10, 25, 50, 100, 200, 500],
        columnDefs: [
            { className: "centered", targets: "_all" }
        ],
        pageLength: 25,
        destroy: true,
        order: [[0, 'desc']], // Sort by ID descending
        language: {
            lengthMenu: "Show _MENU_ records per page",
            zeroRecords: "No records found",
            info: "Showing _START_ to _END_ of _TOTAL_ records",
            infoEmpty: "No records available",
            infoFiltered: "(filtered from _MAX_ total records)",
            search: "Search:",
            loadingRecords: "Loading...",
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
                    const weekInfo = document.getElementById('weekInfo')?.textContent || 'Weekly_Report';
                    return `Weekly_Premium_Freight_${weekInfo.replace(/\s+/g, '_')}`;
                },
                exportOptions: {
                    columns: ':visible'
                }
            },
            {
                extend: 'pdf',
                text: '<i class="fas fa-file-pdf"></i> PDF',
                className: 'btn-danger',
                orientation: 'landscape',
                pageSize: 'LEGAL',
                title: 'Weekly Premium Freight Report',
                filename: function() {
                    const weekInfo = document.getElementById('weekInfo')?.textContent || 'Weekly_Report';
                    return `Weekly_Premium_Freight_${weekInfo.replace(/\s+/g, '_')}`;
                },
                customize: function(doc) {
                    doc.defaultStyle.fontSize = 7;
                    doc.styles.tableHeader.fontSize = 8;
                    doc.styles.tableHeader.fillColor = '#A7CAC3';
                    doc.pageMargins = [10, 15, 10, 15];
                    
                    if (doc.content[1] && doc.content[1].table && doc.content[1].table.body[0]) {
                        doc.content[1].table.widths = Array(doc.content[1].table.body[0].length).fill('*');
                    }
                    
                    const weekInfo = document.getElementById('weekInfo')?.textContent || 'Weekly Report';
                    doc.content.splice(0, 0, {
                        margin: [0, 0, 0, 12],
                        alignment: 'center',
                        text: `GRAMMER Premium Freight - ${weekInfo}`,
                        style: {
                            fontSize: 14,
                            bold: true,
                            color: '#1c4481'
                        }
                    });
                    
                    const now = new Date();
                    doc.footer = function(currentPage, pageCount) {
                        return {
                            columns: [
                                { text: 'Generated: ' + now.toLocaleDateString(), alignment: 'left', margin: [10, 0], fontSize: 8 },
                                { text: 'Page ' + currentPage.toString() + ' of ' + pageCount, alignment: 'right', margin: [0, 0, 10, 0], fontSize: 8 }
                            ],
                            margin: [10, 0]
                        };
                    };
                },
                exportOptions: {
                    columns: ':visible'
                }
            },
            {
                text: '<i class="fas fa-file-pdf"></i> Generate SVGs',
                className: 'btn-info',
                action: async function(e, dt, node, config) {
                    await handleBatchSVGGeneration();
                }
            }
        ],
        scrollX: true,
        scrollCollapse: true
    });
}

/**
 * Setup export buttons functionality
 */
function setupExportButtons() {
    // Additional export functionality can be added here if needed
    console.log('[WeekOrders] Export buttons setup completed');
}

/**
 * Handle batch SVG generation for visible orders
 */
async function handleBatchSVGGeneration() {
    try {
        if (allOrdersData.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No Data',
                text: 'There are no orders to export for this week'
            });
            return;
        }
        
        if (allOrdersData.length > 10) {
            const confirm = await Swal.fire({
                icon: 'warning',
                title: 'Many Records',
                html: `You are about to generate ${allOrdersData.length} SVG/PDF documents. Do you want to continue?`,
                showCancelButton: true,
                confirmButtonText: 'Yes, generate all',
                cancelButtonText: 'Cancel',
            });
            
            if (!confirm.isConfirmed) return;
        }
        
        showLoading('Generating Documents', 'Please wait while we generate PDF documents for all orders...');
        
        for (let i = 0; i < allOrdersData.length; i++) {
            const order = allOrdersData[i];
            
            Swal.update({
                html: `Processing document ${i + 1} of ${allOrdersData.length}...<br>Order ID: ${order.id}`
            });
            
            try {
                const fileName = await generatePDF(order, `Weekly_PF_${order.id}_Order`);
                console.log(`[WeekOrders] Generated PDF for order ${order.id}: ${fileName}`);
            } catch (error) {
                console.error(`[WeekOrders] Error generating PDF for order ${order.id}:`, error);
            }
            
            // Small delay between generations
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        Swal.fire({
            icon: 'success',
            title: 'Documents Generated',
            html: `${allOrdersData.length} PDF documents have been generated.<br>Check your downloads folder.`
        });
        
    } catch (error) {
        console.error('[WeekOrders] Error in batch SVG generation:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while generating the documents: ' + error.message
        });
    }
}

// Export functions if needed by other modules
export {
    loadWeeklyData,
    handleBatchSVGGeneration
};