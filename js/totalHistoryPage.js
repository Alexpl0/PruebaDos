/**
 * Premium Freight - Total History Page (Refactored)
 * Manages the complete orders history page using PF_CONFIG.
 */
import { generatePDF } from './svgOrders.js';
import { addNotificationStyles } from './utils.js';
import { 
    showErrorMessage, 
    showInfoToast, 
    showSuccessToast, 
    showLoading, 
    setupToggleFilters, 
    generateFilters, 
    applyFilters, 
    clearFilters, 
    loadOrdersData, 
    getDataTableButtons 
} from './dataTables.js';

// Variable global para almacenar todos los datos de las órdenes de esta página.
let allOrdersData = [];

document.addEventListener('DOMContentLoaded', async function () {
    try {
        addNotificationStyles();
        setupToggleFilters('toggleFilters', 'filterPanelBody');

        const baseURL = window.PF_CONFIG.app.baseURL;
        await generateFilters(`${baseURL}dao/conections/daoPremiumFreight.php`);
        
        await loadTotalHistoryData();

        // Asignar eventos a los botones de filtro
        const applyButton = document.getElementById('applyFilters');
        const clearButton = document.getElementById('clearFilters');
        
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                const filteredData = applyFilters(allOrdersData);
                populateTotalDataTable(filteredData);
                updateQuickStats(filteredData);
                showInfoToast(`Filters applied. Found ${filteredData.length} orders.`);
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                const clearedData = clearFilters(allOrdersData);
                populateTotalDataTable(clearedData);
                updateQuickStats(clearedData);
                showInfoToast('Filters cleared.');
            });
        }

    } catch (error) {
        console.error('Initialization error:', error);
        showErrorMessage('Initialization Error', 'Failed to initialize the total history page.');
    }
});

async function loadTotalHistoryData() {
    try {
        showLoading('Loading Total History', 'Please wait while we fetch all orders...');
        const orders = await loadOrdersData();
        
        allOrdersData = orders; // Guardar los datos originales
        
        populateTotalDataTable(orders);
        updateQuickStats(orders);
        showSuccessToast(`Loaded ${orders.length} total orders`);
    } catch (error) {
        showErrorMessage('Data Loading Error', `Could not load orders data: ${error.message}`);
    } finally {
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
    }
}

function populateTotalDataTable(orders) {
    // Helper function to determine order status based on approval levels
    const getOrderStatus = (order) => {
        const approvalStatus = parseInt(order.approval_status, 10);
        const requiredLevel = parseInt(order.required_auth_level, 10);

        // Default to review if data is missing
        if (isNaN(approvalStatus) || isNaN(requiredLevel)) {
            return { text: 'Unknown', className: 'status-review', badgeClass: 'badge bg-secondary' };
        }
        // Status: Rejected
        if (approvalStatus === 99) {
            return { text: 'Rejected', className: 'status-rejected', badgeClass: 'badge bg-danger' };
        }
        // Status: Approved
        if (approvalStatus >= requiredLevel) {
            return { text: 'Approved', className: 'status-approved', badgeClass: 'badge bg-success' };
        }
        // Status: In Review
        return { text: 'In Review', className: 'status-review', badgeClass: 'badge bg-warning text-dark' };
    };

    const tableData = orders.map(order => {
        const statusInfo = getOrderStatus(order);
        return [
            order.id || '-', order.planta || '-', order.code_planta || '-', order.date || '-',
            order.in_out_bound || '-', order.reference_number || '-', order.creator_name || '-',
            order.area || '-', order.description || '-', order.category_cause || '-',
            order.cost_euros ? `€${parseFloat(order.cost_euros).toFixed(2)}` : '-',
            order.transport || '-', order.carrier || '-',
            order.origin_company_name || '-', order.origin_city || '-',
            order.destiny_company_name || '-', order.destiny_city || '-',
            // New Status Column HTML with a styled badge
            `<span class="badge ${statusInfo.badgeClass}">${statusInfo.text}</span>`,
            // Actions column
            `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" data-order-id="${order.id}" title="View as PDF"><i class="fas fa-file-pdf"></i></button>`
        ];
    });

    // Verificar si DataTable existe y destruirla
    const table = $('#totalHistoryTable');
    if ($.fn.DataTable.isDataTable(table)) {
        table.DataTable().clear().destroy();
    }

    // Crear nueva DataTable
    table.DataTable({
        data: tableData,
        dom: 'Bfrtip',
        buttons: getDataTableButtons('Total Orders History', orders),
        scrollX: true,
        scrollY: '400px',
        responsive: false,
        order: [[0, 'desc']],
        // This callback runs for each row created, applying the background color
        createdRow: function(row, data, dataIndex) {
            const order = orders[dataIndex];
            if (order) {
                const statusInfo = getOrderStatus(order);
                $(row).addClass(statusInfo.className);
            }
        }
    });

    // Agregar event listeners para los botones PDF
    document.querySelectorAll('.generate-pdf-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const order = allOrdersData.find(o => o.id == btn.dataset.orderId);
            if (order) await generatePDF(order);
        });
    });
}

function updateQuickStats(orders) {
    const stats = { total: 0, approved: 0, pending: 0, rejected: 0 };
    orders.forEach(o => {
        stats.total++;
        // Use the same logic as getOrderStatus for consistency
        const approvalStatus = parseInt(o.approval_status, 10);
        const requiredLevel = parseInt(o.required_auth_level, 10);
        
        if (approvalStatus === 99) {
            stats.rejected++;
        } else if (approvalStatus >= requiredLevel) {
            stats.approved++;
        } else {
            stats.pending++;
        }
    });
    
    // Verificar que los elementos existan antes de actualizar
    const totalElement = document.getElementById('totalOrdersCount');
    const approvedElement = document.getElementById('approvedOrdersCount');
    const pendingElement = document.getElementById('pendingOrdersCount');
    const rejectedElement = document.getElementById('rejectedOrdersCount');
    
    if (totalElement) totalElement.textContent = stats.total;
    if (approvedElement) approvedElement.textContent = stats.approved;
    if (pendingElement) pendingElement.textContent = stats.pending;
    if (rejectedElement) rejectedElement.textContent = stats.rejected;
}
