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
        'copy', 'csv', 'excel', 'pdf', 'print'
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
        const premiumFreightData = await cargarDatosPremiumFreight();
        
        // Obtener referencia al elemento de la tabla
        const tableBody_semanal = document.getElementById('tableBody_historico_semanal');
        if (!tableBody_semanal) {
            console.error('No se encontró el elemento tableBody_historico_semanal');
            return;
        }

        // Obtener semana actual
        const currentDate = new Date();
        const currentWeek = getWeekNumber(currentDate);
        const currentYear = currentDate.getFullYear();
        
        // Filtrar datos para la semana actual
        const datosSemanaActual = Array.isArray(premiumFreightData) 
            ? premiumFreightData.filter(item => {
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
              })
            : (premiumFreightData && [premiumFreightData] || []).filter(item => {
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
        datosSemanaActual.forEach(item => {
            try {
                // Usar nuestra función parseDate en lugar de new Date directamente
                const issueDate = item.date ? parseDate(item.date) : null;
                
                // Verificar si la fecha es válida
                if (!issueDate) {
                    // Usar valores por defecto para fechas inválidas
                    content += `
                        <tr>
                            <td>${item.id || '-'}</td>
                            <td>Grammer AG</td>
                            <td>${item.code_planta || '-'}</td>
                            <td>${item.planta || '-'}</td>
                            <td>${item.date || 'Fecha inválida'}</td>
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
                        <td>${item.date || '-'}</td>
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
        
        tableBody_semanal.innerHTML = content;
    } catch (ex) {
        console.error("Error en generarHistoricoSemanal:", ex);
    }
};

// Función para generar tabla histórico total
const generarHistoricoTotal = async () => {
    try {
        const premiumFreightData = await cargarDatosPremiumFreight();
        
        // Obtener referencia al elemento de la tabla
        const tableBody_total = document.getElementById('tableBody_historico_total');
        if (!tableBody_total) {
            console.error('No se encontró el elemento tableBody_historico_total');
            return;
        }

        // Garantizar que premiumFreightData sea un array
        const datosTotal = Array.isArray(premiumFreightData) ? premiumFreightData : (premiumFreightData ? [premiumFreightData] : []);
        
        let content = ``;
        datosTotal.forEach(item => {
            try {
                // Usar nuestra función parseDate en lugar de new Date directamente
                const issueDate = item.date ? parseDate(item.date) : null;
                
                // Verificar si la fecha es válida
                if (!issueDate) {
                    // Usar valores por defecto para fechas inválidas
                    content += `
                        <tr>
                            <td>${item.id || '-'}</td>
                            <td>Grammer AG</td>
                            <td>${item.code_planta || '-'}</td>
                            <td>${item.planta || '-'}</td>
                            <td>${item.date || 'Fecha inválida'}</td>
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
                        <td>${item.date || '-'}</td>
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
        
        tableBody_total.innerHTML = content;
    } catch (ex) {
        console.error("Error en generarHistoricoTotal:", ex);
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
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
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
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
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