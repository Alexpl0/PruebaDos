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
        'StatesShip', 'StatesDest'
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
             console.warn(`Form element with ID '${id}' not found.`);
        }
    });

    // After collecting all form fields, specifically get company IDs using Select2
    if (typeof $ !== 'undefined' && $.fn.select2) {
        // Get origin company ID
        const originSelect = $('#CompanyShip');
        console.log("Raw Select2 origin data:", originSelect.select2('data')[0]);
        if (originSelect.length && originSelect.select2('data')[0]) {
            const originData = originSelect.select2('data')[0];
            if (originData.id) {
                // Make sure we're storing the numeric ID, not the text
                formData['origin_id'] = parseInt(originData.id, 10);
                console.log("Origin company ID captured:", formData['origin_id']);
            }
        }
        
        // Get destination company ID
        const destSelect = $('#inputCompanyNameDest');
        console.log("Raw Select2 destination data:", destSelect.select2('data')[0]);
        if (destSelect.length && destSelect.select2('data')[0]) {
            const destData = destSelect.select2('data')[0];
            if (destData.id) {
                // Make sure we're storing the numeric ID, not the text
                formData['destiny_id'] = parseInt(destData.id, 10);
                console.log("Destination company ID captured:", formData['destiny_id']);
            }
        }
    }

    // Devuelve el objeto con los datos del formulario y la lista de campos vacíos.
    return { formData, emptyFields };
}

//==========================================================================================
// Función asíncrona para verificar y guardar nuevas compañías (origen y destino)
// antes de enviar el formulario principal.
// Llama a `saveNewCompany` (definida en companySelect.js) para cada nueva compañía.
// Modify the processNewCompanies function to use the returned company IDs
async function processNewCompanies() {
    const companyShipElement = $('#CompanyShip');
    const companyDestElement = $('#inputCompanyNameDest');
    const companyShipData = companyShipElement.select2('data')[0];
    const companyDestData = companyDestElement.select2('data')[0];
    
    let newCompanyIds = {
        origin_id: null,
        destiny_id: null
    };

    // Handle origin company if it's new
    if (companyShipData && companyShipData.isNew) {
        const originResult = await saveNewCompany(
            companyShipData.id,
            $('#inputCityShip').val(), 
            $('#StatesShip').val(), 
            $('#inputZipShip').val(),
            false
        );
        
        if (originResult === false) {
            return { success: false };
        }
        
        // If the server returned a numeric ID, store it
        if (typeof originResult === 'number') {
            newCompanyIds.origin_id = originResult;
        }
    }

    // Handle destination company if it's new
    if (companyDestData && companyDestData.isNew) {
        const destResult = await saveNewCompany(
            companyDestData.id,
            $('#inputCityDest').val(), 
            $('#StatesDest').val(), 
            $('#inputZipDest').val(),
            true
        );
        
        if (destResult === false) {
            return { success: false };
        }
        
        // If the server returned a numeric ID, store it
        if (typeof destResult === 'number') {
            newCompanyIds.destiny_id = destResult;
        }
    }

    return { 
        success: true,
        newCompanyIds: newCompanyIds
    };
}

// Función para validar exhaustivamente todos los campos del formulario
function validateCompleteForm() {
    // Agruparemos los campos por secciones para poder dar mensajes de error más específicos
    const sections = {
        "General Information": ['planta', 'codeplanta', 'transport', 'InOutBound'],
        "Cost Information": ['QuotedCost'],
        "Responsibility": ['Area', 'IntExt', 'PaidBy'],
        "Project Details": ['CategoryCause', 'ProjectStatus', 'Recovery', 'Description'],
        "Ship From": ['CompanyShip', 'inputCityShip', 'StatesShip', 'inputZipShip'],
        "Destination": ['inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest'],
        "Shipment Details": ['Weight', 'Measures', 'Products', 'Carrier'],
        "Reference Information": ['Reference', 'ReferenceNumber']
    };

    // Recolectar los datos del formulario utilizando la función existente
    const { formData, emptyFields } = collectFormData();

    // Si no hay campos vacíos, el formulario está completo
    if (emptyFields.length === 0) {
        return { isValid: true, formData };
    }

    // Identificar qué secciones tienen campos vacíos
    const sectionsWithEmptyFields = {};
    
    for (const [sectionName, sectionFields] of Object.entries(sections)) {
        const missingFields = sectionFields.filter(field => emptyFields.includes(field));
        if (missingFields.length > 0) {
            sectionsWithEmptyFields[sectionName] = missingFields;
        }
    }

    // Crear un mensaje detallado para el usuario
    let errorMessage = 'Please complete all required fields in the following sections:\n';
    for (const [section, fields] of Object.entries(sectionsWithEmptyFields)) {
        const fieldLabels = fields.map(fieldId => {
            // Obtener etiquetas más amigables para los campos
            const element = document.getElementById(fieldId);
            if (element) {
                const labelElement = document.querySelector(`label[for="${fieldId}"]`);
                return labelElement ? labelElement.textContent : fieldId;
            }
            return fieldId;
        });
        
        errorMessage += `\n• ${section}: ${fieldLabels.join(', ')}`;
    }

    // Verificar específicamente la validez de la moneda y del costo en euros
    if (!selectedCurrency) {
        errorMessage += '\n\n• Currency: Please select a currency (MXN or USD)';
    }
    
    if (euros <= 0 && !emptyFields.includes('QuotedCost')) {
        errorMessage += '\n\n• Exchange Rate: Could not calculate cost in Euros. Please check your internet connection or try again later.';
    }

    // Verificar si los campos numéricos tienen valores válidos
    if (formData['QuotedCost'] && isNaN(parseFloat(formData['QuotedCost']))) {
        errorMessage += '\n\n• Quoted Cost: Please enter a valid number';
    }
    
    if (formData['Weight'] && isNaN(parseFloat(formData['Weight']))) {
        errorMessage += '\n\n• Weight: Please enter a valid number';
    }

    return {
        isValid: false,
        errorMessage,
        sectionsWithEmptyFields,
        formData
    };
}