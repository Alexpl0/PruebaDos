/**
 * Premium Freight - New Order Management (Refactored & Updated)
 * This module handles the creation of new Premium Freight orders.
 * It now includes conditional logic for the Recovery and ReferenceOrder fields.
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

/**
 * Function to format text to sentence case
 * Capitalizes first letter of sentences and maintains proper nouns
 */
function formatToSentenceCase(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Common proper nouns that should remain capitalized
    const properNouns = [
        'Grammer', 'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Ford', 'GM', 'General Motors',
        'Toyota', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Mitsubishi',
        'Chrysler', 'Jeep', 'Ram', 'Dodge', 'Cadillac', 'Buick', 'Chevrolet', 'GMC',
        'Lincoln', 'Mercury', 'Pontiac', 'Saturn', 'Hummer', 'Saab', 'Volvo', 'Jaguar',
        'Land Rover', 'Bentley', 'Rolls-Royce', 'Aston Martin', 'Lotus', 'McLaren',
        'Ferrari', 'Lamborghini', 'Maserati', 'Alfa Romeo', 'Fiat', 'Lancia', 'Peugeot',
        'Citroën', 'Renault', 'Dacia', 'Skoda', 'Seat', 'Cupra', 'Mexico', 'USA', 'US',
        'Canada', 'Germany', 'France', 'Italy', 'Spain', 'UK', 'China', 'Japan', 'Korea',
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December', 'COVID', 'AI', 'IT', 'QA', 'QC'
    ];
    
    // First, trim and clean the text
    let formattedText = text.trim();
    
    // Convert to lowercase first
    formattedText = formattedText.toLowerCase();
    
    // Restore proper nouns
    properNouns.forEach(noun => {
        const regex = new RegExp(`\\b${noun.toLowerCase()}\\b`, 'gi');
        formattedText = formattedText.replace(regex, noun);
    });
    
    // Capitalize first letter of sentences (after period, exclamation, question mark)
    formattedText = formattedText.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
        return prefix + letter.toUpperCase();
    });
    
    // Capitalize after colon if it starts a new thought
    formattedText = formattedText.replace(/:\s+([a-z])/g, (match, letter) => {
        return ': ' + letter.toUpperCase();
    });
    
    return formattedText;
}

// Function to send form data to the server.
function sendFormDataAsync(payload) {
    console.log("Payload to be sent:", JSON.stringify(payload, null, 2)); // Log detallado
    return new Promise((resolve, reject) => {
        fetch(window.PF_CONFIG.app.baseURL + 'dao/conections/daoPFpost.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            console.log("Server response status:", response.status, response.statusText);
            if (!response.ok) {
                return response.text().then(text => {
                    console.error("Raw error response:", text);
                    throw new Error('Network response was not ok: ' + response.statusText);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("Server response data:", data);
            resolve(data);
        })
        .catch(error => {
            console.error("Error in sendFormDataAsync:", error);
            reject(error);
        });
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
    if (cost <= 5000) return 6;
    if (cost <= 10000) return 7;
    return 8; // For costs > 10000
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

        // ================== PAYLOAD UPDATED WITH CORRECTIVE ACTION PLAN ==================
        const payload = {
            user_id: window.PF_CONFIG.user.id || 1,
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            planta: formData['planta'],
            code_planta: formData['codeplanta'],
            transport: formData['transport'],
            in_out_bound: formData['InOutBound'],
            cost_euros: (typeof euros === 'number' && !isNaN(euros)) ? euros : 0,
            description: formData['Description'], // This will contain the merged 5 Why's
            area: formData['Area'],
            int_ext: formData['IntExt'],
            paid_by: formData['PaidBy'],
            category_cause: formData['CategoryCause'],
            project_status: formData['ProjectStatus'],
            recovery: formData['Recovery'],
            weight: formData['Weight'],
            measures: formData['Measures'],
            products: parseInt(formData['Products'], 10),
            carrier: carrierId,
            quoted_cost: quotedCost,
            num_order_id: numOrderId,
            origin_id: finalOriginId,
            destiny_id: finalDestinyId,
            status_id: 1,
            required_auth_level: range,
            moneda: getSelectedCurrency(),
            // NUEVOS CAMPOS DEL CORRECTIVE ACTION PLAN
            corrective_action: formData['CorrectiveAction'],
            person_responsible: formData['PersonResponsible'],
            target_date: formData['TargetDate']
        };
        // ===============================================================

        const response = await sendFormDataAsync(payload);
        if (!response || !response.success) {
            throw new Error(response?.message || 'Failed to create order.');
        }

        const orderId = response.order_id || response.premium_freight_id;
        if (!orderId) {
            throw new Error("Order was created, but its ID is missing in the server response.");
        }

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
    initializeProductSelector();
    initializeReferenceSelector();
    initializeCurrencySelectors();

    document.getElementById('enviar')?.addEventListener('click', submitForm);

    // Recovery event handlers (keep existing)
    const recoverySelect = document.getElementById('Recovery');
    if (recoverySelect) {
        const recoveryChangeHandler = () => {
            handleRecoveryFileVisibility();
            handleReferenceOrderFiltering();
        };
        $('#Recovery').on('change', recoveryChangeHandler);
        recoveryChangeHandler();
    }
    
    // Setup for 5 Why's text areas - UPDATED
    const firstWhy = document.getElementById('FirstWhy');
    const secondWhy = document.getElementById('SecondWhy');
    const thirdWhy = document.getElementById('ThirdWhy');
    const fourthWhy = document.getElementById('FourthWhy');
    const fifthWhy = document.getElementById('FifthWhy');
    
    if (firstWhy && secondWhy && thirdWhy && fourthWhy && fifthWhy) {
        const updateAndValidate = () => {
            updateDescription();
            updateCharCounter(firstWhy, '#firstWhyCounter', 30);
            updateCharCounter(secondWhy, '#secondWhyCounter', 30);
            updateCharCounter(thirdWhy, '#thirdWhyCounter', 30);
            updateCharCounter(fourthWhy, '#fourthWhyCounter', 30);
            updateCharCounter(fifthWhy, '#fifthWhyCounter', 30);
        };
        
        firstWhy.addEventListener('input', updateAndValidate);
        secondWhy.addEventListener('input', updateAndValidate);
        thirdWhy.addEventListener('input', updateAndValidate);
        fourthWhy.addEventListener('input', updateAndValidate);
        fifthWhy.addEventListener('input', updateAndValidate);
        
        updateAndValidate();
    }

    // UPDATED: Setup for Corrective Action Plan
    const correctiveAction = document.getElementById('CorrectiveAction');
    const targetDate = document.getElementById('TargetDate');
    
    if (correctiveAction) {
        correctiveAction.addEventListener('input', () => {
            updateCharCounter(correctiveAction, '#correctiveActionCounter', 50);
        });
        updateCharCounter(correctiveAction, '#correctiveActionCounter', 50);
    }
    
    if (targetDate) {
        // CORREGIDO: Usar el evento 'change' en lugar de 'input' para input type="date"
        targetDate.addEventListener('change', updateWeekNumber);
        
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        targetDate.min = today;
        
        // Trigger initial update
        updateWeekNumber();
    }

    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// UPDATED: Update week number display function
function updateWeekNumber() {
    const targetDateInput = document.getElementById('TargetDate');
    const weekDisplay = document.getElementById('weekDisplay');
    
    if (!targetDateInput || !weekDisplay) {
        console.log('Target date input or week display element not found');
        return;
    }
    
    const selectedDate = targetDateInput.value;
    console.log('Selected date:', selectedDate); // Debug log
    
    if (!selectedDate) {
        weekDisplay.textContent = 'Select a date to see week number';
        weekDisplay.style.color = '#6c757d';
        return;
    }
    
    try {
        const date = new Date(selectedDate + 'T00:00:00'); // Add time to avoid timezone issues
        const weekNumber = getWeekNumber(date);
        const year = date.getFullYear();
        
        // Calculate days until target date
        const today = new Date();
        const timeDiff = date.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        let weekText = `Week ${weekNumber} of ${year}`;
        
        if (daysDiff > 0) {
            weekText += ` (${daysDiff} days from now)`;
            weekDisplay.style.color = '#28a745'; // Green for future dates
        } else if (daysDiff === 0) {
            weekText += ` (Today)`;
            weekDisplay.style.color = '#ffc107'; // Yellow for today
        } else {
            weekText += ` (${Math.abs(daysDiff)} days ago)`;
            weekDisplay.style.color = '#dc3545'; // Red for past dates
        }
        
        weekDisplay.textContent = weekText;
        console.log('Week display updated:', weekText); // Debug log
        
    } catch (error) {
        console.error('Error calculating week number:', error);
        weekDisplay.textContent = 'Invalid date';
        weekDisplay.style.color = '#dc3545';
    }
}

// UPDATED: Calculate week number function (ISO week date system)
function getWeekNumber(date) {
    // Copy date so don't modify original
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    
    return weekNo;
}

// Helper function to update the combined description field - UPDATED FOR 5 WHY'S
function updateDescription() {
    const firstWhyValue = document.getElementById('FirstWhy')?.value.trim() || '';
    const secondWhyValue = document.getElementById('SecondWhy')?.value.trim() || '';
    const thirdWhyValue = document.getElementById('ThirdWhy')?.value.trim() || '';
    const fourthWhyValue = document.getElementById('FourthWhy')?.value.trim() || '';
    const fifthWhyValue = document.getElementById('FifthWhy')?.value.trim() || '';
    const descriptionField = document.getElementById('Description');
    
    if (descriptionField) {
        let combinedDescription = '5 WHY\'S ANALYSIS:\n\n';
        
        if (firstWhyValue) {
            combinedDescription += `1st WHY - OBSERVABLE FACT:\n${formatToSentenceCase(firstWhyValue)}\n\n`;
        }
        
        if (secondWhyValue) {
            combinedDescription += `2nd WHY - REASON TO 1st WHY:\n${formatToSentenceCase(secondWhyValue)}\n\n`;
        }
        
        if (thirdWhyValue) {
            combinedDescription += `3rd WHY - PROCESSES, DECISIONS, CONSTRAINTS:\n${formatToSentenceCase(thirdWhyValue)}\n\n`;
        }
        
        if (fourthWhyValue) {
            combinedDescription += `4th WHY - STRUCTURAL ISSUES:\n${formatToSentenceCase(fourthWhyValue)}\n\n`;
        }
        
        if (fifthWhyValue) {
            combinedDescription += `5th WHY - ROOT CAUSE:\n${formatToSentenceCase(fifthWhyValue)}`;
        }
        
        descriptionField.value = combinedDescription.trim();
    }
}

// Helper function to update character counters (keep existing)
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

// Helper function to get the selected currency (keep existing)
function getSelectedCurrency() {    
    if (typeof selectedCurrency !== 'undefined') {
        return selectedCurrency;
    }
    return document.getElementById('USD')?.classList.contains('active') ? 'USD' : 'MXN';
}