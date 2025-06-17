/**
 * Premium Freight - Weekly History Page
 * Manages the weekly orders history page functionality
 */

import { generatePDF } from './svgOrders.js';

// Variables específicas para la página semanal
let currentWeekOffset = 0;
let weeklyDataTable = null;

/**
 * Funciones auxiliares reutilizadas de dataTables.js
 */
const parseDate = (dateString) => {
    try {
        if (!dateString || dateString.trim() === '') return null;
        
        // Manejo de diferentes formatos de fecha
        let parsedDate;
        if (dateString.includes('T')) {
            parsedDate = new Date(dateString);
        } else if (dateString.includes('-')) {
            const parts = dateString.split(' ')[0].split('-');
            parsedDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
            parsedDate = new Date(dateString);
        }
        
        return isNaN(parsedDate.getTime()) ? null : parsedDate;
    } catch (error) {
        console.error('Error parsing date:', dateString, error);
        return null;
    }
};

const getWeekNumber = (date) => {
    try {
        if (!date || isNaN(date.getTime())) return "-";
        
        const dayNum = date.getDay() || 7;
        date.setDate(date.getDate() + 4 - dayNum);
        const yearStart = new Date(date.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return weekNum;
    } catch (error) {
        console.error("Error calculating week number:", error);
        return "-";
    }
};

const getMonthName = (date) => {
    try {
        if (!date || isNaN(date.getTime())) return "-";
        
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[date.getMonth()];
    } catch (error) {
        console.error("Error getting month name:", error);
        return "-";
    }
};

const formatCreatorName = (fullName) => {
    try {
        if (!fullName || typeof fullName !== 'string') return fullName || '-';
        
        const nameParts = fullName.trim().split(/\s+/);
        if (nameParts.length < 2) return fullName;
        
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        return `${firstName.charAt(0)}. ${lastName}`;
    } catch (error) {
        console.error('Error formatting creator name:', error);
        return fullName || '-';
    }
};

/**
 * Carga datos de Premium Freight desde la API
 */
const loadPremiumFreightData = async () => {
    try {
        const response = await fetch(URLPF + 'dao/conections/daoPremiumFreight.php');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data && data.status === 'success' && Array.isArray(data.data)) {
            return data.data;
        } else if (Array.isArray(data)) {
            return data;
        } else {
            throw new Error('Invalid data format received');
        }
    } catch (error) {
        console.error('Error loading Premium Freight data:', error);
        throw error;
    }
};

/**
 * Trunca texto con puntos suspensivos
 */
const truncateText = (text, maxLength = 50) => {
    if (!text || typeof text !== 'string') return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

/**
 * Genera la tabla de histórico semanal
 */
const generateWeeklyTable = async (weeksBack = 0) => {
    try {
        currentWeekOffset = weeksBack;
        
        // Mostrar loading
        Swal.fire({
            title: 'Loading Weekly Data',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // Cargar datos de la API si es la primera carga
        if (allOrdersData.length === 0) {
            allOrdersData = await loadPremiumFreightData();
        }

        // Calcular la semana objetivo
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (weeksBack * 7));
        const targetWeek = getWeekNumber(currentDate);
        const targetYear = currentDate.getFullYear();

        // Actualizar el display de la semana actual
        updateWeekDisplay(targetWeek, targetYear);

        // Filtrar datos para la semana objetivo
        const weeklyData = allOrdersData.filter(item => {
            if (!item || !item.date) return false;
            
            const itemDate = parseDate(item.date);
            if (!itemDate) return false;
            
            const itemWeek = getWeekNumber(new Date(itemDate));
            const itemYear = itemDate.getFullYear();
            
            return itemWeek === targetWeek && itemYear === targetYear;
        });

        console.log(`Showing data for week ${targetWeek} of ${targetYear} - Found ${weeklyData.length} orders`);

        // Destruir tabla existente si existe
        if (weeklyHistoryTable) {
            weeklyHistoryTable.destroy();
            weeklyHistoryTable = null;
        }

        // Limpiar tabla
        $('#weeklyHistoryTable tbody').empty();

        // Generar filas de datos
        const tableData = weeklyData.map(item => {
            const issueDate = parseDate(item.date);
            return [
                item.id || '-',
                'Grammer AG',
                item.creator_plant || '-',
                item.creator_plant || '-', // Usando creator_plant como plant name
                issueDate ? issueDate.toLocaleDateString('en-US') : '-',
                item.in_out_bound || '-',
                issueDate ? getWeekNumber(issueDate) : '-',
                issueDate ? getMonthName(issueDate) : '-',
                item.reference_number || '-',
                formatCreatorName(item.creator_name),
                item.area || '-',
                truncateText(item.description, 60), // Descripción truncada
                item.category_cause || '-',
                item.cost_euros ? `€${parseFloat(item.cost_euros).toFixed(2)}` : '-',
                item.transport || '-',
                item.int_ext || '-',
                item.carrier || '-',
                item.origin_company_name || '-',
                item.origin_city || '-',
                item.destiny_company_name || '-',
                item.destiny_city || '-',
                item.weight ? `${item.weight} kg` : '-',
                item.project_status || '-',
                item.approver_name || '-',
                item.recovery || '-',
                item.paid_by || '-',
                item.products || '-',
                item.status_name || '-',
                item.required_auth_level || '-',
                item.recovery_file ? 'Yes' : 'No',
                item.recovery_evidence ? 'Yes' : 'No',
                item.approval_date || '-',
                item.approval_status || '-',
                `<button class="btn btn-sm btn-primary generate-pdf-btn" data-order-id="${item.id}" title="Generate PDF">
                    <i class="fas fa-file-pdf"></i>
                </button>`
            ];
        });

        // Inicializar DataTable
        weeklyHistoryTable = $('#weeklyHistoryTable').DataTable({
            data: tableData,
            destroy: true,
            lengthMenu: [10, 25, 50, 100, 200, 500],
            pageLength: 25,
            columnDefs: [
                { className: "text-center", targets: "_all" },
                { orderable: false, targets: -1 } // Columna de acciones no ordenable
            ],
            language: {
                lengthMenu: "Show _MENU_ records per page",
                zeroRecords: "No records found for this week",
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
                    title: `Premium_Freight_Week_${targetWeek}_${targetYear}`,
                    filename: `Premium_Freight_Week_${targetWeek}_${targetYear}`,
                    exportOptions: { columns: ':visible:not(:last-child)' }
                },
                {
                    extend: 'pdf',
                    text: '<i class="fas fa-file-pdf"></i> PDF',
                    className: 'btn-danger',
                    orientation: 'landscape',
                    pageSize: 'LEGAL',
                    title: `Premium Freight Weekly Report - Week ${targetWeek} ${targetYear}`,
                    filename: `Premium_Freight_Week_${targetWeek}_${targetYear}`,
                    exportOptions: { columns: ':visible:not(:last-child)' },
                    customize: function(doc) {
                        // Aplicar estilos personalizados del PDF
                        doc.defaultStyle.fontSize = 7;
                        doc.styles.tableHeader.fontSize = 8;
                        doc.styles.tableHeader.fillColor = '#A7CAC3';
                        doc.pageMargins = [10, 15, 10, 15];
                        
                        if (doc.content[1] && doc.content[1].table && doc.content[1].table.body[0]) {
                            doc.content[1].table.widths = Array(doc.content[1].table.body[0].length).fill('*');
                        }
                    }
                },
                {
                    text: '<i class="fas fa-print"></i> Print',
                    className: 'btn-info',
                    extend: 'print',
                    title: `Premium Freight Weekly Report - Week ${targetWeek} ${targetYear}`,
                    exportOptions: { columns: ':visible:not(:last-child)' }
                }
            ]
        });

        // Configurar event listeners para botones de PDF
        setupPDFEventListeners();

        Swal.close();

    } catch (error) {
        console.error('Error generating weekly table:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error Loading Data',
            text: 'Could not load weekly history data. Please try again.'
        });
    }
};

/**
 * Actualiza el display de la semana actual
 */
const updateWeekDisplay = (week, year) => {
    const display = document.getElementById('currentWeekDisplay');
    const subtitle = document.getElementById('weeklySubtitle');
    
    if (display) {
        display.textContent = `Week ${week}, ${year}`;
    }
    
    if (subtitle) {
        if (currentWeekOffset === 0) {
            subtitle.textContent = 'Current Week Report';
        } else {
            subtitle.textContent = `${currentWeekOffset} week${currentWeekOffset > 1 ? 's' : ''} ago`;
        }
    }

    // Actualizar estado de botones de navegación
    const nextBtn = document.getElementById('nextWeek');
    if (nextBtn) {
        nextBtn.disabled = currentWeekOffset === 0;
        if (currentWeekOffset === 0) {
            nextBtn.classList.add('disabled');
        } else {
            nextBtn.classList.remove('disabled');
        }
    }
};

/**
 * Configura event listeners para los botones de PDF
 */
const setupPDFEventListeners = () => {
    // Remover listeners existentes
    $('.generate-pdf-btn').off('click');
    
    // Agregar nuevos listeners
    $('.generate-pdf-btn').on('click', async function() {
        const orderId = $(this).data('order-id');
        const orderData = allOrdersData.find(order => order.id == orderId);
        
        if (!orderData) {
            Swal.fire({
                icon: 'error',
                title: 'Order Not Found',
                text: 'Could not find order data for PDF generation.'
            });
            return;
        }

        try {
            Swal.fire({
                title: 'Generating PDF',
                text: 'Please wait while the document is being processed...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const fileName = await generatePDF(orderData, `PF_${orderId}_Week_Report`);

            Swal.fire({
                icon: 'success',
                title: 'PDF Generated Successfully!',
                text: `The file ${fileName} has been downloaded.`,
                timer: 3000,
                timerProgressBar: true
            });

        } catch (error) {
            console.error('Error generating PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error Generating PDF',
                text: error.message || 'An unexpected error occurred.'
            });
        }
    });
};

/**
 * Inicialización cuando el DOM esté listo
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('[WeeklyHistory] 🚀 Initializing weekly history page...');
    
    try {
        // Crear header
        createHeader(window.authorizationLevel || 0);
        
        // Agregar estilos de notificación
        addNotificationStyles();
        
        // Cargar datos de la semana actual
        loadWeeklyData(currentWeekOffset);
        
        // Configurar navegación de semanas
        setupWeekNavigation();
        
        // Configurar atajos de teclado
        setupKeyboardShortcuts();
        
        console.log('[WeeklyHistory] ✅ Initialization completed successfully');
    } catch (error) {
        console.error('[WeeklyHistory] ❌ Error during initialization:', error);
        showErrorMessage('Initialization Error', 'Failed to initialize the weekly history page.');
    }
});

/**
 * Setup week navigation buttons
 */
function setupWeekNavigation() {
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            if (!isLoading) {
                currentWeekOffset++;
                await loadWeeklyData(currentWeekOffset);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            if (!isLoading && currentWeekOffset > 0) {
                currentWeekOffset--;
                await loadWeeklyData(currentWeekOffset);
            }
        });
    }
    
    console.log('[WeeklyHistory] 🔄 Week navigation setup completed');
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                document.getElementById('prevWeek')?.click();
                break;
            case 'ArrowRight':
                event.preventDefault();
                document.getElementById('nextWeek')?.click();
                break;
            case 'r':
            case 'R':
                if (event.ctrlKey) {
                    event.preventDefault();
                    refreshCurrentWeek();
                }
                break;
        }
    });
    
    console.log('[WeeklyHistory] ⌨️ Keyboard shortcuts enabled');
}

/**
 * Load weekly data from API
 * @param {number} weekOffset - Number of weeks to go back from current week
 */
async function loadWeeklyData(weekOffset = 0) {
    try {
        const loadingMessage = weekOffset === 0 ? 'Loading Current Week' : `Loading Week Data (${Math.abs(weekOffset)} weeks ago)`;
        showLoading(loadingMessage, 'Please wait while we fetch the orders...');
        
        // Load all orders
        const allOrders = await loadOrdersData();
        
        // Process the data for the specific week
        processWeeklyData(allOrders, weekOffset);
        
    } catch (error) {
        console.error('[WeeklyHistory] ❌ Error loading weekly data:', error);
        showErrorMessage('Data Loading Error', `Could not load weekly orders data: ${error.message}`);
    } finally {
        Swal.close();
    }
}

/**
 * Process and filter weekly data
 * @param {Array} allOrders - All orders from API
 * @param {number} weekOffset - Week offset from current week
 */
function processWeeklyData(allOrders, weekOffset) {
    try {
        // Calculate target week
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - (weekOffset * 7));
        const targetWeek = getWeekNumber(currentDate);
        const targetYear = currentDate.getFullYear();
        
        console.log(`[WeeklyHistory] 📅 Filtering for week ${targetWeek} of year ${targetYear}`);
        
        // Filter orders for target week
        const weeklyOrders = allOrders.filter(order => {
            if (!order || !order.date) return false;
            
            try {
                const orderDate = new Date(order.date);
                if (isNaN(orderDate.getTime())) return false;
                
                const orderWeek = getWeekNumber(orderDate);
                const orderYear = orderDate.getFullYear();
                
                return orderWeek === targetWeek && orderYear === targetYear;
            } catch (error) {
                console.error('[WeeklyHistory] Error processing order date:', error, order);
                return false;
            }
        });
        
        console.log(`[WeeklyHistory] 📋 Found ${weeklyOrders.length} orders for week ${targetWeek}`);
        
        // Store data globally
        allOrdersData = weeklyOrders;
        
        // Update UI components
        updateWeekInfo(targetWeek, targetYear, weeklyOrders.length, currentDate);
        updateNavigationButtons();
        populateDataTable(weeklyOrders);
        
        // Show success notification
        if (weekOffset === currentWeekOffset && weeklyOrders.length > 0) {
            showInfoToast(`Loaded ${weeklyOrders.length} orders for week ${targetWeek}`);
        }
        
    } catch (error) {
        console.error('[WeeklyHistory] ❌ Error processing weekly data:', error);
        showErrorMessage('Data Processing Error', error.message);
    }
}

/**
 * Update week information display
 * @param {number} weekNumber - Week number
 * @param {number} year - Year
 * @param {number} orderCount - Number of orders
 * @param {Date} weekDate - Date representing the week
 */
function updateWeekInfo(weekNumber, year, orderCount, weekDate) {
    const currentWeekDisplay = document.getElementById('currentWeekDisplay');
    const weeklySubtitle = document.getElementById('weeklySubtitle');
    
    // Calculate week date range
    const startOfWeek = new Date(weekDate);
    const dayOfWeek = startOfWeek.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
    
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
            </div>
        `;
    }
    
    if (weeklySubtitle) {
        const statusText = orderCount === 0 ? 'No orders found' : 
                          orderCount === 1 ? '1 order found' : 
                          `${orderCount.toLocaleString()} orders found`;
        
        weeklySubtitle.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>Premium Freight Weekly Report</span>
                <span class="badge bg-primary">${statusText}</span>
            </div>
        `;
    }
}

/**
 * Update navigation buttons state
 */
function updateNavigationButtons() {
    const nextBtn = document.getElementById('nextWeek');
    const prevBtn = document.getElementById('prevWeek');
    
    if (nextBtn) {
        nextBtn.disabled = currentWeekOffset === 0 || isLoading;
        nextBtn.innerHTML = isLoading ? 
            '<i class="fas fa-spinner fa-spin"></i> Loading...' : 
            'Next Week <i class="fas fa-chevron-right"></i>';
    }
    
    if (prevBtn) {
        prevBtn.disabled = isLoading;
        prevBtn.innerHTML = isLoading ? 
            '<i class="fas fa-spinner fa-spin"></i> Loading...' : 
            '<i class="fas fa-chevron-left"></i> Previous Week';
    }
}

/**
 * Populate the DataTable with weekly orders
 * @param {Array} orders - Array of order objects
 */
function populateDataTable(orders) {
    // Destroy existing DataTable if it exists
    if (weeklyDataTable && $.fn.DataTable.isDataTable('#weeklyHistoryTable')) {
        weeklyDataTable.destroy();
        weeklyDataTable = null;
    }
    
    if (orders.length === 0) {
        const tableBody = document.querySelector('#weeklyHistoryTable tbody');
        if (tableBody) {
            const noDataMessage = currentWeekOffset === 0 ? 
                'No orders found for the current week' : 
                `No orders found for the selected week`;
                
            tableBody.innerHTML = `
                <tr>
                    <td colspan="34" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-inbox fa-3x mb-3"></i>
                            <h5>${noDataMessage}</h5>
                            <p>Try selecting a different week or check back later.</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        return;
    }
    
    // Prepare data for DataTable
    const tableData = orders.map(order => {
        const orderDate = order.date ? new Date(order.date) : null;
        const formattedDate = orderDate ? orderDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }) : '-';
        
        const monthName = orderDate ? orderDate.toLocaleDateString('en-US', { 
            month: 'long' 
        }) : '-';
        
        const weekNumber = orderDate ? getWeekNumber(orderDate) : '-';
        
        return [
            order.id || '-',
            'Grammer AG',
            order.creator_plant || '-',
            order.creator_plant || '-',
            formattedDate,
            `<span class="badge ${order.in_out_bound === 'Inbound' ? 'bg-info' : 'bg-secondary'}">${order.in_out_bound || '-'}</span>`,
            weekNumber,
            monthName,
            order.reference_number || '-',
            formatCreatorName(order.creator_name),
            order.area || '-',
            order.description || '-',
            order.category_cause || '-',
            formatCost(order.cost_euros),
            order.transport || '-',
            `<span class="badge ${order.int_ext === 'Internal' ? 'bg-primary' : 'bg-secondary'}">${order.int_ext || '-'}</span>`,
            order.carrier || '-',
            order.origin_company_name || '-',
            order.origin_city || '-',
            order.destiny_company_name || '-',
            order.destiny_city || '-',
            formatWeight(order.weight),
            order.project_status || '-',
            order.approver_name || '-',
            order.recovery || '-',
            order.paid_by || '-',
            order.products || '-',
            order.status_name || '-',
            order.required_auth_level || '-',
            `<span class="badge ${order.recovery_file ? 'bg-success' : 'bg-secondary'}">${order.recovery_file ? 'Yes' : 'No'}</span>`,
            `<span class="badge ${order.recovery_evidence ? 'bg-success' : 'bg-secondary'}">${order.recovery_evidence ? 'Yes' : 'No'}</span>`,
            order.approval_date ? new Date(order.approval_date).toLocaleDateString('en-US') : '-',
            getApprovalStatus(order),
            `<button class="btn btn-sm btn-outline-primary generate-pdf-btn" 
                    onclick="generateSinglePDF(${order.id})" 
                    title="Generate PDF for Order ${order.id}">
                <i class="fas fa-file-pdf"></i>
            </button>`
        ];
    });
    
    // Get current week info for export filenames
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - (currentWeekOffset * 7));
    const targetWeek = getWeekNumber(currentDate);
    const targetYear = currentDate.getFullYear();
    
    // Get base configuration and customize for weekly
    const config = getDataTableConfig(
        `Weekly_Premium_Freight_W${targetWeek}_${targetYear}`,
        `Weekly Premium Freight Report - Week ${targetWeek}, ${targetYear}`
    );
    
    // Add batch PDF generation button
    config.buttons.splice(2, 0, {
        text: '<i class="fas fa-file-pdf"></i> Generate All PDFs',
        className: 'btn btn-info btn-sm',
        action: async function(e, dt, node, config) {
            await handleBatchSVGGeneration(orders, `Week ${targetWeek} ${targetYear}`);
        }
    });
    
    // Initialize DataTable
    weeklyDataTable = $('#weeklyHistoryTable').DataTable({
        ...config,
        data: tableData
    });
    
    console.log(`[WeeklyHistory] 📊 Populated table with ${orders.length} orders`);
}

/**
 * Refresh current week data
 */
async function refreshCurrentWeek() {
    if (isLoading) return;
    
    // Clear cache
    dataCache.clear();
    
    showInfoToast('Refreshing data...');
    await loadWeeklyData(currentWeekOffset);
}

console.log('[WeeklyHistory] 📋 Module loaded successfully');