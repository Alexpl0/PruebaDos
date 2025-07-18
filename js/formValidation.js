/**
 * formValidation.js
 * Este módulo contiene funciones para validación y procesamiento de formularios
 * de Premium Freight en la plataforma GRAMMER
 */

//==========================================================================================
// Función para recolectar y validar los datos del formulario.
// Esta es la única fuente de verdad para recolectar datos del formulario.
function collectFormData() {
    // MODIFICADO: Se eliminan 'Reference' y 'ReferenceNumber', se añade 'ReferenceOrder'.
    const fields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'CostoEuros', 'Description',
        'Area', 'IntExt', 'PaidBy', 'CategoryCause', 'ProjectStatus', 'Recovery',
        'Weight', 'Measures', 'Products', 'Carrier', 'QuotedCost', 'ReferenceOrder',
        'CompanyShip', 'inputCityShip', 'StatesShip', 'inputZipShip',
        'inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest'
    ];

    // Lista de campos cuyo TEXTO visible debe ser enviado.
    const textFields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'Area', 'IntExt', 'PaidBy',
        'CategoryCause', 'ProjectStatus', 'Recovery', 'Carrier',
        'StatesShip', 'StatesDest'
    ];
    
    let formData = {};
    let emptyFields = [];

    fields.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            let value;

            // Manejo especial para elementos 'SELECT' para obtener el texto visible.
            if (element.tagName === 'SELECT' && textFields.includes(id)) {
                // Si el elemento es un Select2, usa su API para obtener el texto.
                if (typeof $ !== 'undefined' && $(element).hasClass('select2-hidden-accessible')) {
                    const selectedData = $(element).select2('data');
                    value = (selectedData && selectedData.length > 0 && selectedData[0].text) ? selectedData[0].text : '';
                } else {
                    // Si es un select normal, usa el método estándar.
                    const selectedOption = element.options[element.selectedIndex];
                    value = selectedOption ? selectedOption.text : '';
                }
            } else {
                // Para todos los demás campos (inputs, textareas, y selects que envían ID)
                value = element.value;
            }

            if (typeof value === 'string') {
                value = value.trim();
            }
            formData[id] = value;

            // No se valida 'ReferenceOrder' aquí porque su valor es un ID. La validación de requerido se hace en validateCompleteForm.
            if ((!value || value === '') && id !== 'ReferenceOrder') {
                emptyFields.push(id);
            }
        } else {
            console.warn(`Field element with ID '${id}' not found in the DOM.`);
        }
    });

    // Se añade la validación para ReferenceOrder explícitamente.
    if (!$('#ReferenceOrder').val()) {
        emptyFields.push('ReferenceOrder');
    }

    return { formData, emptyFields };
}

//==========================================================================================
// Función asíncrona para verificar y guardar nuevas compañías (origen y destino)
async function processNewCompanies() {
    const companyShipElement = $('#CompanyShip');
    const companyDestElement = $('#inputCompanyNameDest');
    const companyShipData = companyShipElement.select2('data')[0];
    const companyDestData = companyDestElement.select2('data')[0];
    
    let newCompanyIds = {
        origin_id: null,
        destiny_id: null
    };

    if (companyShipData && companyShipData.isNew) {
        const companyName = companyShipData.id;
        const city = $('#inputCityShip').val();
        const state = $('#StatesShip').val();
        const zip = $('#inputZipShip').val();
        
        if (!companyName || !city || !state || !zip) {
            Swal.fire({
                icon: 'warning',
                title: 'Datos Incompletos',
                text: 'Por favor complete todos los campos de la compañía de origen (Nombre, Ciudad, Estado y Código Postal).'
            });
            return { success: false };
        }
        
        try {
            const saveResult = await saveNewCompany(companyName, city, state, zip);
            if (saveResult && saveResult !== false) {
                newCompanyIds.origin_id = saveResult;
            } else {
                throw new Error("Falló al guardar la compañía de origen");
            }
        } catch (error) {
            console.error("Error guardando compañía de origen:", error);
            return { success: false };
        }
    }

    if (companyDestData && companyDestData.isNew) {
        const companyName = companyDestData.id;
        const city = $('#inputCityDest').val();
        const state = $('#StatesDest').val();
        const zip = $('#inputZipDest').val();
        
        if (!companyName || !city || !state || !zip) {
            Swal.fire({
                icon: 'warning',
                title: 'Datos Incompletos',
                text: 'Por favor complete todos los campos de la compañía de destino (Nombre, Ciudad, Estado y Código Postal).'
            });
            return { success: false };
        }
        
        try {
            const saveResult = await saveNewCompany(companyName, city, state, zip);
            if (saveResult && saveResult !== false) {
                newCompanyIds.destiny_id = saveResult;
            } else {
                throw new Error("Falló al guardar la compañía de destino");
            }
        } catch (error) {
            console.error("Error guardando compañía de destino:", error);
            return { success: false };
        }
    }

    return { 
        success: true,
        newCompanyIds: newCompanyIds
    };
}

// Función para validar visualmente un elemento Select2
function validateSelect2Element(selectElement) {
    const $select = $(selectElement);
    const value = $select.val();
    
    if (!value || value === '') {
        $select.addClass('is-invalid');
        $select.next('.select2-container').addClass('select2-container--error');
        return false;
    } else {
        $select.removeClass('is-invalid').addClass('is-valid');
        $select.next('.select2-container').removeClass('select2-container--error');
        return true;
    }
}


// Función para validar exhaustivamente todos los campos del formulario.
function validateCompleteForm() {
    // Validar visualmente todos los selects con Select2 que sean requeridos
    $('select[required]').each(function() {
        validateSelect2Element(this);
    });

    // MODIFICADO: Se actualiza la sección de referencia.
    const sections = {
        "Información General": ['planta', 'codeplanta', 'transport', 'InOutBound'],
        "Información de Costo": ['QuotedCost'],
        "Responsabilidad": ['Area', 'IntExt', 'PaidBy'],
        "Detalles del Proyecto": ['CategoryCause', 'ProjectStatus', 'Recovery', 'Description'],
        "Origen del Envío": ['CompanyShip', 'inputCityShip', 'StatesShip', 'inputZipShip'],
        "Destino": ['inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest'],
        "Detalles del Envío": ['Weight', 'Measures', 'Products', 'Carrier'],
        "Información de Referencia": ['ReferenceOrder']
    };

    const { formData, emptyFields } = collectFormData();

    const immediateActions = document.getElementById('InmediateActions');
    const permanentActions = document.getElementById('PermanentActions');
    const minLength = 50;
    
    if (immediateActions && immediateActions.value.length < minLength) {
        if (!emptyFields.includes('Immediate Actions (minimum 50 characters)')) {
            emptyFields.push('Immediate Actions (minimum 50 characters)');
        }
    }
    
    if (permanentActions && permanentActions.value.length < minLength) {
        if (!emptyFields.includes('Permanent Actions (minimum 50 characters)')) {
            emptyFields.push('Permanent Actions (minimum 50 characters)');
        }
    }

    if (emptyFields.length === 0) {
        return { isValid: true, formData };
    }

    const sectionsWithEmptyFields = {};
    for (const [sectionName, sectionFields] of Object.entries(sections)) {
        const missingFields = sectionFields.filter(field => emptyFields.includes(field));
        if (missingFields.length > 0) {
            sectionsWithEmptyFields[sectionName] = missingFields;
        }
    }

    let errorMessage = 'Por favor complete todos los campos requeridos en las siguientes secciones:\n';
    for (const [section, fields] of Object.entries(sectionsWithEmptyFields)) {
        const fieldLabels = fields.map(fieldId => {
            const label = document.querySelector(`label[for="${fieldId}"]`);
            return label ? label.textContent.replace('*', '').trim() : fieldId;
        });
        
        errorMessage += `\n• ${section}: ${fieldLabels.join(', ')}`;
    }

    if (typeof selectedCurrency !== 'undefined' && !selectedCurrency) {
        errorMessage += '\n\n• Moneda: Por favor seleccione una moneda (MXN o USD)';
    }
    
    if (typeof euros !== 'undefined' && euros <= 0 && !emptyFields.includes('QuotedCost')) {
        errorMessage += '\n\n• Costo en Euros: El costo en euros no puede ser 0 o negativo. Por favor verifique el tipo de cambio o su conexión a internet.';
    }

    return { isValid: false, message: errorMessage };
}


/**
 * Verificación de disponibilidad de las variables URL
 */
if (typeof URLPF === 'undefined') {
    console.warn('URLPF global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    window.URLPF = window.URLPF || 'https://grammermx.com/Jesus/PruebaDos/';
}

if (typeof URLM === 'undefined') {
    console.warn('URLM global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    window.URLM = window.URLM || 'https://grammermx.com/Mailer/PFMailer/';
}
