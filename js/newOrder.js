//==========================================================================================
// Variables globales
let range = 0; // Rango de autorización, se declara con let para poder modificar su valor.

//==========================================================================================
// Función para validar y enviar los datos del formulario.
// Se activa cuando se hace clic en el botón de envío.
function submitForm(event) {
    event.preventDefault(); // Previene el comportamiento por defecto del formulario (que recargaría la página).

    // Obtiene los datos del formulario y los campos vacíos desde el módulo de validación.
    // Se asume que collectFormData() está definido en formValidation.js y devuelve un objeto con formData y emptyFields.
    const { formData, emptyFields } = collectFormData();

    // Valida los campos requeridos.
    // Si hay campos vacíos, muestra una alerta y detiene el envío.
    if (emptyFields.length > 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Información Faltante', // Título de la alerta en español.
            text: 'Por favor complete todos los campos requeridos: ' + emptyFields.join(', ') // Mensaje de la alerta en español.
        });
        return; // Detiene la ejecución de la función si hay campos vacíos.
    }

    //==========================================================================================
    // Valida y calcula el rango de autorización basado en el costo cotizado.
    const quotedCost = parseFloat(formData['QuotedCost']); // Convierte el costo cotizado a un número flotante.

    // Verifica si el costo cotizado no es un número (NaN - Not a Number).
    if (isNaN(quotedCost)) {
         Swal.fire({
            icon: 'warning',
            title: 'Costo Inválido', // Título de la alerta en español.
            text: 'El campo "Costo Cotizado" debe contener un número válido.' // Mensaje de la alerta en español.
        });
        return; // Detiene la ejecución si el costo no es válido.
    }

    // Calcula el rango de autorización utilizando la función auxiliar.
    range = calculateAuthorizationRange(quotedCost);
    console.log("Rango de Autorización Calculado:", range); // Muestra el rango calculado en la consola.

    //==========================================================================================
    // Prepara el objeto 'payload' (carga útil) con los datos que se enviarán a la API del backend.
    const payload = {
        user_id: 1, // TODO: Reemplazar con el ID del usuario autenticado.
        date: new Date().toISOString().slice(0, 19).replace('T', ' '), // Obtiene la fecha y hora actual en formato MySQL DATETIME.
        planta: formData['planta'],
        code_planta: formData['codeplanta'],
        transport: formData['transport'],
        in_out_bound: formData['InOutBound'],
        cost_euros: formData['CostoEuros'], // Costo en euros, ya formateado o calculado.
        description: formData['Description'],
        area: formData['Area'],
        int_ext: formData['IntExt'],
        paid_by: formData['PaidBy'],
        category_cause: formData['CategoryCause'],
        project_status: formData['ProjectStatus'],
        recovery: formData['Recovery'],
        weight: formData['Weight'],
        measures: formData['Measures'],
        products: formData['Products'],
        carrier: formData['Carrier'],
        quoted_cost: quotedCost, // Costo cotizado como número.
        reference: formData['Reference'],
        reference_number: formData['ReferenceNumber'],
        origin_id: 1, // TODO: Placeholder - Determinar cómo se obtendrá el ID de origen real.
        destiny_id: 1, // TODO: Placeholder - Determinar cómo se obtendrá el ID de destino real.
        status_id: 1, // Estado por defecto para nuevas entradas (ej. "Pendiente").
        required_auth_level: range, // Nivel de autorización requerido, calculado previamente.
        moneda: selectedCurrency // Moneda seleccionada (ej. 'MXN', 'USD'), variable global de currencyUtils.js.
    };

    // Muestra los datos que se enviarán al backend en la consola, en formato JSON legible.
    console.log("Datos para enviar al backend:", JSON.stringify(payload, null, 2));

    //==========================================================================================
    // Envía los datos al backend utilizando la API Fetch.
    sendFormData(payload);
}

//==========================================================================================
// Función para enviar los datos del formulario al backend.
function sendFormData(payload) {
    // Realiza una petición POST al endpoint especificado.
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFpost.php', {
        method: 'POST', // Método HTTP.
        headers: { // Cabeceras de la petición.
            'Content-Type': 'application/json', // Indica que el cuerpo de la petición es JSON.
            'Accept': 'application/json' // Indica que se espera una respuesta en formato JSON.
        },
        body: JSON.stringify(payload) // Convierte el objeto payload a una cadena JSON para enviarlo en el cuerpo.
    })
    .then(response => { // Primera promesa: maneja la respuesta inicial del servidor.
        // Verifica si la respuesta del servidor fue exitosa (código de estado 200-299).
        if (!response.ok) {
            // Si la respuesta no es exitosa, intenta parsear el cuerpo como JSON para obtener un mensaje de error del backend.
            return response.json().then(err => {
                // Lanza un error con el mensaje del backend o un mensaje genérico con el estado del servidor.
                throw new Error(err.message || `El servidor respondió con el estado: ${response.status}`);
            }).catch(() => {
                // Si el cuerpo de la respuesta no es JSON o falla el parseo, lanza un error genérico.
                throw new Error(`El servidor respondió con el estado: ${response.status}`);
            });
        }
        // Si la respuesta es exitosa, parsea el cuerpo como JSON.
        return response.json();
    })
    .then(result => { // Segunda promesa: maneja el resultado JSON parseado.
        console.log("Respuesta del backend:", result); // Muestra la respuesta del backend en la consola.
        if (result.success) { // Si el backend indica que la operación fue exitosa.
            Swal.fire({
                icon: 'success',
                title: 'Datos Guardados', // Título de la alerta en español.
                text: result.message || 'La información se guardó correctamente.' // Mensaje de la alerta en español.
            });
            // Opcionalmente, resetea el formulario después de un envío exitoso.
            // document.getElementById('plant-form').reset(); // Descomentar si se desea resetear el formulario.
        } else {
            // Si el backend indica que hubo un error (ej. error de validación).
            Swal.fire({
                icon: 'error',
                title: 'Error al Guardar Datos', // Título de la alerta en español.
                text: result.message || 'No se pudo guardar la información. Por favor, verifique los detalles.' // Mensaje de la alerta en español.
            });
        }
    })
    .catch(error => { // Maneja errores de red o errores lanzados durante el procesamiento de la respuesta.
        console.error('Error en Fetch:', error); // Muestra el error en la consola.
        Swal.fire({
            icon: 'error',
            title: 'Error en la Solicitud', // Título de la alerta en español.
            text: error.message || 'Ocurrió un error al comunicarse con el servidor.' // Mensaje de la alerta en español.
        });
    });
}

//==========================================================================================
// Función auxiliar para calcular el rango de autorización basado en el costo cotizado.
function calculateAuthorizationRange(quotedCost) {
    if (quotedCost <= 1500) {
        return 3;
    } else if (quotedCost > 1500 && quotedCost <= 5000) {
        return 4;
    } else if (quotedCost > 5000 && quotedCost <= 10000) {
        return 6;
    } else if (quotedCost > 10000) {
        return 7;
    } else {
        // Este caso no debería alcanzarse si quotedCost es un número no negativo.
        console.warn("No se pudo determinar el rango de autorización para el costo:", quotedCost);
        return 0; // Valor por defecto o para indicar un error.
    }
}

//==========================================================================================
// Inicializa los escuchadores de eventos cuando el DOM (Document Object Model) está completamente cargado.
// Esto asegura que todos los elementos HTML estén disponibles antes de intentar interactuar con ellos.
document.addEventListener('DOMContentLoaded', function () {
    // Inicializa los selectores de compañía (se asume que esta función está en companySelect.js).
    initializeCompanySelectors();
    
    // Inicializa los selectores de moneda (se asume que esta función está en currencyUtils.js).
    initializeCurrencySelectors();

    // Configura el envío del formulario.
    const btnSubmit = document.getElementById('enviar'); // Obtiene el botón de envío por su ID.
    if (btnSubmit) { // Verifica si el botón existe.
        // Agrega un escuchador de eventos para el clic en el botón de envío.
        // Cuando se hace clic, se llama a la función submitForm.
        btnSubmit.addEventListener('click', submitForm);
    } else {
        // Si el botón no se encuentra, muestra un error en la consola.
        console.error("Botón de envío ('enviar') no encontrado. El formulario no se puede enviar.");
    }
});