/**
 * formValidation.js
 * This module contains functions for validation and processing of forms
 * for Premium Freight on the GRAMMER platform.
 */

//==========================================================================================
// Function to collect and validate form data.
// This is the single source of truth for collecting form data.
function collectFormData() {
    const fields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'CostoEuros', 'Description',
        'Area', 'IntExt', 'PaidBy', 'CategoryCause', 'ProjectStatus', 'Recovery',
        'Weight', 'Measures', 'Products', 'Carrier', 'QuotedCost', 'ReferenceOrder',
        'CompanyShip', 'inputCityShip', 'StatesShip', 'inputZipShip',
        'inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest'
    ];

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

            if (element.tagName === 'SELECT' && textFields.includes(id)) {
                if (typeof $ !== 'undefined' && $(element).hasClass('select2-hidden-accessible')) {
                    const selectedData = $(element).select2('data');
                    value = (selectedData && selectedData.length > 0 && selectedData[0].text) ? selectedData[0].text : '';
                } else {
                    const selectedOption = element.options[element.selectedIndex];
                    value = selectedOption ? selectedOption.text : '';
                }
            } else {
                value = element.value;
            }

            if (typeof value === 'string') {
                value = value.trim();
            }
            formData[id] = value;

            // The check for 'ReferenceOrder' is now done like any other field.
            if (!value || value === '') {
                emptyFields.push(id);
            }
        } else {
            console.warn(`Field element with ID '${id}' not found in the DOM.`);
        }
    });

    return { formData, emptyFields };
}

//==========================================================================================
// Async function to check and save new companies (origin and destination)
async function processNewCompanies() {
    // ... (This function remains unchanged)
}

// Function to visually validate a Select2 element
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


// Function to comprehensively validate all form fields.
function validateCompleteForm() {
    $('select[required]').each(function() {
        validateSelect2Element(this);
    });

    const sections = {
        "General Information": ['planta', 'codeplanta', 'transport', 'InOutBound'],
        "Cost Information": ['QuotedCost'],
        "Responsibility": ['Area', 'IntExt', 'PaidBy'],
        "Project Details": ['CategoryCause', 'ProjectStatus', 'Recovery', 'Description'],
        "Shipment Origin": ['CompanyShip', 'inputCityShip', 'StatesShip', 'inputZipShip'],
        "Destination": ['inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest'],
        // MODIFICACIÓN: Se añade 'recoveryFile' para que el mensaje de error sepa a qué sección pertenece.
        "Shipment Details": ['Weight', 'Measures', 'Products', 'Carrier', 'recoveryFile'],
        "Reference Information": ['ReferenceOrder']
    };

    const { formData, emptyFields } = collectFormData();
    let customErrorMessages = {};

    // ================== INICIO: BLOQUE DE CÓDIGO AÑADIDO ==================
    // Esta es la lógica que faltaba. Valida el campo del archivo de recuperación.
    const recoverySelect = document.getElementById('Recovery');
    const recoveryFile = document.getElementById('recoveryFile');
    
    if (recoverySelect && recoveryFile) {
        const selectedText = recoverySelect.options[recoverySelect.selectedIndex]?.text || '';
        // 'needsFile' es true si se elige cualquier opción que NO sea "NO RECOVERY".
        const needsFile = !selectedText.toUpperCase().includes('NO RECOVERY');

        // Si se necesita el archivo pero no se ha subido, se marca como un error.
        if (needsFile && (!recoveryFile.files || recoveryFile.files.length === 0)) {
            if (!emptyFields.includes('recoveryFile')) {
                emptyFields.push('recoveryFile');
            }
            // Mensaje de error personalizado para este campo.
            customErrorMessages['recoveryFile'] = 'Recovery Evidence (PDF)';
            recoveryFile.classList.add('is-invalid');
        } else {
            // Si no se necesita o ya se subió, se quita el estilo de error.
            recoveryFile.classList.remove('is-invalid');
        }
    }
    // =================== FIN: BLOQUE DE CÓDIGO AÑADIDO ===================

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
        // Clean up any previous error state for ReferenceOrder if the form is now valid
        $('#ReferenceOrder').next('.select2-container').removeClass('select2-container--error');
        return { isValid: true, formData };
    }

    const sectionsWithEmptyFields = {};
    for (const [sectionName, sectionFields] of Object.entries(sections)) {
        const missingFields = sectionFields.filter(field => emptyFields.includes(field));
        if (missingFields.length > 0) {
            sectionsWithEmptyFields[sectionName] = missingFields;
        }
    }

    let errorMessage = 'Please complete all required fields in the following sections:\n';
    for (const [section, fields] of Object.entries(sectionsWithEmptyFields)) {
        const fieldLabels = fields.map(fieldId => {
            if (customErrorMessages[fieldId]) {
                return customErrorMessages[fieldId];
            }
            const label = document.querySelector(`label[for="${fieldId}"]`);
            return label ? label.textContent.replace('*', '').trim() : fieldId;
        });
        
        if (fieldLabels.length > 0) {
            errorMessage += `\n• ${section}: ${fieldLabels.join(', ')}`;
        }
    }

    if (typeof selectedCurrency !== 'undefined' && !selectedCurrency) {
        errorMessage += '\n\n• Currency: Please select a currency (MXN or USD)';
    }
    
    if (typeof euros !== 'undefined' && euros <= 0 && !emptyFields.includes('QuotedCost')) {
        errorMessage += '\n\n• Cost in Euros: The cost in euros cannot be 0 or negative. Please check the exchange rate or your internet connection.';
    }

    return { isValid: false, message: errorMessage };
}


/**
 * Check for URL variable availability
 */
if (typeof URLPF === 'undefined') {
    console.warn('URLPF global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    window.URLPF = window.URLPF || 'https://grammermx.com/Logistica/PremiumFreight/';
}

if (typeof URLM === 'undefined') {
    console.warn('URLM global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    window.URLM = window.URLM || 'https://grammermx.com/Mailer/PFMailer/';
}