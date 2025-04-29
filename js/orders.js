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
                <td>${order.planta || ''}</td>               // Celda para la planta
                <td>${order.code_planta || ''}</td>         // Celda para el código de planta
                <td>${order.transport || ''}</td>           // Celda para el tipo de transporte
                <td>${order.in_out_bound || ''}</td>        // Celda para Inbound/Outbound
                <td>${order.cost_euros || ''}</td>          // Celda para el costo en euros
                <td>${order.area || ''}</td>                // Celda para el área
                <td>${order.int_ext || ''}</td>             // Celda para Interno/Externo
                <td>${order.paid_by || ''}</td>             // Celda para quién paga
                <td>${order.category_cause || ''}</td>      // Celda para la categoría/causa
                <td>${order.status_name || ''}</td>      // Celda para el estado del proyecto
                <td>${order.recovery || ''}</td>           // Celda para la recuperación
                <td>${order.description || ''}</td>         // Celda para la descripción
                <!-- SHIP FROM -->                       // Comentario HTML indicando sección de origen
                <td>${order.origin_company_name || ''}</td> // Celda para nombre de compañía origen
                <td>${order.origin_city || ''}</td>         // Celda para ciudad de origen
                <td>${order.origin_state || ''}</td>        // Celda para estado de origen
                <td>${order.origin_zip || ''}</td>          // Celda para código postal de origen
                <!-- DESTINATION -->                     // Comentario HTML indicando sección de destino
                <td>${order.destiny_company_name || ''}</td>// Celda para nombre de compañía destino
                <td>${order.destiny_city || ''}</td>        // Celda para ciudad de destino
                <td>${order.destiny_state || ''}</td>       // Celda para estado de destino
                <td>${order.destiny_zip || ''}</td>         // Celda para código postal de destino
                <!-- ORDER -->                           // Comentario HTML indicando sección de la orden
                <td>${order.weight || ''}</td>             // Celda para el peso
                <td>${order.measures || ''}</td>           // Celda para las medidas
                <td>${order.products || ''}</td>           // Celda para los productos
                <!-- CARRIER -->                         // Comentario HTML indicando sección del transportista
                <td>${order.carrier || ''}</td>           // Celda para el transportista
                <td>${order.quoted_cost || ''}</td>        // Celda para el costo cotizado
                <td>${order.reference || ''}</td>           // Celda para la referencia
                <td>${order.reference_number || ''}</td>    // Celda para el número de referencia
            `;
            // Añade la fila (<tr>) recién creada y rellenada como un hijo del elemento <tbody> de la tabla.
            // Esto hace que la fila sea visible en la página web.
            tbody.appendChild(row);
        });
    }

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
    };

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
            // Comprueba si la propiedad 'status_name' de la orden es igual a "Cerrada".
            // Tipos, (1.- nuevo, 2.- revison, 3.- aprobado, 4.- rechazado )
            if(order.status_name == "aprobado"){
                // Si el estado es "Cerrada", cambia el color de fondo de la tarjeta a verde.
                card.style.backgroundColor= "green";
            }
            if(order.status_name == "nuevo"){
                // Si el estado es "Cerrada", cambia el color de fondo de la tarjeta a azul.
                card.style.backgroundColor= "white";
            }
            if(order.status_name == "revision"){
                card.style.backgroundColor= "yellow";
            }
            if(order.status_name == "rechazado"){
                card.style.backgroundColor= "red";
            }

            const falta = '';
            let limit = order.required_auth_level;
            while (order.status_id > limit) {
                if (order.status_id == 0) {
                    falta = 'Falta: Logistic Manager';
                }else if (order.status_id == 1) {
                    falta = 'Falta: Controlling';
                } else if (order.status_id == 2) {
                    falta = 'Falta: Plant Manager';
                } else if (order.status_id == 3) {
                    falta = 'Falta: Senior Manager Logistic';
                } else if (order.status_id == 4) {
                    falta = 'Falta: Senior Manager Logistics Division';
                } else if (order.status_id == 5) {
                    falta = 'Falta: SR VP Regional';
                } else if (order.status_id == 6) {
                    falta = 'Falta: Division Controlling Regional';
                }
            }

            // Define el contenido HTML interno de la tarjeta usando template literals.
            // Incluye el folio (ID de la orden), el número de semana (CW), la descripción,
            // un texto fijo y un botón "Ver".
            // El botón "Ver" tiene una clase 'ver-btn' para identificarlo y un atributo 'data-order-id'
            // que almacena el ID único de la orden asociada a esta tarjeta.
            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Folio: ${order.id}</h5>
                    <h6 class="card-subtitle">CW: ${semana}</h6>
                    <p class="card-text">${order.description || ''}</p>
                    <p class= "card-p">${falta}</p>
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
                    title: 'Cargando', // Título de la alerta.
                    html: 'Por favor espera mientras se carga el documento...', // Mensaje en HTML.
                    timer: 2000, // <-- Usa la opción timer para cerrar automáticamente después de 2000ms (2 segundos)
                    timerProgressBar: true, // Muestra una barra de progreso basada en el tiempo (si se define 'timer').
                    didOpen: () => {
                        Swal.showLoading(); // Muestra el icono de animación de carga de SweetAlert2.
                    },
                    allowOutsideClick: false, // Impide que el usuario cierre la alerta haciendo clic fuera de ella.
                    allowEscapeKey: false,    // Impide que el usuario cierre la alerta presionando la tecla Escape.
                    allowEnterKey: false,   // Impide que el usuario cierre la alerta presionando la tecla Enter.
                    customClass: {
                        container: 'swal-on-top' // Clase para asegurar visibilidad sobre el modal.
                    }
                    // Se elimina el setTimeout incorrecto de aquí
                });
                // Se elimina el }); extra que cerraba el listener prematuramente

                // Muestra el modal (una ventana emergente definida en el HTML) cambiando su estilo CSS 'display' a 'flex'.
                // Se asume que el modal tiene el ID 'myModal'.
                document.getElementById('myModal').style.display = 'flex';

                // --- Lógica para la vista previa del SVG en el modal ---
                // Busca la orden completa correspondiente al 'orderId' dentro del array global 'window.allOrders'.
                // El método find() devuelve el primer elemento que cumple la condición (order.id == orderId).
                // Se usa '==' para comparación flexible (puede convertir tipos), aunque '===' (comparación estricta) sería más seguro si los IDs son siempre del mismo tipo.
                // Si no se encuentra ninguna orden (poco probable si el botón existe), se asigna un objeto vacío {} para evitar errores.
                const selectedOrder = window.allOrders.find(order => order.id == orderId) || {};

                // Define un objeto 'svgMap' que mapea los IDs de elementos dentro del archivo SVG
                // a las claves (nombres de propiedad) correspondientes en el objeto 'selectedOrder'.
                // Esto permite rellenar dinámicamente el SVG con los datos de la orden seleccionada.
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
                    'IssuerValue': 'creator_name', // Asume que la propiedad 'creator_name' existe en el objeto 'order'.
                    'ManagerOPSDivisionValue': 'creator_role', // Asume que la propiedad 'creator_role' existe.
                    'PlantCValue': 'planta',
                    'PlantCodeValue': 'code_planta',
                    'PlantManagerValue': 'approver_name', // Asume que la propiedad 'approver_name' existe.
                    'ProductValue': 'products',
                    'ProjectStatusValue': 'status_name',
                    'QuotedCostValue': 'quoted_cost',
                    'RecoveryValue': 'recovery',
                    'ReferenceNumberValue': 'reference_number',
                    'RequestingPlantValue': 'planta', // Nota: Mapeado a la misma propiedad que PlantCValue.
                    'RootCauseValue': 'category_cause',
                    'SDestValue': 'destiny_state', // Nota: Duplicado con StateDestValue. Se usará el último que se procese o el que encuentre primero el querySelector.
                    'SRVPRegionalValue': 'creator_role', // Nota: Duplicado con ManagerOPSDivisionValue.
                    'SeniorManagerValue': 'approver_role', // Asume que la propiedad 'approver_role' existe.
                    'StateDestValue': 'destiny_state',
                    'StateShipValue': 'origin_state',
                    'TransportValue': 'transport',
                    'WeightValue': 'weight',
                    'ZIPDestValue': 'destiny_zip',
                    'ZIPShipValue': 'origin_zip'
                };

                // Realiza una petición fetch para obtener el contenido del archivo SVG llamado 'Premium_Freight.svg'.
                // Se asume que este archivo está en la misma carpeta o en una ruta accesible relativa a la página HTML.
                // 'await' pausa la ejecución de la función hasta que la promesa de fetch se resuelva (se reciba la respuesta).
                const response = await fetch('Premium_Freight.svg');
                // Lee el cuerpo de la respuesta como texto plano (el código fuente del SVG).
                // 'await' pausa hasta que el texto esté completamente leído.
                const svgText = await response.text();

                // Crea un elemento <div> temporal en memoria. No se añade al DOM visible.
                // Se usará para parsear y manipular el SVG sin afectar directamente la página.
                const tempDiv = document.createElement('div');
                // Asigna el texto del SVG obtenido como el contenido HTML interno del div temporal.
                // El navegador parseará esto como si fuera HTML, creando la estructura DOM del SVG dentro del div.
                tempDiv.innerHTML = svgText;

                // Itera sobre cada par [clave, valor] del objeto 'svgMap'.
                // 'svgId' será el ID del elemento SVG (ej. 'AreaOfResponsabilityValue').
                // 'orderKey' será la clave correspondiente en el objeto 'selectedOrder' (ej. 'area').
                for (const [svgId, orderKey] of Object.entries(svgMap)) {
                    // Busca dentro del 'tempDiv' un elemento que tenga el ID igual a 'svgId'.
                    // Se usa querySelector con la sintaxis de selector CSS `#id`.
                    const element = tempDiv.querySelector(`#${svgId}`);
                    // Verifica si se encontró un elemento con ese ID.
                    if (element) {
                        // Si se encontró, actualiza su contenido de texto (textContent).
                        // Se asigna el valor de la propiedad correspondiente de 'selectedOrder' (ej. selectedOrder['area']).
                        // Se usa el operador OR (||) con '' para mostrar una cadena vacía si el valor es null, undefined, etc.
                        element.textContent = selectedOrder[orderKey] || '';
                    } else {
                        // Si no se encontró un elemento con el ID esperado, muestra una advertencia en la consola.
                        // Esto ayuda a depurar si hay errores en los IDs del SVG o en el mapeo 'svgMap'.
                        console.warn(`Elemento SVG con ID ${svgId} no encontrado.`);
                    }
                }

                // Obtiene la referencia al elemento HTML dentro del modal que actuará como contenedor para la vista previa del SVG.
                // Se asume que este contenedor tiene el ID 'svgPreview'.
                // Asigna el HTML interno del 'tempDiv' (que ahora contiene el SVG modificado con los datos de la orden)
                // como el contenido HTML del contenedor 'svgPreview'. Esto muestra el SVG actualizado en el modal.
                document.getElementById('svgPreview').innerHTML = tempDiv.innerHTML;
            }); // <-- Este es el cierre correcto del event listener 'click'
        });

        // --- Lógica de manejo del Modal ---

        // El siguiente código está comentado, sugiere que inicialmente había un botón genérico para abrir el modal,
        // pero ahora el modal se abre específicamente desde los botones "Ver" de las tarjetas.
        // document.getElementById('openModal').onclick = function() {
        //     document.getElementById('myModal').style.display = 'flex';
        // };

        // Asigna una función al evento 'onclick' del elemento con ID 'closeModal'.
        // Se asume que 'closeModal' es el ID del botón o icono para cerrar el modal.
        document.getElementById('closeModal').onclick = function() {
            // Oculta el modal estableciendo su estilo CSS 'display' a 'none'.
            document.getElementById('myModal').style.display = 'none';
        };

        // Asigna una función al evento 'onclick' del objeto global 'window'.
        // Esto detecta clics en cualquier parte de la ventana del navegador.
        window.onclick = function(event) {
            // Obtiene la referencia al elemento del modal.
            var modal = document.getElementById('myModal');
            // Comprueba si el elemento que originó el clic (event.target) es el propio modal (el fondo oscuro).
            // Si el usuario hace clic fuera del contenido del modal, pero sobre el fondo...
            if (event.target == modal) {
                // Oculta el modal.
                modal.style.display = 'none';
            }
        };

        // --- Lógica para guardar como PDF ---

        // Asigna una función asíncrona al evento 'onclick' del elemento con ID 'savePdfBtn'.
        // Se asume que 'savePdfBtn' es el ID del botón "Guardar PDF" dentro del modal.
        document.getElementById('savePdfBtn').onclick = async function() {
            // Inicia un bloque try...catch para manejar posibles errores durante la generación del PDF.
            try {
                // Muestra una alerta de carga utilizando la librería SweetAlert2 (Swal).
                Swal.fire({
                    title: 'Generando PDF', // Título de la alerta.
                    html: 'Por favor espera mientras se procesa el documento...', // Mensaje en HTML.
                    timerProgressBar: true, // Muestra una barra de progreso basada en el tiempo (si se define 'timer').
                    // Función que se ejecuta cuando la alerta se abre.
                    didOpen: () => {
                        Swal.showLoading(); // Muestra el icono de animación de carga de SweetAlert2.
                    },
                    allowOutsideClick: false, // Impide que el usuario cierre la alerta haciendo clic fuera de ella.
                    allowEscapeKey: false,    // Impide que el usuario cierre la alerta presionando la tecla Escape.
                    allowEnterKey: false,   // Impide que el usuario cierre la alerta presionando la tecla Enter.
                    customClass: {
                        // Añade una clase CSS personalizada al contenedor de la alerta.
                        // 'swal-on-top' podría usarse para asegurar que la alerta tenga un z-index alto y se muestre sobre el modal.
                        container: 'swal-on-top'
                    }
                });

                // Obtiene el ID de la orden seleccionada que fue guardado previamente en sessionStorage.
                const selectedOrderId = sessionStorage.getItem('selectedOrderId');
                // Busca el objeto de la orden completa correspondiente a ese ID en el array global 'window.allOrders'.
                // Se usa '|| {}' como fallback por si el ID no se encuentra o sessionStorage está vacío.
                const selectedOrder = window.allOrders.find(order => order.id == selectedOrderId) || {};

                // Define el mapeo SVG-a-propiedad de orden. Es idéntico al usado para la vista previa.
                // Sería ideal definir este mapeo una sola vez fuera de ambas funciones para evitar repetición (principio DRY).
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

                // Realiza otra petición fetch para obtener el contenido del archivo SVG.
                // Es necesario volver a cargarlo para tener una versión "limpia" del SVG original.
                const response = await fetch('Premium_Freight.svg');
                // Lee la respuesta como texto.
                const svgText = await response.text();

                // Crea un nuevo elemento <div> temporal para renderizar el SVG fuera de la pantalla.
                const container = document.createElement('div');
                // Establece dimensiones fijas para el contenedor, aproximando el tamaño de una página Carta (8.5x11 pulgadas)
                // a 96 DPI (puntos por pulgada), que es una resolución común en pantallas. 8.5*96=816, 11*96=1056.
                container.style.width = '816px';
                container.style.height = '1056px';
                // Posiciona el contenedor fuera del área visible del navegador para que no interfiera con la interfaz.
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                // Asigna el texto del SVG original como contenido HTML del contenedor.
                container.innerHTML = svgText;

                // Itera sobre el mapeo y actualiza los elementos dentro del SVG en el 'container' temporal
                // con los datos de la 'selectedOrder', igual que se hizo para la vista previa.
                for (const [svgId, orderKey] of Object.entries(svgMap)) {
                    const element = container.querySelector(`#${svgId}`);
                    if (element) {
                        element.textContent = selectedOrder[orderKey] || '';
                    } else {
                        // Muestra una advertencia si un ID no se encuentra, específico para la generación de PDF.
                        console.warn(`Elemento SVG con ID ${svgId} no encontrado para PDF.`);
                    }
                }

                // Añade el contenedor temporal (con el SVG relleno) al cuerpo (body) del documento HTML.
                // Esto es necesario para que el navegador renderice el SVG y html2canvas pueda "capturarlo".
                document.body.appendChild(container);

                // Espera un breve momento (200 milisegundos) usando una Promesa y setTimeout.
                // Esto da tiempo al navegador para renderizar completamente el SVG dentro del contenedor
                // antes de que html2canvas intente capturarlo. Sin esta pausa, la captura podría estar incompleta o vacía.
                await new Promise(resolve => setTimeout(resolve, 200));

                // Utiliza la librería html2canvas para tomar una "captura de pantalla" del 'container' renderizado.
                // El resultado es un objeto <canvas> de HTML5.
                const canvas = await html2canvas(container, {
                    scale: 2, // Aumenta la escala de la captura al doble (mejora la resolución/calidad del PDF final).
                    logging: true, // Habilita mensajes de depuración de html2canvas en la consola.
                    useCORS: true, // Permite cargar recursos (como imágenes) desde otros dominios si estuvieran referenciados en el SVG.
                    allowTaint: true // Relacionado con CORS, permite que el canvas capture contenido de otros orígenes sin marcarse como "tainted", aunque puede tener implicaciones de seguridad.
                });

                // Obtiene la clase jsPDF del objeto global 'window.jspdf'.
                // Se asume que la librería jsPDF ha sido incluida en la página HTML (ej. mediante una etiqueta <script>).
                const { jsPDF } = window.jspdf;
                // Crea una nueva instancia de jsPDF para generar el documento PDF.
                const pdf = new jsPDF({
                    orientation: 'portrait', // Orientación de la página: vertical ('portrait') u horizontal ('landscape').
                    unit: 'pt', // Unidad de medida para las dimensiones: 'pt' (puntos), 'mm', 'cm', 'in'.
                    format: [816, 1056] // Formato de la página. Aquí se usa un tamaño personalizado que coincide con las dimensiones del contenedor SVG.
                                        // También se pueden usar formatos estándar como 'a4', 'letter'.
                });

                // Convierte el contenido del elemento <canvas> a una imagen en formato PNG, representada como una Data URL.
                // Una Data URL es una cadena de texto que codifica los datos de la imagen directamente.
                const imgData = canvas.toDataURL('image/png');
                // Añade la imagen (captura del SVG) al documento PDF.
                // Parámetros: datos de la imagen, formato ('PNG'), posición X (0), posición Y (0), ancho (816 pt), alto (1056 pt).
                // La imagen ocupará toda la página del PDF.
                pdf.addImage(imgData, 'PNG', 0, 0, 816, 1056);

                // Genera el contenido del PDF como un Blob (Binary Large Object).
                // Un Blob representa datos binarios inmutables.
                const pdfBlob = pdf.output('blob');
                // Crea una URL temporal (objeto URL) que apunta al Blob del PDF en la memoria del navegador.
                // Esta URL se puede usar para mostrar, enlazar o descargar el Blob.
                const pdfUrl = URL.createObjectURL(pdfBlob);

                // Define el nombre de archivo que se sugerirá al usuario para la descarga.
                const fileName = 'PremiumFreight.pdf';
                // Utiliza el método save() de jsPDF para iniciar la descarga del archivo PDF en el navegador del usuario.
                // Le pasa el nombre de archivo deseado.
                pdf.save(fileName);

                // Elimina el contenedor temporal ('container') del cuerpo del documento.
                // Ya no es necesario una vez que se ha generado el PDF.
                document.body.removeChild(container);

                // Cierra la alerta de carga de SweetAlert2 y muestra una nueva alerta de éxito.
                Swal.fire({
                    icon: 'success', // Icono de éxito.
                    title: '¡PDF generado con éxito!', // Título de la alerta.
                    html: `El archivo <b>${fileName}</b> se ha descargado correctamente.`, // Mensaje HTML.
                    showCancelButton: true, // Muestra un segundo botón (generalmente "Cancelar").
                    confirmButtonText: 'Aceptar', // Texto del botón de confirmación.
                    cancelButtonText: 'Ver PDF', // Texto del botón de cancelar (aquí se usa para ofrecer la opción de ver el PDF).
                    reverseButtons: true, // Invierte el orden visual de los botones (Confirmar a la izquierda, Cancelar a la derecha).
                    customClass: {
                        container: 'swal-on-top', // Clase para asegurar visibilidad sobre el modal.
                        confirmButton: 'btn btn-success', // Clases de Bootstrap para estilizar el botón de confirmar.
                        cancelButton: 'btn btn-primary' // Clases de Bootstrap para estilizar el botón de cancelar/ver.
                    }
                }).then((result) => { // El método .then() se ejecuta cuando el usuario cierra la alerta de éxito.
                                      // 'result' contiene información sobre cómo se cerró la alerta (ej. si se hizo clic en confirmar).
                    // Oculta el modal principal (el que contiene la vista previa y el botón de guardar).
                    document.getElementById('myModal').style.display = 'none';
                    // Comprueba si la alerta NO fue cerrada haciendo clic en el botón de confirmación.
                    // Si 'result.isConfirmed' es false, significa que se hizo clic en el botón "Ver PDF" (cancelButton).
                    if (!result.isConfirmed) {
                        // Abre el PDF recién generado en una nueva pestaña del navegador.
                        // Utiliza la URL temporal del Blob creada anteriormente.
                        window.open(pdfUrl, '_blank');
                    }
                    // Libera la memoria asociada a la URL del objeto Blob después de un breve retraso (100ms).
                    // Es una buena práctica revocar las Object URLs cuando ya no se necesitan para evitar fugas de memoria.
                    // El retraso asegura que el navegador tenga tiempo de iniciar la apertura/descarga antes de que la URL sea invalidada.
                    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
                });

            // Bloque catch: se ejecuta si ocurre cualquier error dentro del bloque try.
            } catch (error) {
                // Muestra el error detallado en la consola del navegador para depuración.
                console.error('Error al generar el PDF:', error);
                // Muestra una alerta de error al usuario usando SweetAlert2.
                Swal.fire({
                    icon: 'error', // Icono de error.
                    title: 'Error al generar el PDF', // Título de la alerta.
                    text: error.message, // Muestra el mensaje de error específico que ocurrió.
                    confirmButtonText: 'Entendido', // Texto del botón para cerrar la alerta.
                    customClass: {
                        container: 'swal-on-top' // Clase para asegurar visibilidad sobre el modal.
                    }
                });
            }
        }; // Fin del event listener onclick para 'savePdfBtn'

        // --- Listener adicional para cerrar el modal (alternativa a window.onclick) ---
        // Añade un event listener al nivel del documento completo para capturar todos los clics.
        // Este enfoque puede ser más eficiente que el 'window.onclick' en algunos casos,
        // y también permite manejar clics en elementos específicos como el botón de cerrar.
        // Sin embargo, puede ser redundante si 'window.onclick' ya está funcionando correctamente.
        document.addEventListener('click', function(e) {
            // Comprueba si el ID del elemento que originó el clic (e.target) es exactamente 'closeModal'.
            if (e.target.id === 'closeModal') {
                // Si es el botón de cerrar, oculta el modal.
                document.getElementById('myModal').style.display = 'none';
            }
            // Comprueba si el ID del elemento que originó el clic es exactamente 'myModal'.
            // Esto cubre el caso de hacer clic en el fondo del modal (similar a window.onclick).
            if (e.target.id === 'myModal') {
                // Si es el fondo del modal, oculta el modal.
                document.getElementById('myModal').style.display = 'none';
            }
        }); // Fin del event listener de clic en el documento

    }); // Fin del event listener 'DOMContentLoaded'

