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
    getDataTableButtons 
} from './dataTables.js';

let allOrdersData = [];
let filteredOrdersData = [];
let currentWeekOffset = 0;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 [weeklyHistoryPage] DOMContentLoaded event fired');
    
    try {
        console.log('🔧 [weeklyHistoryPage] Starting initialization...');
        
        console.log('🎨 [weeklyHistoryPage] Adding notification styles...');
        addNotificationStyles();
        console.log('✅ [weeklyHistoryPage] Notification styles added');
        
        console.log('🔀 [weeklyHistoryPage] Setting up toggle filters...');
        setupToggleFilters('toggleFilters', 'filterPanelBody');
        console.log('✅ [weeklyHistoryPage] Toggle filters setup complete');
        
        console.log('🔧 [weeklyHistoryPage] Setting up week navigation...');
        setupWeekNavigation();
        console.log('✅ [weeklyHistoryPage] Week navigation setup complete');
        
        // Cargar todos los datos una vez
        console.log('📊 [weeklyHistoryPage] Loading orders data...');
        showLoading('Loading Orders Data', 'Please wait...');
        allOrdersData = await loadOrdersData();
        console.log('✅ [weeklyHistoryPage] Orders data loaded:', {
            length: allOrdersData.length,
            type: typeof allOrdersData,
            isArray: Array.isArray(allOrdersData)
        });
        
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
        
        // Mostrar la semana actual
        console.log('📅 [weeklyHistoryPage] Displaying current week data...');
        await displayWeekData(currentWeekOffset);
        console.log('✅ [weeklyHistoryPage] Current week data displayed');
        
        console.log('🎉 [weeklyHistoryPage] Initialization completed successfully!');
        
    } catch (error) {
        console.error('💥 [weeklyHistoryPage] Initialization error:', error);
        console.error('- Error stack:', error.stack);
        showErrorMessage('Initialization Error', 'Failed to initialize the weekly history page.');
    }
});

function setupWeekNavigation() {
    console.log('🔧 [setupWeekNavigation] Setting up navigation buttons...');
    
    const prevButton = document.getElementById('prevWeek');
    const nextButton = document.getElementById('nextWeek');
    
    console.log('- Previous button found:', !!prevButton);
    console.log('- Next button found:', !!nextButton);
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            console.log('⬅️ [prevWeek] Previous week clicked, current offset:', currentWeekOffset);
            if (currentWeekOffset < 52) { // Limitar a 1 año atrás
                currentWeekOffset++;
                console.log('- New offset:', currentWeekOffset);
                displayWeekData(currentWeekOffset);
            } else {
                console.log('- Maximum offset reached (52 weeks)');
            }
        });
        console.log('✅ [setupWeekNavigation] Previous button listener added');
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            console.log('➡️ [nextWeek] Next week clicked, current offset:', currentWeekOffset);
            if (currentWeekOffset > 0) {
                currentWeekOffset--;
                console.log('- New offset:', currentWeekOffset);
                displayWeekData(currentWeekOffset);
            } else {
                console.log('- Already at current week (offset 0)');
            }
        });
        console.log('✅ [setupWeekNavigation] Next button listener added');
    }
}

function displayWeekData(weekOffset) {
    console.log('📅 [displayWeekData] Displaying week with offset:', weekOffset);
    
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - (weekOffset * 7));
    const targetWeek = getWeekNumber(currentDate);
    const targetYear = currentDate.getFullYear();
    
    console.log('- Target week:', targetWeek, 'Year:', targetYear);
    console.log('- All orders data length:', allOrdersData.length);

    // Filtra y guarda los resultados en la variable a nivel de módulo
    filteredOrdersData = allOrdersData.filter(order => {
        if (!order.date) return false;
        const orderDate = new Date(order.date);
        const orderWeek = getWeekNumber(orderDate);
        const orderYear = orderDate.getFullYear();
        return orderWeek === targetWeek && orderYear === targetYear;
    });
    
    console.log('- Filtered orders for week:', filteredOrdersData.length);

    updateWeekInfo(targetWeek, targetYear, filteredOrdersData.length, currentDate);
    updateNavigationButtons();
    populateWeeklyDataTable(filteredOrdersData);
    showInfoToast(`Displaying ${filteredOrdersData.length} orders for week ${targetWeek}.`);
}

function updateWeekInfo(weekNumber, year, orderCount, weekDate) {
    console.log('📊 [updateWeekInfo] Updating week info:', {weekNumber, year, orderCount});
    
    const currentWeekDisplay = document.getElementById('currentWeekDisplay');
    console.log('- Week display element found:', !!currentWeekDisplay);
    
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
        console.log('✅ [updateWeekInfo] Week info updated');
    }
}

function updateNavigationButtons() {
    console.log('🔘 [updateNavigationButtons] Updating button states...');
    
    const nextBtn = document.getElementById('nextWeek');
    if (nextBtn) {
        nextBtn.disabled = currentWeekOffset === 0;
        console.log('- Next button disabled:', nextBtn.disabled);
    }
}

function populateWeeklyDataTable(orders) {
    console.log('📋 [populateWeeklyDataTable] Starting table population...');
    console.log('- Orders received:', {
        length: orders.length,
        type: typeof orders,
        isArray: Array.isArray(orders)
    });
    
    if (!Array.isArray(orders)) {
        console.error('❌ [populateWeeklyDataTable] Orders is not an array!', orders);
        return;
    }
    
    const tableData = orders.map((order, index) => {
        if (index < 3) { // Log first 3 orders
            console.log(`- Mapping order ${index + 1}:`, order);
        }
        
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
            `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" data-order-id="${order.id}" title="View as PDF"><i class="fas fa-file-pdf"></i></button>`
        ];
    });
    
    console.log('✅ [populateWeeklyDataTable] Table data mapped, rows:', tableData.length);

    // Verificar si DataTable existe y destruirla
    console.log('🔍 [populateWeeklyDataTable] Checking for existing DataTable...');
    const table = $('#weeklyHistoryTable');
    console.log('- Table element found:', table.length > 0);
    
    if ($.fn.DataTable.isDataTable(table)) {
        console.log('🗑️ [populateWeeklyDataTable] Destroying existing DataTable...');
        table.DataTable().clear().destroy();
        console.log('✅ [populateWeeklyDataTable] Existing DataTable destroyed');
    }

    // Crear nueva DataTable
    console.log('🆕 [populateWeeklyDataTable] Creating new DataTable...');
    try {
        const dataTable = table.DataTable({
            data: tableData,
            dom: 'Bfrtip',
            buttons: getDataTableButtons(`Weekly Orders History - Week ${getWeekNumber(new Date())}`, orders),
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
            ]
        });
        
        console.log('✅ [populateWeeklyDataTable] DataTable created successfully');
        console.log('- DataTable info:', dataTable.page.info());
        
    } catch (error) {
        console.error('💥 [populateWeeklyDataTable] Error creating DataTable:', error);
        console.error('- Error stack:', error.stack);
        throw error;
    }

    // Agregar event listeners para los botones PDF
    console.log('🔧 [populateWeeklyDataTable] Adding PDF button listeners...');
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
    
    console.log('✅ [populateWeeklyDataTable] PDF button listeners added');
    console.log('🎉 [populateWeeklyDataTable] Table population completed successfully!');
}
