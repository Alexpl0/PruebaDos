/**
 * Premium Freight - New Order Management
 * 
 * Este módulo maneja la creación de nuevas órdenes de Premium Freight,
 * incluyendo la validación de formularios, el procesamiento de datos,
 * y el envío de información al servidor.
 */

//==========================================================================================
// Global variables
// 'range' stores the authorization level required for the order.
// Using 'let' because its value will be calculated and assigned dynamically
// by the 'calculateAuthorizationRange' function based on the quoted cost.
let range = 0;
import { 
    sendApprovalNotification, 
    sendStatusNotification 
} from './mailer.js';
//==========================================================================================
// Asynchronous function to validate and submit form data.
// This function executes when the user clicks the form submit button.
// It orchestrates validation, processing of new companies, payload preparation,
// and final data submission to the server.
async function submitForm(event) {
    event.preventDefault();

    // 1. Procesar nuevas compañías si las hay
    let originId = null;
    let destinyId = null;
    
    // Verificar si hay nuevas compañías que guardar utilizando la función de addCompany.js
    const hasNewCompanies = hasNewCompaniesToSave();
    
    if (hasNewCompanies) {
        // Muestra indicador de carga
        Swal.fire({
            title: 'Processing new companies',
            text: 'Please wait while we save the new company information',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        
        // Procesar nuevas compañías
        const processResult = await processNewCompanies();
        if (!processResult.success) {
            return; // Terminar si falla el procesamiento de nuevas compañías
        }
        
        // Usar los IDs de las nuevas compañías
        if (processResult.newCompanyIds.origin_id) {
            originId = processResult.newCompanyIds.origin_id;
            console.log("Using new origin company ID:", originId);
        }
        
        if (processResult.newCompanyIds.destiny_id) {
            destinyId = processResult.newCompanyIds.destiny_id;
            console.log("Using new destination company ID:", destinyId);
        }
        
        Swal.close();
    }
    else {
        console.log("No new companies to process.");
    }

    // Process new carrier if needed
    let carrierId = null;
    const hasNewCarrier = window.hasNewCarrierToSave && window.hasNewCarrierToSave();

    if (hasNewCarrier) {
        // Process the new carrier
        const carrierResult = await processNewCarrier();
        if (!carrierResult.success) {
            return; // Exit if carrier processing fails
        }
        
        // Use the ID of the new carrier
        if (carrierResult.newCarrierId) {
            carrierId = carrierResult.newCarrierId;
            console.log("Using new carrier ID:", carrierId);
        }
    }

    // Get existing carrier ID if needed
    if (!carrierId) {
        const carrierValidation = validateCarrierId();
        if (!carrierValidation.valid) {
            Swal.fire({
                icon: 'warning',
                title: 'Carrier Selection Required',
                text: 'Please select a valid carrier.'
            });
            return;
        }
        carrierId = carrierValidation.carrierId;
    }

    // 2. Validar el formulario
    const validationResult = validateCompleteForm();
    if (!validationResult.isValid) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Information',
            html: validationResult.errorMessage.replace(/\n/g, '<br>'),
            confirmButtonText: 'Complete Form'
        });
        return;
    }

    const formData = validationResult.formData;

    // 3. Obtener los IDs de compañía (nuevos o existentes)
    const companyValidation = validateCompanyIds();
    if (!companyValidation.valid && !originId && !destinyId) {
        Swal.fire({
            icon: 'warning',
            title: 'Company Selection Required',
            text: 'Please select valid companies for both origin and destination.'
        });
        return;
    }

    // Usar IDs de nuevas compañías o de la validación de compañías existentes
    const finalOriginId = originId || companyValidation.originId;
    const finalDestinyId = destinyId || companyValidation.destinyId;

    const quotedCost = parseFloat(formData['QuotedCost']);
    range = calculateAuthorizationRange(quotedCost);

    // 4. Preparar el payload con los IDs correctos
    const payload = {
        user_id: window.userID || 1,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        planta: formData['planta'],
        code_planta: formData['codeplanta'],
        transport: formData['transport'],
        in_out_bound: formData['InOutBound'],
        cost_euros: (typeof euros === 'number' && !isNaN(euros)) ? euros : 0,
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
        carrier: carrierId,
        quoted_cost: quotedCost,
        reference: formData['Reference'],
        reference_number: formData['ReferenceNumber'],
        origin_id: finalOriginId,
        destiny_id: finalDestinyId,
        status_id: 1,
        required_auth_level: range,
        moneda: getSelectedCurrency()
    };

    // 5. Validaciones finales
    if (!payload.origin_id || !payload.destiny_id) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Company Information',
            text: 'Please select or create valid companies for origin and destination.'
        });
        return;
    }

    if (!payload.cost_euros || payload.cost_euros <= 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Currency Conversion Problem',
            text: 'There was a problem calculating the cost in Euros. Please check your connection and try again.'
        });
        return;
    }

    console.log("Final payload being sent:", payload);
    console.log("Origin ID Type:", typeof payload.origin_id, "Value:", payload.origin_id);
    console.log("Destination ID Type:", typeof payload.destiny_id, "Value:", payload.destiny_id);

    // 6. Verificar si se necesita archivo de recuperación
    const recoverySelect = document.getElementById('Recovery');
    const noRecoveryValue = "NO RECOVERY";
    const recoveryFile = document.getElementById('recoveryFile');
    const needsFile = recoverySelect.value !== noRecoveryValue;

    // 7. Enviar el formulario principal
    try {
        Swal.fire({
            title: 'Sending order data...',
            text: 'Please wait.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        
        const result = await sendFormDataAsync(payload);

        if (result.success && needsFile && recoveryFile && recoveryFile.files && recoveryFile.files.length > 0) {
            // Obtener el nombre de usuario
            const userName = window.userName || 'anonymous_user';
            const shipmentId = result.shipment_id || null;
            console.log("Shipment ID:", shipmentId);
            
            Swal.fire({
                title: 'Uploading recovery file...',
                text: 'Please wait.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            
            try {
                const uploadResult = await uploadRecoveryFile(result.shipment_id, userName, recoveryFile.files[0]);
                console.log("File upload result:", uploadResult);
            } catch (uploadError) {
                console.error("File upload error:", uploadError);
                Swal.fire({
                    icon: 'warning',
                    title: 'File Upload Issue',
                    text: 'The order was created but there was a problem uploading the recovery file: ' + uploadError.message
                });
                // Continuar con el flujo de éxito a pesar del error de carga
            }
        }

        Swal.fire({
            icon: 'success',
            title: 'Data Saved',
            text: 'The premium freight order was created successfully.' + 
                  (result.shipment_id ? ` Order ID: ${result.shipment_id}` : '')
        });

        // Send notification to the first approver
        if (result.shipment_id) {
            try {
                await sendApprovalNotification(result.shipment_id);
                console.log("Approval notification sent for new order:", result.shipment_id);
            } catch (notificationError) {
                console.error("Error sending approval notification:", notificationError);
                // Don't show error to user since the order was created successfully
            }
        }

    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'An error occurred while processing your request.'
        });
    }
}

// Function to send form data as a promise
function sendFormDataAsync(payload) {
    return new Promise((resolve, reject) => {
        fetch(URL + 'dao/conections/daoPFpost.php', {
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
                    throw new Error(err.message || `Server responded with status: ${response.status}`);
                }).catch(() => {
                    throw new Error(`Server responded with status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(result => {
            if (result.success) {
                resolve(result);
            } else {
                reject(new Error(result.message || 'Could not save information'));
            }
        })
        .catch(error => {
            reject(error);
        });
    });
}

//==========================================================================================
// Function to upload a recovery file
async function uploadRecoveryFile(orderId, userName, file) {
    if (!orderId || !file) {
        throw new Error('Missing required parameters for file upload');
    }

    const formData = new FormData();
    formData.append('premium_freight_id', orderId);
    formData.append('userName', userName);
    formData.append('recoveryFile', file);
    
    const response = await fetch(URL + 'dao/conections/daoUploadRecovery.php', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

//==========================================================================================
// Helper function to calculate the authorization range or level required
// based on the quoted cost of the order.
// Defines different cost thresholds to assign an authorization level.
function calculateAuthorizationRange(quotedCost) {
    const cost = parseFloat(quotedCost);

    if (isNaN(cost)) {
        console.warn("Quoted cost is not a valid number:", quotedCost);
        return 0;
    }

    if (cost <= 1500) {
        return 3;
    } else if (cost > 1500 && cost <= 5000) {
        return 4;
    } else if (cost > 5000 && cost <= 10000) {
        return 6;
    } else if (cost > 10000) {
        return 7;
    } else {
        console.warn("Could not determine authorization range for cost:", cost);
        return 0;
    }
}

//==========================================================================================
// Function to validate and obtain the IDs of origin and destination companies.
// Uses jQuery to interact with Select2 elements.
// Returns an object with a validity indicator and the obtained IDs.
function validateCompanyIds() {
    const originCompanyId = $('#CompanyShip').data('selected-id') || 
                           ($('#CompanyShip').select2('data')[0] ? 
                            parseInt($('#CompanyShip').select2('data')[0].id, 10) : null);
    
    const destCompanyId = $('#inputCompanyNameDest').data('selected-id') || 
                          ($('#inputCompanyNameDest').select2('data')[0] ? 
                           parseInt($('#inputCompanyNameDest').select2('data')[0].id, 10) : null);
    
    console.log("Validating company IDs - Origin:", originCompanyId, "Destination:", destCompanyId);
    
    return {
        valid: Boolean(originCompanyId && destCompanyId),
        originId: originCompanyId,
        destinyId: destCompanyId
    };
}

//==========================================================================================
/**
 * Handles the visibility of the recovery file upload field based on the Recovery selection.
 * Works with both standard HTML selects and Select2 components.
 */
function handleRecoveryFileVisibility() {
    try {
        const recoverySelect = document.getElementById('Recovery');
        
        if (!recoverySelect) {
            console.error("Recovery select element not found");
            return;
        }
        
        const fileContainer = document.getElementById('recoveryFileContainer');
        
        if (!fileContainer) {
            console.error("Recovery file container not found");
            return;
        }
        
        const noRecoveryValue = "NO RECOVERY";
        
        if (window.jQuery && $.fn.select2 && $(recoverySelect).data('select2')) {
            const select2Container = document.getElementById('select2-Recovery-container');
            
            if (select2Container) {
                const selectedText = select2Container.textContent.trim();
                // console.log('Recovery selected (Select2):', selectedText);
                
                if (selectedText !== noRecoveryValue) {
                    fileContainer.style.display = 'block';
                    console.log('Showing recovery file upload field');
                } else {
                    fileContainer.style.display = 'none';
                    const fileInput = document.getElementById('recoveryFile');
                    if (fileInput) fileInput.value = '';
                    // console.log('Hiding recovery file upload field');
                }
                return;
            }
        }
        
        const selectedOption = recoverySelect.options[recoverySelect.selectedIndex];
        const selectedText = selectedOption ? selectedOption.textContent.trim() : '';
        // console.log('Recovery selected (standard):', selectedText);
        
        if (selectedText !== noRecoveryValue) {
            fileContainer.style.display = 'block';
            console.log('Showing recovery file upload field');
        } else {
            fileContainer.style.display = 'none';
            const fileInput = document.getElementById('recoveryFile');
            if (fileInput) fileInput.value = '';
            // console.log('Hiding recovery file upload field');
        }
        
    } catch (error) {
        console.error('Error in handleRecoveryFileVisibility:', error);
    }
}

//==========================================================================================
// Initializes event listeners and other configurations when the DOM (Document Object Model)
// is fully loaded and ready to be manipulated.
// This ensures that all HTML elements are available before attempting to interact with them using JavaScript.
document.addEventListener('DOMContentLoaded', function () {
    initializeCompanySelectors();
    initializeCarrierSelector();
    initializeCurrencySelectors();

    const btnSubmit = document.getElementById('enviar');
    if (btnSubmit) {
        btnSubmit.addEventListener('click', submitForm);
    } else {
        console.error("Submit button ('enviar') not found. The form cannot be submitted.");
    }

    const recoverySelect = document.getElementById('Recovery');
    if (recoverySelect) {
        recoverySelect.addEventListener('change', handleRecoveryFileVisibility);
        
        if (window.jQuery) {
            $(document).ready(function() {
                $('#Recovery').on('select2:select', handleRecoveryFileVisibility);
                setTimeout(handleRecoveryFileVisibility, 300);
            });
        }
        
        handleRecoveryFileVisibility();
    }
    
    const recoveryFile = document.getElementById('recoveryFile');
    if (recoveryFile) {
        recoveryFile.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const fileType = file.type;
                if (fileType !== 'application/pdf') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid File Type',
                        text: 'Please upload a PDF file as evidence for recovery.'
                    });
                    this.value = '';
                } else if (file.size > 10 * 1024 * 1024) {
                    Swal.fire({
                        icon: 'error',
                        title: 'File Too Large',
                        text: 'The file size should not exceed 10MB.'
                    });
                    this.value = '';
                }
            }
        });
    }

    const immediateActions = document.getElementById('InmediateActions');
    const permanentActions = document.getElementById('PermanentActions');
    
    if (immediateActions && permanentActions) {
        immediateActions.addEventListener('input', updateDescription);
        permanentActions.addEventListener('input', updateDescription);
        
        immediateActions.addEventListener('blur', function() {
            updateCharCounter(immediateActions, '#immediateCounter', 50);
        });
        
        permanentActions.addEventListener('blur', function() {
            updateCharCounter(permanentActions, '#permanentCounter', 50);
        });
        
        updateDescription();
    } else {
        console.error("Description text areas not found. Description updater could not be initialized.");
    }
});

/**
 * Updates the Description field by combining Immediate and Permanent Actions
 * This function combines the values from the two visible text areas into a single hidden Description field
 */
function updateDescription() {
    const description = document.getElementById('Description');
    const immediateActions = document.getElementById('InmediateActions');
    const permanentActions = document.getElementById('PermanentActions');
    
    if (description && immediateActions && permanentActions) {
        description.value = immediateActions.value + '\n' + permanentActions.value;
        
        updateCharCounter(immediateActions, '#immediateCounter', 50);
        updateCharCounter(permanentActions, '#permanentCounter', 50);
    } else {
        console.error("One or more description fields not found");
    }
}

/**
 * Updates character counters for textareas and validates minimum length
 * @param {HTMLElement} textarea - The textarea element to validate
 * @param {string} counterSelector - Selector for the counter element
 * @param {number} minLength - Minimum required character length
 */
function updateCharCounter(textarea, counterSelector, minLength) {
    if (!textarea || !counterSelector) return;
    
    const counterElement = document.querySelector(counterSelector);
    if (!counterElement) return;
    
    const currentLength = textarea.value.length;
    
    const charCount = counterElement.querySelector('.char-count');
    if (charCount) {
        charCount.textContent = `${currentLength}/${minLength}`;
    }
    
    const message = counterElement.querySelector('span:first-child');
    
    if (currentLength >= minLength) {
        if (message) message.className = 'text-success';
        if (message) message.textContent = 'Minimum length met';
        counterElement.classList.remove('text-danger');
        counterElement.classList.add('text-success');
        textarea.classList.remove('is-invalid');
        textarea.classList.add('is-valid');
    } else {
        const remaining = minLength - currentLength;
        if (message) message.className = 'text-danger';
        if (message) message.textContent = `${remaining} more characters required`;
        counterElement.classList.remove('text-success');
        counterElement.classList.add('text-danger');
        textarea.classList.remove('is-valid');
        textarea.classList.add('is-invalid');
    }
}

// Modify the validateCompleteForm function to check for minimum length
// Add this function to formValidation.js or add the check in the existing validation
// This function should be called before form submission
function validateTextareaMinLength() {
    const immediateActions = document.getElementById('InmediateActions');
    const permanentActions = document.getElementById('PermanentActions');
    const minLength = 50;
    let isValid = true;
    
    if (immediateActions && immediateActions.value.length < minLength) {
        immediateActions.classList.add('is-invalid');
        isValid = false;
    }
    
    if (permanentActions && permanentActions.value.length < minLength) {
        permanentActions.classList.add('is-invalid');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Verificación de disponibilidad de la variable URL
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URL === 'undefined') {
    console.warn('URL global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    // Fallback a URL hardcodeada solo como último recurso
    window.URL = window.URL || 'https://grammermx.com/Jesus/PruebaDos/';
}