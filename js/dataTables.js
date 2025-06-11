/**
 * Premium Freight - Manejo de DataTables para históricos
 * Este módulo gestiona la visualización de datos históricos en tablas interactivas
 */

// Variables globales para las instancias de DataTable
let dataTableHistoricoSemanal;
let dataTableHistoricoTotal;
let dataTableSemanalInitialized = false;
let dataTableTotalInitialized = false;

// Global variable to track initialization state
let dataTableInitialized = false;

/**
 * Opciones comunes para ambas DataTables
 */
const dataTableOptions = {
    lengthMenu: [10, 25, 50, 100, 200, 500],
    columnDefs: [
        { className: "centered", targets: "_all" } // Todas las columnas centradas
    ],
    pageLength: 10,
    destroy: true,
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
            title: 'Premium_Freight_Report',
            filename: 'Premium_Freight_Report',
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
            title: 'Premium Freight Report',
            filename: 'Premium Freight Report',
            customize: function(doc) {
                doc.defaultStyle.fontSize = 7;
                doc.styles.tableHeader.fontSize = 8;
                doc.styles.tableHeader.fillColor = '#A7CAC3';

                // Márgenes más pequeños para aprovechar el espacio
                doc.pageMargins = [10, 15, 10, 15];

                // Distribuir el ancho de las columnas uniformemente
                if (doc.content[1] && doc.content[1].table && doc.content[1].table.body[0]) {
                    doc.content[1].table.widths = Array(doc.content[1].table.body[0].length).fill('*');
                }

                // Título personalizado
                doc.content.splice(0, 0, {
                    margin: [0, 0, 0, 12],
                    alignment: 'center',
                    text: 'GRAMMER Premium Freight Report',
                    style: {
                        fontSize: 14,
                        bold: true,
                        color: '#1c4481'
                    }
                });

                // Pie de página con fecha y número de página
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
            text: '<i class="fas fa-code"></i> SVG',
            className: 'btn-info',
            action: async function(e, dt, node, config) {
                try {
                    Swal.fire({
                        title: 'Preparing documents',
                        html: 'Generating SVGs for each record. This may take a moment...',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });

                    const exportData = dt.rows({search: 'applied'}).data().toArray();
                    if (exportData.length === 0) {
                        Swal.fire({
                            icon: 'info',
                            title: 'No data',
                            text: 'There are no records to export'
                        });
                        return;
                    }

                    if (exportData.length > 10) {
                        const confirm = await Swal.fire({
                            icon: 'warning',
                            title: 'Many records',
                            html: `You are about to generate ${exportData.length} SVG/PDF documents. Do you want to continue?`,
                            showCancelButton: true,
                            confirmButtonText: 'Yes, generate all',
                            cancelButtonText: 'Cancel',
                        });

                        if (!confirm.isConfirmed) return;
                    }

                    const { loadAndPopulateSVG, generatePDF } = await import('./svgOrders.js');
                    const ids = exportData.map(row => row[0]);
                    const ordersResponse = await fetch(URLPF + 'dao/conections/daoPremiumFreight.php');
                    const ordersData = await ordersResponse.json();
                    const allOrders = ordersData.data || [];
                    const visibleOrders = allOrders.filter(order => ids.includes(String(order.id)));

                    const container = document.createElement('div');
                    container.style.position = 'absolute';
                    container.style.left = '-9999px';
                    document.body.appendChild(container);

                    for (let i = 0; i < visibleOrders.length; i++) {
                        const order = visibleOrders[i];
                        const orderId = order.id;

                        Swal.update({
                            html: `Processing document ${i+1} of ${visibleOrders.length}...`
                        });

                        try {
                            await generatePDF(order, `PF_${orderId}`);
                        } catch (error) {
                            console.error(`Error generating PDF for order ${orderId}:`, error);
                        }

                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    document.body.removeChild(container);

                    Swal.fire({
                        icon: 'success',
                        title: 'Documents generated',
                        html: `${visibleOrders.length} PDF documents have been generated.<br>Check your downloads folder.`
                    });

                } catch (error) {
                    console.error('Error generating documents:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'An error occurred while generating the documents: ' + error.message
                    });
                }
            }
        }
    ]
};

/**
 * Función para cargar los datos de Premium Freight desde la API
 * @returns {Promise<Array|Object>} Datos de Premium Freight
 */
const cargarDatosPremiumFreight = async () => {
    try {
        const response = await fetch(URLPF + 'dao/conections/daoPremiumFreight.php');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error al cargar datos de Premium Freight:", error);
        return [];
    }
};

/**
 * Función para convertir cadena de texto de fecha a objeto Date
 * @param {string} dateString - Cadena de fecha en formato "YYYY-MM-DD HH:MM:SS"
 * @returns {Date|null} Objeto Date o null si la fecha es inválida
 */
const parseDate = (dateString) => {
    try {
        if (!dateString) return null;
        
        // Formato esperado: "2025-04-28 20:59:18"
        const parts = dateString.split(' ');
        if (parts.length !== 2) return null;
        
        const dateParts = parts[0].split('-');
        const timeParts = parts[1].split(':');
        
        if (dateParts.length !== 3 || timeParts.length !== 3) return null;
        
        // El formato es: new Date(año, mes-1, día, hora, minuto, segundo)
        // Mes es 0-indexed en JavaScript (0-11)
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Restar 1 porque los meses van de 0-11
        const day = parseInt(dateParts[2], 10);
        const hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1], 10);
        const second = parseInt(timeParts[2], 10);
        
        const date = new Date(year, month, day, hour, minute, second);        
        // Verificar si la fecha es válida
        if (isNaN(date.getTime())) {
            console.warn('parseDate: Fecha resultante inválida:', dateString);
            return null;
        }
        
        return date;
    } catch (error) {
        console.error('Error en parseDate:', error, dateString);
        return null;
    }
};

/**
 * Función para obtener el número de semana de una fecha (ISO 8601)
 * @param {Date} date - Objeto Date
 * @returns {number|string} Número de semana o "-" si la fecha es inválida
 */
const getWeekNumber = (date) => {
    try {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return '-';
        }
        
        // Crear una copia de la fecha para no modificar la original
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        
        // Configurar al primer día de la semana (lunes en ISO 8601)
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        
        // Primer día del año
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        
        // Calcular el número de semana
        const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        
        return weekNumber;
    } catch (error) {
        console.error('Error en getWeekNumber:', error);
        return '-';
    }
};

/**
 * Función para obtener el nombre del mes de una fecha
 * @param {Date} date - Objeto Date
 * @returns {string} Nombre del mes o "-" si la fecha es inválida
 */
const getMonthName = (date) => {
    try {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return '-';
        }
        
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
        return months[date.getMonth()];
    } catch (error) {
        console.error('Error en getMonthName:', error);
        return '-';
    }
};

/**
 * Formats creator name to show first initial + specified last name
 * @param {string} fullName - Full name of the creator
 * @returns {string} Formatted name (initial + last name) or original value if can't be parsed
 */
const formatCreatorName = (fullName) => {
    try {
        if (!fullName || typeof fullName !== 'string') return fullName || '-';
        
        // Split the name into parts
        const nameParts = fullName.trim().split(' ');
        
        // If only one part, return it as is
        if (nameParts.length === 1) return fullName;
        
        // Get the first initial from the first word (always considered first name)
        const firstInitial = nameParts[0].charAt(0).toUpperCase();
        
        // Handle different cases based on number of name parts
        if (nameParts.length === 2) {
            // Simple case: first name + last name
            return `${firstInitial}. ${nameParts[1]}`;
        } else if (nameParts.length >= 3) {
            // For 3+ words: first word is first name, third word is last name
            // This works for both 3-word and 4-word names according to requirements
            return `${firstInitial}. ${nameParts[2]}`;
        }
        
        // Fallback (shouldn't reach here)
        return fullName;
    } catch (error) {
        console.error('Error en formatCreatorName:', error, fullName);
        return fullName || '-';
    }
};

/**
 * Inicializar o reinicializar las DataTables
 * @param {string} tableType - Tipo de tabla a inicializar ('semanal', 'total', o 'both')
 */
const initDataTables = (tableType = 'both') => {
    try {
        // Configuración común con orden descendente por ID (primera columna)
        const commonConfig = {
            ...dataTableOptions,
            scrollX: true,
            scrollCollapse: true,
            order: [[0, 'desc']] // Ordenar por ID (columna 0) en orden descendente
        };
        
        // Inicializar DataTable para histórico semanal
        if (tableType === 'semanal' || tableType === 'both') {
            // Asegurarse de que la tabla existe en el DOM
            const semanalTable = document.getElementById('datatable_historico_semanal');
            if (!semanalTable) {
                console.error('Tabla de histórico semanal no encontrada en el DOM');
                return;
            }
            
            // Destruir instancia anterior si existe
            if (dataTableSemanalInitialized && $.fn.DataTable.isDataTable('#datatable_historico_semanal')) {
                dataTableHistoricoSemanal.destroy();
            }
            
            dataTableHistoricoSemanal = $("#datatable_historico_semanal").DataTable(commonConfig);
            dataTableSemanalInitialized = true;
            console.log("DataTable semanal inicializada correctamente");
        }
        
        // Inicializar DataTable para histórico total
        if (tableType === 'total' || tableType === 'both') {
            // Asegurarse de que la tabla existe en el DOM
            const totalTable = document.getElementById('datatable_historico_total');
            if (!totalTable) {
                console.error('Tabla de histórico total no encontrada en el DOM');
                return;
            }
            
            // Destruir instancia anterior si existe
            if (dataTableTotalInitialized && $.fn.DataTable.isDataTable('#datatable_historico_total')) {
                dataTableHistoricoTotal.destroy();
            }
            
            dataTableHistoricoTotal = $("#datatable_historico_total").DataTable(commonConfig);
            dataTableTotalInitialized = true;
            console.log("DataTable total inicializada correctamente");
        }
    } catch (error) {
        console.error("Error al inicializar DataTables:", error);
    }
};

/**
 * Función para generar tabla histórico semanal
 * @param {number} semanasAnteriores - Número de semanas para retroceder desde la actual
 */
const generarHistoricoSemanal = async (semanasAnteriores = 0) => {
    try {
        const response = await cargarDatosPremiumFreight();
        console.log("Datos recibidos de la API:", response);
        
        // Obtener referencia al elemento de la tabla
        const tableBody_semanal = document.getElementById('tableBody_historico_semanal');
        if (!tableBody_semanal) {
            console.error('No se encontró el elemento tableBody_historico_semanal');
            return;
        }

        // Extraer el array de datos
        let itemsArray = [];
        if (response && response.status === 'success' && Array.isArray(response.data)) {
            itemsArray = response.data;
        } else if (Array.isArray(response)) {
            itemsArray = response;
        } else {
            console.error('Formato de respuesta inesperado:', response);
            tableBody_semanal.innerHTML = '<tr><td colspan="25" class="text-center">No hay datos disponibles o formato inválido</td></tr>';
            return;
        }

        console.log("Total de registros obtenidos:", itemsArray.length);
        
        // Calcular la semana objetivo (actual - semanasAnteriores)
        const currentDate = new Date();
        // Si queremos ver semanas anteriores, restamos días
        currentDate.setDate(currentDate.getDate() - (semanasAnteriores * 7));
        
        const targetWeek = getWeekNumber(currentDate);
        const targetYear = currentDate.getFullYear();
        
        console.log(`Mostrando datos de la semana ${targetWeek} del año ${targetYear}`);
        
        // Actualizar el título del modal para reflejar la semana mostrada
        const modalTitle = document.getElementById('tituloModalHistoricoSemanal');
        if (modalTitle) {
            modalTitle.textContent = `Histórico Semanal de Premium Freight - Semana ${targetWeek} de ${targetYear}`;
        }
        
        // Log de los primeros 5 registros para inspección
        console.log("Muestra de datos (primeros 5 registros):", itemsArray.slice(0, 5));
        
        // Filtrar datos para la semana objetivo
        const datosSemanaFiltrada = itemsArray.filter(item => {
            if (!item || !item.date) return false;
            
            try {
                const itemDate = parseDate(item.date);
                if (!itemDate) {
                    console.log(`Fecha inválida en item ID ${item.id}: ${item.date}`);
                    return false;
                }
                
                const itemWeek = getWeekNumber(itemDate);
                const itemYear = itemDate.getFullYear();
                
                // Log para depuración
                console.log(`Item ID ${item.id}: Fecha ${item.date}, Semana calculada ${itemWeek}, Año ${itemYear}`);
                
                return itemWeek === targetWeek && itemYear === targetYear;
            } catch (error) {
                console.error('Error procesando fecha:', error);
                return false;
            }
        });
        
        console.log(`Registros filtrados para semana ${targetWeek}: ${datosSemanaFiltrada.length}`, datosSemanaFiltrada);
        
        // Generar el contenido HTML para la tabla
        let content = '';
        
        if (datosSemanaFiltrada.length === 0) {
            content = `<tr><td colspan="33" class="text-center">No hay datos disponibles para la semana ${targetWeek} de ${targetYear}</td></tr>`;
        } else {
            // Generate rows for each filtered item with ALL fields
            datosSemanaFiltrada.forEach(item => {
                try {
                    const dateValue = item.date;
                    const issueDate = dateValue ? parseDate(dateValue) : null;
                    
                    // If date is invalid, show with default values
                    if (!issueDate) {
                        content += `
                            <tr>
                                <td>${item.id || '-'}</td>
                                <td>Grammer AG</td>
                                <td>${item.code_planta || '-'}</td>
                                <td>${item.planta || '-'}</td>
                                <td>${dateValue || 'Invalid Date'}</td>
                                <td>${item.in_out_bound || '-'}</td>
                                <td>-</td>
                                <td>-</td>
                                <td>${item.reference_number || '-'}</td>
                                <td>${formatCreatorName(item.creator_name)}</td>
                                <td>${item.area || '-'}</td>
                                <td>${item.description || '-'}</td>
                                <td>${item.category_cause || '-'}</td>
                                <td>${item.cost_euros || '-'}</td>
                                <td>${item.transport || '-'}</td>
                                <td>${item.int_ext || '-'}</td>
                                <td>${item.carrier || '-'}</td>
                                <td>${item.origin_company_name || '-'}</td>
                                <td>${item.origin_city || '-'}</td>
                                <td>${item.destiny_company_name || '-'}</td>
                                <td>${item.destiny_city || '-'}</td>
                                <td>${item.weight || '-'}</td>
                                <td>${item.project_status || '-'}</td>
                                <td>${item.approver_name || 'Pending'}</td>
                                <td>${item.recovery || 'N/A'}</td>
                                <td>${item.paid_by || '-'}</td>
                                <td>${item.products || '-'}</td>
                                <td>${item.status_name || '-'}</td>
                                <td>${item.required_auth_level || '-'}</td>
                                <td>${item.recovery_file ? 'Yes' : 'No'}</td>
                                <td>${item.recovery_evidence ? 'Yes' : 'No'}</td>
                                <td>${item.created_at || '-'}</td>
                                <td>${item.updated_at || '-'}</td>
                            </tr>`;
                        return;
                    }
                    
                    // Valid date, calculate week and month
                    const issueMonth = getMonthName(issueDate);
                    const issueCW = getWeekNumber(issueDate);
                    
                    content += `
                        <tr>
                            <td>${item.id || '-'}</td>
                            <td>Grammer AG</td>
                            <td>${item.code_planta || '-'}</td>
                            <td>${item.planta || '-'}</td>
                            <td>${dateValue || '-'}</td>
                            <td>${item.in_out_bound || '-'}</td>
                            <td>${issueCW}</td>
                            <td>${issueMonth}</td>
                            <td>${item.reference_number || '-'}</td>
                            <td>${formatCreatorName(item.creator_name)}</td>
                            <td>${item.area || '-'}</td>
                            <td>${item.description || '-'}</td>
                            <td>${item.category_cause || '-'}</td>
                            <td>${item.cost_euros || '-'}</td>
                            <td>${item.transport || '-'}</td>
                            <td>${item.int_ext || '-'}</td>
                            <td>${item.carrier || '-'}</td>
                            <td>${item.origin_company_name || '-'}</td>
                            <td>${item.origin_city || '-'}</td>
                            <td>${item.destiny_company_name || '-'}</td>
                            <td>${item.destiny_city || '-'}</td>
                            <td>${item.weight || '-'}</td>
                            <td>${item.project_status || '-'}</td>
                            <td>${item.approver_name || 'Pending'}</td>
                            <td>${item.recovery || 'N/A'}</td>
                            <td>${item.paid_by || '-'}</td>
                            <td>${item.products || '-'}</td>
                            <td>${item.status_name || '-'}</td>
                            <td>${item.required_auth_level || '-'}</td>
                            <td>${item.recovery_file ? 'Yes' : 'No'}</td>
                            <td>${item.recovery_evidence ? 'Yes' : 'No'}</td>
                            <td>${item.created_at || '-'}</td>
                            <td>${item.updated_at || '-'}</td>
                        </tr>`;
                } catch (error) {
                    console.error('Error processing record:', error, item);
                }
            });
        }
        
        // Insertar el contenido en la tabla
        tableBody_semanal.innerHTML = content;
        console.log("Contenido HTML generado para la tabla");
        
        // Agregar controles de navegación para semanas anteriores/siguientes
        const modalFooter = document.querySelector('#modalHistoricoSemanal .modal-footer');
        if (modalFooter) {
            // Eliminar controles anteriores si existen
            const existingControls = modalFooter.querySelector('.semana-navigation');
            if (existingControls) {
                existingControls.remove();
            }
            
            // Crear controles de navegación
            const navControls = document.createElement('div');
            navControls.className = 'semana-navigation me-auto';
            navControls.innerHTML = `
                <button class="btn btn-outline-primary me-2" id="prevSemana">« Semana Anterior</button>
                <button class="btn btn-outline-primary" id="nextSemana" ${semanasAnteriores === 0 ? 'disabled' : ''}>Semana Siguiente »</button>
            `;
            
            // Insertar antes del botón de cerrar
            modalFooter.insertBefore(navControls, modalFooter.firstChild);
            
            // Agregar event listeners
            document.getElementById('prevSemana').addEventListener('click', () => {
                generarHistoricoSemanal(semanasAnteriores + 1);
            });
            
            document.getElementById('nextSemana').addEventListener('click', () => {
                if (semanasAnteriores > 0) {
                    generarHistoricoSemanal(semanasAnteriores - 1);
                }
            });
        }
        
        // Inicializar o reinicializar la DataTable semanal DESPUÉS de agregar contenido
        setTimeout(() => {
            initDataTables('semanal');
        }, 100);
        
    } catch (ex) {
        console.error("Error en generarHistoricoSemanal:", ex);
        
        // Mostrar un mensaje de error en la tabla
        const tableBody_semanal = document.getElementById('tableBody_historico_semanal');
        if (tableBody_semanal) {
            tableBody_semanal.innerHTML = '<tr><td colspan="33" class="text-center text-danger">Error loading data</td></tr>';
        }
    }
};

/**
 * Función para generar tabla histórico total
 */
const generarHistoricoTotal = async () => {
    try {
        const response = await cargarDatosPremiumFreight();
        
        // Obtener referencia al elemento de la tabla
        const tableBody_total = document.getElementById('tableBody_historico_total');
        if (!tableBody_total) {
            console.error('No se encontró el elemento tableBody_historico_total');
            return;
        }

        // Extraer el array de datos de la respuesta
        // La estructura esperada es { status: 'success', data: [...] }
        let itemsArray = [];
        
        if (response && response.status === 'success' && Array.isArray(response.data)) {
            // Caso correcto: la respuesta tiene la estructura esperada
            itemsArray = response.data;
        } else if (Array.isArray(response)) {
            // Caso alternativo: la respuesta es directamente un array
            itemsArray = response;
        } else {
            // Si no podemos encontrar un array, mostrar un error
            console.error('Formato de respuesta inesperado:', response);
            tableBody_total.innerHTML = '<tr><td colspan="25" class="text-center">No hay datos disponibles o formato inválido</td></tr>';
            return;
        }
        
        console.log("Total de registros para histórico total:", itemsArray.length);
        
        let content = ``;
        
        // Ahora itemsArray es siempre un array que podemos recorrer con forEach
        itemsArray.forEach(item => {
            try {
                const dateValue = item.date;
                const issueDate = dateValue ? parseDate(dateValue) : null;
                
                if (!issueDate) {
                    content += `
                        <tr>
                            <td>${item.id || '-'}</td>
                            <td>Grammer AG</td>
                            <td>${item.code_planta || '-'}</td>
                            <td>${item.planta || '-'}</td>
                            <td>${dateValue || 'Invalid Date'}</td>
                            <td>${item.in_out_bound || '-'}</td>
                            <td>-</td>
                            <td>-</td>
                            <td>${item.reference_number || '-'}</td>
                            <td>${formatCreatorName(item.creator_name)}</td>
                            <td>${item.area || '-'}</td>
                            <td>${item.description || '-'}</td>
                            <td>${item.category_cause || '-'}</td>
                            <td>${item.cost_euros || '-'}</td>
                            <td>${item.transport || '-'}</td>
                            <td>${item.int_ext || '-'}</td>
                            <td>${item.carrier || '-'}</td>
                            <td>${item.origin_company_name || '-'}</td>
                            <td>${item.origin_city || '-'}</td>
                            <td>${item.destiny_company_name || '-'}</td>
                            <td>${item.destiny_city || '-'}</td>
                            <td>${item.weight || '-'}</td>
                            <td>${item.project_status || '-'}</td>
                            <td>${item.approver_name || 'Pending'}</td>
                            <td>${item.recovery || 'N/A'}</td>
                            <td>${item.paid_by || '-'}</td>
                            <td>${item.products || '-'}</td>
                            <td>${item.status_name || '-'}</td>
                            <td>${item.required_auth_level || '-'}</td>
                            <td>${item.recovery_file ? 'Yes' : 'No'}</td>
                            <td>${item.recovery_evidence ? 'Yes' : 'No'}</td>
                            <td>${item.created_at || '-'}</td>
                            <td>${item.updated_at || '-'}</td>
                        </tr>`;
                    return;
                }
                
                const issueMonth = getMonthName(issueDate);
                const issueCW = getWeekNumber(issueDate);
                
                content += `
                    <tr>
                        <td>${item.id || '-'}</td>
                        <td>Grammer AG</td>
                        <td>${item.code_planta || '-'}</td>
                        <td>${item.planta || '-'}</td>
                        <td>${dateValue || '-'}</td>
                        <td>${item.in_out_bound || '-'}</td>
                        <td>${issueCW}</td>
                        <td>${issueMonth}</td>
                        <td>${item.reference_number || '-'}</td>
                        <td>${formatCreatorName(item.creator_name)}</td>
                        <td>${item.area || '-'}</td>
                        <td>${item.description || '-'}</td>
                        <td>${item.category_cause || '-'}</td>
                        <td>${item.cost_euros || '-'}</td>
                        <td>${item.transport || '-'}</td>
                        <td>${item.int_ext || '-'}</td>
                        <td>${item.carrier || '-'}</td>
                        <td>${item.origin_company_name || '-'}</td>
                        <td>${item.origin_city || '-'}</td>
                        <td>${item.destiny_company_name || '-'}</td>
                        <td>${item.destiny_city || '-'}</td>
                        <td>${item.weight || '-'}</td>
                        <td>${item.project_status || '-'}</td>
                        <td>${item.approver_name || 'Pending'}</td>
                        <td>${item.recovery || 'N/A'}</td>
                        <td>${item.paid_by || '-'}</td>
                        <td>${item.products || '-'}</td>
                        <td>${item.status_name || '-'}</td>
                        <td>${item.required_auth_level || '-'}</td>
                        <td>${item.recovery_file ? 'Yes' : 'No'}</td>
                        <td>${item.recovery_evidence ? 'Yes' : 'No'}</td>
                        <td>${item.created_at || '-'}</td>
                        <td>${item.updated_at || '-'}</td>
                    </tr>`;
            } catch (error) {
                console.error('Error procesando registro:', error, item);
            }
        });
        
        if (!content) {
            content = '<tr><td colspan="33" class="text-center">No data available</td></tr>';
        }
        
        // Insertar el contenido en la tabla
        tableBody_total.innerHTML = content;
        console.log("Contenido HTML generado para la tabla de histórico total");
        
        // Inicializar o reinicializar la DataTable total DESPUÉS de agregar contenido
        setTimeout(() => {
            initDataTables('total');
        }, 100);
        
    } catch (ex) {
        console.error("Error en generarHistoricoTotal:", ex);
        
        // Mostrar un mensaje de error en la tabla
        const tableBody_total = document.getElementById('tableBody_historico_total');
        if (tableBody_total) {
            tableBody_total.innerHTML = '<tr><td colspan="33" class="text-center text-danger">Error loading data</td></tr>';
        }
    }
};

/**
 * Función para inicializar la DataTable para usuarios
 */
function initializeDataTable() {
    // If already initialized, don't initialize again
    if (dataTableInitialized) {
        console.log('DataTable already initialized');
        return;
    }
    
    // Check if DataTable already exists and destroy it first
    if ($.fn.DataTable.isDataTable('#users-table')) {
        $('#users-table').DataTable().destroy();
    }
    
    // Now initialize the DataTable
    const usersTable = $('#users-table').DataTable({
        ajax: {
            url: URLPF + 'dao/users/daoUserAdmin.php',
            dataSrc: 'data',
            // rest of your configuration
        },
        // rest of your DataTable options
    });

    dataTableInitialized = true;
    
    // Rest of your initialization code
}

/**
 * Event listeners y preparación inicial
 */
document.addEventListener('DOMContentLoaded', async function() {
    // Agregar botones al DOM
    const buttonsContainer = document.getElementById('mainOrders');
    if (buttonsContainer) {
        const buttonHTML = `
            <div class="buttons-container">
                <button id="btnHistoricoSemanal" class="btn btn-primary">View Weekly History</button>
                <button id="btnHistoricoTotal" class="btn btn-success">View Total History</button>
                <input type="text" id="searchInput" placeholder="Search by ID or description...">
            </div>
        `;
        buttonsContainer.insertAdjacentHTML('beforeend', buttonHTML);
    }
    
    // Crear modales en el DOM
    const modalsHTML = `
        <!-- Weekly History Modal -->
        <div id="modalHistoricoSemanal" class="modal fade" aria-labelledby="tituloModalHistoricoSemanal" aria-modal="true" role="dialog">
            <div id="modaldiv" class="modal-dialog modal-xl"> 
                <div id="modalContent" class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="tituloModalHistoricoSemanal">Premium Freight Weekly History</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table id="datatable_historico_semanal" class="table table-striped table-bordered" style="width:100%">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Division</th>
                                        <th>Plant Code</th>
                                        <th>Plant Name</th>
                                        <th>Issue Date</th>
                                        <th>Inbound/Outbound</th>
                                        <th>Issue CW</th>
                                        <th>Issue Month</th>
                                        <th>Reference Number</th>
                                        <th>Creator</th>
                                        <th>Area</th>
                                        <th>Description</th>
                                        <th>Category Cause</th>
                                        <th>Cost [€]</th>
                                        <th>Transport</th>
                                        <th>Int/Ext</th>
                                        <th>Carrier</th>
                                        <th>Origin Company</th>
                                        <th>Origin City</th>
                                        <th>Destination Company</th>
                                        <th>Destination City</th>
                                        <th>Weight [kg]</th>
                                        <th>Project Status</th>
                                        <th>Approver</th>
                                        <th>Recovery</th>
                                        <th>Paid By</th>
                                        <th>Products</th>
                                        <th>Status</th>
                                        <th>Required Auth Level</th>
                                        <th>Recovery File</th>
                                        <th>Recovery Evidence</th>
                                        <th>Created At</th>
                                        <th>Updated At</th>
                                    </tr>
                                </thead>
                                <tbody id="tableBody_historico_semanal">
                                    <!-- Data will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Total History Modal -->
        <div id="modalHistoricoTotal" class="modal fade" aria-labelledby="tituloModalHistoricoTotal" aria-modal="true" role="dialog">
            <div id="modaldiv" class="modal-dialog modal-xl">
                <div id="modalContent" class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="tituloModalHistoricoTotal">Premium Freight Total History</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table id="datatable_historico_total" class="table table-striped table-bordered" style="width:100%">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Division</th>
                                        <th>Plant Code</th>
                                        <th>Plant Name</th>
                                        <th>Issue Date</th>
                                        <th>Inbound/Outbound</th>
                                        <th>Issue CW</th>
                                        <th>Issue Month</th>
                                        <th>Reference Number</th>
                                        <th>Creator</th>
                                        <th>Area</th>
                                        <th>Description</th>
                                        <th>Category Cause</th>
                                        <th>Cost [€]</th>
                                        <th>Transport</th>
                                        <th>Int/Ext</th>
                                        <th>Carrier</th>
                                        <th>Origin Company</th>
                                        <th>Origin City</th>
                                        <th>Destination Company</th>
                                        <th>Destination City</th>
                                        <th>Weight [kg]</th>
                                        <th>Project Status</th>
                                        <th>Approver</th>
                                        <th>Recovery</th>
                                        <th>Paid By</th>
                                        <th>Products</th>
                                        <th>Status</th>
                                        <th>Required Auth Level</th>
                                        <th>Recovery File</th>
                                        <th>Recovery Evidence</th>
                                        <th>Created At</th>
                                        <th>Updated At</th>
                                    </tr>
                                </thead>
                                <tbody id="tableBody_historico_total">
                                    <!-- Data will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalsHTML);
    
    // Añadir event listeners a los botones
    let lastFocusedElement;

    document.getElementById('btnHistoricoSemanal').addEventListener('click', async function() {
        // Guardar elemento con foco antes de abrir el modal
        lastFocusedElement = document.activeElement;
        
        // Mostrar el modal primero para que esté en el DOM
        const modalElement = document.getElementById('modalHistoricoSemanal');
        const modalHistoricoSemanal = new bootstrap.Modal(modalElement);
        modalHistoricoSemanal.show();
        
        // Luego cargar los datos (esto asegura que la tabla exista en el DOM)
        await generarHistoricoSemanal(0);
        
        // Manejar eventos de accesibilidad
        modalElement.addEventListener('hidden.bs.modal', function () {
            // Restaurar el foco al elemento anterior cuando se cierra el modal
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }, { once: true });
        
        // Establecer el foco en el primer elemento interactivo del modal
        setTimeout(() => {
            const firstFocusableElement = modalElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusableElement) {
                firstFocusableElement.focus();
            }
        }, 300);
    });

    document.getElementById('btnHistoricoTotal').addEventListener('click', async function() {
        // Guardar elemento con foco antes de abrir el modal
        lastFocusedElement = document.activeElement;
        
        // Mostrar el modal primero para que esté en el DOM
        const modalElement = document.getElementById('modalHistoricoTotal');
        const modalHistoricoTotal = new bootstrap.Modal(modalElement);
        modalHistoricoTotal.show();
        
        // Luego cargar los datos (esto asegura que la tabla exista en el DOM)
        await generarHistoricoTotal();
        
        // Manejar eventos de accesibilidad
        modalElement.addEventListener('hidden.bs.modal', function () {
            // Restaurar el foco al elemento anterior cuando se cierra el modal
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }, { once: true });
        
        // Establecer el foco en el primer elemento interactivo del modal
        setTimeout(() => {
            const firstFocusableElement = modalElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusableElement) {
                firstFocusableElement.focus();
            }
        }, 300);
    });
});

/**
 * Verificación de disponibilidad de la variable URLPF
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URLPF === 'undefined') {
    console.warn('URLPF global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    // Fallback a URL hardcodeada solo como último recurso
    window.URLPF = window.URLPF || 'https://grammermx.com/Jesus/PruebaDos/';
}