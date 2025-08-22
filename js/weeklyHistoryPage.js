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
    try {
        addNotificationStyles();
        setupToggleFilters('toggleFilters', 'filterPanelBody');
        setupWeekNavigation();
        
        // Cargar todos los datos una vez
        showLoading('Loading Orders Data', 'Please wait...');
        allOrdersData = await loadOrdersData();
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
        
        // Mostrar la semana actual
        await displayWeekData(currentWeekOffset);
    } catch (error) {
        console.error('Initialization error:', error);
        showErrorMessage('Initialization Error', 'Failed to initialize the weekly history page.');
    }
});

function setupWeekNavigation() {
    const prevButton = document.getElementById('prevWeek');
    const nextButton = document.getElementById('nextWeek');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentWeekOffset < 52) { // Limitar a 1 año atrás
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

    // Filtra y guarda los resultados en la variable a nivel de módulo
    filteredOrdersData = allOrdersData.filter(order => {
        if (!order.date) return false;
        const orderDate = new Date(order.date);
        return getWeekNumber(orderDate) === targetWeek && orderDate.getFullYear() === targetYear;
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
    if (nextBtn) nextBtn.disabled = currentWeekOffset === 0;
}

function populateWeeklyDataTable(orders) {
    const tableData = orders.map(order => [
        order.id || '-', order.planta || '-', order.code_planta || '-', order.date || '-',
        order.in_out_bound || '-', order.reference_number || '-', order.creator_name || '-',
        order.area || '-', order.description || '-', order.category_cause || '-',
        order.cost_euros ? `€${parseFloat(order.cost_euros).toFixed(2)}` : '-',
        order.transport || '-', order.carrier || '-',
        order.origin_company_name || '-', order.origin_city || '-',
        order.destiny_company_name || '-', order.destiny_city || '-',
        `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" data-order-id="${order.id}" title="View as PDF"><i class="fas fa-file-pdf"></i></button>`
    ]);

    // Verificar si DataTable existe y destruirla
    const table = $('#weeklyHistoryTable');
    if ($.fn.DataTable.isDataTable(table)) {
        table.DataTable().clear().destroy();
    }

    // Crear nueva DataTable
    table.DataTable({
        data: tableData,
        dom: 'Bfrtip',
        buttons: getDataTableButtons(`Weekly Orders History - Week ${getWeekNumber(new Date())}`, orders),
        scrollX: true,
        scrollY: '400px',
        responsive: false,
        order: [[0, 'desc']]
    });

    // Agregar event listeners para los botones PDF
    document.querySelectorAll('.generate-pdf-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const order = allOrdersData.find(o => o.id == btn.dataset.orderId);
            if (order) await generatePDF(order);
        });
    });
}
