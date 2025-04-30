document.addEventListener('DOMContentLoaded', function () {
    // --- Función para rellenar la tabla de órdenes ---
    function rellenarTablaOrdenes(orders) {
        const tbody = document.getElementById("tbodyOrders");
        tbody.innerHTML = "";
        orders.forEach(order => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${order.planta || ''}</td>
                <td>${order.code_planta || ''}</td>
                <td>${order.transport || ''}</td>
                <td>${order.in_out_bound || ''}</td>
                <td>${order.cost_euros || ''}</td>
                <td>${order.area || ''}</td>
                <td>${order.int_ext || ''}</td>
                <td>${order.paid_by || ''}</td>
                <td>${order.category_cause || ''}</td>
                <td>${order.status_name || ''}</td>
                <td>${order.recovery || ''}</td>
                <td>${order.description || ''}</td>
                <td>${order.origin_company_name || ''}</td>
                <td>${order.origin_city || ''}</td>
                <td>${order.origin_state || ''}</td>
                <td>${order.origin_zip || ''}</td>
                <td>${order.destiny_company_name || ''}</td>
                <td>${order.destiny_city || ''}</td>
                <td>${order.destiny_state || ''}</td>
                <td>${order.destiny_zip || ''}</td>
                <td>${order.weight || ''}</td>
                <td>${order.measures || ''}</td>
                <td>${order.products || ''}</td>
                <td>${order.carrier || ''}</td>
                <td>${order.quoted_cost || ''}</td>
                <td>${order.reference || ''}</td>
                <td>${order.reference_number || ''}</td>
            `;
            tbody.appendChild(row);
        });
    }

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
        'PlantManagerValue': '',
        'ProductValue': 'products',
        'ProjectStatusValue': 'project_status',
        'QuotedCostValue': 'quoted_cost',
        'RecoveryValue': 'recovery',
        'ReferenceNumberValue': 'reference_number',
        'RequestingPlantValue': 'planta',
        'RootCauseValue': 'category_cause',
        'SDestValue': 'destiny_state',
        'ManagerOPSDivisionValue': '',
        'SRVPRegionalValue': '',
        'SeniorManagerValue': '',
        'ManagerOPSDivisionValue': '',
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
            rellenarTablaOrdenes(data.data);
            createCards(data.data);
        })
        .catch(error => console.error('Error al cargar los datos:', error));

    // --- Calcular número de semana ISO 8601 ---
    function getWeekNumber(dateString) {
        const date = new Date(dateString);
        const dayNum = date.getDay() || 7;
        date.setDate(date.getDate() + 4 - dayNum);
        const yearStart = new Date(date.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return weekNum;
    }

    // --- Crear tarjetas visuales para cada orden ---
    function createCards(orders) {
        const mainCards = document.getElementById("card");
        mainCards.innerHTML = "";
        orders.forEach(order => {
            const semana = getWeekNumber(order.date);
            const card = document.createElement("div");
            card.className = "card shadow rounded mx-2 mb-4";
            card.style.maxWidth = "265px";
            card.style.maxHeight = "275px";

            // Colores según estado
            if (order.status_name === "aprobado") card.style.backgroundColor = "green";
            else if (order.status_name === "nuevo") card.style.backgroundColor = "white";
            else if (order.status_name === "revision") card.style.backgroundColor = "yellow";
            else if (order.status_name === "rechazado") card.style.backgroundColor = "red";

            // Mensaje de aprobación pendiente
            let falta = '';
            if (order.approval_status <= order.required_auth_level) {
                if (order.approval_status === 0) falta = 'Falta: Logistic Manager';
                else if (order.approval_status === 1) falta = 'Falta: Controlling';
                else if (order.approval_status === 2) falta = 'Falta: Plant Manager';
                else if (order.approval_status === 3) falta = 'Falta: Senior Manager Logistic';
                else if (order.approval_status === 4) falta = 'Falta: Senior Manager Logistics Division';
                else if (order.approval_status === 5) falta = 'Falta: SR VP Regional';
                else if (order.approval_status === 6) falta = 'Falta: Division Controlling Regional';
                else if (order.approval_status === order.required_auth_level) falta = 'Totalmente Aprobado';
            }

            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Folio: ${order.id}</h5>
                    <h6 class="card-subtitle">CW: ${semana}</h6>
                    <p class="card-text">${order.description || ''}</p>
                    <p class="card-p">${falta}</p>
                    <button class="card-button ver-btn" data-order-id="${order.id}">Ver</button>
                </div>
            `;
            mainCards.appendChild(card);
        });

        window.allOrders = orders;

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

                const approveBtn = document.getElementById('approveBtn');
                const rejectBtn = document.getElementById('rejectBtn');

                if (Number(selectedOrder.approval_status) === (Number(window.authorizationLevel)) - 1) {
                    approveBtn.style.display = "block";
                    approveBtn.disabled = false;
                    rejectBtn.style.display = "block";
                } else {
                    approveBtn.style.display = "none";
                    rejectBtn.style.display = "none";
                }

                try {
                    const response = await fetch('Premium_Freight.svg');
                    const svgText = await response.text();
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = svgText;

                    for (const [svgId, orderKey] of Object.entries(svgMap)) {
                        const element = tempDiv.querySelector(`#${svgId}`);
                        if (element) {
                            if (svgId === 'DescriptionAndRootCauseValue') {
                                const maxWidth = 300;
                                const lines = wrapSvgText(selectedOrder[orderKey] || '', maxWidth, tempDiv);
                                element.textContent = '';
                                lines.forEach((l, i) => {
                                    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                                    tspan.setAttribute('x', element.getAttribute('x') || element.getAttribute('x1') || 0);
                                    tspan.setAttribute('dy', i === 0 ? '0' : '1.2em');
                                    tspan.textContent = l;
                                    element.appendChild(tspan);
                                });
                            } else {
                                element.textContent = selectedOrder[orderKey] || '';
                            }
                        }
                    }
                    document.getElementById('svgPreview').innerHTML = tempDiv.innerHTML;
                } catch (error) {
                    console.error('Error al cargar el SVG:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo cargar la vista previa del documento.'
                    });
                }
            });
        });
    }

    // --- Cerrar modal ---
    document.getElementById('closeModal').onclick = function () {
        document.getElementById('myModal').style.display = 'none';
    };

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
            const response = await fetch('Premium_Freight.svg');
            const svgText = await response.text();

            const container = document.createElement('div');
            container.style.width = '816px';
            container.style.height = '1056px';
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.innerHTML = svgText;

            for (const [svgId, orderKey] of Object.entries(svgMap)) {
                const element = container.querySelector(`#${svgId}`);
                if (element) {
                    if (svgId === 'DescriptionAndRootCauseValue') {
                        let maxWidth = 300;
                        const descArea = container.querySelector('#DescriptionRootInput');
                        if (descArea && descArea.tagName === 'rect') {
                            maxWidth = parseFloat(descArea.getAttribute('width')) || maxWidth;
                        }
                        const lines = wrapSvgText(selectedOrder[orderKey] || '', maxWidth, container);
                        element.textContent = '';
                        lines.forEach((l, i) => {
                            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                            tspan.setAttribute('x', element.getAttribute('x'));
                            tspan.setAttribute('dy', i === 0 ? '0' : '1.2em');
                            tspan.textContent = l;
                            element.appendChild(tspan);
                        });
                    } else {
                        element.textContent = selectedOrder[orderKey] || '';
                    }
                } else {
                    console.warn(`Elemento SVG con ID ${svgId} no encontrado para PDF.`);
                }
            }

            document.body.appendChild(container);
            await new Promise(resolve => setTimeout(resolve, 200));

            const canvas = await html2canvas(container, {
                scale: 2,
                logging: true,
                useCORS: true,
                allowTaint: true
            });

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: [816, 1056]
            });

            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, 816, 1056);

            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);

            const fileName = 'PremiumFreight.pdf';
            pdf.save(fileName);

            document.body.removeChild(container);

            Swal.fire({
                icon: 'success',
                title: '¡PDF generado con éxito!',
                html: `El archivo <b>${fileName}</b> se ha descargado correctamente.`,
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Ver PDF',
                reverseButtons: true,
                customClass: {
                    container: 'swal-on-top',
                    confirmButton: 'btn btn-success',
                    cancelButton: 'btn btn-primary'
                }
            }).then((result) => {
                document.getElementById('myModal').style.display = 'none';
                if (!result.isConfirmed) {
                    window.open(pdfUrl, '_blank');
                }
                setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
            });

        } catch (error) {
            console.error('Error al generar el PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al generar el PDF',
                text: error.message,
                confirmButtonText: 'Entendido',
                customClass: { container: 'swal-on-top' }
            });
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
                didOpen: () => { Swal.showLoading(); }
            });

            const newStatusId = selectedOrder.approval_status + 1;
            const updateData = {
                orderId: selectedOrder.id,
                newStatusId: newStatusId,
                userLevel: window.authorizationLevel,
                userID: window.userID,
                authDate: new Date().toISOString()
            };

            let updatedStatusId = 0;
            if (newStatusId > 0) updatedStatusId = 2; // 'revision'
            else if (newStatusId === selectedOrder.required_auth_level) updatedStatusId = 3; // 'aprobado'
            else if (newStatusId === 99) updatedStatusId = 4; // 'rechazado'

            const updateStatus = {
                orderId: selectedOrder.id,
                statusId: updatedStatusId
            };

            // Primer fetch: approval_status
            const response = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            // Segundo fetch: status_id
            const responseStatus = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatus)
            });

            const result = await response.json();
            const resultStatus = await responseStatus.json();

            if (result.success) {
                selectedOrder.approval_status = newStatusId;
                Swal.fire({
                    icon: 'success',
                    title: 'Orden aprobada',
                    text: `La orden ${selectedOrder.id} ha sido aprobada correctamente.`,
                    confirmButtonText: 'Aceptar',
                    customClass: { container: 'swal-on-top' }
                });
                document.getElementById('myModal').style.display = 'none';
                fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php')
                    .then(response => response.json())
                    .then(data => {
                        rellenarTablaOrdenes(data.data);
                        createCards(data.data);
                    });
            } else {
                throw new Error(result.message || 'Error al actualizar la orden');
            }
        } catch (error) {
            console.error('Error:', error);
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
            Swal.fire({
                title: 'Procesando...',
                text: 'Actualizando estado de la orden',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const newStatusId = 99;
            const updateData = {
                orderId: selectedOrder.id,
                newStatusId: newStatusId,
                userLevel: window.authorizationLevel,
                userID: window.userID,
                authDate: new Date().toISOString()
            };

            let updatedStatusId = 4; // 'rechazado'
            const updateStatus = {
                orderId: selectedOrder.id,
                statusId: updatedStatusId
            };

            // Primer fetch: approval_status
            const response = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            // Segundo fetch: status_id
            const responseStatus = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatus)
            });

            const result = await response.json();
            const resultStatus = await responseStatus.json();

            if (result.success) {
                selectedOrder.approval_status = newStatusId;
                Swal.fire({
                    icon: 'error',
                    title: 'Orden rechazada',
                    text: `La orden ${selectedOrderId} ha sido rechazada.`,
                    confirmButtonText: 'Aceptar',
                    customClass: { container: 'swal-on-top' }
                });
                document.getElementById('myModal').style.display = 'none';
                fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php')
                    .then(response => response.json())
                    .then(data => {
                        rellenarTablaOrdenes(data.data);
                        createCards(data.data);
                    });
            } else {
                throw new Error(result.message || 'Error al actualizar la orden');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo actualizar la orden: ' + error.message,
                confirmButtonText: 'Entendido',
                customClass: { container: 'swal-on-top' }
            });
        }
    };
});

// --- Función para hacer wrap de texto en SVG ---
function wrapSvgText(text, maxWidth, svgElement) {
    const words = text.split(' ');
    let line = '';
    let lines = [];
    const testText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    svgElement.appendChild(testText);

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        testText.textContent = testLine;
        const length = testText.getComputedTextLength();
        if (length > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());
    svgElement.removeChild(testText);
    return lines;
}

