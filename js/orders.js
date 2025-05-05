// Espera a que el contenido del DOM esté completamente cargado antes de ejecutar el script.
document.addEventListener('DOMContentLoaded', function () {
    // --- Mapeo de campos para el SVG ---
    // Define un objeto que mapea los IDs de los elementos SVG a las claves correspondientes en el objeto de datos de la orden.
    // Esto se usa para poblar dinámicamente el SVG con la información de la orden seleccionada.
    const svgMap = {
        'AreaOfResponsabilityValue': 'area', // Mapea el ID 'AreaOfResponsabilityValue' del SVG al campo 'area' de la orden.
        'CarrierNameValue': 'carrier', // Mapea 'CarrierNameValue' a 'carrier'.
        'CityDestValue': 'destiny_city', // Mapea 'CityDestValue' a 'destiny_city'.
        'CityShipValue': 'origin_city', // Mapea 'CityShipValue' a 'origin_city'.
        'CompanyNameDestValue': 'destiny_company_name', // Mapea 'CompanyNameDestValue' a 'destiny_company_name'.
        'CompanyNameShipValue': 'origin_company_name', // Mapea 'CompanyNameShipValue' a 'origin_company_name'.
        'CostInEurosValue': 'cost_euros', // Mapea 'CostInEurosValue' a 'cost_euros'.
        'CostPaidByValue': 'paid_by', // Mapea 'CostPaidByValue' a 'paid_by'.
        'DateValue': 'date', // Mantiene el mapeo original para la fecha. Se formateará por separado.
        'DescriptionAndRootCauseValue': 'description', // Mapea 'DescriptionAndRootCauseValue' a 'description'.
        'InExtValue': 'int_ext', // Mapea 'InExtValue' a 'int_ext'.
        'InOutBoundValue': 'in_out_bound', // Mapea 'InOutBoundValue' a 'in_out_bound'.
        'IssuerValue': 'creator_name', // Mapea 'IssuerValue' a 'creator_name'.
        'PlantCValue': 'planta', // Mapea 'PlantCValue' a 'planta'.
        'PlantCodeValue': 'code_planta', // Mapea 'PlantCodeValue' a 'code_planta'.
        'PlantManagerValue': '', // Placeholder, ajustar si es necesario. Campo sin mapeo directo por ahora.
        'ProductValue': 'products', // Mapea 'ProductValue' a 'products'.
        'ProjectStatusValue': 'project_status', // Placeholder, ajustar si es necesario. Campo sin mapeo directo por ahora.
        // Mapeo especial para 'QuotedCostValue'. Usa una función para formatear el costo con la moneda.
        'QuotedCostValue': (order) => `$ ${order.quoted_cost || '0'} ${order.moneda || 'MXN'}`,
        'RecoveryValue': 'recovery', // Mapea 'RecoveryValue' a 'recovery'.
        'ReferenceNumberValue': 'reference_number', // Mapea 'ReferenceNumberValue' a 'reference_number'.
        'RequestingPlantValue': 'planta', // Mapea 'RequestingPlantValue' a 'planta'.
        'RootCauseValue': 'category_cause', // Mapea 'RootCauseValue' a 'category_cause'.
        'ManagerOPSDivisionValue': '', // Placeholder, ajustar si es necesario. Campo sin mapeo directo por ahora.
        'SRVPRegionalValue': '', // Placeholder, ajustar si es necesario. Campo sin mapeo directo por ahora.
        'SeniorManagerValue': '', // Placeholder, ajustar si es necesario. Campo sin mapeo directo por ahora.
        'StateDestValue': 'destiny_state', // Mapea 'StateDestValue' a 'destiny_state'.
        'StateShipValue': 'origin_state', // Mapea 'StateShipValue' a 'origin_state'.
        'TransportValue': 'transport', // Mapea 'TransportValue' a 'transport'.
        'WeightValue': 'weight', // Mapea 'WeightValue' a 'weight'.
        'ZIPDestValue': 'destiny_zip', // Mapea 'ZIPDestValue' a 'destiny_zip'.
        'ZIPShipValue': 'origin_zip' // Mapea 'ZIPShipValue' a 'origin_zip'.
    };

    // --- Función para formatear fechas sin la hora ---
    // Recibe una cadena de fecha y la devuelve en formato MM/DD/YYYY.
    function formatDate(dateString) {
        // Verifica si la cadena de fecha es nula o vacía. Si lo es, devuelve una cadena vacía.
        if (!dateString) return '';
        try {
            // Intenta crear un objeto Date a partir de la cadena proporcionada.
            const date = new Date(dateString);
            // Verifica si el objeto Date es inválido (por ejemplo, si la cadena no era un formato de fecha reconocible).
            // Si es inválido, devuelve la cadena original para evitar errores.
            if (isNaN(date.getTime())) return dateString; 
            
            // Formatea la fecha al formato MM/DD/YYYY usando la configuración regional 'en-US'.
            return date.toLocaleDateString('en-US', {
                day: '2-digit', // Asegura que el día tenga dos dígitos (ej. 05).
                month: '2-digit', // Asegura que el mes tenga dos dígitos (ej. 09).
                year: 'numeric' // Asegura que el año se muestre completo (ej. 2025).
            });
        } catch (e) {
            // Si ocurre un error durante el proceso de formateo, lo registra en la consola.
            console.error("Error al formatear la fecha:", dateString, e);
            // Devuelve la cadena de fecha original en caso de error.
            return dateString;
        }
    }

    // --- Cargar datos iniciales ---
    // Realiza una petición fetch a la API para obtener la lista de órdenes.
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php')
        .then(response => response.json()) // Convierte la respuesta a formato JSON.
        .then(data => {
            // Verifica si la respuesta contiene datos válidos.
            if (data && data.data) {
                // Si hay datos, llama a la función createCards para mostrar las órdenes.
                createCards(data.data);
            } else {
                // Si no hay datos o el formato es incorrecto, muestra un error en la consola.
                console.error('Error: No se recibieron datos de la API o el formato es incorrecto.');
                // Opcionalmente, se podría mostrar un mensaje de error al usuario en la interfaz.
            }
        })
        .catch(error => console.error('Error al cargar los datos:', error)); // Captura y muestra errores de la petición fetch.

    // --- Calcular número de semana ISO 8601 ---
    // Recibe una cadena de fecha y devuelve el número de semana del año según la norma ISO 8601.
    function getWeekNumber(dateString) {
        // Si la fecha es nula o indefinida, devuelve 'N/A'.
        if (!dateString) return 'N/A'; 
        try {
            // Crea un objeto Date a partir de la cadena.
            const date = new Date(dateString);
            // Verifica si la fecha es válida.
            if (isNaN(date.getTime())) { 
                return 'N/A'; // Devuelve 'N/A' si la fecha no es válida.
            }
            // Obtiene el día de la semana (0=Domingo, 1=Lunes,... 6=Sábado). Se ajusta para que Lunes sea 1 y Domingo sea 7.
            const dayNum = date.getDay() || 7;
            // Ajusta la fecha al jueves de la misma semana. Esto es parte del cálculo ISO 8601.
            date.setDate(date.getDate() + 4 - dayNum);
            // Obtiene el primer día del año de la fecha ajustada.
            const yearStart = new Date(date.getFullYear(), 0, 1);
            // Calcula el número de semana.
            const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
            return weekNum; // Devuelve el número de semana calculado.
        } catch (e) {
            // Si ocurre un error, lo registra en la consola.
            console.error("Error al calcular el número de semana para:", dateString, e);
            return 'N/A'; // Devuelve 'N/A' en caso de error.
        }
    }

    // --- Función para ajustar el texto en un elemento SVG ---
    // Ajusta (envuelve) el texto largo dentro del elemento SVG especificado para que quepa en múltiples líneas.
    function wrapSVGText() {
        // Obtiene el elemento SVG de texto por su ID.
        const textElement = document.getElementById("DescriptionAndRootCauseValue");
        // Si el elemento no existe, termina la función.
        if (!textElement) return;
        
        // Obtiene el contenido de texto actual y elimina espacios en blanco al inicio y final.
        const text = textElement.textContent.trim();
        // Si no hay texto, termina la función.
        if (!text) return;
        
        // Obtiene los atributos originales de posición (x, y) y tamaño de fuente.
        const x = textElement.getAttribute("x");
        const y = textElement.getAttribute("y");
        const fontSize = parseFloat(textElement.style.fontSize || "3.175px"); // Usa 3.175px como valor por defecto si no está definido.
        
        // Calcula el espaciado entre líneas (interlineado), generalmente 1.2-1.5 veces el tamaño de fuente.
        const lineHeight = fontSize * 1.3;
        
        // Limpia el contenido actual del elemento de texto.
        textElement.textContent = "";
        
        // Define el número máximo de caracteres por línea.
        const maxCharsPerLine = 101;
        
        // Divide el texto en palabras usando espacios como delimitadores.
        const words = text.split(/\s+/);
        let currentLine = ""; // Almacena la línea actual que se está construyendo.
        let firstLine = true; // Bandera para saber si es la primera línea (no necesita ajuste 'dy').
        
        // Procesa cada palabra.
        words.forEach(word => {
            // Comprueba si añadir la siguiente palabra excede el límite de caracteres por línea.
            if ((currentLine + " " + word).length > maxCharsPerLine && currentLine.length > 0) {
                // Si excede, crea un nuevo elemento <tspan> para la línea completada.
                const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                tspan.setAttribute("x", x); // Establece la posición horizontal.
                
                // Establece la posición vertical ('dy' para desplazamiento relativo).
                if (firstLine) {
                    // La primera línea no necesita ajuste 'dy'.
                    firstLine = false;
                } else {
                    // Las líneas siguientes se desplazan hacia abajo según el interlineado.
                    tspan.setAttribute("dy", `${lineHeight}px`);
                }
                
                tspan.textContent = currentLine; // Asigna el texto de la línea al tspan.
                textElement.appendChild(tspan); // Añade el tspan al elemento de texto principal.
                
                // Comienza una nueva línea con la palabra actual.
                currentLine = word;
            } else {
                // Si no excede, añade la palabra a la línea actual.
                if (currentLine.length > 0) {
                    // Añade un espacio si no es la primera palabra de la línea.
                    currentLine += " " + word;
                } else {
                    // Si es la primera palabra, simplemente la asigna.
                    currentLine = word;
                }
            }
        });
        
        // Añade la última línea si queda texto en currentLine.
        if (currentLine.length > 0) {
            const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tspan.setAttribute("x", x);
            
            // Aplica el desplazamiento vertical si no es la primera línea.
            if (!firstLine) {
                tspan.setAttribute("dy", `${lineHeight}px`);
            }
            
            tspan.textContent = currentLine;
            textElement.appendChild(tspan);
        }
    }

    // --- Crear tarjetas visuales para cada orden ---
    // Genera y muestra las tarjetas de resumen para cada orden en la interfaz.
    function createCards(orders) {
        // Obtiene el contenedor principal donde se añadirán las tarjetas.
        const mainCards = document.getElementById("card");
        // Si el contenedor no existe, muestra un error y termina.
        if (!mainCards) {
            console.error("Elemento con ID 'card' no encontrado.");
            return;
        }
        // Limpia el contenido existente en el contenedor de tarjetas.
        mainCards.innerHTML = ""; 
        
        // Itera sobre cada objeto de orden en el array 'orders'.
        orders.forEach(order => {
            // Calcula el número de semana para la fecha de la orden.
            const semana = getWeekNumber(order.date);
            // Crea un nuevo elemento div para la tarjeta.
            const card = document.createElement("div");
            // Asigna clases CSS para el estilo de la tarjeta.
            card.className = "card shadow rounded mx-2 mb-4";
            // Establece estilos CSS para el tamaño y la disposición.
            card.style.maxWidth = "265px";
            card.style.minHeight = "250px"; // Usa minHeight para consistencia.
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.justifyContent = "space-between"; // Distribuye el espacio verticalmente.

            // --- Colores basados en el estado ---
            // Obtiene el nombre del estado de la orden (en minúsculas y manejando nulos).
            const statusName = (order.status_name || '').toLowerCase();
            // Asigna un color de fondo a la tarjeta según el estado.
            if (statusName === "aprobado") card.style.backgroundColor = "#A7CAC3"; // Verde claro
            else if (statusName === "nuevo") card.style.backgroundColor = "#EAE8EB"; // Gris claro
            else if (statusName === "revision") card.style.backgroundColor = "#F3D1AB"; // Naranja claro
            else if (statusName === "rechazado") card.style.backgroundColor = "#E0A4AE"; // Rojo claro
            else card.style.backgroundColor = "#FFFFFF"; // Color por defecto (blanco).

            // --- Mensaje de estado de aprobación pendiente ---
            let falta = ''; // Variable para almacenar el mensaje de estado.
            // Obtiene el nivel de aprobación actual (puede ser null o un número).
            const approvalStatus = order.approval_status; 
            // Obtiene el nivel de autorización requerido (o 7 por defecto si no está definido).
            const requiredAuthLevel = order.required_auth_level || 7;

            // Comprueba si la orden está completamente aprobada.
            if (approvalStatus === null || approvalStatus >= requiredAuthLevel) { 
                 falta = 'Completamente Aprobado';
                 // Si está rechazada, sobrescribe el mensaje.
                 if (statusName === "rechazado") { 
                    falta = 'Orden Rechazada';
                 }
            // Comprueba si la orden está explícitamente rechazada (estado 99).
            } else if (approvalStatus === 99) {
                 falta = 'Orden Rechazada';
            } else {
                // Determina el siguiente aprobador requerido según el nivel actual.
                switch (Number(approvalStatus)) {
                    case 0: falta = 'Pendiente: Gerente Logística'; break;
                    case 1: falta = 'Pendiente: Controlling'; break;
                    case 2: falta = 'Pendiente: Gerente Planta'; break;
                    case 3: falta = 'Pendiente: Gerente Senior Logística'; break;
                    case 4: falta = 'Pendiente: Gerente Senior División Logística'; break;
                    case 5: falta = 'Pendiente: SR VP Regional'; break;
                    case 6: falta = 'Pendiente: Controlling División Regional'; break;
                    // Mensaje genérico si el estado no coincide con los casos anteriores.
                    default: falta = `Pendiente: Nivel ${approvalStatus + 1}`; 
                }
            }

            // --- Estructura HTML de la tarjeta ---
            // Define el contenido HTML interno de la tarjeta usando template literals.
            card.innerHTML = `
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">ID: ${order.id || 'N/A'}</h5> <!-- Muestra el ID de la orden -->
                    <h6 class="card-subtitle mb-2 text-muted">CW: ${semana}</h6> <!-- Muestra el número de semana -->
                    <!-- Muestra la descripción (limitada a 3 líneas con ellipsis) -->
                    <p class="card-text flex-grow-1" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                        ${order.description || 'Sin descripción'} 
                    </p>
                    <p class="card-p fw-bold">${falta}</p> <!-- Muestra el mensaje de estado de aprobación -->
                </div>
                <div class="card-footer bg-transparent border-0 text-center pb-3">
                     <!-- Botón para ver los detalles de la orden -->
                     <button class="btn btn-primary ver-btn" data-order-id="${order.id}">Ver</button>
                </div>
            `;
            // Añade la tarjeta creada al contenedor principal.
            mainCards.appendChild(card);
        });

        // Almacena todas las órdenes en una variable global para poder acceder a ellas desde el modal.
        window.allOrders = orders; 

        // --- Event listeners para los botones "Ver" ---
        // Selecciona todos los botones con la clase 'ver-btn' y añade un event listener a cada uno.
        document.querySelectorAll('.ver-btn').forEach(btn => {
            btn.addEventListener('click', async function () {
                // Obtiene el ID de la orden desde el atributo 'data-order-id' del botón.
                const orderId = this.getAttribute('data-order-id');
                // Almacena el ID de la orden seleccionada en sessionStorage para persistencia entre cargas.
                sessionStorage.setItem('selectedOrderId', orderId); 

                // Muestra una alerta de carga mientras se prepara el modal.
                Swal.fire({
                    title: 'Cargando',
                    html: 'Por favor espera mientras se carga el documento...',
                    timer: 1000, // Duración corta para feedback visual.
                    timerProgressBar: true,
                    didOpen: () => { Swal.showLoading(); }, // Muestra el icono de carga.
                    allowOutsideClick: false, // Evita cerrar la alerta haciendo clic fuera.
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    customClass: { container: 'swal-on-top' } // Asegura que la alerta esté por encima de otros elementos.
                });

                // Muestra el modal estableciendo su estilo 'display' a 'flex'.
                document.getElementById('myModal').style.display = 'flex'; 
                // Busca la orden seleccionada en el array global 'allOrders'.
                const selectedOrder = window.allOrders.find(order => order.id === parseInt(orderId)) || {}; // Usa un objeto vacío si no se encuentra.

                // --- Configurar botones Aprobar/Rechazar según nivel de usuario y estado de la orden ---
                const approveBtn = document.getElementById('approveBtn');
                const rejectBtn = document.getElementById('rejectBtn');

                // Comprueba si el nivel de autorización del usuario actual es el *siguiente* nivel requerido para aprobar.
                // Y si la orden no está ya rechazada (estado 99) o completamente aprobada.
                const isNextApprover = Number(selectedOrder.approval_status) === (Number(window.authorizationLevel) - 1);
                const isRejected = Number(selectedOrder.approval_status) === 99;
                const isFullyApproved = selectedOrder.approval_status === null || 
                                       Number(selectedOrder.approval_status) >= (selectedOrder.required_auth_level || 7);

                // Muestra u oculta los botones de Aprobar/Rechazar según las condiciones.
                if (isNextApprover && !isRejected && !isFullyApproved) {
                    approveBtn.style.display = "block"; // Muestra el botón Aprobar.
                    approveBtn.disabled = false; // Habilita el botón Aprobar.
                    rejectBtn.style.display = "block"; // Muestra el botón Rechazar.
                    rejectBtn.disabled = false; // Habilita el botón Rechazar.
                } else {
                    approveBtn.style.display = "none"; // Oculta el botón Aprobar.
                    rejectBtn.style.display = "none"; // Oculta el botón Rechazar.
                }

                // Registra información relevante en la consola para depuración.
                console.log('ID de Orden:', orderId);
                console.log('Estado de Orden Seleccionada:', selectedOrder.approval_status);
                console.log('Nivel de Autorización del Usuario:', window.authorizationLevel);
                console.log('Nivel de Autorización Requerido:', selectedOrder.required_auth_level);

                // --- Cargar y poblar SVG ---
                try {
                    // Realiza una petición fetch para obtener el contenido del archivo SVG.
                    const response = await fetch('PremiumFreight.svg');
                    // Si la respuesta no es exitosa (ej. 404 Not Found), lanza un error.
                    if (!response.ok) throw new Error(`Error HTTP! estado: ${response.status}`);
                    // Lee el contenido del SVG como texto.
                    const svgText = await response.text();

                    // Crea un div temporal para parsear el texto SVG y convertirlo en nodos DOM.
                    const tempDiv = document.createElement('div'); 
                    tempDiv.innerHTML = svgText;

                    // Itera sobre el mapeo 'svgMap' para poblar los elementos del SVG.
                    for (const [svgId, orderKey] of Object.entries(svgMap)) {
                        // Busca el elemento SVG dentro del div temporal usando su ID.
                        const element = tempDiv.querySelector(`#${svgId}`);
                        if (element) {
                            // Caso especial para el campo de fecha: usa la función formatDate.
                            if (svgId === 'DateValue') {
                                element.textContent = formatDate(selectedOrder.date);
                            // Si el mapeo es una función (ej. para QuotedCostValue), la ejecuta.
                            } else if (typeof orderKey === 'function') {
                                element.textContent = orderKey(selectedOrder);
                            } else {
                                // Comportamiento por defecto: asigna el valor del campo correspondiente de la orden.
                                // Usa '' (cadena vacía) si el campo no existe en la orden.
                                element.textContent = selectedOrder[orderKey] || '';
                            }
                        }
                    }
                    
                    // Muestra el SVG poblado en el área de previsualización del modal.
                    document.getElementById('svgPreview').innerHTML = tempDiv.innerHTML;
                    
                    // Aplica el ajuste de texto al campo de descripción después de poblar el SVG.
                    wrapSVGText();

                } catch (error) {
                    // Captura y maneja errores durante la carga o procesamiento del SVG.
                    console.error('Error al cargar o procesar el SVG:', error);
                    // Muestra una alerta de error al usuario.
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo cargar la previsualización del documento.',
                        customClass: { container: 'swal-on-top' }
                    });
                    // Oculta el modal si ocurre un error al cargar el SVG.
                    document.getElementById('myModal').style.display = 'none'; 
                }
            });
        });
    }

    // --- Cerrar modal ---
    // Añade un event listener al botón de cerrar (X) del modal.
    document.getElementById('closeModal').onclick = function () {
        // Oculta el modal estableciendo su estilo 'display' a 'none'.
        document.getElementById('myModal').style.display = 'none';
    };

    // Cierra el modal si se hace clic fuera de él (en el fondo oscuro).
    window.onclick = function (event) {
        const modal = document.getElementById('myModal');
        // Comprueba si el elemento clickeado es el propio modal (el fondo).
        if (event.target === modal) {
            modal.style.display = 'none'; // Oculta el modal.
        }
    };

    // --- Guardar como PDF ---
    // Añade un event listener al botón "Guardar como PDF".
    document.getElementById('savePdfBtn').onclick = async function () {
        try {
            // Muestra una alerta de progreso mientras se genera el PDF.
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

            // Obtiene el ID de la orden seleccionada desde sessionStorage.
            const selectedOrderId = sessionStorage.getItem('selectedOrderId');
            // Busca la orden correspondiente en el array global.
            const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
            // Carga de nuevo el template SVG (necesario para la renderización limpia en html2canvas).
            const response = await fetch('PremiumFreight.svg');
            if (!response.ok) throw new Error(`Error HTTP! estado: ${response.status}`);
            const svgText = await response.text();

            // --- Preparación para html2canvas ---
            // Crea un contenedor div fuera de la pantalla para renderizar el SVG.
            const container = document.createElement('div');
            // Establece dimensiones estándar de página (aproximadas en puntos).
            container.style.width = '816px'; 
            container.style.height = '1056px';
            // Posiciona el contenedor fuera de la vista del usuario.
            container.style.position = 'absolute';
            container.style.left = '-9999px'; 
            container.style.backgroundColor = 'white'; // Fondo blanco para el canvas.
            container.innerHTML = svgText; // Carga el template SVG en el contenedor.

            // Puebla el SVG dentro del contenedor off-screen con los datos de la orden.
            for (const [svgId, orderKey] of Object.entries(svgMap)) {
                const element = container.querySelector(`#${svgId}`);
                if (element) {
                    if (svgId === 'DateValue') {
                        element.textContent = formatDate(selectedOrder.date);
                    } else if (typeof orderKey === 'function') {
                        element.textContent = orderKey(selectedOrder);
                    } else {
                        element.textContent = selectedOrder[orderKey] || '';
                    }
                }
            }

            // Añade el contenedor al DOM para que html2canvas pueda renderizarlo.
            document.body.appendChild(container); 
            
            // --- Aplicar ajuste de texto al campo de descripción específicamente para el PDF ---
            // Busca el elemento de descripción dentro del contenedor off-screen.
            const descriptionElement = container.querySelector('#DescriptionAndRootCauseValue');
            if (descriptionElement) {
                // Crea un elemento de texto SVG temporal para manipular el ajuste.
                const tempTextElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
                // Copia todos los atributos del elemento original al temporal.
                Array.from(descriptionElement.attributes).forEach(attr => {
                    tempTextElement.setAttribute(attr.name, attr.value);
                });
                
                // Establece el contenido de texto que se va a ajustar.
                tempTextElement.textContent = selectedOrder.description || '';
                
                // Reemplaza el elemento original en el contenedor off-screen con el temporal.
                // Esto es necesario porque vamos a modificar el contenido (añadir tspans).
                descriptionElement.parentNode.replaceChild(tempTextElement, descriptionElement);
                
                // --- Lógica de ajuste de texto (similar a wrapSVGText, pero aplicada al elemento temporal) ---
                const text = tempTextElement.textContent.trim();
                if (text) {
                    const x = tempTextElement.getAttribute("x");
                    const y = tempTextElement.getAttribute("y");
                    const fontSize = parseFloat(tempTextElement.style.fontSize || "3.175px");
                    const lineHeight = fontSize * 1.3;
                    
                    tempTextElement.textContent = ""; // Limpia el contenido para añadir tspans.
                    
                    const maxCharsPerLine = 101;
                    const words = text.split(/\s+/);
                    let currentLine = "";
                    let firstLine = true;
                    
                    words.forEach(word => {
                        if ((currentLine + " " + word).length > maxCharsPerLine && currentLine.length > 0) {
                            const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                            tspan.setAttribute("x", x);
                            if (firstLine) {
                                firstLine = false;
                            } else {
                                tspan.setAttribute("dy", `${lineHeight}px`);
                            }
                            tspan.textContent = currentLine;
                            tempTextElement.appendChild(tspan);
                            currentLine = word;
                        } else {
                            if (currentLine.length > 0) {
                                currentLine += " " + word;
                            } else {
                                currentLine = word;
                            }
                        }
                    });
                    
                    if (currentLine.length > 0) {
                        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                        tspan.setAttribute("x", x);
                        if (!firstLine) {
                            tspan.setAttribute("dy", `${lineHeight}px`);
                        }
                        tspan.textContent = currentLine;
                        tempTextElement.appendChild(tspan);
                    }
                    // Nota: No es necesario clonar ni añadir/quitar del DOM principal aquí,
                    // ya que estamos trabajando directamente en el contenedor off-screen que será renderizado.
                }
            }
            
            // Pequeña pausa para asegurar que el navegador haya renderizado completamente el contenedor off-screen.
            await new Promise(resolve => setTimeout(resolve, 300));

            // --- Generación del Canvas y PDF ---
            // Usa html2canvas para convertir el contenedor div (con el SVG poblado) en un canvas.
            const canvas = await html2canvas(container, {
                scale: 2, // Aumenta la escala para mejorar la resolución del PDF.
                logging: false, // Deshabilita logs de html2canvas (útil para depuración).
                useCORS: true, // Necesario si el SVG referencia recursos externos.
                allowTaint: true, // Permite "contaminar" el canvas con imágenes de origen cruzado (si aplica).
                backgroundColor: null // Usa el fondo blanco definido en el contenedor.
            });

            // Elimina el contenedor temporal del DOM una vez que se ha generado el canvas.
            document.body.removeChild(container); 

            // Inicializa jsPDF.
            const { jsPDF } = window.jspdf; // Accede a jsPDF desde el objeto global window.
            // Crea una nueva instancia de jsPDF.
            const pdf = new jsPDF({
                orientation: 'portrait', // Orientación vertical.
                unit: 'pt', // Unidad de medida: puntos.
                // Establece el formato del PDF basado en las dimensiones del canvas (dividido por la escala).
                format: [canvas.width / 2, canvas.height / 2] 
            });

            // Añade la imagen del canvas al PDF.
            const imgData = canvas.toDataURL('image/png'); // Obtiene los datos del canvas como imagen PNG.
            // Añade la imagen al PDF, ocupando toda la página.
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);

            // Guarda el PDF.
            // Define el nombre del archivo PDF.
            const fileName = `PremiumFreight_${selectedOrder.id || 'Order'}.pdf`;
            // Desencadena la descarga del archivo PDF en el navegador.
            pdf.save(fileName);

            // Muestra un mensaje de éxito al usuario.
            Swal.fire({
                icon: 'success',
                title: '¡PDF Generado Exitosamente!',
                html: `El archivo <b>${fileName}</b> se ha descargado correctamente.`,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            // Cierra el modal después de guardar el PDF.
            document.getElementById('myModal').style.display = 'none'; 

        } catch (error) {
            // Captura y maneja errores durante la generación del PDF.
            console.error('Error al generar el PDF:', error);
            // Muestra una alerta de error al usuario.
            Swal.fire({
                icon: 'error',
                title: 'Error al Generar PDF',
                text: error.message || 'Ocurrió un error inesperado.',
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            // Asegura que el contenedor temporal se elimine incluso si hay un error.
            const tempContainer = document.querySelector('div[style*="left: -9999px"]');
            if (tempContainer) {
                document.body.removeChild(tempContainer);
            }
        }
    };

    // --- Aprobar orden ---
    // Añade un event listener al botón "Aprobar".
    document.getElementById('approveBtn').onclick = async function () {
        // Obtiene el ID de la orden seleccionada.
        const selectedOrderId = sessionStorage.getItem('selectedOrderId');
        // Busca la orden correspondiente.
        const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
        try {
            // Muestra una alerta de procesamiento.
            Swal.fire({
                title: 'Procesando...',
                text: 'Actualizando estado de la orden',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                customClass: { container: 'swal-on-top' }
            });

            // Calcula el siguiente ID de estado de aprobación.
            const currentStatus = Number(selectedOrder.approval_status);
            const newStatusId = currentStatus + 1;

            // Prepara los datos para actualizar el estado de aprobación en la base de datos.
            const updateData = {
                orderId: selectedOrder.id,
                newStatusId: newStatusId, // El nuevo nivel de aprobación.
                userLevel: window.authorizationLevel, // Nivel del usuario que aprueba.
                userID: window.userID, // ID del usuario que aprueba.
                authDate: new Date().toISOString().slice(0, 19).replace('T', ' ') // Fecha y hora actual en formato SQL DATETIME.
            };

            // Determina el ID del estado de texto general ('revision' o 'aprobado') basado en el nuevo nivel.
            let updatedStatusTextId = 2; // Por defecto: 'revision'.
            const requiredLevel = Number(selectedOrder.required_auth_level || 7); // Nivel requerido para aprobación final.
            // Si el nuevo nivel alcanza o supera el requerido, el estado general es 'aprobado'.
            if (newStatusId >= requiredLevel) {
                updatedStatusTextId = 3; // ID para 'aprobado'.
            }

            // Prepara los datos para actualizar el estado de texto general.
            const updateStatusText = {
                orderId: selectedOrder.id,
                statusid: updatedStatusTextId // El ID del nuevo estado de texto ('revision' o 'aprobado').
            };

            // --- Llamadas a la API ---
            // 1. Actualiza el nivel de aprobación (approval_status) y registra el paso de aprobación.
            const responseApproval = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const resultApproval = await responseApproval.json();
            // Si la actualización del nivel de aprobación falla, lanza un error.
            if (!resultApproval.success) {
                throw new Error(resultApproval.message || 'Error al actualizar el nivel de aprobación.');
            }

            // 2. Actualiza el ID del estado general (status_id) que corresponde al texto ('revision', 'aprobado').
            const responseStatusText = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusText.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatusText)
            });
            const resultStatusText = await responseStatusText.json();
            // Si la actualización del estado de texto falla, registra un error pero no detiene el proceso necesariamente.
            if (!resultStatusText.success) {
                console.error('Error al actualizar el texto del estado:', resultStatusText.message);
            }

            // --- Manejo de Éxito ---
            // Actualiza los datos locales de la orden inmediatamente para reflejar el cambio en la interfaz.
            selectedOrder.approval_status = newStatusId; // Actualiza el nivel de aprobación.
            selectedOrder.status_id = updatedStatusTextId; // Actualiza el ID del estado de texto.
            
            // Actualiza el nombre del estado localmente basado en el nuevo ID.
            if (updatedStatusTextId === 3) selectedOrder.status_name = 'aprobado';
            else if (updatedStatusTextId === 2) selectedOrder.status_name = 'revision';

            // Muestra un mensaje de éxito al usuario.
            Swal.fire({
                icon: 'success',
                title: 'Orden Aprobada',
                text: `La orden ${selectedOrder.id} ha sido aprobada para el siguiente nivel.`,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            // Cierra el modal.
            document.getElementById('myModal').style.display = 'none'; 

            // Refresca la vista de tarjetas para mostrar los datos actualizados.
            createCards(window.allOrders); // Vuelve a renderizar las tarjetas con los datos locales actualizados.

        } catch (error) {
            // Captura y maneja errores durante el proceso de aprobación.
            console.error('Error al aprobar la orden:', error);
            // Muestra una alerta de error al usuario.
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
    // Añade un event listener al botón "Rechazar".
    document.getElementById('rejectBtn').onclick = async function () {
        // Obtiene el ID de la orden seleccionada.
        const selectedOrderId = sessionStorage.getItem('selectedOrderId');
        // Busca la orden correspondiente.
        const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
        try {
            // Muestra un diálogo de confirmación antes de rechazar.
            const confirmation = await Swal.fire({
                title: '¿Estás seguro?',
                text: `¿Realmente quieres rechazar la orden ${selectedOrderId}? Esta acción no se puede deshacer.`,
                icon: 'warning',
                showCancelButton: true, // Muestra el botón de cancelar.
                confirmButtonColor: '#d33', // Color rojo para el botón de confirmar (rechazar).
                cancelButtonColor: '#3085d6', // Color azul para el botón de cancelar.
                confirmButtonText: 'Sí, rechazarla',
                cancelButtonText: 'Cancelar',
                customClass: { container: 'swal-on-top' } // Asegura que esté por encima.
            });

            // Si el usuario no confirma (hace clic en Cancelar), detiene la ejecución.
            if (!confirmation.isConfirmed) {
                return; 
            }

            // Muestra una alerta de procesamiento si el usuario confirma.
            Swal.fire({
                title: 'Procesando...',
                text: 'Rechazando la orden',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                customClass: { container: 'swal-on-top' }
            });

            // Define el ID de estado específico para rechazo.
            const newStatusId = 99; 
            // Prepara los datos para actualizar el estado de aprobación a 99 (rechazado).
            const updateData = {
                orderId: selectedOrder.id,
                newStatusId: newStatusId, // Establece approval_status a 99.
                userLevel: window.authorizationLevel, // Nivel del usuario que rechaza.
                userID: window.userID, // ID del usuario que rechaza.
                authDate: new Date().toISOString().slice(0, 19).replace('T', ' ') // Fecha y hora del rechazo.
            };

            // Define el ID del estado de texto para 'rechazado'.
            const updatedStatusTextId = 4; 
            // Prepara los datos para actualizar el estado de texto general a 'rechazado'.
            const updateStatusText = {
                orderId: selectedOrder.id,
                statusid: updatedStatusTextId
            };

            // --- Llamadas a la API ---
            // 1. Actualiza approval_status a 99.
            const responseApproval = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const resultApproval = await responseApproval.json();
            // Si falla la actualización a rechazado, lanza un error.
            if (!resultApproval.success) {
                throw new Error(resultApproval.message || 'Error al actualizar el nivel de aprobación a rechazado.');
            }

            // 2. Actualiza el status_id general a 'rechazado'.
            const responseStatusText = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusText.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatusText)
            });
            const resultStatusText = await responseStatusText.json();
            // Si falla la actualización del texto, registra el error.
            if (!resultStatusText.success) {
                console.error('Error al actualizar el texto del estado a rechazado:', resultStatusText.message);
            }

            // --- Manejo de Éxito ---
            // Actualiza los datos locales inmediatamente.
            selectedOrder.approval_status = newStatusId; // Actualiza nivel a 99.
            selectedOrder.status_id = updatedStatusTextId; // Actualiza ID de texto a 4.
            selectedOrder.status_name = 'rechazado'; // Actualiza nombre del estado.

            // Muestra un mensaje de confirmación de rechazo.
            Swal.fire({
                icon: 'error', // Usa icono de error/advertencia para rechazo.
                title: 'Orden Rechazada',
                text: `La orden ${selectedOrderId} ha sido rechazada exitosamente.`,
                confirmButtonText: 'OK',
                customClass: { container: 'swal-on-top' }
            });
            // Cierra el modal.
            document.getElementById('myModal').style.display = 'none'; 

            // Refresca la vista de tarjetas para mostrar el estado actualizado.
            createCards(window.allOrders);

        } catch (error) {
            // Captura y maneja errores durante el proceso de rechazo.
            console.error('Error al rechazar la orden:', error);
            // Muestra una alerta de error al usuario.
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

