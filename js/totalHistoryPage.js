/**
 * Premium Freight - Total History Page
 * Manages the total orders history page functionality
 */

import { getWeekNumber, showLoading, addNotificationStyles } from './utils.js';
import { generatePDF } from './svgOrders.js';

// CORREGIDO: Obtener URL desde las variables globales definidas en PHP
const URLPF = window.URL_BASE || window.BASE_URL || '';

if (!URLPF) {
    console.error('URLPF not defined. Make sure config.php is loaded and URL constants are available.');
}

let allOrdersData = [];
let dataTable = null;

/**
 * Initialize the total history page
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('[TotalHistory] Initializing total history page with URL:', URLPF);
    
    // Add notification styles
    addNotificationStyles();
    
    // Load all orders data
    loadTotalHistoryData();
    
    // Setup statistics
    setupStatistics();
});

/**
 * Load all orders data from API
 */
async function loadTotalHistoryData() {
    try {
        showLoading('Loading All Orders', 'Please wait while we fetch all orders data...');
        
        console.log(`[TotalHistory] Loading data from: ${URLPF}dao/conections/daoPremiumFreight.php`);
        
        const response = await fetch(`${URLPF}dao/conections/daoPremiumFreight.php`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[TotalHistory] Raw API response:', data);
        
        // Extract orders array from response
        let orders = [];
        if (data && data.status === 'success' && Array.isArray(data.data)) {
            orders = data.data;
        } else if (Array.isArray(data)) {
            orders = data;
        } else {
            throw new Error('Invalid data format received from API');
        }
        
        console.log(`[TotalHistory] Found ${orders.length} total orders`);
        
        // Store data globally
        allOrdersData = orders;
        
        // Update statistics
        updateStatistics(orders);
        
        // Populate DataTable
        populateDataTable(orders);
        
        Swal.close();
        
    } catch (error) {
        console.error('[TotalHistory] Error loading total history data:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error Loading Data',
            text: 'Could not load orders data: ' + error.message
        });
    }
}

/**
 * Update statistics cards
 */
function updateStatistics(orders) {
    // Total orders
    const totalOrdersElement = document.getElementById('totalOrders');
    if (totalOrdersElement) {
        totalOrdersElement.textContent = orders.length.toLocaleString();
    }
    
    // This month orders
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthOrders = orders.filter(order => {
        if (!order.date) return false;
        const orderDate = new Date(order.date);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    
    const thisMonthElement = document.getElementById('thisMonth');
    if (thisMonthElement) {
        thisMonthElement.textContent = thisMonthOrders.length.toLocaleString();
    }
    
    // Total cost
    const totalCost = orders.reduce((sum, order) => {
        const cost = parseFloat(order.cost_euros) || 0;
        return sum + cost;
    }, 0);
    
    const totalCostElement = document.getElementById('totalCost');
    if (totalCostElement) {
        totalCostElement.textContent = `€${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    // Pending approvals
    const pendingApprovals = orders.filter(order => {
        const approvalStatus = order.approval_status;
        const requiredLevel = order.required_auth_level || 7;
        return approvalStatus !== null && approvalStatus < requiredLevel && approvalStatus !== 99;
    });
    
    const pendingApprovalsElement = document.getElementById('pendingApprovals');
    if (pendingApprovalsElement) {
        pendingApprovalsElement.textContent = pendingApprovals.length.toLocaleString();
    }
}

/**
 * Setup statistics functionality
 */
function setupStatistics() {
    // Add click handlers for statistics cards if needed
    console.log('[TotalHistory] Statistics setup completed');
}

/**
 * Populate the DataTable with all orders
 */
function populateDataTable(orders) {
    const tableBody = document.getElementById('totalHistoryTableBody');
    if (!tableBody) {
        console.error('[TotalHistory] Table body element not found');
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="33" class="text-center">No orders found</td></tr>';
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
    
    const orderDate = order.date ? new Date(order.date) : null;
    const formattedDate = orderDate ? orderDate.toLocaleDateString('en-US') : '-';
    const monthName = orderDate ? orderDate.toLocaleDateString('en-US', { month: 'long' }) : '-';
    const weekNumber = orderDate ? getWeekNumber(orderDate) : '-';
    
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
        <td>${weekNumber}</td>
        <td>${monthName}</td>
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
    if ($.fn.DataTable.isDataTable('#totalHistoryTable')) {
        $('#totalHistoryTable').DataTable().destroy();
    }
    
    // Initialize new DataTable
    dataTable = $('#totalHistoryTable').DataTable({
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
                title: 'Total_Premium_Freight_Report',
                filename: function() {
                    const now = new Date();
                    return `Total_Premium_Freight_Report_${now.toISOString().split('T')[0]}`;
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
                title: 'Total Premium Freight Report',
                filename: function() {
                    const now = new Date();
                    return `Total_Premium_Freight_Report_${now.toISOString().split('T')[0]}`;
                },
                customize: function(doc) {
                    doc.defaultStyle.fontSize = 7;
                    doc.styles.tableHeader.fontSize = 8;
                    doc.styles.tableHeader.fillColor = '#A7CAC3';
                    doc.pageMargins = [10, 15, 10, 15];
                    
                    if (doc.content[1] && doc.content[1].table && doc.content[1].table.body[0]) {
                        doc.content[1].table.widths = Array(doc.content[1].table.body[0].length).fill('*');
                    }
                    
                    doc.content.splice(0, 0, {
                        margin: [0, 0, 0, 12],
                        alignment: 'center',
                        text: 'GRAMMER Premium Freight - Complete History Report',
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
                    await handleBatchSVGGeneration(dt);
                }
            }
        ],
        scrollX: true,
        scrollCollapse: true
    });
}

/**
 * Handle batch SVG generation for filtered/visible orders
 */
async function handleBatchSVGGeneration(dt) {
    try {
        // Get currently filtered data
        const filteredData = dt.rows({search: 'applied'}).data().toArray();
        
        if (filteredData.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No Data',
                text: 'There are no orders to export based on current filters'
            });
            return;
        }
        
        if (filteredData.length > 10) {
            const confirm = await Swal.fire({
                icon: 'warning',
                title: 'Many Records',
                html: `You are about to generate ${filteredData.length} SVG/PDF documents. Do you want to continue?`,
                showCancelButton: true,
                confirmButtonText: 'Yes, generate all',
                cancelButtonText: 'Cancel',
            });
            
            if (!confirm.isConfirmed) return;
        }
        
        showLoading('Generating Documents', 'Please wait while we generate PDF documents...');
        
        // Get order IDs from filtered data (assuming first column is ID)
        const orderIds = filteredData.map(row => row[0]);
        
        // Find corresponding order objects
        const ordersToProcess = allOrdersData.filter(order => 
            orderIds.includes(String(order.id))
        );
        
        for (let i = 0; i < ordersToProcess.length; i++) {
            const order = ordersToProcess[i];
            
            Swal.update({
                html: `Processing document ${i + 1} of ${ordersToProcess.length}...<br>Order ID: ${order.id}`
            });
            
            try {
                const fileName = await generatePDF(order, `Total_PF_${order.id}_Order`);
                console.log(`[TotalHistory] Generated PDF for order ${order.id}: ${fileName}`);
            } catch (error) {
                console.error(`[TotalHistory] Error generating PDF for order ${order.id}:`, error);
            }
            
            // Small delay between generations
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        Swal.fire({
            icon: 'success',
            title: 'Documents Generated',
            html: `${ordersToProcess.length} PDF documents have been generated.<br>Check your downloads folder.`
        });
        
    } catch (error) {
        console.error('[TotalHistory] Error in batch SVG generation:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while generating the documents: ' + error.message
        });
    }
}

// Export functions if needed by other modules
export {
    loadTotalHistoryData,
    handleBatchSVGGeneration
};