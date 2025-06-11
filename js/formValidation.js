/**
 * formValidation.js
 * Este módulo contiene funciones para validación y procesamiento de formularios
 * de Premium Freight en la plataforma GRAMMER
 */

//==========================================================================================
// Función para recolectar y validar los datos del formulario.
// Esta función itera sobre una lista predefinida de IDs de campos del formulario,
// extrae sus valores y realiza una validación básica para identificar campos vacíos.
// Devuelve un objeto que contiene dos propiedades:
// - formData: Un objeto con los datos recolectados del formulario, donde las claves son los IDs de los campos.
// - emptyFields: Un array con los IDs de los campos que se encontraron vacíos.
function collectFormData() {
    // Lista de IDs de los campos del formulario que se van a recolectar.
    // Estos IDs deben coincidir con los atributos 'id' de los elementos HTML en el formulario.
    const fields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'CostoEuros', 'Description',
        'Area', 'IntExt', 'PaidBy', 'CategoryCause', 'ProjectStatus', 'Recovery',
        'Weight', 'Measures', 'Products', 'Carrier', 'QuotedCost', 'Reference', 'ReferenceNumber',
        'CompanyShip', 'inputCityShip', 'StatesShip', 'inputZipShip', // Campos relacionados con la compañía de origen/envío
        'inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest' // Campos relacionados con la compañía de destino
    ];

    // Lista de IDs de campos de tipo 'select' (desplegables).
    // Para estos campos, en lugar de obtener el valor interno de la opción seleccionada (que podría ser un ID numérico),
    // se obtendrá el texto visible para el usuario de la opción seleccionada.
    const textFields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'Area', 'IntExt', 'PaidBy',
        'CategoryCause', 'ProjectStatus', 'Recovery', 'Carrier',
        'StatesShip', 'StatesDest' // Estados de origen y destino
    ];
    
    let formData = {}; // Objeto vacío que se poblará con los datos del formulario.
    let emptyFields = []; // Array vacío para almacenar los IDs de los campos que resulten estar vacíos.

    // Itera sobre cada ID de campo definido en la lista 'fields'.
    fields.forEach(id => {
        const element = document.getElementById(id); // Intenta obtener el elemento del DOM usando su ID.
        if (element) { // Verifica si el elemento fue encontrado en el DOM.
            let value = element.value; // Obtiene el valor del elemento del formulario. Para la mayoría de los inputs, esto es directo.

            // Manejo especial para elementos 'SELECT' que están en la lista 'textFields'.
            // Si el elemento actual es un 'SELECT' y su ID está incluido en 'textFields',
            // se busca obtener el texto de la opción seleccionada en lugar de su valor.
            if (element.tagName === 'SELECT' && textFields.includes(id)) {
                // 'element.options[element.selectedIndex]' accede a la opción actualmente seleccionada.
                // El operador de encadenamiento opcional '?.' previene un error si 'element.selectedIndex' es -1 (ninguna opción seleccionada).
                // Si hay una opción seleccionada, se toma su propiedad 'text'. Si no, se asigna una cadena vacía.
                value = element.options[element.selectedIndex]?.text || '';
            }

            // Si el valor obtenido es una cadena de texto, se eliminan los espacios en blanco al inicio y al final.
            // Esto ayuda a normalizar la entrada del usuario y evitar problemas con espacios accidentales.
            if (typeof value === 'string') {
                value = value.trim();
            }
            formData[id] = value; // Almacena el valor (procesado) en el objeto 'formData', usando el ID del campo como clave.

            // Verifica si el campo está vacío.
            // Un campo se considera vacío si su valor es una cadena vacía, null o undefined.
            // Es importante notar que el valor numérico 0 se considera válido y no vacío.
            if (value === '' || value === null || value === undefined) {
                 // Excepción para el campo 'CostoEuros':
                 // Este campo se excluye de la verificación de campos vacíos porque
                 // su valor se calcula automáticamente y, por lo tanto, puede estar vacío inicialmente
                 // sin que esto represente un error o una omisión por parte del usuario.
                 if (id !== 'CostoEuros') {
                    emptyFields.push(id); // Si el campo está vacío y no es 'CostoEuros', se agrega su ID a la lista de campos vacíos.
                 }
            }
        } else {
             // Si no se encuentra un elemento del formulario con el ID esperado,
             // se muestra una advertencia en la consola del navegador.
             // Esto ayuda a identificar problemas como errores tipográficos en los IDs de los campos
             // o elementos que no se han cargado correctamente en el DOM.
             console.warn(`No se encontró el elemento del formulario con ID '${id}'.`);
        }
    });

    // Procesamiento específico para campos de compañía que utilizan la librería Select2.
    // Esta sección se ejecuta después de haber recolectado todos los demás campos del formulario.

    // Primero, verifica si jQuery ($) y el plugin Select2 ($.fn.select2) están definidos y disponibles en el entorno.
    // Esto previene errores en caso de que jQuery o Select2 no se hayan cargado correctamente.
    if (typeof $ !== 'undefined' && $.fn.select2) {
        // Obtención del ID de la compañía de origen.
        const originSelect = $('#CompanyShip'); // Selecciona el elemento del DOM con ID 'CompanyShip' usando jQuery. Se espera que sea un campo Select2.
        // Muestra en la consola los datos crudos obtenidos de Select2 para el campo de la compañía de origen.
        // Esto es útil para depuración, para ver qué datos está manejando Select2.
        console.log("Datos crudos de Select2 para la compañía de origen:", originSelect.select2('data')[0]);
        // Verifica si el elemento 'originSelect' fue encontrado (originSelect.length > 0)
        // y si hay datos seleccionados en él (originSelect.select2('data')[0] no es nulo o indefinido).
        if (originSelect.length && originSelect.select2('data')[0]) {
            const originData = originSelect.select2('data')[0]; // Obtiene el primer objeto de datos del elemento seleccionado en Select2.
                                                              // Select2 puede devolver un array de selecciones, aquí se asume una sola selección.
            // Verifica si el objeto de datos 'originData' tiene una propiedad 'id'.
            // El 'id' es crucial ya que representa el identificador único de la compañía.
            if (originData.id) {
                // Almacena el ID de la compañía de origen en el objeto 'formData'.
                // Se utiliza parseInt para asegurar que el ID se guarde como un número entero (base 10).
                // Esto es importante si el ID se usa posteriormente en operaciones numéricas o se envía a un backend que espera un tipo numérico.
                formData['origin_id'] = parseInt(originData.id, 10);
                // Muestra en la consola el ID de la compañía de origen que se ha capturado.
                // Esto confirma que el ID se ha procesado y almacenado correctamente.
                console.log("ID de la compañía de origen capturado:", formData['origin_id']);
            }
        }
        
        // Obtención del ID de la compañía de destino.
        const destSelect = $('#inputCompanyNameDest'); // Selecciona el elemento del DOM con ID 'inputCompanyNameDest' usando jQuery. Se espera que sea un campo Select2.
        // Muestra en la consola los datos crudos obtenidos de Select2 para el campo de la compañía de destino.
        console.log("Datos crudos de Select2 para la compañía de destino:", destSelect.select2('data')[0]);
        // Verifica si el elemento 'destSelect' fue encontrado y si hay datos seleccionados.
        if (destSelect.length && destSelect.select2('data')[0]) {
            const destData = destSelect.select2('data')[0]; // Obtiene el objeto de datos de la selección.
            // Verifica si el objeto de datos 'destData' tiene una propiedad 'id'.
            if (destData.id) {
                // Almacena el ID de la compañía de destino en 'formData' como un número entero.
                formData['destiny_id'] = parseInt(destData.id, 10);
                // Muestra en la consola el ID de la compañía de destino capturado.
                console.log("ID de la compañía de destino capturado:", formData['destiny_id']);
            }
        }
    }

    // Devuelve el objeto con los datos del formulario recolectados ('formData')
    // y la lista de IDs de campos que se encontraron vacíos ('emptyFields').
    return { formData, emptyFields };
}

//==========================================================================================
// Función asíncrona para verificar y guardar nuevas compañías (origen y destino)
// antes de enviar el formulario principal.
// Esta función interactúa con los campos de selección de compañía (que usan Select2)
// para determinar si el usuario ha ingresado una nueva compañía que no existe en la base de datos.
// Si se detecta una nueva compañía, llama a `saveNewCompany` (que se asume definida en 'companySelect.js')
// para guardarla en el backend.
// Modifica la función processNewCompanies para usar los IDs de compañía devueltos.
async function processNewCompanies() {
    // Selecciona los elementos Select2 para la compañía de origen y destino
    const companyShipElement = $('#CompanyShip');
    const companyDestElement = $('#inputCompanyNameDest');
    
    // Obtiene los datos asociados con la selección actual en cada campo Select2
    const companyShipData = companyShipElement.select2('data')[0];
    const companyDestData = companyDestElement.select2('data')[0];
    
    // Objeto para almacenar los IDs de las nuevas compañías que se guarden
    let newCompanyIds = {
        origin_id: null,
        destiny_id: null
    };

    // Manejar la compañía de origen si es nueva
    if (companyShipData && companyShipData.isNew) {
        console.log("Saving new origin company:", companyShipData.id);
        
        // Obtener valores de los campos de la compañía de origen
        const companyName = companyShipData.id;
        const city = $('#inputCityShip').val();
        const state = $('#StatesShip').val();
        const zip = $('#inputZipShip').val();
        
        // Validación de campos requeridos
        if (!companyName || !city || !state || !zip) {
            Swal.fire({
                icon: 'warning',
                title: 'Incomplete Origin Company Data',
                text: 'Please complete all origin company fields (Name, City, State and Zip Code).'
            });
            return { success: false };
        }
        
        try {
            // Mostrar indicador de carga
            Swal.fire({
                title: 'Saving origin company...',
                text: 'Please wait.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            
            // Realizar la petición POST al servidor
            const response = await fetch(URLPF + 'dao/elements/daoAddLocation.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    company_name: companyName,
                    city: city,
                    state: state,
                    zip: zip
                })
            });
            
            const result = await response.json();
            if (result.status === 'success') {
                console.log("Origin company saved successfully. ID:", result.company_id);
                newCompanyIds.origin_id = parseInt(result.company_id);
                
                // Actualizar el Select2 con el nuevo ID
                const newOption = new Option(companyName, result.company_id, true, true);
                companyShipElement.append(newOption).trigger('change');
                
                // Cerrar el indicador de carga
                Swal.close();
            } else {
                throw new Error(result.message || 'Error saving origin company');
            }
        } catch (error) {
            console.error('Error saving new origin company:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not save the origin company: ' + error.message
            });
            return { success: false };
        }
    }

    // Manejar la compañía de destino si es nueva
    if (companyDestData && companyDestData.isNew) {
        console.log("Saving new destination company:", companyDestData.id);
        
        // Obtener valores de los campos de la compañía de destino
        const companyName = companyDestData.id;
        const city = $('#inputCityDest').val();
        const state = $('#StatesDest').val();
        const zip = $('#inputZipDest').val();
        
        // Validación de campos requeridos
        if (!companyName || !city || !state || !zip) {
            Swal.fire({
                icon: 'warning',
                title: 'Incomplete Destination Company Data',
                text: 'Please complete all destination company fields (Name, City, State and Zip Code).'
            });
            return { success: false };
        }
        
        try {
            // Mostrar indicador de carga
            Swal.fire({
                title: 'Saving destination company...',
                text: 'Please wait.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            
            // Realizar la petición POST al servidor
            const response = await fetch(URLPF + 'dao/elements/daoAddLocation.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    company_name: companyName,
                    city: city,
                    state: state,
                    zip: zip
                })
            });
            
            const result = await response.json();
            if (result.status === 'success') {
                console.log("Destination company saved successfully. ID:", result.company_id);
                newCompanyIds.destiny_id = parseInt(result.company_id);
                
                // Actualizar el Select2 con el nuevo ID
                const newOption = new Option(companyName, result.company_id, true, true);
                companyDestElement.append(newOption).trigger('change');
                
                // Cerrar el indicador de carga
                Swal.close();
            } else {
                throw new Error(result.message || 'Error saving destination company');
            }
        } catch (error) {
            console.error('Error saving new destination company:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not save the destination company: ' + error.message
            });
            return { success: false };
        }
    }

    // Retornar éxito y los nuevos IDs
    return { 
        success: true,
        newCompanyIds: newCompanyIds
    };
}

// Función para validar exhaustivamente todos los campos del formulario.
// Esta función organiza los campos del formulario en secciones lógicas
// para proporcionar mensajes de error más específicos y amigables al usuario
// si faltan campos obligatorios.
function validateCompleteForm() {
    // Define una estructura de secciones del formulario.
    // Cada sección agrupa un conjunto de IDs de campos relacionados.
    // Esto se usa para generar mensajes de error más contextualizados.
    const sections = {
        "Información General": ['planta', 'codeplanta', 'transport', 'InOutBound'],
        "Información de Costo": ['QuotedCost'], // 'CostoEuros' se calcula, por eso no está aquí como obligatorio directo
        "Responsabilidad": ['Area', 'IntExt', 'PaidBy'],
        "Detalles del Proyecto": ['CategoryCause', 'ProjectStatus', 'Recovery', 'Description'],
        "Enviar Desde (Origen)": ['CompanyShip', 'inputCityShip', 'StatesShip', 'inputZipShip'],
        "Destino": ['inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest'],
        "Detalles del Envío": ['Weight', 'Measures', 'Products', 'Carrier'],
        "Información de Referencia": ['Reference', 'ReferenceNumber']
    };

    // Llama a 'collectFormData' para obtener los datos actuales del formulario
    // y la lista de campos que están vacíos.
    const { formData, emptyFields } = collectFormData();

    // Check textarea minimum length
    const immediateActions = document.getElementById('InmediateActions');
    const permanentActions = document.getElementById('PermanentActions');
    const minLength = 50;
    
    if (immediateActions && immediateActions.value.length < minLength) {
        emptyFields.push('Immediate Actions (minimum 50 characters)');
    }
    
    if (permanentActions && permanentActions.value.length < minLength) {
        emptyFields.push('Permanent Actions (minimum 50 characters)');
    }

    // Si la lista 'emptyFields' está vacía, significa que todos los campos (según la lógica de 'collectFormData')
    // tienen un valor. En este caso, el formulario se considera válido en términos de completitud.
    if (emptyFields.length === 0) {
        return { isValid: true, formData }; // Retorna validez y los datos del formulario.
    }

    // Si hay campos vacíos, se procede a identificar en qué secciones se encuentran.
    const sectionsWithEmptyFields = {}; // Objeto para almacenar las secciones que tienen campos vacíos.
    
    // Itera sobre cada sección definida en el objeto 'sections'.
    for (const [sectionName, sectionFields] of Object.entries(sections)) {
        // Filtra los campos de la sección actual para encontrar cuáles están en la lista 'emptyFields'.
        const missingFields = sectionFields.filter(field => emptyFields.includes(field));
        // Si se encontraron campos faltantes en esta sección, se añade la sección y sus campos faltantes
        // al objeto 'sectionsWithEmptyFields'.
        if (missingFields.length > 0) {
            sectionsWithEmptyFields[sectionName] = missingFields;
        }
    }

    // Construye un mensaje de error detallado para el usuario.
    let errorMessage = 'Por favor, complete todos los campos requeridos en las siguientes secciones:\n';
    // Itera sobre las secciones que tienen campos vacíos.
    for (const [section, fields] of Object.entries(sectionsWithEmptyFields)) {
        // Mapea los IDs de los campos faltantes a sus etiquetas (labels) visibles en el formulario,
        // para que el mensaje sea más comprensible para el usuario.
        const fieldLabels = fields.map(fieldId => {
            const element = document.getElementById(fieldId); // Obtiene el elemento del campo.
            if (element) {
                // Intenta encontrar el elemento <label> asociado al campo mediante el atributo 'for'.
                const labelElement = document.querySelector(`label[for="${fieldId}"]`);
                // Si se encuentra la etiqueta, usa su contenido de texto. Si no, usa el ID del campo como fallback.
                return labelElement ? labelElement.textContent : fieldId;
            }
            return fieldId; // Fallback si el elemento no se encuentra (aunque no debería pasar si está en emptyFields).
        });
        
        // Añade la información de la sección y sus campos faltantes (con etiquetas amigables) al mensaje de error.
        errorMessage += `\n• ${section}: ${fieldLabels.join(', ')}`;
    }

    // Verificaciones adicionales específicas que no se cubren con la simple comprobación de campos vacíos.

    // Verifica si se ha seleccionado una moneda.
    // 'selectedCurrency' se asume que es una variable global o accesible en este ámbito,
    // que almacena la moneda seleccionada por el usuario (ej. 'MXN', 'USD').
    if (!selectedCurrency) { // Si no hay moneda seleccionada.
        errorMessage += '\n\n• Moneda: Por favor, seleccione una moneda (MXN o USD)';
    }
    
    // Verifica el costo en euros.
    // 'euros' se asume que es una variable global o accesible que contiene el costo convertido a euros.
    // Si el costo en euros es 0 o menor, Y el campo 'QuotedCost' no está vacío (lo que implica que se ingresó un costo),
    // podría indicar un problema con la tasa de cambio o la conexión a internet si la tasa se obtiene de forma remota.
    if (euros <= 0 && !emptyFields.includes('QuotedCost')) {
        errorMessage += '\n\n• Costo en Euros: El costo en euros no puede ser 0 o negativo. Verifique la tasa de cambio o su conexión a internet.';
    }

    // Si se llega a este punto, significa que hay campos faltantes o errores específicos.
    // Se retorna un objeto indicando que el formulario no es válido, junto con el mensaje de error.
    return { isValid: false, errorMessage };
}

/**
 * Funciones auxiliares para manejar validación con Select2
 * Estas funciones extienden la validación existente para trabajar con Select2
 */

// Función para validar elementos Select2
function validateSelect2Element(selectElement) {
    const $select = $(selectElement);
    const value = $select.val();
    
    if (!value || value === '') {
        // Aplicar clases de error al elemento select y su contenedor Select2
        $select.addClass('is-invalid');
        $select.next('.select2-container').addClass('select2-container--error');
        return false;
    } else {
        // Aplicar clases de validación exitosa
        $select.removeClass('is-invalid').addClass('is-valid');
        $select.next('.select2-container').removeClass('select2-container--error');
        return true;
    }
}

// Sobrescribir collectFormData para manejar Select2 correctamente
// Esta versión conserva toda la lógica original pero agrega soporte para Select2
const originalCollectFormData = collectFormData;
collectFormData = function() {
    // Primero llamamos a la implementación original
    const result = originalCollectFormData();
    
    // Ahora agregamos lógica adicional para Select2
    const formData = result.formData;
    const emptyFields = result.emptyFields;
    
    // Validar todos los elementos select2 que puedan estar vacíos
    $('select.is-invalid').each(function() {
        const id = $(this).attr('id');
        if (id && !emptyFields.includes(id)) {
            emptyFields.push(id);
        }
    });
    
    // Asegurar que los valores de Select2 se capturen correctamente
    $('select').each(function() {
        const id = $(this).attr('id');
        if (id && $(this).hasClass('select2-hidden-accessible')) {
            // Para selects que necesitan el texto mostrado en lugar del valor
            const textFields = [
                'planta', 'codeplanta', 'transport', 'InOutBound', 'Area', 'IntExt', 'PaidBy',
                'CategoryCause', 'ProjectStatus', 'Recovery', 'Carrier',
                'StatesShip', 'StatesDest'
            ];
            
            if (textFields.includes(id)) {
                // Capturar el texto visible seleccionado
                const selectedText = $(this).find('option:selected').text().trim();
                formData[id] = selectedText;
            }
        }
    });
    
    return { formData, emptyFields };
};

// Extender validateCompleteForm para validar elementos Select2
const originalValidateCompleteForm = validateCompleteForm;
validateCompleteForm = function() {
    // Validar todos los selects con Select2
    $('select[required]').each(function() {
        validateSelect2Element(this);
    });
    
    // Luego llamar a la implementación original
    return originalValidateCompleteForm();
};

/**
 * Verificación de disponibilidad de la variable URL
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URLPF === 'undefined') {
    console.warn('URLPF global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    // Fallback a URLPF hardcodeada solo como último recurso
    window.URLPF = window.URLPF || 'https://grammermx.com/Jesus/PruebaDos/';
}