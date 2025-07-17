/**
 * Premium Freight - New Order Management (Refactored)
 * * This module handles the creation of new Premium Freight orders.
 * It now imports notification functions from the central mailer.js module.
 */

// 1. Import notification function from the centralized module.
import { sendApprovalNotification } from './mailer.js';

// Global variable for the required authorization level.
let range = 0;

// Function to send form data to the server.
function sendFormDataAsync(payload) {
    console.log("Sending form data to server: ", window.PF_CONFIG.app.baseURL + 'dao/conections/daoPFpost.php');
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
        return 4; // Default to lowest authorization level
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
    if (!recoverySelect || !fileContainer) return;

    const selectedText = recoverySelect.options[recoverySelect.selectedIndex]?.text || '';
    const isNoRecovery = selectedText.toUpperCase().includes('NO RECOVERY');
    
    fileContainer.style.display = isNoRecovery ? 'none' : 'block';
    if (isNoRecovery) {
        const fileInput = document.getElementById('recoveryFile');
        if (fileInput) fileInput.value = '';
    }
}

// Main function to validate and submit the form.
async function submitForm(event) {
    event.preventDefault();

    // ================== START: LOADING MODAL ==================
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
    // =================== END: LOADING MODAL ===================

    try {
        // 1. Process new companies if any
        let originId = null;
        let destinyId = null;
        if (window.hasNewCompaniesToSave && window.hasNewCompaniesToSave()) {
            const result = await window.saveNewCompanies();
            if (!result || !result.success) throw new Error(result?.error || "Failed to save new companies");
            originId = result.originId;
            destinyId = result.destinyId;
        }

        // Process new carrier if needed
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

        // ================== NEW: Process new Reference Order if needed ==================
        let numOrderId = null;
        if (window.hasNewNumOrderToSave && window.hasNewNumOrderToSave()) {
            numOrderId = await window.saveNewNumOrder();
            if (!numOrderId) throw new Error("Failed to save new reference order number");
        }
        if (!numOrderId) {
            numOrderId = $('#ReferenceOrder').val();
        }
        // ==============================================================================

        // 2. Validate form
        const validationResult = validateCompleteForm();
        if (!validationResult.isValid) {
            throw new Error(validationResult.message || 'Please check the form for errors.');
        }
        const formData = validationResult.formData;

        // 3. Get company IDs (new or existing)
        const companyValidation = validateCompanyIds();
        const finalOriginId = originId || companyValidation.originId;
        const finalDestinyId = destinyId || companyValidation.destinyId;
        if (!finalOriginId || !finalDestinyId) {
            throw new Error('Please select valid origin and destination companies.');
        }

        // 4. Prepare payload
        const quotedCost = parseFloat(formData['QuotedCost']);
        range = calculateAuthorizationRange(quotedCost);

        // ================== MODIFIED: Payload updated for new reference field ==================
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
            products: formData['Products'],
            carrier: carrierId,
            quoted_cost: quotedCost,
            num_order_id: numOrderId, // Replaces 'reference' and 'reference_number'
            origin_id: finalOriginId,
            destiny_id: finalDestinyId,
            status_id: 1,
            required_auth_level: range,
            moneda: getSelectedCurrency()
        };
        // =====================================================================================
        
        // 5. Submit form data
        const response = await sendFormDataAsync(payload);
        if (!response || !response.success) {
            throw new Error(response?.message || 'Failed to create order.');
        }

        const orderId = response.order_id || response.premium_freight_id;
        if (!orderId) {
            throw new Error("Order was created, but its ID is missing in the server response.");
        }

        // 6. Upload recovery file if needed
        const recoveryFile = document.getElementById('recoveryFile');
        const needsFile = !document.getElementById('Recovery').options[document.getElementById('Recovery').selectedIndex].text.includes('NO RECOVERY');
        if (needsFile && recoveryFile?.files.length > 0) {
            const fileResponse = await uploadRecoveryFile(orderId, window.PF_CONFIG.user.name, recoveryFile.files[0]);
            if (!fileResponse.success) {
                console.warn("Order created, but recovery file upload failed:", fileResponse.message);
            }
        }
        
        // 7. Send approval notification using the imported function
        const notificationResult = await sendApprovalNotification(orderId);

        // 8. Show final success message
        Swal.fire({
            icon: 'success',
            title: 'Order Created Successfully!',
            html: `
                Order <strong>#${orderId}</strong> has been created successfully.<br><br>
                ${notificationResult.success ? 
                    '<i class="fas fa-check-circle text-success"></i> Approval notification sent.' : 
                    `<i class="fas fa-exclamation-triangle text-warning"></i> Order created, but notification failed: ${notificationResult.message}`
                }
            `,
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
    // ================== ADDED: Initialize the new reference selector ==================
    initializeReferenceSelector();
    // ================================================================================
    initializeCurrencySelectors();

    document.getElementById('enviar')?.addEventListener('click', submitForm);
    
    const recoverySelect = document.getElementById('Recovery');
    if (recoverySelect) {
        recoverySelect.addEventListener('change', handleRecoveryFileVisibility);
        if (window.jQuery && $.fn.select2) {
            $('#Recovery').on('select2:select', handleRecoveryFileVisibility);
        }
        handleRecoveryFileVisibility();
    }
    
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
    return document.getElementById('USD')?.classList.contains('active') ? 'USD' : 'MXN';
}
