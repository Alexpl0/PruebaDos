/**
 * form.js - Form Data Handler for Edit Orders
 * Populates editOrder.php form with existing order data
 * Matching structure and validation with newOrder.js
 */

import { populateEditFormWithData, attachEditFormListeners, enableUnsavedChangesWarning } from './orderEdited.js';
import { initializeTokenValidation } from './tokenController.js';

async function initializeEditFormWithData() {
    try {
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

        console.log('[form.js] Order data available:', orderData);
        populateEditFormWithData(orderData);
        attachEditFormListeners();
        enableUnsavedChangesWarning();
        initializeFormSelectors();
        disableUnEditableFields();
        handleRecoveryFileVisibility();

        return true;

    } catch (error) {
        console.error('[form.js] Error initializing form:', error);
        return false;
    }
}

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
        '#Carrier',
        '#CompanyShip',
        '#inputCompanyNameDest'
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

function disableUnEditableFields() {
    const unEditableFields = ['planta', 'codeplanta'];

    unEditableFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.disabled = true;
            element.style.backgroundColor = '#e9ecef';
            element.style.cursor = 'not-allowed';
        }
    });
}

function handleRecoveryFileVisibility() {
    const recoverySelect = document.getElementById('Recovery');
    const fileContainer = document.getElementById('recoveryFileContainer');
    const fileInput = document.getElementById('recoveryFile');
    
    if (!recoverySelect || !fileContainer || !fileInput) return;

    const updateVisibility = () => {
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
    };

    updateVisibility();
    jQuery(recoverySelect).on('change', updateVisibility);
}

export async function initializeEditForm() {
    try {
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

        const success = await initializeEditFormWithData();

        if (!success) {
            Swal.fire({
                icon: 'error',
                title: 'Initialization Failed',
                text: 'Could not load the order data. Please try again.'
            });
            return false;
        }

        Swal.close();
        console.log('[form.js] Edit form initialized successfully');
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEditForm);
} else {
    initializeEditForm();
}