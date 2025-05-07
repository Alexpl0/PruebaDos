//==========================================================================================
// Variables globales
let range = 0; // Rango de autorización, se declara con let para poder modificar su valor.

//==========================================================================================
// Función para validar y enviar los datos del formulario.
// Se activa cuando se hace clic en el botón de envío.
async function submitForm(event) {
    event.preventDefault(); // Previene el comportamiento por defecto del formulario (que recargaría la página).

    // Usar la nueva función de validación completa que ofrece más detalles
    const validationResult = validateCompleteForm();

    // Si la validación falla, muestra el mensaje detallado y detiene el envío
    if (!validationResult.isValid) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Information',
            html: validationResult.errorMessage.replace(/\n/g, '<br>'),
            confirmButtonText: 'Complete Form'
        });
        return;
    }

    // Extraer los datos validados del formulario
    const formData = validationResult.formData;

    // Process any new companies first
    const processResult = await processNewCompanies();
    if (!processResult.success) {
        // If there was an error processing new companies, stop here
        return;
    }

    //==========================================================================================
    // Calcula el rango de autorización utilizando la función auxiliar.
    const quotedCost = parseFloat(formData['QuotedCost']);
    range = calculateAuthorizationRange(quotedCost);

    //==========================================================================================
    // Prepara el objeto 'payload' (carga útil) con los datos que se enviarán a la API del backend.
    const payload = {
        user_id: 1, // TODO: Reemplazar con el ID del usuario autenticado.
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        planta: formData['planta'],
        code_planta: formData['codeplanta'],
        transport: formData['transport'],
        in_out_bound: formData['InOutBound'],
        cost_euros: (typeof euros === 'number' && !isNaN(euros)) ? euros : 0, // Use the numeric value, not the formatted string
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
        quoted_cost: quotedCost,
        reference: formData['Reference'],
        reference_number: formData['ReferenceNumber'],
        origin_id: processResult.newCompanyIds.origin_id || 
                   (formData['origin_id'] ? parseInt(formData['origin_id'], 10) : null),
        destiny_id: processResult.newCompanyIds.destiny_id || 
                    (formData['destiny_id'] ? parseInt(formData['destiny_id'], 10) : null),
        status_id: 1,
        required_auth_level: range,
        moneda: getSelectedCurrency()
    };

    // Verificar campos críticos
    if (!payload.origin_id || !payload.destiny_id) {
        Swal.fire({
            icon: 'warning',
            title: 'Company Information Missing',
            text: 'Please select or create valid companies for origin and destination.'
        });
        return;
    }

    if (!payload.cost_euros || payload.cost_euros <= 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Currency Conversion Issue',
            text: 'There was a problem calculating the cost in Euros. Please check your connection and try again.'
        });
        return;
    }

    // Log completo para debugging
    console.log("Final payload being sent:", payload);

    // Log para verificar que todos los datos estén correctos
    console.log("Datos completos validados para envío:", JSON.stringify(payload, null, 2));
    

    // Si todo está bien, enviar los datos
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
                throw new Error(err.message || `Server responded with status: ${response.status}`);
            }).catch(() => {
                // Si el cuerpo de la respuesta no es JSON o falla el parseo, lanza un error genérico.
                throw new Error(`Server responded with status: ${response.status}`);
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
                title: 'Data Saved',
                text: 'Premium freight order and approval record created successfully.'
            });
            // Opcionalmente, resetea el formulario después de un envío exitoso.
            // document.getElementById('plant-form').reset(); // Descomentar si se desea resetear el formulario.
        } else {
            // Si el backend indica que hubo un error (ej. error de validación).
            Swal.fire({
                icon: 'error',
                title: 'Error Saving Data', // Título de la alerta en inglés.
                text: result.message || 'Could not save the information. Please check the details.' // Mensaje de la alerta en inglés.
            });
        }
    })
    .catch(error => { // Maneja errores de red o errores lanzados durante el procesamiento de la respuesta.
        console.error('Error en Fetch:', error); // Muestra el error en la consola.
        Swal.fire({
            icon: 'error',
            title: 'Request Error', // Título de la alerta en inglés.
            text: error.message || 'An error occurred while communicating with the server.' // Mensaje de la alerta en inglés.
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