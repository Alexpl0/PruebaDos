/**
 * form.js - Form Data Handler for Edit Orders
 * Populates editOrder.php form with existing order data
 */

import { populateEditFormWithData, attachEditFormListeners, enableUnsavedChangesWarning } from './orderEdited.js';
import { initializeTokenValidation } from './tokenController.js';

let isInitialized = false;

async function initializeEditFormWithData() {
    try {
        console.log('[form.js] Starting form data initialization...');
        
        const isValid = await initializeTokenValidation();

        if (!isValid) {
            console.error('[form.js] Token validation failed');
            return false;
        }

        const orderData = window.EDIT_ORDER_DATA;

        if (!orderData) {
            console.error('[form.js] Order data not available after token validation');
            return false;
        }

        console.log('[form.js] Order data available, populating form:', orderData.id);
        
        populateEditFormWithData(orderData);
        
        console.log('[form.js] Calling module initialization functions...');
        
        await initializeExternalModules();
        
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

async function initializeExternalModules() {
    console.log('[form.js] Initializing external modules...');

    try {
        if (typeof initializeCarrierSelector === 'function') {
            console.log('[form.js] Calling initializeCarrierSelector()');
            initializeCarrierSelector();
        } else {
            console.warn('[form.js] initializeCarrierSelector not found');
        }
    } catch (error) {
        console.error('[form.js] Error initializing carrier selector:', error);
    }

    console.log('[form.js] External modules initialization complete');
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
        '#Carrier'
    ];

    console.log('[form.js] Initializing Select2 selectors...');

    selectors.forEach(selector => {
        const element = jQuery(selector);
        if (element.length > 0) {
            if (!element.hasClass('select2-hidden-accessible')) {
                element.select2({
                    placeholder: 'Select an option',
                    allowClear: true
                });
                console.log(`[form.js] Select2 initialized for: ${selector}`);
            } else {
                console.log(`[form.js] Select2 already initialized for: ${selector}`);
            }
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
            console.log(`[form.js] Disabled field: ${fieldId}`);
        }
    });
}

function handleRecoveryFileVisibility() {
    const recoverySelect = document.getElementById('Recovery');
    const fileContainer = document.getElementById('recoveryFileContainer');
    const fileInput = document.getElementById('recoveryFile');
    
    if (!recoverySelect || !fileContainer || !fileInput) {
        console.warn('[form.js] Recovery file elements not found');
        return;
    }

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
    
    if (typeof jQuery !== 'undefined') {
        jQuery(recoverySelect).on('change', updateVisibility);
    } else {
        recoverySelect.addEventListener('change', updateVisibility);
    }
    
    console.log('[form.js] Recovery file visibility handler attached');
}

async function initializeEditForm() {
    if (isInitialized) {
        console.log('[form.js] Form already initialized, skipping...');
        return true;
    }

    try {
        console.log('[form.js] Initializing edit form...');
        
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
                text: 'Could not load the order data. Please try again.',
                confirmButtonText: 'OK'
            });
            return false;
        }

        Swal.close();
        isInitialized = true;
        console.log('[form.js] Edit form initialized successfully');
        return true;

    } catch (error) {
        console.error('[form.js] Initialization error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while initializing the form: ' + error.message
        });
        return false;
    }
}

console.log('[form.js] Module loaded, document readyState:', document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[form.js] DOM ready event fired');
        initializeEditForm();
    });
} else {
    console.log('[form.js] DOM already loaded, initializing immediately');
    initializeEditForm();
}

export { initializeEditForm };