/**
 * orderEdited.js - Order Update and Submission Handler
 * Manages changes tracking and database updates for edited orders
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

import { EditChangeTracker, showChangesSummaryModal, markTokenAsUsed } from './tokenController.js';

const MAILER_BASE_URL = 'https://grammermx.com/Mailer/PFMailer/';

export async function submitEditedOrder(event) {
    event.preventDefault();

    const orderId = window.PF_CONFIG?.orderId;
    const editToken = window.EDIT_TOKEN;
    const originalData = window.EDIT_ORDER_DATA;

    if (!orderId || !editToken || !originalData) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Missing required data for submission'
        });
        return;
    }

    // Collect current form data
    const currentData = collectFormData();

    // Track changes
    const changeTracker = new EditChangeTracker(originalData);

    // Record changes for each field
    const fieldsToCompare = [
        'planta', 'code_planta', 'transport', 'in_out_bound',
        'area', 'int_ext', 'paid_by', 'category_cause',
        'project_status', 'recovery', 'weight', 'measures',
        'products', 'carrier_id', 'quoted_cost'
    ];

    fieldsToCompare.forEach(field => {
        const originalValue = originalData[field] || '';
        const currentValue = currentData[field] || '';
        changeTracker.recordChange(field, originalValue, currentValue);
    });

    // Show summary modal
    const userConfirmed = await showChangesSummaryModal(changeTracker);

    if (!userConfirmed) {
        return;
    }

    // Submit the edited order
    await submitOrderUpdate(orderId, editToken.tokenId, currentData, changeTracker);
}

/**
 * Collects form data from the edit form
 */
function collectFormData() {
    const formData = {};

    const fieldMap = {
        'planta': 'planta',
        'codeplanta': 'code_planta',
        'transport': 'transport',
        'InOutBound': 'in_out_bound',
        'Area': 'area',
        'IntExt': 'int_ext',
        'PaidBy': 'paid_by',
        'CategoryCause': 'category_cause',
        'ProjectStatus': 'project_status',
        'Recovery': 'recovery',
        'Weight': 'weight',
        'Measures': 'measures',
        'Products': 'products',
        'Carrier': 'carrier_id',
        'QuotedCost': 'quoted_cost'
    };

    for (const [formFieldId, dbFieldName] of Object.entries(fieldMap)) {
        const element = document.getElementById(formFieldId);
        if (element) {
            formData[dbFieldName] = element.value;
        }
    }

    return formData;
}

/**
 * Submits the updated order to the server
 */
async function submitOrderUpdate(orderId, tokenId, currentData, changeTracker) {
    try {
        Swal.fire({
            title: 'Processing Your Update',
            html: 'Please wait while your changes are being processed...',
            timerProgressBar: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await fetch(
            `${MAILER_BASE_URL}PFmailEditOrder.php?action=submit_edit`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderId,
                    tokenId: tokenId,
                    currentData: currentData,
                    changes: changeTracker.getChanges()
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to submit order update');
        }

        // Mark token as used
        await markTokenAsUsed(tokenId);

        // Show success message
        Swal.fire({
            icon: 'success',
            title: 'Update Submitted',
            html: `
                <p>Your order has been updated successfully.</p>
                <p><small>Your changes have been sent for approval and the next reviewer has been notified.</small></p>
            `,
            confirmButtonText: 'View Order'
        }).then(() => {
            window.location.href = `${window.PF_CONFIG.app.baseURL}myOrder.php?order=${orderId}`;
        });

    } catch (error) {
        console.error('[orderEdited.js] Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Submission Error',
            text: error.message || 'An error occurred while submitting your update'
        });
    }
}

/**
 * Handles cancel button - returns to order view
 */
export function cancelEdit() {
    const orderId = window.PF_CONFIG?.orderId;
    
    Swal.fire({
        title: 'Cancel Edit?',
        text: 'Any unsaved changes will be lost.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Cancel',
        confirmButtonColor: '#dc3545',
        cancelButtonText: 'Continue Editing',
        cancelButtonColor: '#6c757d'
    }).then(result => {
        if (result.isConfirmed) {
            window.location.href = `${window.PF_CONFIG.app.baseURL}myOrder.php?order=${orderId}`;
        }
    });
}

/**
 * RENAMED: Populates form with original data (was initializeEditForm)
 */
export function populateEditFormWithData(orderData) {
    if (!orderData) return;

    const fieldMap = {
        'planta': 'planta',
        'codeplanta': 'code_planta',
        'transport': 'transport',
        'InOutBound': 'in_out_bound',
        'Area': 'area',
        'IntExt': 'int_ext',
        'PaidBy': 'paid_by',
        'CategoryCause': 'category_cause',
        'ProjectStatus': 'project_status',
        'Recovery': 'recovery',
        'Weight': 'weight',
        'Measures': 'measures',
        'Products': 'products',
        'Carrier': 'carrier_id',
        'QuotedCost': 'quoted_cost'
    };

    for (const [formFieldId, dbFieldName] of Object.entries(fieldMap)) {
        const element = document.getElementById(formFieldId);
        if (element && orderData[dbFieldName]) {
            element.value = orderData[dbFieldName];

            // Trigger change event for Select2 if available
            if (typeof jQuery !== 'undefined') {
                jQuery(element).trigger('change');
            }
        }
    }

    // Populate other fields
    if (orderData.description) {
        document.getElementById('Description').value = orderData.description;
    }
}

/**
 * Attaches event listeners to the edit form
 */
export function attachEditFormListeners() {
    const form = document.getElementById('plant-form');
    const submitBtn = document.getElementById('submitEditBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    if (submitBtn) {
        submitBtn.addEventListener('click', submitEditedOrder);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEdit);
    }

    // Prevent default form submission
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitEditedOrder(e);
        });
    }
}

/**
 * Shows warning if trying to leave with unsaved changes
 */
export function enableUnsavedChangesWarning() {
    let hasChanges = false;

    document.addEventListener('change', () => {
        hasChanges = true;
    });

    document.addEventListener('input', () => {
        hasChanges = true;
    });

    window.addEventListener('beforeunload', (e) => {
        if (hasChanges) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });

    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            hasChanges = false;
        });
    }
}