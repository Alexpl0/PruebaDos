// Espera a que el contenido del DOM esté completamente cargado antes de ejecutar el script.
import { 
    svgMap, 
    formatDate, 
    loadAndPopulateSVG, 
    generatePDF 
} from './svgOrders.js';

document.addEventListener('DOMContentLoaded', function () {
    // --- Calcular número de semana ISO 8601 ---
    function getWeekNumber(dateString) {
        if (!dateString) return 'N/A'; 
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) { 
                return 'N/A';
            }
            const dayNum = date.getDay() || 7;
            date.setDate(date.getDate() + 4 - dayNum);
            const yearStart = new Date(date.getFullYear(), 0, 1);
            const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
            return weekNum;
        } catch (e) {
            console.error("Error al calcular el número de semana para:", dateString, e);
            return 'N/A';
        }
    }

    // --- Cargar datos iniciales ---
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php')
        .then(response => response.json())
        .then(data => {
            if (data && data.data) {
                createCards(data.data);
                
                // Agregar event listeners para los botones de filtrado
                setupFilterButtons(data.data);
            } else {
                console.error('Error: No se recibieron datos de la API o el formato es incorrecto.');
            }
        })
        .catch(error => console.error('Error al cargar los datos:', error));
    
    // --- Configurar botones de filtrado ---
    function setupFilterButtons(allOrders) {
        // Botón para ver todas las órdenes
        const btnTodas = document.getElementById('btnTodas');
        if (btnTodas) {
            btnTodas.addEventListener('click', function() {
                createCards(allOrders);
            });
        }
        
        // Botón para filtrar por órdenes de la semana actual
        const btnHistoricoSemanal = document.getElementById('btnHistoricoSemanal');
        if (btnHistoricoSemanal) {
            btnHistoricoSemanal.addEventListener('click', function() {
                // Obtener el número de semana actual
                const currentDate = new Date();
                const currentWeek = getWeekNumber(currentDate);
                
                // Filtrar órdenes de la semana actual
                const weeklyOrders = allOrders.filter(order => 
                    getWeekNumber(order.date) === currentWeek
                );
                
                if (weeklyOrders.length > 0) {
                    createCards(weeklyOrders);
                } else {
                    const mainCards = document.getElementById("card");
                    if (mainCards) {
                        mainCards.innerHTML = `
                            <div class="alert alert-info w-100 text-center" role="alert">
                                No hay órdenes para la semana actual (CW: ${currentWeek})
                            </div>
                        `;
                    }
                }
            });
        }
    }

    // --- Crear tarjetas visuales para cada orden ---
    function createCards(orders) {
        const mainCards = document.getElementById("card");
        if (!mainCards) {
            console.error("Elemento con ID 'card' no encontrado.");
            return;
        }
        mainCards.innerHTML = ""; 
        
        orders.forEach(order => {
            const semana = getWeekNumber(order.date);
            const card = document.createElement("div");
            card.className = "card shadow rounded mx-2 mb-4";
            card.style.maxWidth = "265px";
            card.style.minHeight = "250px";
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.justifyContent = "space-between";

            // --- Colores basados en el estado ---
            const statusName = (order.status_name || '').toLowerCase();
            if (statusName === "aprobado") card.style.backgroundColor = "#A7CAC3";
            else if (statusName === "nuevo") card.style.backgroundColor = "#EAE8EB";
            else if (statusName === "revision") card.style.backgroundColor = "#F3D1AB";
            else if (statusName === "rechazado") card.style.backgroundColor = "#E0A4AE";
            else card.style.backgroundColor = "#FFFFFF";

            // --- Mensaje de estado de aprobación pendiente ---
            let falta = '';
            const approvalStatus = order.approval_status;
            const requiredAuthLevel = order.required_auth_level || 7;

            if (approvalStatus === null || approvalStatus >= requiredAuthLevel) { 
                 falta = 'Completamente Aprobado';
                 if (statusName === "rechazado") { 
                    falta = 'Orden Rechazada';
                 }
            } else if (approvalStatus === 99) {
                 falta = 'Orden Rechazada';
            } else {
                switch (Number(approvalStatus)) {
                    case 0: falta = 'Pendiente: Gerente Logística'; break;
                    case 1: falta = 'Pendiente: Controlling'; break;
                    case 2: falta = 'Pendiente: Gerente Planta'; break;
                    case 3: falta = 'Pendiente: Gerente Senior Logística'; break;
                    case 4: falta = 'Pendiente: Gerente Senior División Logística'; break;
                    case 5: falta = 'Pendiente: SR VP Regional'; break;
                    case 6: falta = 'Pendiente: Controlling División Regional'; break;
                    default: falta = `Pendiente: Nivel ${approvalStatus + 1}`;
                }
            }

            // --- Estructura HTML de la tarjeta ---
            card.innerHTML = `
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">ID: ${order.id || 'N/A'}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">CW: ${semana}</h6>
                    <p class="card-text flex-grow-1" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                        ${order.description || 'Sin descripción'} 
                    </p>
                    <p class="card-p fw-bold">${falta}</p>
                </div>
                <div class="card-footer bg-transparent border-0 text-center pb-3">
                     <button class="btn btn-primary btn-sm ver-btn" data-order-id="${order.id}">
                         <i class="fas fa-eye"></i> Ver
                     </button>
                </div>
            `;
            mainCards.appendChild(card);
        });

        // Almacena todas las órdenes en una variable global
        window.allOrders = orders; 

        // --- Event listeners para los botones "Ver" ---
        document.querySelectorAll('.ver-btn').forEach(btn => {
            btn.addEventListener('click', async function () {
                const orderId = this.getAttribute('data-order-id');
                sessionStorage.setItem('selectedOrderId', orderId); 

                Swal.fire({
                    title: 'Cargando',
                    html: 'Por favor espera mientras se carga el documento...',
                    timer: 1000,
                    timerProgressBar: true,
                    didOpen: () => { Swal.showLoading(); },
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    customClass: { container: 'swal-on-top' }
                });

                document.getElementById('myModal').style.display = 'flex'; 
                const selectedOrder = window.allOrders.find(order => order.id === parseInt(orderId)) || {};

                // --- Configurar botones Aprobar/Rechazar según nivel de usuario y estado de la orden ---
                const approveBtn = document.getElementById('approveBtn');
                const rejectBtn = document.getElementById('rejectBtn');

                const isNextApprover = Number(selectedOrder.approval_status) === (Number(window.authorizationLevel) - 1);
                const isRejected = Number(selectedOrder.approval_status) === 99;
                const isFullyApproved = selectedOrder.approval_status === null || 
                                       Number(selectedOrder.approval_status) >= (selectedOrder.required_auth_level || 7);

                if (isNextApprover && !isRejected && !isFullyApproved) {
                    approveBtn.style.display = "block";
                    approveBtn.disabled = false;
                    rejectBtn.style.display = "block";
                    rejectBtn.disabled = false;
                } else {
                    approveBtn.style.display = "none";
                    rejectBtn.style.display = "none";
                }

                console.log('ID de Orden:', orderId);
                console.log('Estado de Orden Seleccionada:', selectedOrder.approval_status);
                console.log('Nivel de Autorización del Usuario:', window.authorizationLevel);
                console.log('Nivel de Autorización Requerido:', selectedOrder.required_auth_level);

                // --- Cargar y poblar SVG ---
                try {
                    await loadAndPopulateSVG(selectedOrder, 'svgPreview');
                } catch (error) {
                    console.error('Error al cargar o procesar el SVG:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo cargar la previsualización del documento.',
                        customClass: { container: 'swal-on-top' }
                    });
                    document.getElementById('myModal').style.display = 'none'; 
                }
            });
        });
    }

    // --- Funcionalidad de búsqueda ---
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            
            // Si no hay término de búsqueda, mostrar todas las órdenes
            if (!searchTerm) {
                createCards(window.allOrders);
                return;
            }
            
            // Filtrar las órdenes que coincidan con el término de búsqueda
            const filteredOrders = window.allOrders.filter(order => {
                const idMatch = order.id.toString().includes(searchTerm);
                const descMatch = (order.description || '').toLowerCase().includes(searchTerm);
                return idMatch || descMatch;
            });
            
            // Mostrar resultados filtrados o mensaje si no hay coincidencias
            if (filteredOrders.length > 0) {
                createCards(filteredOrders);
            } else {
                const mainCards = document.getElementById("card");
                if (mainCards) {
                    mainCards.innerHTML = `
                        <div class="alert alert-info w-100 text-center" role="alert">
                            No se encontraron órdenes que coincidan con "${searchTerm}"
                        </div>
                    `;
                }
            }
        });
        
        // Botón para limpiar la búsqueda
        const clearButton = document.getElementById('clearSearch');
        if (clearButton) {
            clearButton.addEventListener('click', function() {
                searchInput.value = '';
                createCards(window.allOrders);
                searchInput.focus();
            });
        }
    }

    // --- Cerrar modal ---
    document.getElementById('closeModal').onclick = function () {
        document.getElementById('myModal').style.display = 'none';
    };

    // Cierra el modal si se hace clic fuera de él
    window.onclick = function (event) {
        const modal = document.getElementById('myModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // --- Guardar como PDF ---
    document.getElementById('savePdfBtn').onclick = async function () {
        try {
            Swal.fire({
                title: 'Generando PDF',
                html: 'Por favor espera mientras se procesa el documento...',
                timerProgressBar: true,
                didOpen: () => { Swal.showLoading(); },
                allowOutsideClick: false,
                allowEscapeKey: false,
                allowEnterKey: false,
                customClass: { container: 'swal-on-top' }
            });

            const selectedOrderId = sessionStorage.getItem('selectedOrderId');
            const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
            
            const fileName = await generatePDF(selectedOrder);

            Swal.fire({
                icon: 'success',
                title: '¡PDF Generado Exitosamente!',
                html: `El archivo <b>${fileName}</b> se ha descargado correctamente.`,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            document.getElementById('myModal').style.display = 'none'; 

        } catch (error) {
            console.error('Error al generar el PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al Generar PDF',
                text: error.message || 'Ocurrió un error inesperado.',
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            const tempContainer = document.querySelector('div[style*="left: -9999px"]');
            if (tempContainer) {
                document.body.removeChild(tempContainer);
            }
        }
    };

    // --- Aprobar orden ---
    document.getElementById('approveBtn').onclick = async function () {
        const selectedOrderId = sessionStorage.getItem('selectedOrderId');
        const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
        try {
            Swal.fire({
                title: 'Procesando...',
                text: 'Actualizando estado de la orden',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                customClass: { container: 'swal-on-top' }
            });

            const currentStatus = Number(selectedOrder.approval_status);
            const newStatusId = currentStatus + 1;

            const updateData = {
                orderId: selectedOrder.id,
                newStatusId: newStatusId,
                userLevel: window.authorizationLevel,
                userID: window.userID,
                authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
            };

            let updatedStatusTextId = 2;
            const requiredLevel = Number(selectedOrder.required_auth_level || 7);
            if (newStatusId >= requiredLevel) {
                updatedStatusTextId = 3;
            }

            const updateStatusText = {
                orderId: selectedOrder.id,
                statusid: updatedStatusTextId
            };

            // --- Llamadas a la API ---
            const responseApproval = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const resultApproval = await responseApproval.json();
            if (!resultApproval.success) {
                throw new Error(resultApproval.message || 'Error al actualizar el nivel de aprobación.');
            }

            const responseStatusText = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusText.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatusText)
            });
            const resultStatusText = await responseStatusText.json();
            if (!resultStatusText.success) {
                console.error('Error al actualizar el texto del estado:', resultStatusText.message);
            }

            // --- Manejo de Éxito ---
            selectedOrder.approval_status = newStatusId;
            selectedOrder.status_id = updatedStatusTextId;
            
            if (updatedStatusTextId === 3) selectedOrder.status_name = 'aprobado';
            else if (updatedStatusTextId === 2) selectedOrder.status_name = 'revision';

            Swal.fire({
                icon: 'success',
                title: 'Orden Aprobada',
                text: `La orden ${selectedOrder.id} ha sido aprobada para el siguiente nivel.`,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            document.getElementById('myModal').style.display = 'none'; 

            createCards(window.allOrders);

        } catch (error) {
            console.error('Error al aprobar la orden:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo actualizar la orden: ' + error.message,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
        }
    };

    // --- Rechazar orden ---
    document.getElementById('rejectBtn').onclick = async function () {
        const selectedOrderId = sessionStorage.getItem('selectedOrderId');
        const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
        try {
            const confirmation = await Swal.fire({
                title: '¿Estás seguro?',
                text: `¿Realmente quieres rechazar la orden ${selectedOrderId}? Esta acción no se puede deshacer.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, rechazarla',
                cancelButtonText: 'Cancelar',
                customClass: { container: 'swal-on-top' }
            });

            if (!confirmation.isConfirmed) {
                return; 
            }

            Swal.fire({
                title: 'Procesando...',
                text: 'Rechazando la orden',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                customClass: { container: 'swal-on-top' }
            });

            const newStatusId = 99; 
            const updateData = {
                orderId: selectedOrder.id,
                newStatusId: newStatusId,
                userLevel: window.authorizationLevel,
                userID: window.userID,
                authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
            };

            const updatedStatusTextId = 4; 
            const updateStatusText = {
                orderId: selectedOrder.id,
                statusid: updatedStatusTextId
            };

            // --- Llamadas a la API ---
            const responseApproval = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const resultApproval = await responseApproval.json();
            if (!resultApproval.success) {
                throw new Error(resultApproval.message || 'Error al actualizar el nivel de aprobación a rechazado.');
            }

            const responseStatusText = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusText.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatusText)
            });
            const resultStatusText = await responseStatusText.json();
            if (!resultStatusText.success) {
                console.error('Error al actualizar el texto del estado a rechazado:', resultStatusText.message);
            }

            // --- Manejo de Éxito ---
            selectedOrder.approval_status = newStatusId;
            selectedOrder.status_id = updatedStatusTextId;
            selectedOrder.status_name = 'rechazado';

            Swal.fire({
                icon: 'error',
                title: 'Orden Rechazada',
                text: `La orden ${selectedOrderId} ha sido rechazada exitosamente.`,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            document.getElementById('myModal').style.display = 'none'; 

            createCards(window.allOrders);

        } catch (error) {
            console.error('Error al rechazar la orden:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo rechazar la orden: ' + error.message,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
        }
    };
}); // Fin del event listener DOMContentLoaded

