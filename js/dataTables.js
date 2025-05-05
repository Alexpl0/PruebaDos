let dataTableHistoricoSemanal; // Instancia DataTable para histórico semanal
let dataTableHistoricoTotal; // Instancia DataTable para histórico total

let dataTableSemanalInitialized = false;
let dataTableTotalInitialized = false;

// Opciones comunes para ambas DataTables
const dataTableOptions = {
    lengthMenu: [10, 25, 50, 100, 200, 500],
    columnDefs: [
        { className: "centered", targets: "_all" } // Todas las columnas centradas
    ],
    pageLength: 10,
    destroy: true,
    language: {
        lengthMenu: "Mostrar _MENU_ registros por página",
        zeroRecords: "No se encontraron registros",
        info: "Mostrando de _START_ a _END_ de un total de _TOTAL_ registros",
        infoEmpty: "No hay registros disponibles",
        infoFiltered: "(filtrados desde _MAX_ registros totales)",
        search: "Buscar:",
        loadingRecords: "Cargando...",
        paginate: {
            first: "Primero",
            last: "Último",
            next: "Siguiente",
            previous: "Anterior"
        }
    },
    dom: 'Bfrtip',
    buttons: [
        {
            extend: 'excel',
            text: 'Excel',
            className: 'btn-success',
            title: 'Premium_Freight_Report',
            filename: 'Premium_Freight_Report',
            exportOptions: {
                columns: ':visible'
            }
        },
        {
            extend: 'pdf',
            text: 'PDF',
            className: 'btn-danger',
            orientation: 'portrait',
            pageSize: 'LETTER',
            title: 'Premium Freight Report',
            filename: 'Premium_Freight_Report',
            customize: function(doc) {
                // Personaliza el PDF para ajustar al tamaño carta
                doc.defaultStyle.fontSize = 8; // Reduce tamaño de fuente
                doc.styles.tableHeader.fontSize = 9;
                doc.styles.tableHeader.fillColor = '#A7CAC3';
                
                // Ajusta los márgenes para aprovechar más espacio
                doc.pageMargins = [10, 15, 10, 15]; // [izquierda, arriba, derecha, abajo]
                
                // Ajusta el ancho de la tabla al 100% del espacio disponible
                doc.content[1].table.widths = Array(doc.content[1].table.body[0].length).fill('*');
                
                // Añade logo GRAMMER en la esquina superior
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
                
                // Añade pie de página con fecha y número de página
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
            text: 'SVG Individual',
            className: 'btn-info',
            action: async function(e, dt, node, config) {
                try {
                    // Muestra una alerta de carga
                    Swal.fire({
                        title: 'Preparando documentos',
                        html: 'Generando SVGs para cada registro. Esto puede tomar un momento...',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });
                    
                    // Obtiene los registros visibles (después de filtrados)
                    const exportData = dt.rows({search: 'applied'}).data().toArray();
                    if (exportData.length === 0) {
                        Swal.fire({
                            icon: 'info',
                            title: 'Sin datos',
                            text: 'No hay registros para exportar'
                        });
                        return;
                    }
                    
                    // Si hay muchos registros, pide confirmación
                    if (exportData.length > 10) {
                        const confirm = await Swal.fire({
                            icon: 'warning',
                            title: 'Muchos registros',
                            html: `Está a punto de generar ${exportData.length} documentos SVG/PDF. ¿Desea continuar?`,
                            showCancelButton: true,
                            confirmButtonText: 'Sí, generar todos',
                            cancelButtonText: 'Cancelar',
                        });
                        
                        if (!confirm.isConfirmed) return;
                    }
                    
                    // Importa las funciones necesarias del módulo svgOrders
                    const { loadAndPopulateSVG, generatePDF } = await import('./svgOrders.js');
                    
                    // Prepara los IDs para hacer fetch desde la API
                    const ids = exportData.map(row => row[0]);
                    
                    // Obtiene los datos completos de cada orden
                    const ordersResponse = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php');
                    const ordersData = await ordersResponse.json();
                    
                    // Extrae las órdenes del formato { status: 'success', data: [...] }
                    const allOrders = ordersData.data || [];
                    
                    // Filtra para obtener solo las órdenes visibles en la tabla
                    const visibleOrders = allOrders.filter(order => ids.includes(String(order.id)));
                    
                    // Crea un contenedor oculto para los SVGs
                    const container = document.createElement('div');
                    container.style.position = 'absolute';
                    container.style.left = '-9999px';
                    document.body.appendChild(container);
                    
                    // Para cada orden, genera un SVG y un PDF
                    for (let i = 0; i < visibleOrders.length; i++) {
                        const order = visibleOrders[i];
                        const orderId = order.id;
                        
                        // Actualiza el mensaje de progreso
                        Swal.update({
                            html: `Procesando documento ${i+1} de ${visibleOrders.length}...`
                        });
                        
                        try {
                            // Genera el PDF con el nombre requerido
                            await generatePDF(order, `PF_${orderId}`);
                        } catch (error) {
                            console.error(`Error generando PDF para orden ${orderId}:`, error);
                        }
                        
                        // Pequeña pausa para no sobrecargar el navegador
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    
                    // Elimina el contenedor temporal
                    document.body.removeChild(container);
                    
                    // Muestra mensaje de éxito
                    Swal.fire({
                        icon: 'success',
                        title: 'Documentos generados',
                        html: `Se han generado ${visibleOrders.length} documentos PDF.<br>Revise su carpeta de descargas.`
                    });
                    
                } catch (error) {
                    console.error('Error generando documentos:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Ocurrió un error al generar los documentos: ' + error.message
                    });
                }
            }
        }
    ]
};

// Función para cargar los datos de Premium Freight
const cargarDatosPremiumFreight = async () => {
    try {
        const response = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error al cargar datos de Premium Freight:", error);
        return [];
    }
};

// Función para convertir cadena de texto de fecha a objeto Date
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

// Función para obtener el número de semana de una fecha
const getWeekNumber = (date) => {
    try {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return '-';
        }
        
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNumber;
    } catch (error) {
        console.error('Error en getWeekNumber:', error);
        return '-';
    }
};

// Función para obtener el mes de una fecha
const getMonthName = (date) => {
    try {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return '-';
        }
        
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return months[date.getMonth()];
    } catch (error) {
        console.error('Error en getMonthName:', error);
        return '-';
    }
};

// Función para generar tabla histórico semanal
const generarHistoricoSemanal = async () => {
    try {
        const response = await cargarDatosPremiumFreight();
        
        // Obtener referencia al elemento de la tabla
        const tableBody_semanal = document.getElementById('tableBody_historico_semanal');
        if (!tableBody_semanal) {
            console.error('No se encontró el elemento tableBody_historico_semanal');
            return;
        }

        // Extraer el array de datos de la respuesta
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

        // Obtener semana actual
        const currentDate = new Date();
        const currentWeek = getWeekNumber(currentDate);
        const currentYear = currentDate.getFullYear();
        
        // Filtrar datos para la semana actual
        const datosSemanaActual = itemsArray.filter(item => {
            if (!item || !item.date) return false;
            
            try {
                // Usar nuestra función parseDate en lugar de new Date directamente
                const itemDate = parseDate(item.date);
                if (!itemDate) return false;
                
                const itemWeek = getWeekNumber(itemDate);
                const itemYear = itemDate.getFullYear();
                
                return itemWeek === currentWeek && itemYear === currentYear;
            } catch (error) {
                console.error('Error procesando fecha:', error);
                return false;
            }
        });
        
        let content = ``;
        
        if (datosSemanaActual.length === 0) {
            content = '<tr><td colspan="25" class="text-center">No hay datos para la semana actual</td></tr>';
        } else {
            datosSemanaActual.forEach(item => {
                try {
                    // Aquí podemos acceder al campo date de cada item
                    const dateValue = item.date;
                    
                    // Usar nuestra función parseDate en lugar de new Date directamente
                    const issueDate = dateValue ? parseDate(dateValue) : null;
                    
                    // Verificar si la fecha es válida
                    if (!issueDate) {
                        // Usar valores por defecto para fechas inválidas
                        content += `
                            <tr>
                                <td>${item.id || '-'}</td>
                                <td>Grammer AG</td>
                                <td>${item.code_planta || '-'}</td>
                                <td>${item.planta || '-'}</td>
                                <td>${dateValue || 'Fecha inválida'}</td>
                                <td>${item.in_out_bound || '-'}</td>
                                <td>-</td>
                                <td>-</td>
                                <td>${item.reference_number || '-'}</td>
                                <td>${item.creator_name || '-'}</td>
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
                                <td>${item.approver_name || 'Pendiente'}</td>
                                <td>${item.recovery || 'N/A'}</td>
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
                            <td>${item.creator_name || '-'}</td>
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
                            <td>${item.approver_name || 'Pendiente'}</td>
                            <td>${item.recovery || 'N/A'}</td>
                        </tr>`;
                } catch (error) {
                    console.error('Error procesando registro:', error, item);
                }
            });
        }
        
        tableBody_semanal.innerHTML = content;
    } catch (ex) {
        console.error("Error en generarHistoricoSemanal:", ex);
        
        // Mostrar un mensaje de error en la tabla
        const tableBody_semanal = document.getElementById('tableBody_historico_semanal');
        if (tableBody_semanal) {
            tableBody_semanal.innerHTML = '<tr><td colspan="25" class="text-center text-danger">Error al cargar los datos</td></tr>';
        }
    }
};

// Función para generar tabla histórico total
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
            console.log(`Se encontraron ${itemsArray.length} registros en response.data`);
        } else if (Array.isArray(response)) {
            // Caso alternativo: la respuesta es directamente un array
            itemsArray = response;
            console.log(`Se encontraron ${itemsArray.length} registros en response (array directo)`);
        } else {
            // Si no podemos encontrar un array, mostrar un error
            console.error('Formato de respuesta inesperado:', response);
            tableBody_total.innerHTML = '<tr><td colspan="25" class="text-center">No hay datos disponibles o formato inválido</td></tr>';
            return;
        }
        
        let content = ``;
        
        // Ahora itemsArray es siempre un array que podemos recorrer con forEach
        itemsArray.forEach(item => {
            try {
                // Aquí podemos acceder al campo date de cada item
                const dateValue = item.date;
                console.log("Fecha del registro:", dateValue);
                
                // Usar nuestra función parseDate en lugar de new Date directamente
                const issueDate = dateValue ? parseDate(dateValue) : null;
                
                // Verificar si la fecha es válida
                if (!issueDate) {
                    // Usar valores por defecto para fechas inválidas
                    content += `
                        <tr>
                            <td>${item.id || '-'}</td>
                            <td>Grammer AG</td>
                            <td>${item.code_planta || '-'}</td>
                            <td>${item.planta || '-'}</td>
                            <td>${dateValue || 'Fecha inválida'}</td>
                            <td>${item.in_out_bound || '-'}</td>
                            <td>-</td>
                            <td>-</td>
                            <td>${item.reference_number || '-'}</td>
                            <td>${item.creator_name || '-'}</td>
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
                            <td>${item.approver_name || 'Pendiente'}</td>
                            <td>${item.recovery || 'N/A'}</td>
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
                        <td>${item.creator_name || '-'}</td>
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
                        <td>${item.approver_name || 'Pendiente'}</td>
                        <td>${item.recovery || 'N/A'}</td>
                    </tr>`;
            } catch (error) {
                console.error('Error procesando registro:', error, item);
            }
        });
        
        // Si no hay contenido, mostrar un mensaje
        if (!content) {
            content = '<tr><td colspan="25" class="text-center">No hay datos disponibles</td></tr>';
        }
        
        tableBody_total.innerHTML = content;
    } catch (ex) {
        console.error("Error en generarHistoricoTotal:", ex);
        
        // Mostrar un mensaje de error en la tabla
        const tableBody_total = document.getElementById('tableBody_historico_total');
        if (tableBody_total) {
            tableBody_total.innerHTML = '<tr><td colspan="25" class="text-center text-danger">Error al cargar los datos</td></tr>';
        }
    }
};

// Inicializar las DataTables
const initDataTables = () => {
    try {
        // Destruir instancias anteriores si existen
        if (dataTableSemanalInitialized && dataTableHistoricoSemanal) {
            dataTableHistoricoSemanal.destroy();
        }
        if (dataTableTotalInitialized && dataTableHistoricoTotal) {
            dataTableHistoricoTotal.destroy();
        }
        
        // Inicializar DataTable para histórico semanal
        dataTableHistoricoSemanal = $("#datatable_historico_semanal").DataTable({
            ...dataTableOptions,
            scrollX: true,
            scrollCollapse: true
        });
        dataTableSemanalInitialized = true;
        
        // Inicializar DataTable para histórico total
        dataTableHistoricoTotal = $("#datatable_historico_total").DataTable({
            ...dataTableOptions,
            scrollX: true,
            scrollCollapse: true
        });
        dataTableTotalInitialized = true;
        
        console.log("DataTables inicializadas correctamente");
    } catch (error) {
        console.error("Error al inicializar DataTables:", error);
    }
};

// Event listeners para los botones de mostrar modal
document.addEventListener('DOMContentLoaded', async function() {
    // Agregar botones al DOM
    const buttonsContainer = document.getElementById('mainOrders');
    if (buttonsContainer) {
        const buttonHTML = `
            <div class="buttons-container">
                <button id="btnHistoricoSemanal" class="btn btn-primary">Ver Histórico Semanal</button>
                <button id="btnHistoricoTotal" class="btn btn-success">Ver Histórico Total</button>
            </div>
        `;
        buttonsContainer.insertAdjacentHTML('beforeend', buttonHTML);
    }
    
    // Crear modales en el DOM
    const modalsHTML = `
        <!-- Modal Histórico Semanal -->
        <div id="modalHistoricoSemanal" class="modal fade" aria-labelledby="tituloModalHistoricoSemanal" aria-modal="true" role="dialog">
            <div id="modaldiv" class="modal-dialog modal-xl"> 
                <div id="modalContent" class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="tituloModalHistoricoSemanal">Histórico Semanal de Premium Freight</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
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
                                        <th>Orden</th>
                                        <th>Issuer</th>
                                        <th>Area of Responsibility</th>
                                        <th>Description & Root Cause</th>
                                        <th>Root cause category</th>
                                        <th>Costs [€]</th>
                                        <th>Transport mode</th>
                                        <th>Internal/external</th>
                                        <th>Forwarder</th>
                                        <th>Shipper Name</th>
                                        <th>City shipped from</th>
                                        <th>Consignee Name</th>
                                        <th>City shipped to</th>
                                        <th>Chargable weight in kg</th>
                                        <th>Status of the effected project</th>
                                        <th>Special freight approved by</th>
                                        <th>Recovery from whom</th>
                                    </tr>
                                </thead>
                                <tbody id="tableBody_historico_semanal">
                                    <!-- Aquí se cargarán los datos -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Histórico Total -->
        <div id="modalHistoricoTotal" class="modal fade" aria-labelledby="tituloModalHistoricoTotal" aria-modal="true" role="dialog">
            <div id="modaldiv" class="modal-dialog modal-xl">
                <div id="modalContent" class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="tituloModalHistoricoTotal">Histórico Total de Premium Freight</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
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
                                        <th>Orden</th>
                                        <th>Issuer</th>
                                        <th>Area of Responsibility</th>
                                        <th>Description & Root Cause</th>
                                        <th>Root cause category</th>
                                        <th>Costs [€]</th>
                                        <th>Transport mode</th>
                                        <th>Internal/external</th>
                                        <th>Forwarder</th>
                                        <th>Shipper Name</th>
                                        <th>City shipped from</th>
                                        <th>Consignee Name</th>
                                        <th>City shipped to</th>
                                        <th>Chargable weight in kg</th>
                                        <th>Status of the effected project</th>
                                        <th>Special freight approved by</th>
                                        <th>Recovery from whom</th>
                                    </tr>
                                </thead>
                                <tbody id="tableBody_historico_total">
                                    <!-- Aquí se cargarán los datos -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
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
        
        await generarHistoricoSemanal();
        
        // Inicializar o actualizar DataTable
        if (!dataTableSemanalInitialized) {
            initDataTables();
        } else {
            dataTableHistoricoSemanal.destroy();
            dataTableHistoricoSemanal = $("#datatable_historico_semanal").DataTable({
                ...dataTableOptions,
                scrollX: true,
                scrollCollapse: true
            });
        }
        
        // Mostrar el modal
        const modalElement = document.getElementById('modalHistoricoSemanal');
        const modalHistoricoSemanal = new bootstrap.Modal(modalElement);
        
        // Manejar eventos de accesibilidad
        modalElement.addEventListener('hidden.bs.modal', function () {
            // Restaurar el foco al elemento anterior cuando se cierra el modal
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }, { once: true });
        
        modalHistoricoSemanal.show();
        
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
        
        await generarHistoricoTotal();
        
        // Inicializar o actualizar DataTable
        if (!dataTableTotalInitialized) {
            initDataTables();
        } else {
            dataTableHistoricoTotal.destroy();
            dataTableHistoricoTotal = $("#datatable_historico_total").DataTable({
                ...dataTableOptions,
                scrollX: true,
                scrollCollapse: true
            });
        }
        
        // Mostrar el modal
        const modalElement = document.getElementById('modalHistoricoTotal');
        const modalHistoricoTotal = new bootstrap.Modal(modalElement);
        
        // Manejar eventos de accesibilidad
        modalElement.addEventListener('hidden.bs.modal', function () {
            // Restaurar el foco al elemento anterior cuando se cierra el modal
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }, { once: true });
        
        modalHistoricoTotal.show();
        
        // Establecer el foco en el primer elemento interactivo del modal
        setTimeout(() => {
            const firstFocusableElement = modalElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusableElement) {
                firstFocusableElement.focus();
            }
        }, 300);
    });
});