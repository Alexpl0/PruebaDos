//==========================================================================================
// Variables globales
// Se declara 'range' para almacenar el rango de autorización necesario para la orden.
// Se utiliza 'let' porque su valor será calculado y asignado dinámicamente
// por la función 'calculateAuthorizationRange' basándose en el costo cotizado.
let range = 0;

//==========================================================================================
// Función asíncrona para validar y enviar los datos del formulario.
// Esta función se ejecuta cuando el usuario hace clic en el botón de envío del formulario.
// Orquesta la validación, el procesamiento de nuevas compañías, la preparación del payload
// y el envío final de los datos al servidor.
async function submitForm(event) {
    // Previene el comportamiento predeterminado del evento de envío del formulario,
    // que normalmente sería recargar la página. Esto permite manejar el envío con JavaScript
    // de forma asíncrona y sin recargar la página (comportamiento SPA-like).
    event.preventDefault();

    // Llama a la función 'validateCompleteForm' (definida en formValidation.js)
    // para realizar una validación exhaustiva de todos los campos del formulario.
    // Esta función devuelve un objeto que contiene:
    // - isValid: un booleano que indica si el formulario es válido.
    // - formData: un objeto con los datos recolectados del formulario.
    // - errorMessage: un string con el mensaje de error detallado si la validación falla.
    const validationResult = validateCompleteForm();

    // Verifica si la validación del formulario no fue exitosa.
    // 'validationResult.isValid' será 'false' si hay errores de validación (campos faltantes, formatos incorrectos, etc.).
    if (!validationResult.isValid) {
        // Si la validación falla, muestra una alerta al usuario utilizando la librería SweetAlert.
        // La alerta indica que falta información y muestra un mensaje detallado de los errores.
        Swal.fire({
            icon: 'warning', // Icono de advertencia para la alerta.
            title: 'Información Faltante', // Título de la alerta.
            html: validationResult.errorMessage.replace(/\n/g, '<br>'), // Mensaje de error. Se reemplazan los saltos de línea por <br> para un formato HTML adecuado en la alerta.
            confirmButtonText: 'Completar Formulario' // Texto del botón de confirmación de la alerta.
        });
        return; // Detiene la ejecución de la función 'submitForm', impidiendo el envío del formulario hasta que se corrijan los errores.
    }

    // Si la validación es exitosa, extrae los datos del formulario del objeto 'validationResult'.
    // 'validationResult.formData' contiene un objeto clave-valor con todos los valores de los campos del formulario.
    const formData = validationResult.formData;

    // Procesa primero cualquier compañía nueva que el usuario haya podido ingresar en los campos de origen o destino.
    // Llama a 'processNewCompanies' (definida en formValidation.js) que maneja la lógica de detectar
    // si se ingresó una nueva compañía y, de ser así, la guarda en la base de datos.
    // Esta función es asíncrona, por lo que se usa 'await' para esperar su resultado.
    const processResult = await processNewCompanies();
    // Verifica si hubo algún error durante el procesamiento de nuevas compañías.
    if (!processResult.success) {
        // Si 'processResult.success' es falso, significa que ocurrió un error (ej. fallo al guardar la nueva compañía).
        // En este caso, se detiene la ejecución para evitar enviar datos inconsistentes.
        // Se asume que 'processNewCompanies' ya mostró un mensaje de error al usuario.
        return;
    }

    // Valida que se hayan seleccionado o creado IDs válidos para las compañías de origen y destino.
    // Llama a 'validateCompanyIds' para obtener los IDs de las compañías.
    const companyValidation = validateCompanyIds();
    // Si la validación de los IDs de compañía falla (es decir, falta alguno).
    if (!companyValidation.valid) {
        // Muestra una alerta al usuario indicando que debe seleccionar compañías válidas.
        Swal.fire({
            icon: 'warning',
            title: 'Selección de Compañía Requerida',
            text: 'Por favor, seleccione compañías válidas tanto para el origen como para el destino.'
        });
        return; // Detiene el envío del formulario.
    }

    //==========================================================================================
    // Calcula el rango de autorización necesario basado en el costo cotizado.
    // Primero, convierte el valor de 'QuotedCost' (que podría ser una cadena) a un número de punto flotante.
    const quotedCost = parseFloat(formData['QuotedCost']);
    // Llama a la función auxiliar 'calculateAuthorizationRange' para determinar el nivel de autorización.
    range = calculateAuthorizationRange(quotedCost);

    //==========================================================================================
    // Prepara el objeto 'payload' (carga útil) con los datos que se enviarán a la API del backend.
    // Este objeto estructura los datos del formulario de acuerdo con lo que espera el servidor.
    const payload = {
        user_id: 1, // TODO: Reemplazar con el ID del usuario autenticado dinámicamente. Este es un valor placeholder.
        date: new Date().toISOString().slice(0, 19).replace('T', ' '), // Fecha y hora actual en formato 'YYYY-MM-DD HH:MM:SS'.
        planta: formData['planta'], // Valor del campo 'planta'.
        code_planta: formData['codeplanta'], // Valor del campo 'codeplanta'.
        transport: formData['transport'], // Valor del campo 'transport'.
        in_out_bound: formData['InOutBound'], // Valor del campo 'InOutBound'.
        cost_euros: (typeof euros === 'number' && !isNaN(euros)) ? euros : 0, // Costo en euros. Utiliza la variable global 'euros' (calculada por la conversión de moneda). Asegura que sea un número; si no, usa 0.
        description: formData['Description'], // Valor del campo 'Description'.
        area: formData['Area'], // Valor del campo 'Area'.
        int_ext: formData['IntExt'], // Valor del campo 'IntExt'.
        paid_by: formData['PaidBy'], // Valor del campo 'PaidBy'.
        category_cause: formData['CategoryCause'], // Valor del campo 'CategoryCause'.
        project_status: formData['ProjectStatus'], // Valor del campo 'ProjectStatus'.
        recovery: formData['Recovery'], // Valor del campo 'Recovery'.
        weight: formData['Weight'], // Valor del campo 'Weight'.
        measures: formData['Measures'], // Valor del campo 'Measures'.
        products: formData['Products'], // Valor del campo 'Products'.
        carrier: formData['Carrier'], // Valor del campo 'Carrier'.
        quoted_cost: quotedCost, // Costo cotizado, ya convertido a número.
        reference: formData['Reference'], // Valor del campo 'Reference'.
        reference_number: formData['ReferenceNumber'], // Valor del campo 'ReferenceNumber'.
        // Asigna el ID de la compañía de origen. Prioriza el ID de una compañía nueva si se creó.
        // Si no, usa el ID de la compañía seleccionada obtenido de 'companyValidation'.
        origin_id: processResult.newCompanyIds.origin_id || companyValidation.originId,
        // Asigna el ID de la compañía de destino. Similar al 'origin_id'.
        destiny_id: processResult.newCompanyIds.destiny_id || companyValidation.destinyId,
        status_id: 1, // ID de estado inicial para la orden (ej. 'Pendiente de Aprobación'). Este es un valor fijo por ahora.
        required_auth_level: range, // Nivel de autorización calculado.
        moneda: getSelectedCurrency() // Moneda seleccionada por el usuario (ej. 'MXN', 'USD'), obtenida de 'currencyUtils.js'.
    };

    // Verificación crítica de campos antes del envío final.
    // Asegura que los IDs de compañía de origen y destino estén presentes en el payload.
    if (!payload.origin_id || !payload.destiny_id) {
        Swal.fire({
            icon: 'warning',
            title: 'Falta Información de Compañía',
            text: 'Por favor, seleccione o cree compañías válidas para el origen y el destino.'
        });
        return; // Detiene el envío si falta algún ID de compañía.
    }

    // Verifica que el costo en euros sea válido (mayor que cero).
    // Un costo en euros de 0 o negativo podría indicar un problema con la conversión de moneda.
    if (!payload.cost_euros || payload.cost_euros <= 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Problema con la Conversión de Moneda',
            text: 'Hubo un problema al calcular el costo en Euros. Por favor, verifique su conexión e inténtelo de nuevo.'
        });
        return; // Detiene el envío si hay un problema con el costo en euros.
    }

    // Log completo del payload para propósitos de depuración.
    // Esto muestra en la consola del navegador el objeto exacto que se enviará al servidor.
    console.log("Payload final que se envía:", payload);

    // Log adicional para verificar que todos los datos estén correctos y en el formato esperado.
    // JSON.stringify con indentación para facilitar la lectura.
    console.log("Datos completos validados para envío:", JSON.stringify(payload, null, 2));
    
    // Logs más detallados para depurar los tipos y valores de los IDs de compañía.
    // Útil para rastrear problemas si los IDs no son del tipo esperado por el backend.
    console.log("Tipo de ID de Origen:", typeof payload.origin_id, "Valor:", payload.origin_id);
    console.log("Tipo de ID de Destino:", typeof payload.destiny_id, "Valor:", payload.destiny_id);

    // Verificar si se necesita subir un archivo de recuperación
    const recoverySelect = document.getElementById('Recovery');
    const noRecoveryValue = "NO RECOVERY"; // Ajustar este valor según corresponda
    const recoveryFile = document.getElementById('recoveryFile');
    const needsFile = recoverySelect.value !== noRecoveryValue;
    
    // Guardar primero los datos del formulario y luego el archivo si es necesario
    try {
        // Enviar los datos del formulario como se hace actualmente
        const result = await sendFormDataAsync(payload);
        
        // Si se guardó correctamente y se necesita subir un archivo
        if (result.success && needsFile && recoveryFile.files.length > 0) {
            // Crear FormData para el archivo
            const formData = new FormData();
            formData.append('premium_freight_id', result.id); // El ID devuelto por el servidor
            formData.append('recoveryFile', recoveryFile.files[0]);
            
            // Subir el archivo
            await uploadRecoveryFile(formData);
        }
        
        // Mostrar mensaje de éxito
        Swal.fire({
            icon: 'success',
            title: 'Datos Guardados',
            text: 'La orden de flete premium se creó exitosamente.'
        });
        
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Ocurrió un error al procesar la solicitud.'
        });
    }
    
    return; // Detener la ejecución aquí para evitar que se llame al sendFormData original
}

// Función para enviar datos del formulario como promesa
function sendFormDataAsync(payload) {
    return new Promise((resolve, reject) => {
        fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFpost.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || `El servidor respondió con el estado: ${response.status}`);
                }).catch(() => {
                    throw new Error(`El servidor respondió con el estado: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(result => {
            if (result.success) {
                resolve(result);
            } else {
                reject(new Error(result.message || 'No se pudo guardar la información'));
            }
        })
        .catch(error => {
            reject(error);
        });
    });
}

// Función para subir el archivo de recuperación
function uploadRecoveryFile(formData) {
    return fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoUploadRecovery.php', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error uploading file: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        if (!result.success) {
            throw new Error(result.message || 'Error uploading recovery file');
        }
        return result;
    });
}

//==========================================================================================
// Función para enviar los datos del formulario (payload) al backend mediante una petición HTTP.
function sendFormData(payload) {
    // Realiza una petición POST al endpoint especificado en el servidor.
    // Este endpoint es responsable de recibir y procesar los datos de la nueva orden.
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFpost.php', {
        method: 'POST', // Especifica el método HTTP como POST, ya que estamos enviando datos para crear un nuevo recurso.
        headers: { // Cabeceras HTTP de la petición.
            'Content-Type': 'application/json', // Indica al servidor que el cuerpo de la petición está en formato JSON.
            'Accept': 'application/json' // Indica al servidor que el cliente espera una respuesta en formato JSON.
        },
        body: JSON.stringify(payload) // Convierte el objeto 'payload' de JavaScript a una cadena de texto en formato JSON. Este es el cuerpo de la petición.
    })
    .then(response => { // Primera promesa: se resuelve cuando el servidor envía una respuesta inicial (cabeceras).
        // Verifica si la respuesta del servidor fue exitosa (código de estado HTTP en el rango 200-299).
        if (!response.ok) {
            // Si la respuesta no es exitosa (ej. error 400, 500), intenta parsear el cuerpo como JSON
            // para obtener un mensaje de error más específico del backend.
            return response.json().then(err => {
                // Lanza un error utilizando el mensaje proporcionado por el backend (si existe),
                // o un mensaje genérico con el estado HTTP si el backend no devuelve un mensaje de error estructurado.
                throw new Error(err.message || `El servidor respondió con el estado: ${response.status}`);
            }).catch(() => {
                // Si el cuerpo de la respuesta de error no es JSON o falla el parseo,
                // lanza un error genérico con el código de estado HTTP.
                throw new Error(`El servidor respondió con el estado: ${response.status}`);
            });
        }
        // Si la respuesta es exitosa (response.ok es true), parsea el cuerpo de la respuesta como JSON.
        // Se espera que el backend devuelva una respuesta JSON indicando el resultado de la operación.
        return response.json();
    })
    .then(result => { // Segunda promesa: se resuelve con el resultado JSON parseado del cuerpo de la respuesta.
        console.log("Respuesta del backend:", result); // Muestra la respuesta completa del backend en la consola para depuración.
        if (result.success) { // Si el backend indica explícitamente que la operación fue exitosa (ej. result.success === true).
            // Muestra una alerta de éxito al usuario utilizando SweetAlert.
            Swal.fire({
                icon: 'success',
                title: 'Datos Guardados',
                text: 'La orden de flete premium y el registro de aprobación se crearon exitosamente.'
            });
            // Opcionalmente, se podría resetear el formulario después de un envío exitoso.
            // document.getElementById('plant-form').reset(); // Descomentar esta línea si se desea limpiar el formulario.
        } else {
            // Si el backend indica que hubo un error (ej. result.success === false o falta la propiedad 'success').
            // Muestra una alerta de error al usuario con el mensaje proporcionado por el backend.
            Swal.fire({
                icon: 'error',
                title: 'Error al Guardar los Datos',
                text: result.message || 'No se pudo guardar la información. Por favor, verifique los detalles.' // Mensaje de error genérico si el backend no proporciona uno.
            });
        }
    })
    .catch(error => { // Maneja errores que puedan ocurrir durante la petición fetch.
                      // Esto incluye errores de red (ej. no hay conexión a internet) o errores lanzados
                      // en los bloques .then() anteriores (ej. si response.json() falla o se lanza un Error).
        console.error('Error en Fetch:', error); // Muestra el objeto de error completo en la consola para depuración.
        // Muestra una alerta de error genérica al usuario.
        Swal.fire({
            icon: 'error',
            title: 'Error en la Solicitud',
            text: error.message || 'Ocurrió un error al comunicarse con el servidor.' // Muestra el mensaje del error o uno genérico.
        });
    });
}

//==========================================================================================
// Función auxiliar para calcular el rango o nivel de autorización requerido
// basado en el costo cotizado de la orden.
// Define diferentes umbrales de costo para asignar un nivel de autorización.
function calculateAuthorizationRange(quotedCost) {
    // Asegura que quotedCost sea un número para la comparación.
    const cost = parseFloat(quotedCost);

    if (isNaN(cost)) {
        // Si el costo no es un número válido después de la conversión,
        // se registra una advertencia y se devuelve un rango por defecto o de error.
        console.warn("Costo cotizado no es un número válido:", quotedCost);
        return 0; // Rango 0 podría indicar un error o un estado indefinido.
    }

    if (cost <= 1500) {
        return 3; // Nivel de autorización 3 para costos hasta 1500.
    } else if (cost > 1500 && cost <= 5000) {
        return 4; // Nivel de autorización 4 para costos entre 1500 (exclusivo) y 5000 (inclusivo).
    } else if (cost > 5000 && cost <= 10000) {
        return 6; // Nivel de autorización 6 para costos entre 5000 (exclusivo) y 10000 (inclusivo).
    } else if (cost > 10000) {
        return 7; // Nivel de autorización 7 para costos mayores a 10000.
    } else {
        // Este caso teóricamente no debería alcanzarse si 'cost' es un número,
        // ya que las condiciones anteriores cubren todos los números positivos.
        // Podría ser relevante si se esperan costos negativos o cero con un tratamiento especial no definido.
        console.warn("No se pudo determinar el rango de autorización para el costo:", cost);
        return 0; // Valor por defecto o para indicar un error en la lógica de rangos.
    }
}

//==========================================================================================
// Función para validar y obtener los IDs de las compañías de origen y destino.
// Utiliza jQuery para interactuar con los elementos Select2.
// Devuelve un objeto con un indicador de validez y los IDs obtenidos.
function validateCompanyIds() {
    // Intenta obtener el ID de la compañía de origen.
    // Primero, verifica si hay un ID almacenado en el atributo 'data-selected-id' del elemento Select2.
    // Esto podría usarse si el ID se establece externamente o después de una creación.
    // Si no, intenta obtener el ID de los datos de la selección actual de Select2.
    // Se parsea a entero (base 10). Si no hay selección, el resultado será null.
    const originCompanyId = $('#CompanyShip').data('selected-id') || 
                           ($('#CompanyShip').select2('data')[0] ? 
                            parseInt($('#CompanyShip').select2('data')[0].id, 10) : null);
    
    // Lógica similar para obtener el ID de la compañía de destino.
    const destCompanyId = $('#inputCompanyNameDest').data('selected-id') || 
                          ($('#inputCompanyNameDest').select2('data')[0] ? 
                           parseInt($('#inputCompanyNameDest').select2('data')[0].id, 10) : null);
    
    // Muestra en consola los IDs obtenidos para depuración.
    console.log("Validando IDs de compañía - Origen:", originCompanyId, "Destino:", destCompanyId);
    
    // Devuelve un objeto con:
    // - valid: booleano que es true si ambos IDs (origen y destino) tienen un valor (no son null, undefined, 0, etc.).
    // - originId: el ID de la compañía de origen obtenido.
    // - destinyId: el ID de la compañía de destino obtenido.
    return {
        valid: Boolean(originCompanyId && destCompanyId), // True si ambos IDs son "truthy".
        originId: originCompanyId,
        destinyId: destCompanyId
    };
}

//==========================================================================================
// Función para manejar la visibilidad del campo de archivo según la selección de Recovery
function handleRecoveryFileVisibility() {
    // Obtener el select de Recovery
    const recoverySelect = document.getElementById('Recovery');
    // Obtener el contenedor del campo de archivo
    const fileContainer = document.getElementById('recoveryFileContainer');
    
    // Obtener el valor de "No Recovery" (generalmente es 1, pero podría variar)
    const noRecoveryValue = "1"; // Ajustar este valor según corresponda
    
    // Verificar si la selección actual es diferente a "No Recovery"
    if (recoverySelect.value !== noRecoveryValue) {
        // Mostrar el campo de archivo
        fileContainer.style.display = 'block';
    } else {
        // Ocultar el campo de archivo
        fileContainer.style.display = 'none';
        // Limpiar el campo de archivo
        document.getElementById('recoveryFile').value = '';
    }
}

//==========================================================================================
// Inicializa los escuchadores de eventos y otras configuraciones cuando el DOM (Document Object Model)
// está completamente cargado y listo para ser manipulado.
// Esto asegura que todos los elementos HTML estén disponibles antes de intentar interactuar con ellos mediante JavaScript.
document.addEventListener('DOMContentLoaded', function () {
    // Inicializa los selectores de compañía.
    // Se asume que esta función 'initializeCompanySelectors' está definida en otro archivo (posiblemente 'companySelect.js')
    // y se encarga de configurar los campos de selección de compañía (probablemente usando la librería Select2).
    initializeCompanySelectors();
    
    // Inicializa los selectores de moneda.
    // Se asume que esta función 'initializeCurrencySelectors' está definida en otro archivo (posiblemente 'currencyUtils.js')
    // y configura la funcionalidad relacionada con la selección y conversión de moneda.
    initializeCurrencySelectors();

    // Configura el evento de envío del formulario.
    const btnSubmit = document.getElementById('enviar'); // Obtiene el botón de envío del formulario por su ID 'enviar'.
    if (btnSubmit) { // Verifica si el botón de envío fue encontrado en el DOM.
        // Agrega un escuchador de eventos para el evento 'click' en el botón de envío.
        // Cuando se hace clic en el botón, se llama a la función 'submitForm' definida anteriormente.
        btnSubmit.addEventListener('click', submitForm);
    } else {
        // Si el botón de envío no se encuentra en el DOM, muestra un mensaje de error en la consola.
        // Esto ayuda a diagnosticar problemas si el formulario no se puede enviar porque el botón no existe o tiene un ID incorrecto.
        console.error("Botón de envío ('enviar') no encontrado. El formulario no se puede enviar.");
    }

    // Agregar listener para el cambio en el select de Recovery
    const recoverySelect = document.getElementById('Recovery');
    if (recoverySelect) {
        recoverySelect.addEventListener('change', handleRecoveryFileVisibility);
        // Ejecutar al cargar para establecer el estado inicial
        handleRecoveryFileVisibility();
    }
});