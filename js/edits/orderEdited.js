/**
 * orderEdited.js - Order Update and Submission Handler (Improved)
 * Manages changes tracking, database updates, and email notifications
 */

import { EditChangeTracker, showChangesSummaryModal, markTokenAsUsed } from './tokenController.js';

const MAILER_BASE_URL = 'https://grammermx.com/Mailer/PFMailer/';
let originalFormData = null;

export async function submitEditedOrder(event) {
    event.preventDefault();

    const orderId = window.PF_CONFIG?.orderId;
    const editToken = window.EDIT_TOKEN;
    const originalData = window.EDIT_ORDER_DATA;

    console.log('[orderEdited.js] Submit started', { orderId, hasToken: !!editToken });

    if (!orderId || !editToken || !originalData) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Missing required data for submission'
        });
        return;
    }

    const currentData = collectFormData();
    console.log('[orderEdited.js] Current data collected', Object.keys(currentData));

    const changeTracker = new EditChangeTracker(originalData);

    const fieldsToCompare = [
        'transport', 'in_out_bound', 'description', 'area', 'int_ext',
        'paid_by', 'category_cause', 'project_status', 'recovery',
        'carrier_id', 'quoted_cost'
    ];

    fieldsToCompare.forEach(field => {
        const originalValue = originalData[field] || '';
        const currentValue = currentData[field] || '';
        changeTracker.recordChange(field, originalValue, currentValue);
    });

    console.log('[orderEdited.js] Changes tracked:', Object.keys(changeTracker.getChanges()));

    if (!changeTracker.hasChanges()) {
        Swal.fire({
            icon: 'warning',
            title: 'No Changes',
            text: 'You have not made any changes to this order.'
        });
        return;
    }

    const userConfirmed = await showChangesSummaryModal(changeTracker);

    if (!userConfirmed) {
        console.log('[orderEdited.js] User cancelled submission');
        return;
    }

    await submitOrderUpdate(orderId, editToken.tokenId, currentData, changeTracker);
}

function collectFormData() {
    const formData = {};

    const fieldMap = {
        'transport': 'transport',
        'InOutBound': 'in_out_bound',
        'Area': 'area',
        'IntExt': 'int_ext',
        'PaidBy': 'paid_by',
        'CategoryCause': 'category_cause',
        'ProjectStatus': 'project_status',
        'Recovery': 'recovery',
        'Description': 'description',
        'Carrier': 'carrier_id',
        'QuotedCost': 'quoted_cost'
    };

    for (const [formFieldId, dbFieldName] of Object.entries(fieldMap)) {
        const element = document.getElementById(formFieldId);
        if (element) {
            let value = element.value;
            console.log(`[orderEdited.js] Collecting ${formFieldId} = "${value}"`);
            formData[dbFieldName] = value || null;
        }
    }

    formData['description'] = document.getElementById('Description')?.value || null;

    console.log('[orderEdited.js] Form data collected:', formData);
    return formData;
}

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

        console.log('[orderEdited.js] Sending update to server...');

        const changedFields = changeTracker.getChanges();
        const updatePayload = {
            orderId: orderId,
            tokenId: tokenId,
            changes: {}
        };

        Object.keys(changedFields).forEach(field => {
            updatePayload.changes[field] = changedFields[field].new;
        });

        console.log('[orderEdited.js] Update payload:', updatePayload);

        const updateResponse = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/edits/daoUpdatePremiumFreight.php`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            }
        );

        const updateData = await updateResponse.json();
        console.log('[orderEdited.js] Update response:', updateData.success ? 'SUCCESS' : 'FAILED');

        if (!updateResponse.ok || !updateData.success) {
            throw new Error(updateData.message || 'Failed to submit order update');
        }

        Swal.fire({
            title: 'Determining Approval Route',
            html: 'Please wait while we determine who should review your changes...',
            timerProgressBar: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const businessResponse = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/edits/daoUpdateBusiness.php?orderId=${orderId}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const businessData = await businessResponse.json();
        console.log('[orderEdited.js] Business logic - Scenario:', businessData.scenario);

        if (!businessResponse.ok || !businessData.success) {
            throw new Error(businessData.message || 'Failed to determine approval route');
        }

        let nextApproverId = null;
        let notificationMessage = '';

        if (businessData.scenario === 'SCENARIO_3_FULLY_APPROVED') {
            notificationMessage = 'Your order has been updated. Since it is already fully approved, no further approvals are needed.';
            nextApproverId = null;
        } else if (businessData.nextApprover) {
            nextApproverId = businessData.nextApprover.id;
            notificationMessage = `Your order has been updated and sent to ${businessData.nextApprover.name} for review.`;
            console.log('[orderEdited.js] Next approver:', businessData.nextApprover.name);
        } else {
            throw new Error('Unable to determine next approver');
        }

        const tokenMarked = await markTokenAsUsed(tokenId);
        console.log('[orderEdited.js] Token marked as used:', tokenMarked);

        if (nextApproverId) {
            console.log('[orderEdited.js] Sending email notification to approver...');
            
            const emailResponse = await fetch(
                `${MAILER_BASE_URL}PFmailEditOrder.php?action=submit_edit`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: orderId,
                        tokenId: tokenId,
                        nextApproverId: nextApproverId,
                        scenario: businessData.scenario
                    })
                }
            );

            const emailData = await emailResponse.json();
            console.log('[orderEdited.js] Email sent:', emailData.success ? 'SUCCESS' : 'FAILED');
        }

        Swal.fire({
            icon: 'success',
            title: 'Update Submitted',
            html: `
                <p>Your order has been updated successfully.</p>
                <p><small>${notificationMessage}</small></p>
            `,
            confirmButtonText: 'View Order'
        }).then(() => {
            window.location.href = `${window.PF_CONFIG.app.baseURL}myOrder.php?order=${orderId}`;
        });

    } catch (error) {
        console.error('[orderEdited.js] Error:', error.message);
        Swal.fire({
            icon: 'error',
            title: 'Submission Error',
            text: error.message || 'An error occurred while submitting your update'
        });
    }
}

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

export function populateEditFormWithData(orderData) {
    if (!orderData) {
        console.error('[orderEdited.js] No order data to populate');
        return;
    }

    console.log('[orderEdited.js] Populating form with order data (ID:', orderData.id, ')');
    console.log('[orderEdited.js] Order data contents:', orderData);

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
        'Description': 'description',
        'Carrier': 'carrier_id',
        'QuotedCost': 'quoted_cost'
    };

    console.log('[orderEdited.js] Starting field population with fieldMap:', Object.keys(fieldMap));

    for (const [formFieldId, dbFieldName] of Object.entries(fieldMap)) {
        const element = document.getElementById(formFieldId);
        
        if (!element) {
            console.warn(`[orderEdited.js] Element not found: ${formFieldId}`);
            continue;
        }

        const value = orderData[dbFieldName];

        console.log(`[orderEdited.js] Processing ${formFieldId}: dbFieldName="${dbFieldName}", orderData value="${value}"`);

        if (value !== undefined && value !== null && value !== '') {
            const oldValue = element.value;
            element.value = value;
            const newValue = element.value;
            
            console.log(`[orderEdited.js] SET ${formFieldId}: "${oldValue}" -> "${newValue}" ✓`);
        } else {
            console.log(`[orderEdited.js] SKIP ${formFieldId}: value is empty/null`);
        }
    }

    console.log('[orderEdited.js] Form population complete');
    
    setTimeout(() => {
        console.log('[orderEdited.js] Post-populate verification:');
        for (const [formFieldId, dbFieldName] of Object.entries(fieldMap)) {
            const element = document.getElementById(formFieldId);
            if (element) {
                console.log(`[orderEdited.js] VERIFY ${formFieldId} = "${element.value}"`);
            }
        }
    }, 100);
}

export function attachEditFormListeners() {
    const form = document.getElementById('plant-form');
    const submitBtn = document.getElementById('submitEditBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    console.log('[orderEdited.js] Attaching form listeners...');

    if (submitBtn) {
        submitBtn.addEventListener('click', submitEditedOrder);
        console.log('[orderEdited.js] Submit button listener attached');
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEdit);
        console.log('[orderEdited.js] Cancel button listener attached');
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            submitEditedOrder(e);
        });
        console.log('[orderEdited.js] Form submit listener attached');
    }

    console.log('[orderEdited.js] Form listeners attached');
}

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

    console.log('[orderEdited.js] Unsaved changes warning enabled');
}