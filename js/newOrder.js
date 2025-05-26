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
    const hasNewCompanies = window.hasNewCompaniesToSave && window.hasNewCompaniesToSave();
    
    if (hasNewCompanies) {
        try {
            const result = await window.saveNewCompanies();
            if (result && result.success) {
                originId = result.originId;
                destinyId = result.destinyId;
                console.log("New companies saved successfully. Origin ID:", originId, "Destiny ID:", destinyId);
            } else {
                console.error("Failed to save new companies:", result ? result.error : "Unknown error");
                return;
            }
        } catch (error) {
            console.error("Error saving new companies:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to save new company information. Please try again.'
            });
            return;
        }
    }

    // Process new carrier if needed
    let carrierId = null;
    const hasNewCarrier = window.hasNewCarrierToSave && window.hasNewCarrierToSave();

    if (hasNewCarrier) {
        try {
            carrierId = await window.saveNewCarrier();
            if (!carrierId) {
                console.error("Failed to save new carrier");
                return;
            }
        } catch (error) {
            console.error("Error saving new carrier:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to save new carrier information. Please try again.'
            });
            return;
        }
    }

    // Get existing carrier ID if needed
    if (!carrierId) {
        carrierId = $('#Carrier').val();
    }

    // 2. Validar el formulario
    const validationResult = validateCompleteForm();
    if (!validationResult.isValid) {
        Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: validationResult.message || 'Please check the form for errors.'
        });
        return;
    }

    const formData = validationResult.formData;

    // 3. Obtener los IDs de compañía (nuevos o existentes)
    const companyValidation = validateCompanyIds();
    if (!companyValidation.valid && !originId && !destinyId) {
        Swal.fire({
            icon: 'error',
            title: 'Company Error',
            text: 'Please select valid origin and destination companies.'
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
            icon: 'error',
            title: 'Company Error',
            text: 'Origin and destination company IDs are required.'
        });
        return;
    }

    if (!payload.cost_euros || payload.cost_euros <= 0) {
        console.warn("Cost in euros is zero or invalid:", payload.cost_euros);
    }

    console.log("Final payload being sent:", payload);
    // console.log("Origin ID Type:", typeof payload.origin_id, "Value:", payload.origin_id);
    // console.log("Destination ID Type:", typeof payload.destiny_id, "Value:", payload.destiny_id);

    // 6. Verificar si se necesita archivo de recuperación
    const recoverySelect = document.getElementById('Recovery');
    const recoveryFile = document.getElementById('recoveryFile');
    const needsFile = !recoverySelect.options[recoverySelect.selectedIndex].text.includes('NO RECOVERY');
    
    // 7. Enviar el formulario principal
    try {
        const response = await sendFormDataAsync(payload);
        console.log("Response from server:", response); // Añade este log para depuración
        
        if (response && response.success) {
            // Verifica exactamente qué estructura tiene la respuesta
            console.log("Order ID from response:", response.order_id, "Full response:", response);
            
            // El problema puede estar aquí - el ID de la orden podría tener un nombre diferente
            // Intenta estas alternativas
            const orderId = response.order_id || response.orderId || response.id || response.premium_freight_id;
            
            if (!orderId) {
                console.error("Order ID is missing in server response:", response);
                Swal.fire({
                    icon: 'warning',
                    title: 'Order Status Unknown',
                    text: 'The order might have been created, but we could not determine its ID. Please check the dashboard.'
                });
                return;
            }
            
            // Si se necesita subir un archivo de recuperación y hay un archivo seleccionado
            if (needsFile && recoveryFile && recoveryFile.files.length > 0) {
                try {
                    console.log("Uploading recovery file for order ID:", orderId);
                    
                    const fileResponse = await uploadRecoveryFile(
                        orderId,
                        window.userName || 'Unknown User',
                        recoveryFile.files[0]
                    );
                    
                    if (!fileResponse || !fileResponse.success) {
                        console.error("Error uploading recovery file:", fileResponse ? fileResponse.message : "Unknown error");
                        Swal.fire({
                            icon: 'warning',
                            title: 'Order Created',
                            text: 'Order was created successfully, but there was an issue uploading the recovery file.'
                        });
                        return;
                    }
                } catch (fileError) {
                    console.error("Exception uploading recovery file:", fileError);
                    Swal.fire({
                        icon: 'warning',
                        title: 'Order Created',
                        text: 'Order was created successfully, but there was an error uploading the recovery file.'
                    });
                    return;
                }
            }
            
            // Enviar notificación de aprobación al siguiente aprobador
            try {
                console.log("Enviando notificación al siguiente aprobador para la orden:", orderId);
                
                // Importar dinámicamente el módulo mailer
                const mailerModule = await import('./mailer.js');
                
                // Llamar a la función de envío de notificación
                await mailerModule.sendApprovalNotification(orderId);
                
                console.log("Notificación enviada exitosamente");
            } catch (notificationError) {
                console.error("Error al enviar notificación:", notificationError);
                // No mostramos error al usuario ya que la orden ya se creó correctamente
            }

            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Order created successfully with ID: ' + orderId,
                confirmButtonText: 'OK'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = 'dashboard.php';
                }
            });
            
        } else {
            console.error("Error from server:", response ? response.message : "Unknown error");
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: response && response.message ? response.message : 'Failed to create order. Please try again.'
            });
        }
    } catch (error) {
        console.error("Exception in order submission:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An unexpected error occurred. Please try again later.'
        });
    }
}

// Function to send form data as a promise
function sendFormDataAsync(payload) {
    console.log("Sending form data to server: ", URL + 'dao/conections/daoPFpost.php');
    return new Promise((resolve, reject) => {
        fetch(URL + 'dao/conections/daoPFpost.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => resolve(data))
        .catch(error => reject(error));
    });
}

//==========================================================================================
// Function to upload a recovery file
async function uploadRecoveryFile(orderId, userName, file) {
    if (!orderId || !file) {
        console.error("Missing required parameters for file upload", { orderId, hasFile: !!file });
        return { success: false, message: "Missing required parameters" };
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
        const errorText = await response.text();
        console.error("Upload failed with status:", response.status, errorText);
        return { success: false, message: `Upload failed: ${response.statusText}` };
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
        console.warn("Invalid cost value for authorization range calculation:", quotedCost);
        return 1; // Default to lowest authorization level
    }

    if (cost <= 1500) {
        return 1;
    } else if (cost <= 3000) {
        return 2;
    } else if (cost <= 5000) {
        return 3;
    } else {
        return 4;
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
        console.log("handleRecoveryFileVisibility called");
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
        
        // Get the selected option text
        const selectedIndex = recoverySelect.selectedIndex;
        const selectedText = selectedIndex >= 0 ? recoverySelect.options[selectedIndex].text : '';
        
        console.log("Recovery selection:", {
            element: recoverySelect,
            value: recoverySelect.value,
            selectedIndex: selectedIndex,
            selectedText: selectedText
        });
        
        // Check if the selected option is "NO RECOVERY" (by text content)
        const isNoRecovery = selectedText.toUpperCase().includes('NO RECOVERY');
        
        console.log("Is NO RECOVERY selected:", isNoRecovery);
        
        if (isNoRecovery) {
            fileContainer.style.display = 'none';
            // Clear the file input when hiding
            const fileInput = document.getElementById('recoveryFile');
            if (fileInput) fileInput.value = '';
        } else {
            fileContainer.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error in handleRecoveryFileVisibility:', error);
    }
}

//==========================================================================================
// Initializes event listeners and other configurations when the DOM (Document Object Model)
// is fully loaded and ready to be manipulated.
// This ensures that all HTML elements are available before attempting to interact with them using JavaScript.
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded - Initializing form");
    
    initializeCompanySelectors();
    initializeCarrierSelector();
    initializeCurrencySelectors();

    const btnSubmit = document.getElementById('enviar');
    if (btnSubmit) {
        btnSubmit.addEventListener('click', submitForm);
    } else {
        console.error("Submit button ('enviar') not found. The form cannot be submitted.");
    }

    // Handle recovery selection and file upload visibility
    const recoverySelect = document.getElementById('Recovery');
    if (recoverySelect) {
        console.log("Setting up Recovery select event listeners");
        
        // Standard change event for native select element
        recoverySelect.addEventListener('change', function() {
            console.log("Recovery selection changed");
            handleRecoveryFileVisibility();
        });
        
        // Handle Select2 if jQuery and Select2 are available
        if (window.jQuery && $.fn.select2) {
            $(document).ready(function() {
                if ($('#Recovery').length) {
                    console.log("Initializing Select2 for Recovery");
                    
                    // This event fires when a Select2 selection changes
                    $('#Recovery').on('select2:select', function() {
                        console.log("Recovery Select2 selection changed");
                        handleRecoveryFileVisibility();
                    });
                    
                    // Initialize with correct state after Select2 is fully loaded
                    setTimeout(handleRecoveryFileVisibility, 300);
                }
            });
        }
        
        // Initial setup
        console.log("Calling initial handleRecoveryFileVisibility");
        handleRecoveryFileVisibility();
    } else {
        console.error("Recovery select element not found");
    }
    
    // Set up file validation for recovery uploads
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

    // Initialize text area handlers for descriptions
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
    try {
        const immediateValue = document.getElementById('InmediateActions').value.trim();
        const permanentValue = document.getElementById('PermanentActions').value.trim();
        const descriptionField = document.getElementById('Description');
        
        if (descriptionField) {
            const combinedText = `IMMEDIATE ACTIONS:\n${immediateValue}\n\nPERMANENT ACTIONS:\n${permanentValue}`;
            descriptionField.value = combinedText;
            
            // Update character counters
            updateCharCounter(document.getElementById('InmediateActions'), '#immediateCounter', 50);
            updateCharCounter(document.getElementById('PermanentActions'), '#permanentCounter', 50);
        }
    } catch (error) {
        console.error("Error updating description:", error);
    }
}

/**
 * Updates character counters for textareas and validates minimum length
 * @param {HTMLElement} textarea - The textarea element to validate
 * @param {string} counterSelector - Selector for the counter element
 * @param {number} minLength - Minimum required character length
 */
function updateCharCounter(textarea, counterSelector, minLength) {
    try {
        const length = textarea.value.length;
        const counterElement = document.querySelector(counterSelector);
        
        if (counterElement) {
            const countElement = counterElement.querySelector('.char-count');
            if (countElement) {
                countElement.textContent = `${length}/${minLength}`;
            }
            
            const requirementElement = counterElement.querySelector('.text-danger');
            if (requirementElement) {
                if (length >= minLength) {
                    requirementElement.classList.remove('text-danger');
                    requirementElement.classList.add('text-success');
                    requirementElement.textContent = 'Minimum length met';
                    textarea.classList.add('is-valid');
                    textarea.classList.remove('is-invalid');
                } else {
                    requirementElement.classList.add('text-danger');
                    requirementElement.classList.remove('text-success');
                    requirementElement.textContent = `${minLength} characters required`;
                    textarea.classList.add('is-invalid');
                    textarea.classList.remove('is-valid');
                }
            }
        }
    } catch (error) {
        console.error("Error updating character counter:", error);
    }
}

/**
 * Returns the currently selected currency
 * @returns {string} The selected currency code (USD, MXN)
 */
function getSelectedCurrency() {
    const usdButton = document.getElementById('USD');
    return usdButton && usdButton.classList.contains('active') ? 'USD' : 'MXN';
}

/**
 * Verificación de disponibilidad de la variable URL
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URL === 'undefined') {
    console.warn("URL variable not defined. Using default base URL.");
    window.URL = 'https://grammermx.com/Jesus/PruebaDos/';
}