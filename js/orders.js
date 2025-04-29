// Espera a que el contenido del DOM (Document Object Model) esté completamente cargado y parseado
// Esto asegura que todos los elementos HTML estén disponibles para ser manipulados por el script.
document.addEventListener('DOMContentLoaded', function () {
    /**
     * Rellena la tabla de órdenes en el HTML con los datos proporcionados.
     * @param {Array<Object>} orders - Un array de objetos, donde cada objeto representa una orden.
     */
    function rellenarTablaOrdenes(orders) {
        // Obtiene la referencia al cuerpo de la tabla (tbody) donde se insertarán las filas de datos.
        // Busca el elemento HTML que tiene el ID "tbodyOrders".
        const tbody = document.getElementById("tbodyOrders");
        // Limpia el contenido previo del cuerpo de la tabla.
        // Esto asegura que no se acumulen datos de ejecuciones anteriores si la función se llama múltiples veces.
        tbody.innerHTML = "";
        // Itera sobre cada objeto 'order' dentro del array 'orders' recibido como parámetro.
        orders.forEach(order => {
            // Crea un nuevo elemento HTML de tipo fila (<tr>) en memoria para cada orden.
            const row = document.createElement("tr");
            // Define el contenido HTML interno de la fila recién creada usando template literals (backticks ``).
            // Se crea una celda (<td>) por cada propiedad de la orden que se quiere mostrar en la tabla.
            // Se utiliza el operador OR (||) con una cadena vacía ('') como valor por defecto.
            // Esto significa que si una propiedad de 'order' (ej. order.planta) es null, undefined, false, 0, o una cadena vacía,
            // se mostrará una cadena vacía en la celda, evitando errores o la aparición de "undefined" en la tabla.
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
            // Añade la fila (<tr>) recién creada y rellenada como un hijo del elemento <tbody> de la tabla.
            // Esto hace que la fila sea visible en la página web.
            tbody.appendChild(row);
        });
    }

    // Mapeo SVG definido una sola vez para reutilizar
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
        'ManagerOPSDivisionValue': 'creator_role',
        'PlantCValue': 'planta',
        'PlantCodeValue': 'code_planta',
        'PlantManagerValue': 'approver_name',
        'ProductValue': 'products',
        'ProjectStatusValue': 'status_name',
        'QuotedCostValue': 'quoted_cost',
        'RecoveryValue': 'recovery',
        'ReferenceNumberValue': 'reference_number',
        'RequestingPlantValue': 'planta',
        'RootCauseValue': 'category_cause',
        'SDestValue': 'destiny_state',
        'SRVPRegionalValue': 'creator_role',
        'SeniorManagerValue': 'approver_role',
        'StateDestValue': 'destiny_state',
        'StateShipValue': 'origin_state',
        'TransportValue': 'transport',
        'WeightValue': 'weight',
        'ZIPDestValue': 'destiny_zip',
        'ZIPShipValue': 'origin_zip'
    };

    // Realiza una petición asíncrona (fetch) a la URL especificada para obtener los datos de las órdenes.
    // La URL apunta a un script PHP que probablemente consulta una base de datos y devuelve los datos en formato JSON.
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php')
        // El método .then() se ejecuta cuando la petición fetch recibe una respuesta del servidor.
        // response.json() convierte el cuerpo de la respuesta (que se espera sea JSON) en un objeto JavaScript.
        .then(response => response.json())
        // Este .then() se ejecuta después de que la respuesta ha sido convertida a JSON exitosamente.
        // 'data' contiene el objeto JavaScript resultante.
        .then(data => {
            // Llama a la función 'rellenarTablaOrdenes', pasándole el array de órdenes.
            // Se asume que los datos de las órdenes están dentro de una propiedad llamada 'data' en el objeto JSON recibido.
            rellenarTablaOrdenes(data.data);
            // Llama a la función 'createCards', pasándole el mismo array de órdenes.
            // Esta función se encargará de crear elementos visuales tipo "tarjeta" para cada orden.
            createCards(data.data);
        })
        // El método .catch() se ejecuta si ocurre algún error durante la petición fetch o el procesamiento de la respuesta.
        // Por ejemplo, si la red falla, el servidor devuelve un error, o el JSON no es válido.
        .catch(error => console.error('Error al cargar los datos:', error)); // Muestra el error en la consola del navegador.

    /**
     * Calcula el número de la semana ISO 8601 para una fecha dada.
     * La norma ISO 8601 define que la semana empieza en lunes y la primera semana del año
     * es la que contiene el primer jueves del año.
     * @param {string} dateString - La fecha en formato de cadena (ej. "YYYY-MM-DD").
     * @returns {number} El número de la semana del año (1 a 52 o 53).
     */
    function getWeekNumber(dateString) {
        // Crea un nuevo objeto Date a partir de la cadena de fecha proporcionada.
        const date = new Date(dateString);
        // Obtiene el día de la semana según la convención de JavaScript (0=Domingo, 1=Lunes,..., 6=Sábado).
        // Se ajusta usando el operador OR (||) para que Domingo sea 7, alineándose con ISO 8601 (1=Lunes,..., 7=Domingo).
        const dayNum = date.getDay() || 7;
        // Ajusta la fecha al jueves de la semana actual.
        // El cálculo (4 - dayNum) determina cuántos días hay que sumar o restar para llegar al jueves.
        // setDate modifica el día del mes del objeto 'date'.
        date.setDate(date.getDate() + 4 - dayNum);
        // Crea un objeto Date que representa el primer día (1 de enero) del mismo año que la fecha ajustada.
        const yearStart = new Date(date.getFullYear(), 0, 1);
        // Calcula el número de la semana.
        // 1. (date - yearStart): Calcula la diferencia en milisegundos entre la fecha ajustada (jueves) y el inicio del año.
        // 2. / 86400000: Divide por el número de milisegundos en un día para obtener la diferencia en días.
        // 3. + 1: Suma 1 porque los días se cuentan desde 1.
        // 4. / 7: Divide por 7 para obtener el número de semanas transcurridas.
        // 5. Math.ceil(): Redondea hacia arriba al entero más cercano para obtener el número de semana completo.
        const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        // Devuelve el número de la semana calculado.
        return weekNum;
    }

    /**
     * Crea y muestra tarjetas (cards) visuales para cada orden en el contenedor HTML especificado.
     * @param {Array<Object>} orders - Un array de objetos de órdenes, similar al usado en rellenarTablaOrdenes.
     */
    function createCards(orders) {
        // Obtiene la referencia al elemento HTML contenedor donde se añadirán las tarjetas.
        // Busca el elemento con el ID "card".
        const mainCards = document.getElementById("card");
        // Limpia el contenido previo del contenedor de tarjetas.
        // Esto evita duplicados si la función se llama más de una vez.
        mainCards.innerHTML = "";
        // Itera sobre cada objeto 'order' en el array 'orders'.
        orders.forEach(order => {
            // Calcula el número de la semana para la fecha asociada a la orden actual.
            // Llama a la función 'getWeekNumber' definida anteriormente.
            const semana = getWeekNumber(order.date);

            // Crea un nuevo elemento HTML de tipo <div> en memoria para representar la tarjeta.
            const card = document.createElement("div");
            // Asigna clases CSS al div de la tarjeta para aplicar estilos predefinidos.
            // Se usan clases de Bootstrap ("card", "shadow", "rounded", "mx-2", "mb-4") para el diseño.
            card.className = "card shadow rounded mx-2 mb-4";
            // Establece un ancho máximo para la tarjeta usando estilos en línea.
            card.style.maxWidth = "265px";
            // Establece una altura máxima para la tarjeta usando estilos en línea.
            card.style.maxHeight = "275px";
            
            // Asigna colores a las tarjetas según el estado
            if (order.status_name === "aprobado") {
                card.style.backgroundColor = "green";
            } else if (order.status_name === "nuevo") {
                card.style.backgroundColor = "white";
            } else if (order.status_name === "revision") {
                card.style.backgroundColor = "yellow";
            } else if (order.status_name === "rechazado") {
                card.style.backgroundColor = "red";
            }

            // Determina el mensaje de quién falta para aprobar
            let falta = '';
            
            // Corregido: reemplazamos el while por un if ya que solo necesitamos verificar una vez
            // si el status_id es menor que el nivel requerido
            if (order.status_id <= order.required_auth_level) {
                if (order.status_id === 0) {
                    falta = 'Falta: Logistic Manager';
                } else if (order.status_id === 1) {
                    falta = 'Falta: Controlling';
                } else if (order.status_id === 2) {
                    falta = 'Falta: Plant Manager';
                } else if (order.status_id === 3) {
                    falta = 'Falta: Senior Manager Logistic';
                } else if (order.status_id === 4) {
                    falta = 'Falta: Senior Manager Logistics Division';
                } else if (order.status_id === 5) {
                    falta = 'Falta: SR VP Regional';
                } else if (order.status_id === 6) {
                    falta = 'Falta: Division Controlling Regional';
                } else if (order.status_id === order.required_auth_level) {
                    falta = 'Totalmente Aprobado';
                }

            }

            // Define el contenido HTML interno de la tarjeta usando template literals.
            // Incluye el folio (ID de la orden), el número de semana (CW), la descripción,
            // el mensaje de quién falta por aprobar y un botón "Ver".
            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Folio: ${order.id}</h5>
                    <h6 class="card-subtitle">CW: ${semana}</h6>
                    <p class="card-text">${order.description || ''}</p>
                    <p class="card-p">${falta}</p>
                    <button class="card-button ver-btn" data-order-id="${order.id}">Ver</button>
                </div>
            `;
            // Añade la tarjeta (<div>) recién creada y configurada como un hijo del contenedor principal 'mainCards'.
            // Esto hace que la tarjeta sea visible en la página.
            mainCards.appendChild(card);
        });

        // Almacena el array completo de 'orders' en una propiedad del objeto global 'window'.
        // Esto hace que el array 'orders' sea accesible desde otras partes del código,
        // como los event listeners que se definirán a continuación, sin necesidad de pasarlo explícitamente.
        window.allOrders = orders;

        // Selecciona todos los elementos HTML que tienen la clase 'ver-btn' (los botones "Ver" dentro de las tarjetas).
        // document.querySelectorAll devuelve una NodeList, que se puede iterar con forEach.
        document.querySelectorAll('.ver-btn').forEach(btn => {
            // Añade un event listener a cada botón "Ver". La función se ejecutará cuando se haga clic en el botón.
            // La función es 'async' porque dentro se usa 'await' para esperar la respuesta del fetch del SVG.
            btn.addEventListener('click', async function() {
                // 'this' dentro de esta función se refiere al botón que fue clickeado.
                // Obtiene el valor del atributo 'data-order-id' del botón clickeado. Este es el ID de la orden.
                const orderId = this.getAttribute('data-order-id');
                // Guarda el ID de la orden seleccionada en sessionStorage.
                // sessionStorage almacena datos mientras la pestaña del navegador está abierta.
                // Esto permite recuperar el ID más tarde, por ejemplo, al guardar el PDF.
                sessionStorage.setItem('selectedOrderId', orderId);
                
                //Añadimos un Swal.Fire como pantalla de carga para que el usuario no vea la pantalla en blanco
                Swal.fire({
                    title: 'Cargando', 
                    html: 'Por favor espera mientras se carga el documento...',
                    timer: 1000,
                    timerProgressBar: true,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    customClass: {
                        container: 'swal-on-top'
                    }
                });

                // Muestra el modal cambiando su estilo CSS 'display' a 'flex'.
                document.getElementById('myModal').style.display = 'flex';

                // Busca la orden completa correspondiente al 'orderId' dentro del array global 'window.allOrders'.
                const selectedOrder = window.allOrders.find(order => order.id === parseInt(orderId)) || {};

                try {
                    // Obtiene el contenido del SVG
                    const response = await fetch('Premium_Freight.svg');
                    const svgText = await response.text();

                    // Crea un elemento <div> temporal para manipular el SVG
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = svgText;

                    // Rellena los campos del SVG con los datos de la orden
                    for (const [svgId, orderKey] of Object.entries(svgMap)) {
                        const element = tempDiv.querySelector(`#${svgId}`);
                        if (element) {
                            element.textContent = selectedOrder[orderKey] || '';
                        } else {
                            console.warn(`Elemento SVG con ID ${svgId} no encontrado.`);
                        }
                    }

                    // Muestra el SVG actualizado en el modal
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

        // Asigna una función al evento 'onclick' del elemento con ID 'closeModal'.
        document.getElementById('closeModal').onclick = function() {
            // Oculta el modal estableciendo su estilo CSS 'display' a 'none'.
            document.getElementById('myModal').style.display = 'none';
        };

        // Asigna una función al evento 'onclick' del objeto global 'window'.
        // Esto detecta clics en cualquier parte de la ventana del navegador.
        window.onclick = function(event) {
            // Obtiene la referencia al elemento del modal.
            const modal = document.getElementById('myModal');
            // Comprueba si el elemento que originó el clic (event.target) es el propio modal (el fondo oscuro).
            if (event.target === modal) {
                // Oculta el modal.
                modal.style.display = 'none';
            }
        };

        // --- Lógica para guardar como PDF ---
        document.getElementById('savePdfBtn').onclick = async function() {
            try {
                // Muestra una alerta de carga
                Swal.fire({
                    title: 'Generando PDF',
                    html: 'Por favor espera mientras se procesa el documento...',
                    timerProgressBar: true,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    customClass: {
                        container: 'swal-on-top'
                    }
                });

                // Obtiene el ID de la orden seleccionada
                const selectedOrderId = sessionStorage.getItem('selectedOrderId');
                const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};

                // Obtiene el SVG limpio
                const response = await fetch('Premium_Freight.svg');
                const svgText = await response.text();

                // Crea un contenedor para el SVG
                const container = document.createElement('div');
                container.style.width = '816px';
                container.style.height = '1056px';
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.innerHTML = svgText;

                // Rellena los campos del SVG
                for (const [svgId, orderKey] of Object.entries(svgMap)) {
                    const element = container.querySelector(`#${svgId}`);
                    if (element) {
                        element.textContent = selectedOrder[orderKey] || '';
                    } else {
                        console.warn(`Elemento SVG con ID ${svgId} no encontrado para PDF.`);
                    }
                }

                document.body.appendChild(container);

                // Da tiempo al navegador para renderizar el SVG
                await new Promise(resolve => setTimeout(resolve, 200));

                // Captura el SVG como imagen
                const canvas = await html2canvas(container, {
                    scale: 2,
                    logging: true,
                    useCORS: true,
                    allowTaint: true
                });

                // Crea el PDF
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

                // Muestra mensaje de éxito
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
                    customClass: {
                        container: 'swal-on-top'
                    }
                });
            }
        };
        if (order.status_id === order.approval_id) {
            document.getElementById('approveBtn').onclick = async function() {
                getElementById('approveBtn').style= "block"; // Muestra el botón de aprobar
                getElementById('approveBtn').disabled = true; // Desabilita el botón de aprobar
                getElementById('rejectBtn').style= "none"; // Oculta el botón de rechazar
                // Obtiene el ID de la orden seleccionada
                const selectedOrderId = sessionStorage.getItem('selectedOrderId');
                const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
                
                try {
                    // Muestra indicador de carga
                    Swal.fire({
                        title: 'Procesando...',
                        text: 'Actualizando estado de la orden',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    
                    // Incrementa el status_id localmente
                    const newStatusId = selectedOrder.status_id + 1;
                    
                    // Prepara los datos para enviar al servidor
                    const updateData = {
                        orderId: selectedOrder.id,
                        newStatusId: newStatusId
                    };
                    
                    // Envía la actualización al servidor
                    const response = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updateData)
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Actualiza el objeto local
                        selectedOrder.status_id = newStatusId;
                        
                        // Mostrar mensaje de éxito
                        Swal.fire({
                            icon: 'success',
                            title: 'Orden aprobada',
                            text: `La orden ${selectedOrderId} ha sido aprobada correctamente.`,
                            confirmButtonText: 'Aceptar',
                            customClass: {
                                container: 'swal-on-top'
                            }
                        });
                        
                        // Opcional: Actualizar la vista sin recargar la página
                        // Podrías volver a llamar a createCards() aquí o simplemente cerrar el modal
                        document.getElementById('myModal').style.display = 'none';
                        
                        // Si quieres recargar los datos actualizados:
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
                        customClass: {
                            container: 'swal-on-top'
                        }
                    });
                }
            };
        }



        document.getElementById('rejectBtn').onclick = async function() {
            // Obtiene el ID de la orden seleccionada
            const selectedOrderId = sessionStorage.getItem('selectedOrderId');
            const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};

            // Aquí puedes agregar la lógica para rechazar la orden
            // Por ejemplo, enviar una solicitud al servidor para actualizar el estado de la orden

            Swal.fire({
                icon: 'error',
                title: 'Orden rechazada',
                text: `La orden ${selectedOrderId} ha sido rechazada.`,
                confirmButtonText: 'Aceptar',
                customClass: {
                    container: 'swal-on-top'
                }
            });
        }

        // Listener adicional para cerrar el modal
        document.addEventListener('click', function(e) {
            if (e.target.id === 'closeModal' || e.target.id === 'myModal') {
                document.getElementById('myModal').style.display = 'none';
            }
        });
    }
});

