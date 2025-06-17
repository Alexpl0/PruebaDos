/**
 * Premium Freight - Total History Page Module
 * Manages the total history page display and statistics
 */

import { getWeekNumber, showLoading } from './utils.js';
import { loadAndPopulateSVG, generatePDF } from './svgOrders.js';

// CORRECCIÓN: Obtener la URL base de múltiples fuentes posibles
const getBaseURL = () => {
    // Intentar múltiples fuentes para la URL base
    if (typeof window.BASE_URL !== 'undefined') return window.BASE_URL;
    if (typeof window.URL_BASE !== 'undefined') return window.URL_BASE;
    if (typeof URLPF !== 'undefined') return URLPF;
    if (typeof window.URLPF !== 'undefined') return window.URLPF;
    
    // Fallback URL hardcodeada
    console.warn('Base URL not found, using fallback URL');
    return 'https://grammermx.com/Jesus/PruebaDos/';
};

// Variables globales del módulo
let allOrdersData = [];
let dataTableTotal = null;

/**
 * Initialize the total history page
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing total history page...');
    
    try {
        await initializeTotalHistory();
    } catch (error) {
        console.error('Error initializing total history:', error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: 'Failed to initialize the total history page: ' + error.message
        });
    }
});

/**
 * CORREGIDO: Load all orders data from API
 */
async function loadAllOrdersData() {
    try {
        const baseURL = getBaseURL(); // USAR LA FUNCIÓN HELPER
        const apiUrl = baseURL + 'dao/conections/daoPremiumFreight.php';
        
        console.log('Loading all orders from:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || data.status !== 'success' || !Array.isArray(data.data)) {
            throw new Error('Invalid data format received from API');
        }
        
        allOrdersData = data.data;
        console.log(`Loaded ${allOrdersData.length} total orders successfully`);
        
        return allOrdersData;
        
    } catch (error) {
        console.error('Error loading all orders data:', error);
        throw error;
    }
}

/**
 * Calculate comprehensive statistics from all orders
 */
function calculateStatistics(orders) {
    if (!Array.isArray(orders) || orders.length === 0) {
        return {
            totalOrders: 0,
            totalCost: 0,
            averageCost: 0,
            ordersThisMonth: 0,
            ordersThisYear: 0,
            approvedOrders: 0,
            pendingOrders: 0,
            rejectedOrders: 0,
            topCarrier: 'N/A',
            topPlant: 'N/A'
        };
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    let totalCost = 0;
    let ordersThisMonth = 0;
    let ordersThisYear = 0;
    let approvedOrders = 0;
    let pendingOrders = 0;
    let rejectedOrders = 0;

    const carrierCounts = {};
    const plantCounts = {};

    orders.forEach(order => {
        // Calculate costs
        const cost = parseFloat(order.cost_euros) || 0;
        totalCost += cost;

        // Calculate date-based statistics
        if (order.date) {
            const orderDate = new Date(order.date);
            if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                ordersThisMonth++;
            }
            if (orderDate.getFullYear() === currentYear) {
                ordersThisYear++;
            }
        }

        // Calculate status-based statistics
        const status = (order.status_name || '').toLowerCase();
        if (status === 'aprobado' || status === 'approved') {
            approvedOrders++;
        } else if (status === 'rechazado' || status === 'rejected') {
            rejectedOrders++;
        } else {
            pendingOrders++;
        }

        // Count carriers
        if (order.carrier) {
            carrierCounts[order.carrier] = (carrierCounts[order.carrier] || 0) + 1;
        }

        // Count plants
        if (order.creator_plant) {
            plantCounts[order.creator_plant] = (plantCounts[order.creator_plant] || 0) + 1;
        }
    });

    // Find top carrier and plant
    const topCarrier = Object.keys(carrierCounts).reduce((a, b) => 
        carrierCounts[a] > carrierCounts[b] ? a : b, 'N/A');
    const topPlant = Object.keys(plantCounts).reduce((a, b) => 
        plantCounts[a] > plantCounts[b] ? a : b, 'N/A');

    return {
        totalOrders: orders.length,
        totalCost: totalCost,
        averageCost: orders.length > 0 ? totalCost / orders.length : 0,
        ordersThisMonth: ordersThisMonth,
        ordersThisYear: ordersThisYear,
        approvedOrders: approvedOrders,
        pendingOrders: pendingOrders,
        rejectedOrders: rejectedOrders,
        topCarrier: topCarrier,
        topPlant: topPlant
    };
}

/**
 * CORREGIDO: Update statistics display on the page
 */
function updateStatistics(stats) {
    console.log('Updating statistics with:', stats);
    
    // CORRECCIÓN: Verificar que los elementos existan antes de asignar valores
    const elements = {
        totalOrders: document.getElementById('totalOrders'),
        totalCost: document.getElementById('totalCost'),
        averageCost: document.getElementById('averageCost'),
        ordersThisMonth: document.getElementById('ordersThisMonth'),
        ordersThisYear: document.getElementById('ordersThisYear'),
        approvedOrders: document.getElementById('approvedOrders'),
        pendingOrders: document.getElementById('pendingOrders'),
        rejectedOrders: document.getElementById('rejectedOrders'),
        topCarrier: document.getElementById('topCarrier'),
        topPlant: document.getElementById('topPlant')
    };
    
    // Update each element if it exists
    Object.keys(elements).forEach(key => {
        const element = elements[key];
        if (element) {
            switch (key) {
                case 'totalCost':
                    element.textContent = `€${stats.totalCost.toFixed(2)}`;
                    break;
                case 'averageCost':
                    element.textContent = `€${stats.averageCost.toFixed(2)}`;
                    break;
                default:
                    element.textContent = stats[key];
            }
        } else {
            console.warn(`Element with ID '${key}' not found for statistics update`);
        }
    });
}

/**
 * Generate the total history table with all data
 */
async function generateTotalTable() {
    try {
        console.log('Generating total history table...');
        
        // Show loading
        showLoading('Loading Total History', 'Preparing complete orders history...');
        
        // Calculate and update statistics
        const statistics = calculateStatistics(allOrdersData);
        updateStatistics(statistics);
        
        // Populate the table
        await populateTotalTable(allOrdersData);
        
        // Initialize DataTable
        initializeTotalDataTable();
        
        // Close loading
        Swal.close();
        
        console.log('Total history table generated successfully');
        
    } catch (error) {
        console.error('Error generating total table:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to generate total history table: ' + error.message
        });
    }
}

/**
 * CORREGIDO: Populate the total table with all order data
 */
async function populateTotalTable(orders) {
    const tableBody = document.getElementById('totalTableBody');
    if (!tableBody) {
        console.error('Total table body element not found');
        return;
    }
    
    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="33" class="text-center">No orders found</td></tr>';
        return;
    }
    
    let content = '';
    
    orders.forEach(order => {
        const issueDate = order.date ? new Date(order.date) : null;
        const formattedDate = issueDate ? issueDate.toLocaleDateString('en-US') : '-';
        const weekNum = issueDate ? getWeekNumber(order.date) : '-';
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
 * Initialize or reinitialize the total DataTable
 */
function initializeTotalDataTable() {
    // Destroy existing DataTable if it exists
    if (dataTableTotal) {
        try {
            dataTableTotal.destroy();
            dataTableTotal = null;
        } catch (error) {
            console.warn('Error destroying existing DataTable:', error);
        }
    }
    
    // Initialize new DataTable
    try {
        const baseURL = getBaseURL(); // USAR LA FUNCIÓN HELPER
        
        dataTableTotal = $('#totalOrdersTable').DataTable({
            lengthMenu: [10, 25, 50, 100, 200, 500],
            pageLength: 25,
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
                    title: 'Complete_Premium_Freight_Report',
                    filename: function() {
                        const date = new Date().toISOString().split('T')[0];
                        return `Complete_Premium_Freight_Report_${date}`;
                    }
                },
                {
                    extend: 'pdf',
                    text: '<i class="fas fa-file-pdf"></i> PDF',
                    className: 'btn-danger',
                    orientation: 'landscape',
                    pageSize: 'LEGAL',
                    title: 'Complete Premium Freight Report',
                    filename: function() {
                        const date = new Date().toISOString().split('T')[0];
                        return `Complete_Premium_Freight_Report_${date}`;
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
                            text: 'GRAMMER Complete Premium Freight Report',
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
                    }
                },
                {
                    text: '<i class="fas fa-file-image"></i> Generate All SVGs',
                    className: 'btn-info',
                    action: async function(e, dt, node, config) {
                        await handleBulkSVGGeneration(dt);
                    }
                }
            ]
        });
        
        console.log('Total DataTable initialized successfully');
        
    } catch (error) {
        console.error('Error initializing total DataTable:', error);
    }
}

/**
 * Handle bulk SVG/PDF generation for total history
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
        
        if (exportData.length > 20) {
            const confirm = await Swal.fire({
                icon: 'warning',
                title: 'Many Records',
                html: `You are about to generate ${exportData.length} PDF documents. This may take several minutes. Do you want to continue?`,
                showCancelButton: true,
                confirmButtonText: 'Yes, generate all',
                cancelButtonText: 'Cancel'
            });
            
            if (!confirm.isConfirmed) return;
        }
        
        showLoading('Generating PDFs', 'Please wait while documents are being generated...');
        
        const ids = exportData.map(row => row[0]);
        const visibleOrders = allOrdersData.filter(order => ids.includes(String(order.id)));
        
        for (let i = 0; i < visibleOrders.length; i++) {
            const order = visibleOrders[i];
            
            Swal.update({
                html: `Processing document ${i + 1} of ${visibleOrders.length}...<br>Order ID: ${order.id}`
            });
            
            try {
                const fileName = await generatePDF(order, `PF_Complete_${order.id}`);
                console.log(`Generated PDF for order ${order.id}: ${fileName}`);
            } catch (error) {
                console.error(`Error generating PDF for order ${order.id}:`, error);
            }
            
            // Small delay between generations
            await new Promise(resolve => setTimeout(resolve, 300));
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
 * Initialize the total history functionality
 */
async function initializeTotalHistory() {
    try {
        console.log('Loading all orders data...');
        await loadAllOrdersData();
        
        console.log('Generating total history table...');
        await generateTotalTable();
        
        console.log('Total history initialized successfully');
        
    } catch (error) {
        console.error('Error initializing total history:', error);
        throw error;
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
    initializeTotalHistory, 
    generateTotalTable, 
    calculateStatistics 
};