/**
 * Premium Freight - Total History Page (Refactored)
 * Manages the complete orders history page using PF_CONFIG.
 */
import { generatePDF } from './svgOrders.js';
// ✅ IMPORTANTE: Se agregó getWeekNumber a las importaciones
import { addNotificationStyles, getWeekNumber } from './utils.js';
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
    getDataTableButtons,
    renderLastApprover
} from './dataTables.js';

// Variable global para almacenar todos los datos de las órdenes de esta página.
let allOrdersData = [];

document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 [totalHistoryPage] DOMContentLoaded event fired');
    
    try {
        console.log('🔧 [totalHistoryPage] Starting initialization...');
        
        // 1. Verificar dependencias básicas
        if (typeof window.PF_CONFIG === 'undefined') {
            throw new Error('PF_CONFIG is not available');
        }
        
        // 2. Agregar estilos de notificación
        addNotificationStyles();
        
        // 3. Configurar toggle de filtros
        setupToggleFilters('toggleFilters', 'filterPanelBody');
        
        // 4. Generar filtros
        const baseURL = window.PF_CONFIG.app.baseURL;
        const filterUrl = `${baseURL}dao/conections/daoPremiumFreight.php`;
        await generateFilters(filterUrl);
        
        // 5. Cargar datos
        console.log('📊 [totalHistoryPage] Loading total history data...');
        await loadTotalHistoryData();

        // 6. Configurar event listeners para botones de filtro
        const applyButton = document.getElementById('applyFilters');
        const clearButton = document.getElementById('clearFilters');
        
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                try {
                    const filteredData = applyFilters(allOrdersData);
                    populateTotalDataTable(filteredData);
                    updateQuickStats(filteredData);
                    showInfoToast(`Filters applied. Found ${filteredData.length} orders.`);
                } catch (error) {
                    console.error('❌ Error applying filters:', error);
                }
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                try {
                    const clearedData = clearFilters(allOrdersData);
                    populateTotalDataTable(clearedData);
                    updateQuickStats(clearedData);
                    showInfoToast('Filters cleared.');
                } catch (error) {
                    console.error('❌ Error clearing filters:', error);
                }
            });
        }
        
    } catch (error) {
        console.error('💥 [totalHistoryPage] Initialization error:', error);
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
        console.error('💥 Error loading data:', error);
        showErrorMessage('Data Loading Error', `Could not load orders data: ${error.message}`);
    } finally {
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
    }
}

function populateTotalDataTable(orders) {
    console.log('📋 [populateTotalDataTable] Starting table population...');
    
    if (!Array.isArray(orders)) return;
    
    const table = $('#totalHistoryTable');
    
    // Destruir tabla existente
    if ($.fn.DataTable.isDataTable(table)) {
        table.DataTable().clear().destroy();
        // Limpiar el HTML del head para que se regeneren las columnas nuevas
        table.find('thead').empty(); 
        table.find('tbody').empty();
    }

    // Helper para estado
    const getOrderStatus = (order) => {
        const approvalStatus = parseInt(order.approval_status, 10);
        const requiredLevel = parseInt(order.required_auth_level, 10);
        if (isNaN(approvalStatus) || isNaN(requiredLevel)) return { text: 'Unknown', className: 'status-review', badgeClass: 'badge bg-secondary' };
        if (approvalStatus === 99) return { text: 'Rejected', className: 'status-rejected', badgeClass: 'badge bg-danger' };
        if (approvalStatus >= requiredLevel) return { text: 'Approved', className: 'status-approved', badgeClass: 'badge bg-success' };
        return { text: 'In Review', className: 'status-review', badgeClass: 'badge bg-warning text-dark' };
    };

    // Helper para nombre del mes
    const getMonthName = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', { month: 'short' });
    };

    // Helper para Wk
    const getWeek = (dateStr) => {
        if (!dateStr) return '-';
        return getWeekNumber(new Date(dateStr));
    };

    // Mapeo de datos SEGÚN TU SOLICITUD
    const tableData = orders.map(order => {
        const statusInfo = getOrderStatus(order);
        
        // Lógica para Supplier/Customer: Si es Inbound -> Origin (Supplier), si es Outbound -> Destiny (Customer)
        // O simplemente mostramos el Origin Company como Supplier principal.
        const supplierCustomer = order.origin_company_name || '-';

        return [
            order.date || '-',                                              // 0: Date
            getWeek(order.date),                                            // 1: Wk
            getMonthName(order.date),                                       // 2: Month
            order.planta || '-',                                            // 3: Plant
            order.in_out_bound || '-',                                      // 4: Type Inbound / outbound
            supplierCustomer,                                               // 5: Supplier / customer
            order.origin_city || '-',                                       // 6: Origin (Location)
            order.destiny_city || '-',                                      // 7: Destination (Location)
            order.cost_euros ? `€${parseFloat(order.cost_euros).toFixed(2)}` : '-', // 8: Cost (EUR)
            order.reference_number || '-',                                  // 9: PO 45
            order.description || '-',                                       // 10: Reason (description...)
            '-',                                                            // 11: Vendor num (Placeholder)
            order.carrier || '-',                                           // 12: Forwarder / carrier
            order.category_cause || '-',                                    // 13: Root cause
            order.recovery || '-',                                          // 14: Recoverable / Non recoverable
            '-',                                                            // 15: Comments (Placeholder)
            order.id || '-',                                                // 16: PF Num
            // Columnas extra necesarias para funcionalidad
            `<span class="badge ${statusInfo.badgeClass}">${statusInfo.text}</span>`, // 17: Status (Oculta o al final)
            `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" data-order-id="${order.id}" title="View as PDF"><i class="fas fa-file-pdf"></i></button>` // 18: Actions
        ];
    });

    try {
        const dataTable = table.DataTable({
            data: tableData,
            // ✅ DEFINICIÓN DE NOMBRES DE COLUMNAS (Para cambiar los headers automáticamente)
            columns: [
                { title: "Date" },
                { title: "Wk" },
                { title: "Month" },
                { title: "Plant" },
                { title: "Type" },
                { title: "Supplier / Customer" },
                { title: "Origin (Location)" },
                { title: "Destination (Location)" },
                { title: "Cost (EUR)" },
                { title: "PO 45" },
                { title: "Reason (Description)" }, // Acortado para limpieza visual
                { title: "Vendor Num" },
                { title: "Forwarder / Carrier" },
                { title: "Root Cause" },
                { title: "Recoverable" },
                { title: "Comments" },
                { title: "PF Num" },
                { title: "Status" },
                { title: "Actions" }
            ],
            dom: 'Bfrtip',
            buttons: getDataTableButtons('Total Orders History', orders),
            scrollX: true,
            scrollY: '400px',
            responsive: false,
            order: [[0, 'desc']], // Ordenar por Date (columna 0)
            columnDefs: [
                {
                    targets: 14, // Recoverable
                    className: 'text-center'
                },
                {
                    targets: 9, // PO 45
                    className: 'text-center',
                    render: function(data) {
                        return `<span class="badge bg-light text-dark border">${data}</span>`;
                    }
                },
                {
                    targets: -1, // Última columna (Actions)
                    className: 'text-center',
                    orderable: false
                }
            ],
            createdRow: function(row, data, dataIndex) {
                const order = orders[dataIndex];
                if (order) {
                    const statusInfo = getOrderStatus(order);
                    $(row).addClass(statusInfo.className);
                }
            }
        });
        
    } catch (error) {
        console.error('💥 Error creating DataTable:', error);
    }

    // Agregar event listeners para los botones PDF
    const pdfButtons = document.querySelectorAll('.generate-pdf-btn');
    pdfButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const order = allOrdersData.find(o => o.id == btn.dataset.orderId);
            if (order) await generatePDF(order);
        });
    });
}

function updateQuickStats(orders) {
    // ... (El código de stats se mantiene igual, lógica no cambia)
    const stats = { total: 0, approved: 0, pending: 0, rejected: 0 };
    orders.forEach(o => {
        stats.total++;
        const approvalStatus = parseInt(o.approval_status, 10);
        const requiredLevel = parseInt(o.required_auth_level, 10);
        if (approvalStatus === 99) stats.rejected++;
        else if (approvalStatus >= requiredLevel) stats.approved++;
        else stats.pending++;
    });
    
    const ids = ['totalOrdersCount', 'approvedOrdersCount', 'pendingOrdersCount', 'rejectedOrdersCount'];
    const values = [stats.total, stats.approved, stats.pending, stats.rejected];
    
    ids.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) el.textContent = values[idx];
    });
}