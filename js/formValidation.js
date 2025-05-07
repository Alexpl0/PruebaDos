//==========================================================================================
// Función para recolectar y validar los datos del formulario.
// Devuelve un objeto con los datos del formulario y una lista de campos vacíos.
function collectFormData() {
    // Lista de IDs de los campos del formulario que se van a recolectar.
    const fields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'CostoEuros', 'Description',
        'Area', 'IntExt', 'PaidBy', 'CategoryCause', 'ProjectStatus', 'Recovery',
        'Weight', 'Measures', 'Products', 'Carrier', 'QuotedCost', 'Reference', 'ReferenceNumber',
        'CompanyShip', 'inputCityShip', 'StatesShip', 'inputZipShip', // Campos de compañía de origen
        'inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest' // Campos de compañía de destino
    ];

    // Lista de IDs de campos de tipo 'select' de los cuales se debe obtener el texto visible de la opción seleccionada,
    // en lugar de su valor.
    const textFields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'Area', 'IntExt', 'PaidBy',
        'CategoryCause', 'ProjectStatus', 'Recovery', 'Carrier',
        'CompanyShip', 'inputCompanyNameDest', // Nombres de las compañías
        'StatesShip', 'StatesDest' // Nombres de los estados (si son selects)
    ];
    
    let formData = {}; // Objeto para almacenar los datos del formulario.
    let emptyFields = []; // Array para almacenar los IDs de los campos que están vacíos.

    // Itera sobre cada ID de campo en la lista 'fields'.
    fields.forEach(id => {
        const element = document.getElementById(id); // Obtiene el elemento del DOM por su ID.
        if (element) { // Verifica si el elemento existe.
            let value = element.value; // Obtiene el valor del elemento.

            // Si el elemento es un 'SELECT' y su ID está en 'textFields',
            // obtiene el texto de la opción seleccionada en lugar del valor.
            if (element.tagName === 'SELECT' && textFields.includes(id)) {
                // El '?' es un encadenamiento opcional para evitar errores si no hay opción seleccionada.
                value = element.options[element.selectedIndex]?.text || '';
            }

            // Si el valor es una cadena de texto, elimina los espacios en blanco al inicio y al final.
            if (typeof value === 'string') {
                value = value.trim();
            }
            formData[id] = value; // Almacena el valor procesado en el objeto formData.

            // Verifica si el campo está vacío.
            // Se considera vacío si es una cadena vacía, null o undefined.
            // El valor 0 se considera válido y no vacío.
            if (value === '' || value === null || value === undefined) {
                 // Excluye el campo 'CostoEuros' de la verificación de campos vacíos,
                 // ya que este campo se calcula automáticamente y puede estar vacío inicialmente.
                 if (id !== 'CostoEuros') {
                    emptyFields.push(id); // Agrega el ID del campo vacío a la lista.
                 }
            }
        } else {
             // Advierte en la consola si no se encuentra un elemento del formulario con el ID esperado.
             console.warn(`Elemento del formulario con ID '${id}' no encontrado.`);
        }
    });

    // Devuelve el objeto con los datos del formulario y la lista de campos vacíos.
    return { formData, emptyFields };
}

//==========================================================================================
// Función asíncrona para verificar y guardar nuevas compañías (origen y destino)
// antes de enviar el formulario principal.
// Llama a `saveNewCompany` (definida en companySelect.js) para cada nueva compañía.
async function processNewCompanies() {
    // Obtiene los elementos Select2 para las compañías de origen y destino.
    const companyShipElement = $('#CompanyShip');
    const companyDestElement = $('#inputCompanyNameDest');

    // Obtiene los datos de la opción seleccionada en cada Select2.
    // `select2('data')` devuelve un array, por lo que se accede al primer elemento [0].
    const companyShipData = companyShipElement.select2('data')[0];
    const companyDestData = companyDestElement.select2('data')[0];
    
    let saveOperations = []; // Array para almacenar las promesas de las operaciones de guardado.

    // Verifica si la compañía de origen es nueva (si tiene la propiedad `isNew` establecida por Select2).
    if (companyShipData && companyShipData.isNew) {
        // Agrega la promesa devuelta por `saveNewCompany` al array de operaciones.
        saveOperations.push(
            saveNewCompany( // Llama a la función para guardar la nueva compañía de origen.
                companyShipData.id, // El ID contiene el nombre de la nueva compañía.
                $('#inputCityShip').val(), 
                $('#StatesShip').val(), 
                $('#inputZipShip').val(),
                false // Indica que no es una compañía de destino.
            )
        );
    }

    // Verifica si la compañía de destino es nueva.
    if (companyDestData && companyDestData.isNew) {
        // Agrega la promesa devuelta por `saveNewCompany` al array de operaciones.
        saveOperations.push(
            saveNewCompany( // Llama a la función para guardar la nueva compañía de destino.
                companyDestData.id, // El ID contiene el nombre de la nueva compañía.
                $('#inputCityDest').val(), 
                $('#StatesDest').val(), 
                $('#inputZipDest').val(),
                true // Indica que es una compañía de destino.
            )
        );
    }

    // Si hay operaciones de guardado pendientes (nuevas compañías para guardar).
    if (saveOperations.length > 0) {
        try {
            // Espera a que todas las promesas de guardado se resuelvan.
            // `Promise.all` devuelve un array con los resultados de cada promesa.
            const results = await Promise.all(saveOperations);
            
            // Verifica si alguna de las operaciones de guardado falló.
            // `saveNewCompany` devuelve `false` en caso de error.
            if (results.some(result => result === false)) {
                return false; // Retorna `false` si al menos una operación falló.
            }
            return true; // Retorna `true` si todas las operaciones fueron exitosas.
        } catch (error) { // Captura cualquier error que ocurra durante `Promise.all`.
            console.error('Error al guardar nuevas compañías:', error);
            Swal.fire({ // Muestra una alerta de error.
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron guardar las nuevas compañías: ' + error.message
            });
            return false; // Retorna `false` en caso de error.
        }
    }
    // Si no hay operaciones de guardado pendientes, retorna `true` (no hay nuevas compañías que guardar).
    return true;
}