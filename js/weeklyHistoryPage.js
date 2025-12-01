/**
 * Premium Freight - Weekly History Page (Refactored)
 * Manages the weekly orders history page using PF_CONFIG.
 */
import { generatePDF } from './svgOrders.js';
import { addNotificationStyles, getWeekNumber } from './utils.js';
import { 
    showErrorMessage, 
    showInfoToast, 
    showSuccessToast, 
    showLoading, 
    setupToggleFilters, 
    loadOrdersData, 
    getDataTableButtons,
    renderLastApprover
} from './dataTables.js';

let allOrdersData = [];
let filteredOrdersData = [];
let currentWeekOffset = 0;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 [weeklyHistoryPage] DOMContentLoaded event fired');
    
    try {
        addNotificationStyles();
        setupToggleFilters('toggleFilters', 'filterPanelBody');
        setupWeekNavigation();
        
        showLoading('Loading Orders Data', 'Please wait...');
        allOrdersData = await loadOrdersData();
        
        if (typeof Swal !== 'undefined') Swal.close();
        
        // Mostrar la semana actual
        await displayWeekData(currentWeekOffset);
        
    } catch (error) {
        console.error('💥 [weeklyHistoryPage] Initialization error:', error);
        showErrorMessage('Initialization Error', 'Failed to initialize the weekly history page.');
    }
});

function setupWeekNavigation() {
    const prevButton = document.getElementById('prevWeek');
    const nextButton = document.getElementById('nextWeek');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentWeekOffset < 52) {
                currentWeekOffset++;
                displayWeekData(currentWeekOffset);
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (currentWeekOffset > 0) {
                currentWeekOffset--;
                displayWeekData(currentWeekOffset);
            }
        });
    }
}

function displayWeekData(weekOffset) {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - (weekOffset * 7));
    const targetWeek = getWeekNumber(currentDate);
    const targetYear = currentDate.getFullYear();
    
    filteredOrdersData = allOrdersData.filter(order => {
        if (!order.date) return false;
        const orderDate = new Date(order.date);
        const orderWeek = getWeekNumber(orderDate);
        const orderYear = orderDate.getFullYear();
        return orderWeek === targetWeek && orderYear === targetYear;
    });
    
    updateWeekInfo(targetWeek, targetYear, filteredOrdersData.length, currentDate);
    updateNavigationButtons();
    populateWeeklyDataTable(filteredOrdersData);
    showInfoToast(`Displaying ${filteredOrdersData.length} orders for week ${targetWeek}.`);
}

function updateWeekInfo(weekNumber, year, orderCount, weekDate) {
    const currentWeekDisplay = document.getElementById('currentWeekDisplay');
    
    const startOfWeek = new Date(weekDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1));
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

function updateNavigationButtons() {
    const nextBtn = document.getElementById('nextWeek');
    if (nextBtn) {
        nextBtn.disabled = currentWeekOffset === 0;
    }
}

function populateWeeklyDataTable(orders) {
    console.log('📋 [populateWeeklyDataTable] Starting table population...');
    
    if (!Array.isArray(orders)) return;
    
    const table = $('#weeklyHistoryTable');
    
    if ($.fn.DataTable.isDataTable(table)) {
        table.DataTable().clear().destroy();
        table.find('thead').empty(); // Limpiar headers para regenerar
        table.find('tbody').empty();
    }

    // Helper para nombre del mes
    const getMonthName = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', { month: 'short' });
    };

    const tableData = orders.map(order => {
        
        // Status logic
        const approvalStatus = parseInt(order.approval_status, 10);
        const requiredLevel = parseInt(order.required_auth_level, 10);
        let statusObj = { text: 'In Review', badgeClass: 'badge bg-warning text-dark' };
        
        if (approvalStatus === 99) statusObj = { text: 'Rejected', badgeClass: 'badge bg-danger' };
        else if (approvalStatus >= requiredLevel) statusObj = { text: 'Approved', badgeClass: 'badge bg-success' };

        const supplierCustomer = order.origin_company_name || '-';

        return [
            order.date || '-',                                              // 0: Date
            getWeekNumber(new Date(order.date)),                            // 1: Wk
            getMonthName(order.date),                                       // 2: Month
            order.planta || '-',                                            // 3: Plant
            order.in_out_bound || '-',                                      // 4: Inbound / Outbound
            order.transport || '-',                                         // 5: Type
            supplierCustomer,                                               // 6: Supplier / customer
            order.origin_city || '-',                                       // 7: Origin (Location)
            order.destiny_city || '-',                                      // 8: Destination (Location)
            order.cost_euros ? `€${parseFloat(order.cost_euros).toFixed(2)}` : '-', // 9: Cost
            order.reference_number || '-',                                  // 10: Purchase Order
            order.description || '-',                                       // 11: Reason
            '-',                                                            // 12: Vendor num
            order.carrier || '-',                                           // 13: Forwarder / carrier
            order.creator_name || '-',                                      // 14: Requester (NUEVO)
            order.category_cause || '-',                                    // 15: Root cause
            order.recovery || '-',                                          // 16: Recoverable
            '-',                                                            // 17: Comments
            order.id || '-',                                                // 18: PF Num
            `<span class="badge ${statusObj.badgeClass}">${statusObj.text}</span>`, // 19: Status
            `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" data-order-id="${order.id}" title="View as PDF"><i class="fas fa-file-pdf"></i></button>` // 20: Actions
        ];
    });
    
    try {
        const dataTable = table.DataTable({
            data: tableData,
            // ✅ CONFIGURACIÓN DE COLUMNAS ACTUALIZADA
            columns: [
                { title: "Date" },
                { title: "Wk" },
                { title: "Month" },
                { title: "Plant" },
                { title: "Inbound / Outbound" },
                { title: "Type" },
                { title: "Supplier / Customer" },
                { title: "Origin (Location)" },
                { title: "Destination (Location)" },
                { title: "Cost (EUR)" },
                { title: "Purchase Order" },
                { title: "Reason (Description)" },
                { title: "Vendor Num" },
                { title: "Forwarder / Carrier" },
                { title: "Requester" },                 // NUEVO
                { title: "Root Cause" },
                { title: "Recoverable" },
                { title: "Comments" },
                { title: "PF Num" },
                { title: "Status" },
                { title: "Actions" }
            ],
            dom: 'Bfrtip',
            buttons: getDataTableButtons(`Weekly Orders History - Week ${getWeekNumber(new Date())}`, orders),
            scrollX: true,
            scrollY: '400px',
            responsive: false,
            order: [[0, 'desc']],
            columnDefs: [
                { targets: 15, className: 'text-center' }, // Recoverable
                { targets: 10, className: 'text-center' }, // Purchase Order (Shifted)
                { targets: -1, className: 'text-center', orderable: false }
            ]
        });
        
    } catch (error) {
        console.error('💥 Error creating DataTable:', error);
    }

    // Event listeners PDF
    const pdfButtons = document.querySelectorAll('.generate-pdf-btn');
    pdfButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const order = allOrdersData.find(o => o.id == btn.dataset.orderId);
            if (order) await generatePDF(order);
        });
    });
}

// Función para generar los botones (sin cambios funcionales mayores)
function getWeeklyDataTableButtons(title, orders) {
    return [
        { extend: 'excelHtml5', title: title, text: '<i class="fas fa-file-excel"></i> Excel', className: 'btn btn-success btn-sm' },
        { extend: 'csvHtml5', title: title, text: '<i class="fas fa-file-csv"></i> CSV', className: 'btn btn-info btn-sm' },
        { extend: 'pdfHtml5', title: title, text: '<i class="fas fa-file-pdf"></i> PDF', className: 'btn btn-danger btn-sm', orientation: 'landscape', pageSize: 'A4' },
        { extend: 'print', title: title, text: '<i class="fas fa-print"></i> Print', className: 'btn btn-secondary btn-sm' }
    ];
}