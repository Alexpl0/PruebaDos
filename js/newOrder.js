/**
 * Premium Freight - New Order Management (Refactored & Updated)
 * * This module handles the creation of new Premium Freight orders.
 * * It now includes conditional logic for the Recovery and ReferenceOrder fields.
 */

// 1. Importar dependencias
import { sendApprovalNotification } from './mailer.js';
import {
    initializeReferenceSelector,
    initializeFullReferenceSelector,
    initializeLimitedReferenceSelector
} from './referenceSelect.js';
// Importa la función para inicializar el selector de productos
import { initializeProductSelector } from './productSelect.js';

let range = 0;

// Function to send form data to the server.
function sendFormDataAsync(payload) {
    console.log("Sending form data to server:", payload); // Log para depuración
    return new Promise((resolve, reject) => {
        fetch(window.PF_CONFIG.app.baseURL + 'dao/conections/daoPFpost.php', {
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

// Function to upload a recovery file.
async function uploadRecoveryFile(orderId, userName, file) {
    if (!orderId || !file) {
        console.error("Missing required parameters for file upload", { orderId, hasFile: !!file });
        return { success: false, message: "Missing required parameters" };
    }

    const formData = new FormData();
    formData.append('premium_freight_id', orderId);
    formData.append('userName', userName);
    formData.append('recoveryFile', file);
    
    const response = await fetch(window.PF_CONFIG.app.baseURL + 'dao/conections/daoUploadRecovery.php', {
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

// Helper function to calculate the authorization range.
function calculateAuthorizationRange(quotedCost) {
    const cost = parseFloat(quotedCost);

    if (isNaN(cost)) {
        console.warn("Invalid cost value for authorization range calculation:", quotedCost);
        return 5; // Default to lowest authorization level
    }

    if (cost <= 1500) return 5;
    if (cost <= 3000) return 6;
    if (cost <= 5000) return 7;
    return 8; // For costs > 5000
}

// Function to validate and obtain company IDs.
function validateCompanyIds() {
    const originCompanyId = $('#CompanyShip').data('selected-id') || ($('#CompanyShip').select2('data')[0] ? parseInt($('#CompanyShip').select2('data')[0].id, 10) : null);
    const destCompanyId = $('#inputCompanyNameDest').data('selected-id') || ($('#inputCompanyNameDest').select2('data')[0] ? parseInt($('#inputCompanyNameDest').select2('data')[0].id, 10) : null);
    
    return {
        valid: Boolean(originCompanyId && destCompanyId),
        originId: originCompanyId,
        destinyId: destCompanyId
    };
}

// Handles the visibility of the recovery file upload field.
function handleRecoveryFileVisibility() {
    const recoverySelect = document.getElementById('Recovery');
    const fileContainer = document.getElementById('recoveryFileContainer');
    const fileInput = document.getElementById('recoveryFile');
    if (!recoverySelect || !fileContainer || !fileInput) return;

    const selectedText = recoverySelect.options[recoverySelect.selectedIndex]?.text || '';
    const isNoRecovery = selectedText.toUpperCase().includes('NO RECOVERY');
    
    if (isNoRecovery) {
        fileContainer.style.display = 'none';
        fileInput.value = '';
        fileInput.required = false;
    } else {
        fileContainer.style.display = 'block';
        fileInput.required = true;
    }
}

/**
 * NEW FUNCTION
 * This function handles your second requirement.
 * It dynamically changes the options available in the 'ReferenceOrder' select
 * based on the value of the 'Recovery' select.
 */
function handleReferenceOrderFiltering() {
    const recoverySelect = document.getElementById('Recovery');
    if (!recoverySelect) return;

    const selectedText = recoverySelect.options[recoverySelect.selectedIndex]?.text || '';
    const isNoRecovery = selectedText.toUpperCase().includes('NO RECOVERY');

    // Clear the current selection in ReferenceOrder to prevent
    // carrying over a value that might not be valid in the new context.
    $('#ReferenceOrder').val(null).trigger('change');

    if (isNoRecovery) {
        // If "NO RECOVERY" is selected, initialize the selector with full AJAX capabilities.
        initializeFullReferenceSelector();
    } else {
        // Otherwise, initialize the selector with the limited, static list of options.
        initializeLimitedReferenceSelector();
    }
}

// Main function to validate and submit the form.
async function submitForm(event) {
    event.preventDefault();

    Swal.fire({
        title: 'Submitting Order',
        html: 'Please wait while your request is being processed...',
        timerProgressBar: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        if (typeof calculateEuros === 'function' && typeof getSelectedCurrency === 'function') {
            await calculateEuros(getSelectedCurrency());
        }

        let originId = null;
        let destinyId = null;
        if (window.hasNewCompaniesToSave && window.hasNewCompaniesToSave()) {
            const result = await window.saveNewCompanies();
            if (!result || !result.success) throw new Error(result?.error || "Failed to save new companies");
            originId = result.originId;
            destinyId = result.destinyId;
        }

        let carrierId = null;
        if (window.hasNewCarrierToSave && window.hasNewCarrierToSave()) {
            const carrierResult = await window.processNewCarrier();
            if (!carrierResult.success) {
                throw new Error("Failed to save new carrier");
            }
            carrierId = carrierResult.newCarrierId;
        }
        if (!carrierId) {
            carrierId = $('#Carrier').val();
        }

        let numOrderId = null;
        if (window.hasNewNumOrderToSave && window.hasNewNumOrderToSave()) {
            numOrderId = await window.saveNewNumOrder();
            if (!numOrderId) throw new Error("Failed to save new reference order number");
        }
        if (!numOrderId) {
            numOrderId = $('#ReferenceOrder').val();
        }

        const validationResult = validateCompleteForm();
        if (!validationResult.isValid) {
            throw new Error(validationResult.message || 'Please check the form for errors.');
        }
        const formData = validationResult.formData;

        const companyValidation = validateCompanyIds();
        const finalOriginId = originId || companyValidation.originId;
        const finalDestinyId = destinyId || companyValidation.destinyId;
        if (!finalOriginId || !finalDestinyId) {
            throw new Error('Please select valid origin and destination companies.');
        }

        const quotedCost = parseFloat(formData['QuotedCost']);
        range = calculateAuthorizationRange(euros);

        // ================== PAYLOAD MODIFICADO ==================
        // 'products' ahora enviará el ID del producto seleccionado.
        const payload = {
            user_id: window.PF_CONFIG.user.id || 1,
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
            products: parseInt(formData['Products'], 10), // <-- Asegura que sea int
            carrier: carrierId,
            quoted_cost: quotedCost,
            num_order_id: numOrderId,
            origin_id: finalOriginId,
            destiny_id: finalDestinyId,
            status_id: 1,
            required_auth_level: range,
            moneda: getSelectedCurrency()
        };
        // =========================================================

        const response = await sendFormDataAsync(payload);
        if (!response || !response.success) {
            throw new Error(response?.message || 'Failed to create order.');
        }

        const orderId = response.order_id || response.premium_freight_id;
        if (!orderId) {
            throw new Error("Order was created, but its ID is missing in the server response.");
        }

        // await sendApprovalNotification(orderId); // <--- COMENTADO PARA PRUEBAS

        const recoveryFile = document.getElementById('recoveryFile');
        const needsFile = !document.getElementById('Recovery').options[document.getElementById('Recovery').selectedIndex].text.includes('NO RECOVERY');
        if (needsFile && recoveryFile?.files.length > 0) {
            const fileResponse = await uploadRecoveryFile(orderId, window.PF_CONFIG.user.name, recoveryFile.files[0]);
            if (!fileResponse.success) {
                console.warn("Order created, but recovery file upload failed:", fileResponse.message);
            }
        }
        
        Swal.fire({
            icon: 'success',
            title: 'Order Created Successfully!',
            html: `Order <strong>#${orderId}</strong> has been created successfully.`,
            confirmButtonText: 'Go to Generated Orders'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'orders.php';
            }
        });

    } catch (error) {
        console.error("Exception in order submission:", error);
        Swal.fire({ 
            icon: 'error', 
            title: 'Submission Error', 
            text: error.message 
        });
    }
}

// Initializes event listeners when the DOM is ready.
document.addEventListener('DOMContentLoaded', function() {
    initializeCompanySelectors();
    initializeCarrierSelector();
    // ================== NUEVA LLAMADA A FUNCIÓN ==================
    initializeProductSelector(); // Inicializa el nuevo selector de productos
    // =============================================================
    initializeReferenceSelector();
    initializeCurrencySelectors();

    document.getElementById('enviar')?.addEventListener('click', submitForm);

    // --- MODIFIED EVENT LISTENER SETUP FOR RECOVERY ---
    const recoverySelect = document.getElementById('Recovery');
    if (recoverySelect) {
        // This single handler will now manage both the file input visibility
        // and the reference order filtering.
        const recoveryChangeHandler = () => {
            handleRecoveryFileVisibility();
            handleReferenceOrderFiltering();
        };

        // We use jQuery's .on() to reliably handle both standard change
        // and the select2:select event.
        $('#Recovery').on('change', recoveryChangeHandler);

        // Run the handler on page load to set the initial state correctly.
        recoveryChangeHandler();
    }
    // --- END OF MODIFICATION ---
    
    // Setup for description text areas
    const immediateActions = document.getElementById('InmediateActions');
    const permanentActions = document.getElementById('PermanentActions');
    if (immediateActions && permanentActions) {
        const updateAndValidate = () => {
            updateDescription();
            updateCharCounter(immediateActions, '#immediateCounter', 50);
            updateCharCounter(permanentActions, '#permanentCounter', 50);
        };
        immediateActions.addEventListener('input', updateAndValidate);
        permanentActions.addEventListener('input', updateAndValidate);
        updateAndValidate();
    }
});

// Helper function to update the combined description field.
function updateDescription() {
    const immediateValue = document.getElementById('InmediateActions')?.value.trim() || '';
    const permanentValue = document.getElementById('PermanentActions')?.value.trim() || '';
    const descriptionField = document.getElementById('Description');
    if (descriptionField) {
        descriptionField.value = `IMMEDIATE ACTIONS:\n${immediateValue}\n\nPERMANENT ACTIONS:\n${permanentValue}`;
    }
}

// Helper function to update character counters for textareas.
function updateCharCounter(textarea, counterSelector, minLength) {
    const length = textarea.value.length;
    const counterElement = document.querySelector(counterSelector);
    if (!counterElement) return;

    counterElement.querySelector('.char-count').textContent = `${length}/${minLength}`;
    const reqElement = counterElement.querySelector('span:first-child');
    
    if (length >= minLength) {
        reqElement.classList.replace('text-danger', 'text-success');
        reqElement.textContent = 'Minimum length met';
        textarea.classList.add('is-valid');
        textarea.classList.remove('is-invalid');
    } else {
        reqElement.classList.replace('text-success', 'text-danger');
        reqElement.textContent = `${minLength} characters required`;
        textarea.classList.add('is-invalid');
        textarea.classList.remove('is-valid');
    }
}

// Helper function to get the selected currency.
function getSelectedCurrency() {    
    if (typeof selectedCurrency !== 'undefined') {
        return selectedCurrency;
    }
    return document.getElementById('USD')?.classList.contains('active') ? 'USD' : 'MXN';
}
