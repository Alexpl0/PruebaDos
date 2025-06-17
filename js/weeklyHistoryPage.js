/**
 * Premium Freight - Weekly History Page Handler
 * Maneja la página de histórico semanal con navegación mejorada
 */

import { generatePDF } from './svgOrders.js';

// Variables globales
let weeklyHistoryTable;
let currentWeekOffset = 0; // 0 = semana actual, 1 = semana anterior, etc.
let allOrdersData = [];

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
    // Crear header
    createHeader(window.authorizationLevel || 0);
    
    // Configurar navegación de semanas
    document.getElementById('prevWeek').addEventListener('click', () => {
        generateWeeklyTable(currentWeekOffset + 1);
    });
    
    document.getElementById('nextWeek').addEventListener('click', () => {
        if (currentWeekOffset > 0) {
            generateWeeklyTable(currentWeekOffset - 1);
        }
    });

    // Cargar datos de la semana actual
    generateWeeklyTable(0);
});