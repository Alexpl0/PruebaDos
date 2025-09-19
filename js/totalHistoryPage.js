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
    console.log('🚀 [totalHistoryPage] DOMContentLoaded event fired');
    
    try {
        console.log('🔧 [totalHistoryPage] Starting initialization...');
        
        // 1. Verificar dependencias básicas
        console.log('🔍 [totalHistoryPage] Checking basic dependencies...');
        console.log('- jQuery available:', typeof $ !== 'undefined');
        console.log('- DataTables available:', typeof $.fn.DataTable !== 'undefined');
        console.log('- SweetAlert available:', typeof Swal !== 'undefined');
        console.log('- PF_CONFIG available:', typeof window.PF_CONFIG !== 'undefined');
        
        if (typeof window.PF_CONFIG === 'undefined') {
            throw new Error('PF_CONFIG is not available');
        }
        
        console.log('- baseURL:', window.PF_CONFIG.app.baseURL);
        
        // 2. Agregar estilos de notificación
        console.log('🎨 [totalHistoryPage] Adding notification styles...');
        addNotificationStyles();
        console.log('✅ [totalHistoryPage] Notification styles added');
        
        // 3. Configurar toggle de filtros
        console.log('🔀 [totalHistoryPage] Setting up toggle filters...');
        setupToggleFilters('toggleFilters', 'filterPanelBody');
        console.log('✅ [totalHistoryPage] Toggle filters setup complete');
        
        // 4. Verificar elementos DOM necesarios
        console.log('🔍 [totalHistoryPage] Checking required DOM elements...');
        const requiredElements = [
            'totalHistoryTable',
            'totalOrdersCount',
            'approvedOrdersCount', 
            'pendingOrdersCount',
            'rejectedOrdersCount'
        ];
        
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            console.log(`- ${id}:`, element ? 'Found' : 'NOT FOUND');
        });
        
        // 5. Generar filtros
        console.log('🔧 [totalHistoryPage] Generating filters...');
        const baseURL = window.PF_CONFIG.app.baseURL;
        const filterUrl = `${baseURL}dao/conections/daoPremiumFreight.php`;
        console.log('- Filter URL:', filterUrl);
        
        await generateFilters(filterUrl);
        console.log('✅ [totalHistoryPage] Filters generated');
        
        // 6. Cargar datos
        console.log('📊 [totalHistoryPage] Loading total history data...');
        await loadTotalHistoryData();
        console.log('✅ [totalHistoryPage] Total history data loaded');

        // 7. Configurar event listeners para botones de filtro
        console.log('🔧 [totalHistoryPage] Setting up filter button listeners...');
        const applyButton = document.getElementById('applyFilters');
        const clearButton = document.getElementById('clearFilters');
        
        console.log('- Apply button found:', !!applyButton);
        console.log('- Clear button found:', !!clearButton);
        
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                console.log('🔍 [totalHistoryPage] Apply filters clicked');
                try {
                    const filteredData = applyFilters(allOrdersData);
                    console.log('- Filtered data length:', filteredData.length);
                    populateTotalDataTable(filteredData);
                    updateQuickStats(filteredData);
                    showInfoToast(`Filters applied. Found ${filteredData.length} orders.`);
                } catch (error) {
                    console.error('❌ [totalHistoryPage] Error applying filters:', error);
                }
            });
            console.log('✅ [totalHistoryPage] Apply button listener added');
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                console.log('🧹 [totalHistoryPage] Clear filters clicked');
                try {
                    const clearedData = clearFilters(allOrdersData);
                    console.log('- Cleared data length:', clearedData.length);
                    populateTotalDataTable(clearedData);
                    updateQuickStats(clearedData);
                    showInfoToast('Filters cleared.');
                } catch (error) {
                    console.error('❌ [totalHistoryPage] Error clearing filters:', error);
                }
            });
            console.log('✅ [totalHistoryPage] Clear button listener added');
        }
        
        console.log('🎉 [totalHistoryPage] Initialization completed successfully!');

    } catch (error) {
        console.error('💥 [totalHistoryPage] Initialization error:', error);
        console.error('- Error stack:', error.stack);
        showErrorMessage('Initialization Error', 'Failed to initialize the total history page.');
    }
});

async function loadTotalHistoryData() {
    console.log('📊 [loadTotalHistoryData] Starting data load...');
    
    try {
        console.log('⏳ [loadTotalHistoryData] Showing loading dialog...');
        showLoading('Loading Total History', 'Please wait while we fetch all orders...');
        
        console.log('🌐 [loadTotalHistoryData] Fetching orders data...');
        const orders = await loadOrdersData();
        console.log('✅ [loadTotalHistoryData] Orders data received:', {
            length: orders.length,
            firstOrder: orders[0] ? orders[0] : 'No orders',
            type: typeof orders
        });
        
        allOrdersData = orders; // Guardar los datos originales
        console.log('💾 [loadTotalHistoryData] Data stored in allOrdersData');
        
        console.log('📋 [loadTotalHistoryData] Populating DataTable...');
        populateTotalDataTable(orders);
        console.log('✅ [loadTotalHistoryData] DataTable populated');
        
        console.log('📊 [loadTotalHistoryData] Updating quick stats...');
        updateQuickStats(orders);
        console.log('✅ [loadTotalHistoryData] Quick stats updated');
        
        showSuccessToast(`Loaded ${orders.length} total orders`);
        console.log('🎉 [loadTotalHistoryData] Data load completed successfully!');
        
    } catch (error) {
        console.error('💥 [loadTotalHistoryData] Error loading data:', error);
        console.error('- Error stack:', error.stack);
        showErrorMessage('Data Loading Error', `Could not load orders data: ${error.message}`);
    } finally {
        console.log('🔚 [loadTotalHistoryData] Closing loading dialog...');
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
    }
}

function populateTotalDataTable(orders) {
    console.log('📋 [populateTotalDataTable] Starting table population...');
    console.log('- Orders received:', {
        length: orders.length,
        type: typeof orders,
        isArray: Array.isArray(orders)
    });
    
    if (!Array.isArray(orders)) {
        console.error('❌ [populateTotalDataTable] Orders is not an array!', orders);
        return;
    }
    
    // Helper function to determine order status based on approval levels
    const getOrderStatus = (order) => {
        console.log('🔍 [getOrderStatus] Processing order:', order.id);
        const approvalStatus = parseInt(order.approval_status, 10);
        const requiredLevel = parseInt(order.required_auth_level, 10);
        
        console.log('- Approval status:', approvalStatus, 'Required level:', requiredLevel);

        // Default to review if data is missing
        if (isNaN(approvalStatus) || isNaN(requiredLevel)) {
            console.log('- Status: Unknown (missing data)');
            return { text: 'Unknown', className: 'status-review', badgeClass: 'badge bg-secondary' };
        }
        // Status: Rejected
        if (approvalStatus === 99) {
            console.log('- Status: Rejected');
            return { text: 'Rejected', className: 'status-rejected', badgeClass: 'badge bg-danger' };
        }
        // Status: Approved
        if (approvalStatus >= requiredLevel) {
            console.log('- Status: Approved');
            return { text: 'Approved', className: 'status-approved', badgeClass: 'badge bg-success' };
        }
        // Status: In Review
        console.log('- Status: In Review');
        return { text: 'In Review', className: 'status-review', badgeClass: 'badge bg-warning text-dark' };
    };

    console.log('🔄 [populateTotalDataTable] Mapping orders to table data...');
    const tableData = orders.map((order, index) => {
        if (index < 3) { // Log first 3 orders for debugging
            console.log(`- Mapping order ${index + 1}:`, order);
        }
        
        const statusInfo = getOrderStatus(order);
        return [
            order.id || '-', 
            order.planta || '-', 
            order.code_planta || '-', 
            order.date || '-',
            order.in_out_bound || '-', 
            // ✅ NUEVAS COLUMNAS: Recovery y Reference después de Inbound/Outbound
            order.recovery || '-',
            order.reference || 'Order',
            // Resto de columnas
            order.reference_number || '-', 
            order.creator_name || '-',
            order.area || '-', 
            order.description || '-', 
            order.category_cause || '-',
            order.cost_euros ? `€${parseFloat(order.cost_euros).toFixed(2)}` : '-',
            order.transport || '-', 
            order.carrier || '-',
            order.origin_company_name || '-', 
            order.origin_city || '-',
            order.destiny_company_name || '-', 
            order.destiny_city || '-',
            // New Status Column HTML with a styled badge
            `<span class="badge ${statusInfo.badgeClass}">${statusInfo.text}</span>`,
            // Actions column
            `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" data-order-id="${order.id}" title="View as PDF"><i class="fas fa-file-pdf"></i></button>`
        ];
    });
    
    console.log('✅ [populateTotalDataTable] Table data mapped, rows:', tableData.length);

    // Verificar si DataTable existe y destruirla
    console.log('🔍 [populateTotalDataTable] Checking for existing DataTable...');
    const table = $('#totalHistoryTable');
    console.log('- Table element found:', table.length > 0);
    
    if ($.fn.DataTable.isDataTable(table)) {
        console.log('🗑️ [populateTotalDataTable] Destroying existing DataTable...');
        table.DataTable().clear().destroy();
        console.log('✅ [populateTotalDataTable] Existing DataTable destroyed');
    }

    // Crear nueva DataTable
    console.log('🆕 [populateTotalDataTable] Creating new DataTable...');
    try {
        const dataTable = table.DataTable({
            data: tableData,
            dom: 'Bfrtip',
            buttons: getDataTableButtons('Total Orders History', orders),
            scrollX: true,
            scrollY: '400px',
            responsive: false,
            order: [[0, 'desc']],
            columnDefs: [
                // ✅ COLUMNA RECOVERY (índice 5)
                {
                    targets: 5,
                    className: 'text-center',
                    render: function(data, type, row) {
                        return data || '-';
                    }
                },
                // ✅ COLUMNA REFERENCE (índice 6)
                {
                    targets: 6,
                    className: 'text-center',
                    render: function(data, type, row) {
                        let badgeClass = 'badge ';
                        switch(data) {
                            case '45':
                                badgeClass += 'bg-primary';
                                break;
                            case '3':
                                badgeClass += 'bg-info';
                                break;
                            case 'CC':
                                badgeClass += 'bg-warning text-dark';
                                break;
                            case 'Order':
                                badgeClass += 'bg-secondary';
                                break;
                            default:
                                badgeClass += 'bg-light text-dark';
                        }
                        return `<span class="${badgeClass}">${data}</span>`;
                    }
                }
            ],
            // This callback runs for each row created, applying the background color
            createdRow: function(row, data, dataIndex) {
                const order = orders[dataIndex];
                if (order) {
                    const statusInfo = getOrderStatus(order);
                    $(row).addClass(statusInfo.className);
                }
            }
        });
        
        console.log('✅ [populateTotalDataTable] DataTable created successfully');
        console.log('- DataTable info:', dataTable.page.info());
        
    } catch (error) {
        console.error('💥 [populateTotalDataTable] Error creating DataTable:', error);
        console.error('- Error stack:', error.stack);
        throw error;
    }

    // Agregar event listeners para los botones PDF
    console.log('🔧 [populateTotalDataTable] Adding PDF button listeners...');
    const pdfButtons = document.querySelectorAll('.generate-pdf-btn');
    console.log('- PDF buttons found:', pdfButtons.length);
    
    pdfButtons.forEach((btn, index) => {
        btn.addEventListener('click', async () => {
            console.log(`📄 [PDF Button ${index + 1}] Clicked, order ID:`, btn.dataset.orderId);
            const order = allOrdersData.find(o => o.id == btn.dataset.orderId);
            if (order) {
                console.log('- Order found, generating PDF...');
                await generatePDF(order);
            } else {
                console.error('- Order not found!');
            }
        });
    });
    
    console.log('✅ [populateTotalDataTable] PDF button listeners added');
    console.log('🎉 [populateTotalDataTable] Table population completed successfully!');
}

function updateQuickStats(orders) {
    console.log('📊 [updateQuickStats] Starting stats update...');
    console.log('- Orders received:', orders.length);
    
    const stats = { total: 0, approved: 0, pending: 0, rejected: 0 };
    
    orders.forEach((o, index) => {
        stats.total++;
        // Use the same logic as getOrderStatus for consistency
        const approvalStatus = parseInt(o.approval_status, 10);
        const requiredLevel = parseInt(o.required_auth_level, 10);
        
        if (index < 3) { // Log first 3 for debugging
            console.log(`- Order ${index + 1} stats:`, {
                id: o.id,
                approvalStatus,
                requiredLevel
            });
        }
        
        if (approvalStatus === 99) {
            stats.rejected++;
        } else if (approvalStatus >= requiredLevel) {
            stats.approved++;
        } else {
            stats.pending++;
        }
    });
    
    console.log('📈 [updateQuickStats] Calculated stats:', stats);
    
    // Verificar que los elementos existan antes de actualizar
    console.log('🔍 [updateQuickStats] Checking stats elements...');
    const totalElement = document.getElementById('totalOrdersCount');
    const approvedElement = document.getElementById('approvedOrdersCount');
    const pendingElement = document.getElementById('pendingOrdersCount');
    const rejectedElement = document.getElementById('rejectedOrdersCount');
    
    console.log('- Elements found:', {
        total: !!totalElement,
        approved: !!approvedElement,
        pending: !!pendingElement,
        rejected: !!rejectedElement
    });
    
    if (totalElement) {
        totalElement.textContent = stats.total;
        console.log('✅ [updateQuickStats] Total count updated');
    }
    if (approvedElement) {
        approvedElement.textContent = stats.approved;
        console.log('✅ [updateQuickStats] Approved count updated');
    }
    if (pendingElement) {
        pendingElement.textContent = stats.pending;
        console.log('✅ [updateQuickStats] Pending count updated');
    }
    if (rejectedElement) {
        rejectedElement.textContent = stats.rejected;
        console.log('✅ [updateQuickStats] Rejected count updated');
    }
    
    console.log('🎉 [updateQuickStats] Stats update completed!');
}

// ✅ ELIMINAR estas líneas que estaban mal ubicadas al final del archivo:
// No necesitamos estas definiciones aquí ya que están en columnDefs arriba
