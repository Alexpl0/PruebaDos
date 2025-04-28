// Espera a que el contenido del DOM esté completamente cargado y parseado antes de ejecutar el script.
document.addEventListener('DOMContentLoaded', function () {
    /**
     * Rellena la tabla de órdenes en el HTML con los datos proporcionados.
     * @param {Array<Object>} orders - Un array de objetos, donde cada objeto representa una orden.
     */
    function rellenarTablaOrdenes(orders) {
        // Obtiene la referencia al cuerpo de la tabla donde se insertarán las filas.
        const tbody = document.getElementById("tbodyOrders");
        // Limpia el contenido previo de la tabla.
        tbody.innerHTML = "";
        // Itera sobre cada orden en el array de órdenes.
        orders.forEach(order => {
            // Crea un nuevo elemento de fila (<tr>).
            const row = document.createElement("tr");
            // Define el contenido HTML de la fila usando template literals.
            // Cada celda (<td>) muestra una propiedad de la orden.
            // Se usa el operador OR (||) para mostrar una cadena vacía si la propiedad no existe o es null/undefined.
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
                <td>${order.project_status || ''}</td>
                <td>${order.recovery || ''}</td>
                <td>${order.description || ''}</td>
                <!-- SHIP FROM -->
                <td>${order.origin_company_name || ''}</td>
                <td>${order.origin_city || ''}</td>
                <td>${order.origin_state || ''}</td>
                <td>${order.origin_zip || ''}</td>
                <!-- DESTINATION -->
                <td>${order.destiny_company_name || ''}</td>
                <td>${order.destiny_city || ''}</td>
                <td>${order.destiny_state || ''}</td>
                <td>${order.destiny_zip || ''}</td>
                <!-- ORDER -->
                <td>${order.weight || ''}</td>
                <td>${order.measures || ''}</td>
                <td>${order.products || ''}</td>
                <!-- CARRIER -->
                <td>${order.carrier || ''}</td>
                <td>${order.quoted_cost || ''}</td>
                <td>${order.reference || ''}</td>
                <td>${order.reference_number || ''}</td>
            `;
            // Añade la fila creada al cuerpo de la tabla.
            tbody.appendChild(row);
        });
    }

    // Realiza una petición fetch al endpoint especificado para obtener los datos de las órdenes.
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php')
        // Convierte la respuesta de la petición a formato JSON.
        .then(response => response.json())
        // Una vez que los datos JSON están listos:
        .then(data => {
            // Llama a la función para rellenar la tabla con los datos de las órdenes (data.data).
            rellenarTablaOrdenes(data.data);
            // Llama a la función para crear las tarjetas (cards) con los datos de las órdenes (data.data).
            createCards(data.data);
        })
        // Captura y muestra cualquier error que ocurra durante la petición fetch.
        .catch(error => console.error('Error al cargar los datos:', error));

    /**
     * Calcula el número de la semana ISO 8601 para una fecha dada.
     * @param {string} dateString - La fecha en formato de cadena (ej. "YYYY-MM-DD").
     * @returns {number} El número de la semana del año.
     */
    function getWeekNumber(dateString) {
        // Crea un objeto Date a partir de la cadena de fecha.
        const date = new Date(dateString);
        // Obtiene el día de la semana (0=Domingo, 1=Lunes,..., 6=Sábado). Se ajusta para que Domingo sea 7.
        const dayNum = date.getDay() || 7;
        // Ajusta la fecha al jueves de la misma semana (según ISO 8601).
        date.setDate(date.getDate() + 4 - dayNum);
        // Obtiene el primer día del año de la fecha ajustada.
        const yearStart = new Date(date.getFullYear(), 0, 1);
        // Calcula el número de la semana.
        // Se divide la diferencia en milisegundos entre la fecha ajustada y el inicio del año por los milisegundos de un día (86400000).
        // Se suma 1 porque los días se cuentan desde 1.
        // Se divide por 7 para obtener el número de semanas.
        // Math.ceil redondea hacia arriba para obtener el número de semana completo.
        const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        // Devuelve el número de la semana calculado.
        return weekNum;
    };

    /**
     * Crea y muestra tarjetas (cards) para cada orden en el contenedor especificado.
     * @param {Array<Object>} orders - Un array de objetos de órdenes.
     */
    function createCards(orders) {
        // Obtiene el contenedor principal donde se mostrarán las tarjetas.
        const mainCards = document.getElementById("card");
        // Limpia el contenido previo del contenedor de tarjetas.
        mainCards.innerHTML = "";
        // Itera sobre cada orden en el array de órdenes.
        orders.forEach(order => {
            // Calcula el número de la semana para la fecha de la orden.
            const semana = getWeekNumber(order.date);

            // Crea un nuevo elemento div para la tarjeta.
            const card = document.createElement("div");
            // Asigna clases CSS para el estilo de la tarjeta (Bootstrap y personalizadas).
            card.className = "card shadow rounded mx-2 mb-4";
            // Establece un ancho máximo para la tarjeta.
            card.style.maxWidth = "265px";
            // Establece una altura máxima para la tarjeta.
            card.style.maxHeight = "275px";
            // Si el estado del proyecto es "Cerrada", cambia el color de fondo a verde.
            if(order.project_status == "Cerrada"){
                card.style.backgroundColor= "green";
            }

            // Define el contenido HTML interno de la tarjeta usando template literals.
            // Muestra el folio (ID), número de semana (CW), descripción y un texto fijo.
            // Incluye un botón "Ver" con un atributo data-order-id que almacena el ID de la orden.
            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Folio: ${order.id}</h5>
                    <h6 class="card-subtitle">CW: ${semana}</h6>
                    <p class="card-text">${order.description || ''}</p>
                    <p class= "card-p">Falta: Senior Manager Logistic</p>
                    <button class="card-button ver-btn" data-order-id="${order.id}">Ver</button>
                </div>
            `;
            // Añade la tarjeta creada al contenedor principal.
            mainCards.appendChild(card);
        });

        // Almacena todas las órdenes en una variable global (accesible desde window)
        // para poder acceder a ellas más tarde (ej., en el modal).
        window.allOrders = orders;

        // Selecciona todos los botones con la clase 'ver-btn' (los botones "Ver" de las tarjetas).
        document.querySelectorAll('.ver-btn').forEach(btn => {
            // Añade un event listener de clic a cada botón "Ver".
            btn.addEventListener('click', async function() {
                // Obtiene el ID de la orden desde el atributo 'data-order-id' del botón clickeado.
                const orderId = this.getAttribute('data-order-id');
                // Guarda el ID de la orden seleccionada en sessionStorage para poder recuperarlo después (ej., al guardar PDF).
                sessionStorage.setItem('selectedOrderId', orderId);
                // Muestra el modal estableciendo su estilo 'display' a 'flex'.
                document.getElementById('myModal').style.display = 'flex';

                // --- Lógica para la vista previa del SVG en el modal ---
                // Busca la orden completa correspondiente al ID seleccionado en el array global 'allOrders'.
                const selectedOrder = window.allOrders.find(order => order.id == orderId) || {};

                // Mapeo de IDs de SVG a propiedades del objeto 'order'
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
                    'IssuerValue': 'creator_name', // Asumiendo que 'creator_name' está en el JSON
                    'ManagerOPSDivisionValue': 'creator_role', // Asumiendo que 'creator_role' está en el JSON
                    'PlantCValue': 'planta',
                    'PlantCodeValue': 'code_planta',
                    'PlantManagerValue': 'approver_name', // Asumiendo que 'approver_name' está en el JSON
                    'ProductValue': 'products',
                    'ProjectStatusValue': 'project_status',
                    'QuotedCostValue': 'quoted_cost',
                    'RecoveryValue': 'recovery',
                    'ReferenceNumberValue': 'reference_number',
                    'RequestingPlantValue': 'planta',
                    'RootCauseValue': 'category_cause',
                    'SDestValue': 'destiny_state', // Duplicado con StateDestValue, usar uno
                    'SRVPRegionalValue': 'creator_role', // Duplicado con ManagerOPSDivisionValue, usar uno
                    'SeniorManagerValue': 'approver_role', // Asumiendo que 'approver_role' está en el JSON
                    'StateDestValue': 'destiny_state',
                    'StateShipValue': 'origin_state',
                    'TransportValue': 'transport',
                    'WeightValue': 'weight',
                    'ZIPDestValue': 'destiny_zip',
                    'ZIPShipValue': 'origin_zip'
                };

                // Realiza una petición fetch para obtener el contenido del archivo SVG.
                const response = await fetch('Premium_Freight.svg');
                // Lee la respuesta como texto (el contenido del SVG).
                const svgText = await response.text();

                // Crea un div temporal en memoria para manipular el SVG sin afectar el DOM principal aún.
                const tempDiv = document.createElement('div');
                // Asigna el texto del SVG como HTML interno del div temporal.
                tempDiv.innerHTML = svgText;

                // Itera sobre el mapeo y actualiza los elementos SVG correspondientes
                for (const [svgId, orderKey] of Object.entries(svgMap)) {
                    const element = tempDiv.querySelector(`#${svgId}`);
                    if (element) {
                        element.textContent = selectedOrder[orderKey] || ''; // Usa || '' para valores nulos/undefined
                    } else {
                        console.warn(`Elemento SVG con ID ${svgId} no encontrado.`); // Advertencia si no se encuentra un ID
                    }
                }

                // Obtiene el contenedor dentro del modal donde se mostrará la vista previa del SVG.
                // Asigna el HTML interno del div temporal (el SVG modificado) a este contenedor.
                document.getElementById('svgPreview').innerHTML = tempDiv.innerHTML;
            });
        });
    }

    // --- Lógica de manejo del Modal ---

    // Asigna un event listener al botón con ID 'openModal' (si existiera uno para abrir genéricamente).
    // Nota: Actualmente, el modal se abre desde los botones 'Ver' de las tarjetas.
    // document.getElementById('openModal').onclick = function() {
    //     document.getElementById('myModal').style.display = 'flex';
    // };

    // Asigna un event listener al botón de cerrar dentro del modal (ID 'closeModal').
    document.getElementById('closeModal').onclick = function() {
        // Oculta el modal estableciendo su estilo 'display' a 'none'.
        document.getElementById('myModal').style.display = 'none';
    };

    // Asigna un event listener a la ventana para cerrar el modal si se hace clic fuera de su contenido.
    window.onclick = function(event) {
        // Obtiene la referencia al elemento del modal.
        var modal = document.getElementById('myModal');
        // Si el objetivo del clic (event.target) es el propio fondo del modal...
        if (event.target == modal) {
            // Oculta el modal.
            modal.style.display = 'none';
        }
    };

    // --- Lógica para guardar como PDF ---

    // Asigna un event listener al botón con ID 'savePdfBtn'.
    document.getElementById('savePdfBtn').onclick = async function() {
        try {
            // Muestra una alerta de carga usando SweetAlert2 (Swal).
            Swal.fire({
                title: 'Generando PDF',
                html: 'Por favor espera mientras se procesa el documento...',
                timerProgressBar: true, // Muestra una barra de progreso.
                didOpen: () => {
                    Swal.showLoading(); // Muestra el icono de carga.
                },
                allowOutsideClick: false, // Impide cerrar la alerta haciendo clic fuera.
                allowEscapeKey: false,    // Impide cerrar la alerta con la tecla Esc.
                allowEnterKey: false,   // Impide cerrar la alerta con la tecla Enter.
                customClass: {
                    // Asegura que la alerta se muestre por encima del modal si es necesario.
                    container: 'swal-on-top'
                }
            });

            // Obtiene el ID de la orden seleccionada que se guardó en sessionStorage.
            const selectedOrderId = sessionStorage.getItem('selectedOrderId');
            // Busca la orden completa correspondiente a ese ID en el array global.
            const selectedOrder = window.allOrders.find(order => order.id == selectedOrderId) || {};

            // Mapeo de IDs de SVG a propiedades del objeto 'order' (repetido para claridad, podría refactorizarse)
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
                'IssuerValue': 'creator_name', // Asumiendo que 'creator_name' está en el JSON
                'ManagerOPSDivisionValue': 'creator_role', // Asumiendo que 'creator_role' está en el JSON
                'PlantCValue': 'planta',
                'PlantCodeValue': 'code_planta',
                'PlantManagerValue': 'approver_name', // Asumiendo que 'approver_name' está en el JSON
                'ProductValue': 'products',
                'ProjectStatusValue': 'project_status',
                'QuotedCostValue': 'quoted_cost',
                'RecoveryValue': 'recovery',
                'ReferenceNumberValue': 'reference_number',
                'RequestingPlantValue': 'planta',
                'RootCauseValue': 'category_cause',
                'SDestValue': 'destiny_state', // Duplicado con StateDestValue, usar uno
                'SRVPRegionalValue': 'creator_role', // Duplicado con ManagerOPSDivisionValue, usar uno
                'SeniorManagerValue': 'approver_role', // Asumiendo que 'approver_role' está en el JSON
                'StateDestValue': 'destiny_state',
                'StateShipValue': 'origin_state',
                'TransportValue': 'transport',
                'WeightValue': 'weight',
                'ZIPDestValue': 'destiny_zip',
                'ZIPShipValue': 'origin_zip'
            };

            // Realiza una petición fetch para obtener el contenido del archivo SVG nuevamente.
            const response = await fetch('Premium_Freight.svg');
            // Lee la respuesta como texto.
            const svgText = await response.text();

            // Crea un contenedor div temporal para renderizar el SVG fuera de la pantalla.
            const container = document.createElement('div');
            // Establece dimensiones fijas (tamaño carta aproximado en píxeles para 96 DPI).
            container.style.width = '816px';
            container.style.height = '1056px';
            // Lo posiciona fuera de la vista del usuario.
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            // Asigna el texto del SVG como HTML interno del contenedor.
            container.innerHTML = svgText;

            // Itera sobre el mapeo y actualiza los elementos SVG correspondientes en el contenedor temporal
            for (const [svgId, orderKey] of Object.entries(svgMap)) {
                const element = container.querySelector(`#${svgId}`);
                if (element) {
                    element.textContent = selectedOrder[orderKey] || ''; // Usa || '' para valores nulos/undefined
                } else {
                    console.warn(`Elemento SVG con ID ${svgId} no encontrado para PDF.`); // Advertencia si no se encuentra un ID
                }
            }

            // Añade el contenedor temporal al cuerpo del documento para que pueda ser renderizado.
            document.body.appendChild(container);

            // Espera un breve momento para asegurar que el SVG se haya renderizado completamente en el contenedor.
            await new Promise(resolve => setTimeout(resolve, 200));

            // Usa html2canvas para tomar una "captura" del contenedor renderizado y convertirlo en un elemento canvas.
            // scale: 2 aumenta la resolución para mejor calidad en el PDF.
            // logging: true habilita logs de html2canvas en la consola (útil para depuración).
            // useCORS: true permite cargar imágenes de otros dominios si las hubiera en el SVG.
            // allowTaint: true (relacionado con CORS) permite que el canvas no se marque como "tainted".
            const canvas = await html2canvas(container, {
                scale: 2,
                logging: true,
                useCORS: true,
                allowTaint: true
            });

            // Obtiene la clase jsPDF del objeto global window.jspdf (asumiendo que la librería está cargada).
            const { jsPDF } = window.jspdf;
            // Crea una nueva instancia de jsPDF.
            // orientation: 'portrait' - Orientación vertical.
            // unit: 'pt' - Unidades en puntos (points).
            // format: [816, 1056] - Tamaño de página personalizado (aproximadamente carta).
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: [816, 1056]
            });

            // Convierte el contenido del canvas a una imagen PNG en formato Data URL.
            const imgData = canvas.toDataURL('image/png');
            // Añade la imagen al PDF, ocupando toda la página.
            pdf.addImage(imgData, 'PNG', 0, 0, 816, 1056);

            // Genera el PDF como un Blob (Binary Large Object).
            const pdfBlob = pdf.output('blob');
            // Crea una URL temporal para el Blob del PDF.
            const pdfUrl = URL.createObjectURL(pdfBlob);

            // Define el nombre del archivo PDF que se descargará.
            const fileName = 'PremiumFreight.pdf';
            // Inicia la descarga del archivo PDF generado.
            pdf.save(fileName);

            // Elimina el contenedor temporal del DOM, ya no es necesario.
            document.body.removeChild(container);

            // Cierra la alerta de carga y muestra una de éxito usando SweetAlert2.
            Swal.fire({
                icon: 'success',
                title: '¡PDF generado con éxito!',
                html: `El archivo <b>${fileName}</b> se ha descargado correctamente.`,
                showCancelButton: true, // Muestra un botón de cancelar.
                confirmButtonText: 'Aceptar', // Texto del botón de confirmación.
                cancelButtonText: 'Ver PDF', // Texto del botón de cancelar (que aquí usamos para ver).
                reverseButtons: true, // Invierte la posición de los botones.
                customClass: {
                    container: 'swal-on-top', // Asegura que la alerta se muestre por encima del modal si es necesario.
                    confirmButton: 'btn btn-success', // Clases de Bootstrap para estilo.
                    cancelButton: 'btn btn-primary'
                }
            }).then((result) => { // Se ejecuta cuando el usuario interactúa con la alerta.
                // Oculta el modal principal.
                document.getElementById('myModal').style.display = 'none';
                // Si el usuario hizo clic en el botón "Ver PDF" (que es el 'cancelButton')...
                if (!result.isConfirmed) {
                    // Abre el PDF en una nueva pestaña del navegador usando la URL temporal.
                    window.open(pdfUrl, '_blank');
                }
                // Libera la memoria asociada a la URL del objeto Blob después de un breve retraso.
                setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
            });

        } catch (error) {
            // Si ocurre cualquier error durante el proceso try...
            console.error('Error al generar el PDF:', error);
            // Muestra una alerta de error usando SweetAlert2.
            Swal.fire({
                icon: 'error',
                title: 'Error al generar el PDF',
                text: error.message, // Muestra el mensaje de error.
                confirmButtonText: 'Entendido',
                customClass: {
                    container: 'swal-on-top' // Asegura que la alerta se muestre por encima del modal si es necesario.
                }
            });
        }
    };

    // --- Listener adicional para cerrar el modal (alternativa a window.onclick) ---
    // Este listener es más específico y puede ser redundante con window.onclick,
    // pero asegura el cierre si se hace clic exactamente en el botón de cerrar o en el fondo del modal.
    document.addEventListener('click', function(e) {
        // Si el ID del elemento clickeado es 'closeModal'.
        if (e.target.id === 'closeModal') {
            document.getElementById('myModal').style.display = 'none';
        }
        // Si el ID del elemento clickeado es 'myModal' (el fondo del modal).
        if (e.target.id === 'myModal') {
            document.getElementById('myModal').style.display = 'none';
        }
    });
});

