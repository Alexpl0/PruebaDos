/**
 * form.js - Form Data Handler for Edit Orders
 * Populates editOrder.php form with existing order data
 * Similar to newOrder.js but for editing existing orders
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

import { initializeEditForm, attachEditFormListeners, enableUnsavedChangesWarning } from './orderEdited.js';
import { initializeTokenValidation } from './tokenController.js';

/**
 * Initializes the edit form with data from the order
 */
export async function initializeEditFormWithData() {
    try {
        // First validate the token
        const isValid = await initializeTokenValidation();

        if (!isValid) {
            console.error('[form.js] Token validation failed');
            return false;
        }

        const orderData = window.EDIT_ORDER_DATA;

        if (!orderData) {
            console.error('[form.js] Order data not available');
            return false;
        }

        // Initialize the form with existing data
        initializeEditForm(orderData);

        // Attach event listeners
        attachEditFormListeners();

        // Enable unsaved changes warning
        enableUnsavedChangesWarning();

        // Initialize any Select2 selectors if they exist
        initializeFormSelectors();

        return true;

    } catch (error) {
        console.error('[form.js] Error initializing form:', error);
        return false;
    }
}

/**
 * Initializes form element selectors (Select2, etc)
 */
function initializeFormSelectors() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.select2 === 'undefined') {
        console.warn('[form.js] Select2 not available, skipping selector initialization');
        return;
    }

    const selectors = [
        '#planta',
        '#codeplanta',
        '#transport',
        '#InOutBound',
        '#Area',
        '#IntExt',
        '#PaidBy',
        '#CategoryCause',
        '#ProjectStatus',
        '#Recovery',
        '#Measures',
        '#Products',
        '#Carrier'
    ];

    selectors.forEach(selector => {
        const element = jQuery(selector);
        if (element.length > 0 && !element.hasClass('select2-hidden-accessible')) {
            element.select2({
                placeholder: 'Select an option',
                allowClear: true
            });
        }
    });
}

/**
 * Populates location fields from stored data
 */
export function populateLocationData(orderData) {
    const locationFields = {
        'inputCityShip': orderData.origin_city,
        'StatesShip': orderData.origin_state,
        'inputZipShip': orderData.origin_zip,
        'inputCityDest': orderData.destiny_city,
        'StatesDest': orderData.destiny_state,
        'inputZipDest': orderData.destiny_zip
    };

    for (const [fieldId, value] of Object.entries(locationFields)) {
        const element = document.getElementById(fieldId);
        if (element && value) {
            element.value = value;
        }
    }
}

/**
 * Populates company/location selector fields
 */
export async function populateCompanySelectors(orderData) {
    if (!orderData.origin_id || !orderData.destiny_id) {
        console.warn('[form.js] Origin or destiny ID missing');
        return;
    }

    // Set selected company values
    if (typeof jQuery !== 'undefined') {
        jQuery('#CompanyShip').val(orderData.origin_id).trigger('change');
        jQuery('#inputCompanyNameDest').val(orderData.destiny_id).trigger('change');
    }
}

/**
 * Disables fields that should not be edited
 */
export function disableUnEditableFields() {
    const unEditableFields = [
        'planta',
        'codeplanta',
        'date'
    ];

    unEditableFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.disabled = true;
            element.style.backgroundColor = '#e9ecef';
            element.style.cursor = 'not-allowed';
        }
    });

    // Add notice
    const notice = document.createElement('div');
    notice.style.cssText = `
        background-color: #d1ecf1;
        border: 1px solid #bee5eb;
        color: #0c5460;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 20px;
        margin-top: 10px;
    `;
    notice.innerHTML = '<strong>Note:</strong> Some fields cannot be edited. These were locked when the order was created.';

    const form = document.getElementById('plant-form');
    if (form && form.parentNode) {
        form.parentNode.insertBefore(notice, form);
    }
}

/**
 * Handles currency conversion for the edited order
 */
export async function handleCurrencyForEdit(orderData) {
    if (!orderData.moneda) {
        console.warn('[form.js] Currency information not available');
        return;
    }

    const currencyBtn = document.getElementById(orderData.moneda);
    if (currencyBtn) {
        currencyBtn.classList.add('active');
        currencyBtn.style.backgroundColor = '#034C8C';
        currencyBtn.style.color = 'white';
    }
}

/**
 * Validates required fields before submission
 */
export function validateEditFormComplete() {
    const requiredFields = [
        'transport',
        'InOutBound',
        'Area',
        'IntExt',
        'PaidBy',
        'CategoryCause',
        'ProjectStatus',
        'Recovery',
        'Weight',
        'Measures',
        'Products',
        'Carrier',
        'QuotedCost'
    ];

    const missingFields = [];

    requiredFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (!element || !element.value) {
            missingFields.push(fieldId);
        }
    });

    if (missingFields.length > 0) {
        console.warn('[form.js] Missing required fields:', missingFields);
        return {
            valid: false,
            missingFields: missingFields,
            message: `Please fill in all required fields: ${missingFields.join(', ')}`
        };
    }

    return { valid: true };
}

/**
 * Shows edit mode indicator
 */
export function showEditModeIndicator() {
    const header = document.querySelector('.page-header');
    
    if (header) {
        const editNotice = document.createElement('div');
        editNotice.style.cssText = `
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 12px;
            border-radius: 4px;
            margin-top: 15px;
            text-align: center;
            font-weight: bold;
        `;
        editNotice.innerHTML = 'You are editing this order. All changes must be reviewed and approved.';
        header.appendChild(editNotice);
    }
}

/**
 * Loads and displays the order's audit history
 */
export async function displayEditAuditHistory(orderId) {
    try {
        const response = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/edits/daoEditTokens.php?action=get_audit_log&orderId=${orderId}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const data = await response.json();

        if (!data.success || !data.data || data.data.length === 0) {
            return;
        }

        // Create audit history section
        const historySection = createAuditHistorySection(data.data);
        const formElement = document.getElementById('plant-form');

        if (formElement && formElement.parentNode) {
            formElement.parentNode.insertBefore(historySection, formElement);
        }

    } catch (error) {
        console.warn('[form.js] Could not load audit history:', error);
    }
}

/**
 * Creates HTML for audit history display
 */
function createAuditHistorySection(auditLogs) {
    const section = document.createElement('div');
    section.style.cssText = `
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        padding: 20px;
        margin-bottom: 20px;
    `;

    let html = '<h3 style="margin-top: 0; color: #034C8C;">Edit History</h3>';
    html += '<div style="max-height: 300px; overflow-y: auto;">';

    auditLogs.forEach(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const action = log.action.replace(/_/g, ' ');

        html += `
            <div style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                <strong>${action}</strong><br>
                <small style="color: #6c757d;">
                    ${timestamp} by ${log.requested_by_name || 'System'}
                </small>
            </div>
        `;
    });

    html += '</div>';
    section.innerHTML = html;

    return section;
}

/**
 * Main initialization function
 */
export async function initializeEditForm() {
    try {
        // Show loading indicator
        Swal.fire({
            title: 'Loading Form',
            html: 'Please wait while the order data is being loaded...',
            timerProgressBar: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Initialize form with data
        const success = await initializeEditFormWithData();

        if (!success) {
            Swal.fire({
                icon: 'error',
                title: 'Initialization Failed',
                text: 'Could not load the order data. Please try again.'
            });
            return false;
        }

        const orderData = window.EDIT_ORDER_DATA;
        const orderId = window.PF_CONFIG?.orderId;

        // Populate various form sections
        populateLocationData(orderData);
        await populateCompanySelectors(orderData);
        await handleCurrencyForEdit(orderData);

        // Mark non-editable fields
        disableUnEditableFields();

        // Show edit mode indicator
        showEditModeIndicator();

        // Display audit history if available
        if (orderId) {
            await displayEditAuditHistory(orderId);
        }

        Swal.close();
        return true;

    } catch (error) {
        console.error('[form.js] Initialization error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while initializing the form.'
        });
        return false;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEditForm);
} else {
    initializeEditForm();
}