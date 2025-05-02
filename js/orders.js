document.addEventListener('DOMContentLoaded', function () {
    // --- Mapeo de campos para el SVG ---
    const svgMap = {
        'AreaOfResponsabilityValue': 'area',
        'CarrierNameValue': 'carrier',
        'CityDestValue': 'destiny_city',
        'CityShipValue': 'origin_city',
        'CompanyNameDestValue': 'destiny_company_name',
        'CompanyNameShipValue': 'origin_company_name',
        'CostInEurosValue': 'cost_euros',
        'CostPaidByValue': 'paid_by',
        'DateValue': 'date',
        'DescriptionAndRootCauseValue': 'description',
        'InExtValue': 'int_ext',
        'InOutBoundValue': 'in_out_bound',
        'IssuerValue': 'creator_name',
        'PlantCValue': 'planta',
        'PlantCodeValue': 'code_planta',
        'PlantManagerValue': '', // Placeholder, adjust if needed
        'ProductValue': 'products',
        'ProjectStatusValue': 'project_status', // Placeholder, adjust if needed
        'QuotedCostValue': 'quoted_cost',
        'RecoveryValue': 'recovery',
        'ReferenceNumberValue': 'reference_number',
        'RequestingPlantValue': 'planta',
        'RootCauseValue': 'category_cause',
        'SDestValue': 'destiny_state', // Note: Duplicate key with StateDestValue, check SVG
        'ManagerOPSDivisionValue': '', // Placeholder, adjust if needed
        'SRVPRegionalValue': '', // Placeholder, adjust if needed
        'SeniorManagerValue': '', // Placeholder, adjust if needed
        'StateDestValue': 'destiny_state',
        'StateShipValue': 'origin_state',
        'TransportValue': 'transport',
        'WeightValue': 'weight',
        'ZIPDestValue': 'destiny_zip',
        'ZIPShipValue': 'origin_zip'
    };

    // --- Cargar datos iniciales ---
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php')
        .then(response => response.json())
        .then(data => {
            if (data && data.data) {
                createCards(data.data);
            } else {
                console.error('Error: No data received from API or data format is incorrect.');
                // Optionally display an error message to the user
            }
        })
        .catch(error => console.error('Error al cargar los datos:', error));

    // --- Calcular número de semana ISO 8601 ---
    function getWeekNumber(dateString) {
        if (!dateString) return 'N/A'; // Handle cases where date might be null or undefined
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) { // Check if date is valid
                return 'N/A';
            }
            const dayNum = date.getDay() || 7;
            date.setDate(date.getDate() + 4 - dayNum);
            const yearStart = new Date(date.getFullYear(), 0, 1);
            const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
            return weekNum;
        } catch (e) {
            console.error("Error calculating week number for:", dateString, e);
            return 'N/A';
        }
    }

    // --- Crear tarjetas visuales para cada orden ---
    function createCards(orders) {
        const mainCards = document.getElementById("card");
        if (!mainCards) {
            console.error("Element with ID 'card' not found.");
            return;
        }
        mainCards.innerHTML = ""; // Clear existing cards
        orders.forEach(order => {
            const semana = getWeekNumber(order.date);
            const card = document.createElement("div");
            card.className = "card shadow rounded mx-2 mb-4";
            card.style.maxWidth = "265px";
            card.style.minHeight = "250px"; // Use minHeight for consistency
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.justifyContent = "space-between";


            // Colores según estado
            const statusName = (order.status_name || '').toLowerCase();
            if (statusName === "aprobado") card.style.backgroundColor = "#A7CAC3";
            else if (statusName === "nuevo") card.style.backgroundColor = "#EAE8EB";
            else if (statusName === "revision") card.style.backgroundColor = "#F3D1AB";
            else if (statusName === "rechazado") card.style.backgroundColor = "#E0A4AE";
            else card.style.backgroundColor = "#FFFFFF"; // Default color

            // Mensaje de aprobación pendiente
            let falta = '';
            const approvalStatus = order.approval_status; // Can be null or a number

            if (approvalStatus === null || approvalStatus >= (order.required_auth_level || 7)) { // Assuming 7 is max level if required_auth_level is missing
                 falta = 'Totalmente Aprobado';
                 if (statusName === "rechazado") { // Override if rejected
                    falta = 'Orden Rechazada';
                 }
            } else if (approvalStatus === 99) {
                 falta = 'Orden Rechazada';
            } else {
                // Determine next required approver based on current status
                switch (Number(approvalStatus)) {
                    case 0: falta = 'Falta: Logistic Manager'; break;
                    case 1: falta = 'Falta: Controlling'; break;
                    case 2: falta = 'Falta: Plant Manager'; break;
                    case 3: falta = 'Falta: Senior Manager Logistic'; break;
                    case 4: falta = 'Falta: Senior Manager Logistics Division'; break;
                    case 5: falta = 'Falta: SR VP Regional'; break;
                    case 6: falta = 'Falta: Division Controlling Regional'; break;
                    default: falta = `Falta: Nivel ${approvalStatus + 1}`; // Generic message
                }
            }


            card.innerHTML = `
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">Folio: ${order.id || 'N/A'}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">CW: ${semana}</h6>
                    <p class="card-text flex-grow-1" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${order.description || 'Sin descripción'}</p>
                    <p class="card-p fw-bold">${falta}</p>
                </div>
                <div class="card-footer bg-transparent border-0 text-center pb-3">
                     <button class="btn btn-primary ver-btn" data-order-id="${order.id}">Ver</button>
                </div>
            `;
            mainCards.appendChild(card);
        });

        window.allOrders = orders; // Store orders globally for modal use

        // --- Event listeners for "Ver" buttons ---
        document.querySelectorAll('.ver-btn').forEach(btn => {
            btn.addEventListener('click', async function () {
                const orderId = this.getAttribute('data-order-id');
                sessionStorage.setItem('selectedOrderId', orderId); // Store selected ID

                Swal.fire({
                    title: 'Cargando',
                    html: 'Por favor espera mientras se carga el documento...',
                    timer: 1000, // Short timer for visual feedback
                    timerProgressBar: true,
                    didOpen: () => { Swal.showLoading(); },
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    customClass: { container: 'swal-on-top' } // Ensure modal is on top
                });

                document.getElementById('myModal').style.display = 'flex'; // Show the modal
                const selectedOrder = window.allOrders.find(order => order.id === parseInt(orderId)) || {};

                // --- Configure Approve/Reject buttons based on user level and order status ---
                const approveBtn = document.getElementById('approveBtn');
                const rejectBtn = document.getElementById('rejectBtn');

                // Check if the current user's level is the *next* required approval level
                // And the order is not already rejected (status 99) or fully approved (null or >= required)
                const isNextApprover = Number(selectedOrder.approval_status) === (Number(window.authorizationLevel) - 1);
                const isRejected = Number(selectedOrder.approval_status) === 99;
                const isFullyApproved = selectedOrder.approval_status === null || Number(selectedOrder.approval_status) >= (selectedOrder.required_auth_level || 7);

                if (isNextApprover && !isRejected && !isFullyApproved) {
                    approveBtn.style.display = "block";
                    approveBtn.disabled = false;
                    rejectBtn.style.display = "block";
                    rejectBtn.disabled = false; // Ensure reject is also enabled
                } else {
                    approveBtn.style.display = "none";
                    rejectBtn.style.display = "none";
                }

                console.log('Order ID:', orderId);
                console.log('Selected Order Status:', selectedOrder.approval_status);
                console.log('User Auth Level:', window.authorizationLevel);
                console.log('Required Auth Level:', selectedOrder.required_auth_level);


                // --- Load and populate SVG ---
                try {
                    const response = await fetch('PremiumFreight.svg');
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const svgText = await response.text();

                    const tempDiv = document.createElement('div'); // Use temporary div to parse SVG
                    tempDiv.innerHTML = svgText;

                    // Populate SVG elements based on svgMap
                    for (const [svgId, orderKey] of Object.entries(svgMap)) {
                        const element = tempDiv.querySelector(`#${svgId}`);
                        if (element) {
                            // Default behavior for all elements: set textContent
                            element.textContent = selectedOrder[orderKey] || '';
                        } else {
                            // Log if an expected SVG element is not found
                            // console.warn(`SVG element with ID #${svgId} not found in template.`);
                        }
                    }
                    // Display the populated SVG in the preview area
                    document.getElementById('svgPreview').innerHTML = tempDiv.innerHTML;

                } catch (error) {
                    console.error('Error al cargar o procesar el SVG:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo cargar la vista previa del documento.',
                        customClass: { container: 'swal-on-top' }
                    });
                    document.getElementById('myModal').style.display = 'none'; // Hide modal on error
                }
            });
        });
    }

    // --- Cerrar modal ---
    document.getElementById('closeModal').onclick = function () {
        document.getElementById('myModal').style.display = 'none';
    };

    // Close modal if clicked outside of it
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
            const response = await fetch('PremiumFreight.svg');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const svgText = await response.text();

            // Create a container for rendering off-screen
            const container = document.createElement('div');
            container.style.width = '816px'; // Standard page width in points (adjust if needed)
            container.style.height = '1056px'; // Standard page height in points (adjust if needed)
            container.style.position = 'absolute';
            container.style.left = '-9999px'; // Position off-screen
            container.style.backgroundColor = 'white'; // Ensure background for canvas
            container.innerHTML = svgText; // Load SVG template

            // Populate the SVG in the off-screen container
            for (const [svgId, orderKey] of Object.entries(svgMap)) {
                const element = container.querySelector(`#${svgId}`);
                if (element) {
                     // Default behavior for all elements: set textContent
                    element.textContent = selectedOrder[orderKey] || '';
                } else {
                    // console.warn(`Elemento SVG con ID ${svgId} no encontrado para PDF.`);
                }
            }

            document.body.appendChild(container); // Add to DOM for rendering
            // Small delay to ensure rendering completes
            await new Promise(resolve => setTimeout(resolve, 300));

            // Generate canvas from the container
            const canvas = await html2canvas(container, {
                scale: 2, // Increase scale for better resolution
                logging: false, // Disable logging unless debugging
                useCORS: true,
                allowTaint: true, // May be needed for external resources if any
                backgroundColor: null // Use container's background
            });

            document.body.removeChild(container); // Clean up the temporary container

            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: [canvas.width / 2, canvas.height / 2] // Use canvas dimensions scaled back
            });

            // Add canvas image to PDF
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);

            // Save the PDF
            const fileName = `PremiumFreight_${selectedOrder.id || 'Order'}.pdf`;
            pdf.save(fileName);

            // Success message
            Swal.fire({
                icon: 'success',
                title: '¡PDF generado con éxito!',
                html: `El archivo <b>${fileName}</b> se ha descargado correctamente.`,
                confirmButtonText: 'Aceptar',
                customClass: { container: 'swal-on-top' }
            });
            document.getElementById('myModal').style.display = 'none'; // Close modal after saving

        } catch (error) {
            console.error('Error al generar el PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al generar el PDF',
                text: error.message || 'Ocurrió un error inesperado.',
                confirmButtonText: 'Entendido',
                customClass: { container: 'swal-on-top' }
            });
            // Ensure temporary container is removed even on error
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

            // Calculate the next approval status ID
            const currentStatus = Number(selectedOrder.approval_status);
            const newStatusId = currentStatus + 1;

            // Prepare data for updating the approval status
            const updateData = {
                orderId: selectedOrder.id,
                newStatusId: newStatusId,
                userLevel: window.authorizationLevel,
                userID: window.userID,
                authDate: new Date().toISOString().slice(0, 19).replace('T', ' ') // Use ISO format
            };

            // Determine the overall status text ID based on the new approval level
            let updatedStatusTextId = 2; // Default to 'revision'
            const requiredLevel = Number(selectedOrder.required_auth_level || 7); // Assume 7 if missing
            if (newStatusId >= requiredLevel) {
                updatedStatusTextId = 3; // 'aprobado'
            }

            const updateStatusText = {
                orderId: selectedOrder.id,
                statusid: updatedStatusTextId
            };

            // --- API Calls ---
            // 1. Update approval_status and log the approval step
            const responseApproval = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const resultApproval = await responseApproval.json();
            if (!resultApproval.success) {
                throw new Error(resultApproval.message || 'Error al actualizar el nivel de aprobación.');
            }

            // 2. Update the overall status_id (text representation)
            const responseStatusText = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusText.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatusText)
            });
            const resultStatusText = await responseStatusText.json();
            if (!resultStatusText.success) {
                // Log this error but might not need to stop the process if approval update worked
                console.error('Error updating status text:', resultStatusText.message);
            }

            // --- Success Handling ---
            // Update local data immediately for responsiveness
            selectedOrder.approval_status = newStatusId;
            selectedOrder.status_id = updatedStatusTextId; // Update status text ID locally
            // Find the corresponding status name (assuming you might have a map or need to fetch it)
            // For now, let's assume IDs map like: 1=nuevo, 2=revision, 3=aprobado, 4=rechazado
            if (updatedStatusTextId === 3) selectedOrder.status_name = 'aprobado';
            else if (updatedStatusTextId === 2) selectedOrder.status_name = 'revision';


            Swal.fire({
                icon: 'success',
                title: 'Orden aprobada',
                text: `La orden ${selectedOrder.id} ha sido aprobada para el siguiente nivel.`,
                confirmButtonText: 'Aceptar',
                customClass: { container: 'swal-on-top' }
            });
            document.getElementById('myModal').style.display = 'none'; // Close modal

            // Refresh the cards display with updated data
            createCards(window.allOrders); // Re-render cards with updated local data

            // Optionally re-fetch all data from server if needed, but updating local is faster
            // fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php')
            //     .then(response => response.json())
            //     .then(data => createCards(data.data));

        } catch (error) {
            console.error('Error al aprobar la orden:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo actualizar la orden: ' + error.message,
                confirmButtonText: 'Entendido',
                customClass: { container: 'swal-on-top' }
            });
        }
    };

    // --- Rechazar orden ---
    document.getElementById('rejectBtn').onclick = async function () {
        const selectedOrderId = sessionStorage.getItem('selectedOrderId');
        const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
        try {
            // Confirmation dialog before rejecting
            const confirmation = await Swal.fire({
                title: '¿Estás seguro?',
                text: `¿Realmente deseas rechazar la orden ${selectedOrderId}? Esta acción no se puede deshacer.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, rechazar',
                cancelButtonText: 'Cancelar',
                customClass: { container: 'swal-on-top' }
            });

            if (!confirmation.isConfirmed) {
                return; // Stop if user cancels
            }

            Swal.fire({
                title: 'Procesando...',
                text: 'Rechazando la orden',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                customClass: { container: 'swal-on-top' }
            });

            const newStatusId = 99; // Specific status ID for rejection
            const updateData = {
                orderId: selectedOrder.id,
                newStatusId: newStatusId, // Set approval_status to 99
                userLevel: window.authorizationLevel,
                userID: window.userID,
                authDate: new Date().toISOString().slice(0, 19).replace('T', ' ') // Use ISO format
            };

            const updatedStatusTextId = 4; // Status text ID for 'rechazado'
            const updateStatusText = {
                orderId: selectedOrder.id,
                statusid: updatedStatusTextId
            };

            // --- API Calls ---
            // 1. Update approval_status to 99
            const responseApproval = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const resultApproval = await responseApproval.json();
            if (!resultApproval.success) {
                throw new Error(resultApproval.message || 'Error al actualizar el nivel de aprobación a rechazado.');
            }

            // 2. Update the overall status_id to 'rechazado'
            const responseStatusText = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusText.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatusText)
            });
            const resultStatusText = await responseStatusText.json();
            if (!resultStatusText.success) {
                console.error('Error updating status text to rejected:', resultStatusText.message);
            }

            // --- Success Handling ---
             // Update local data immediately
            selectedOrder.approval_status = newStatusId;
            selectedOrder.status_id = updatedStatusTextId;
            selectedOrder.status_name = 'rechazado';

            Swal.fire({
                icon: 'error', // Use error icon for rejection
                title: 'Orden Rechazada',
                text: `La orden ${selectedOrderId} ha sido rechazada correctamente.`,
                confirmButtonText: 'Aceptar',
                customClass: { container: 'swal-on-top' }
            });
            document.getElementById('myModal').style.display = 'none'; // Close modal

            // Refresh the cards display
            createCards(window.allOrders);

        } catch (error) {
            console.error('Error al rechazar la orden:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo rechazar la orden: ' + error.message,
                confirmButtonText: 'Entendido',
                customClass: { container: 'swal-on-top' }
            });
        }
    };
});

