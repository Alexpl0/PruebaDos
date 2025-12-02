/**
 * orderEdited.js - Order Update and Submission Handler
 * Manages changes tracking, database updates, and email notifications
 */

import { EditChangeTracker, showChangesSummaryModal, markTokenAsUsed } from './tokenController.js';

const MAILER_BASE_URL = 'https://grammermx.com/Mailer/PFMailer/';

export async function submitEditedOrder(event) {
    event.preventDefault();

    const orderId = window.PF_CONFIG?.orderId;
    const editToken = window.EDIT_TOKEN;
    const originalData = window.EDIT_ORDER_DATA;

    console.log('[orderEdited.js] Submit started', { orderId, editToken: editToken ? 'present' : 'missing' });

    if (!orderId || !editToken || !originalData) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Missing required data for submission'
        });
        return;
    }

    const currentData = collectFormData();
    console.log('[orderEdited.js] Current data collected:', currentData);

    const changeTracker = new EditChangeTracker(originalData);

    const fieldsToCompare = [
        'transport', 'in_out_bound', 'description', 'area', 'int_ext',
        'paid_by', 'category_cause', 'project_status', 'recovery',
        'weight', 'measures', 'products', 'carrier_id', 'quoted_cost',
        'corrective_action', 'person_responsible', 'target_date'
    ];

    fieldsToCompare.forEach(field => {
        const originalValue = originalData[field] || '';
        const currentValue = currentData[field] || '';
        changeTracker.recordChange(field, originalValue, currentValue);
    });

    console.log('[orderEdited.js] Changes tracked:', changeTracker.getChanges());

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
        'Weight': 'weight',
        'Measures': 'measures',
        'Products': 'products',
        'Carrier': 'carrier_id',
        'QuotedCost': 'quoted_cost',
        'FirstWhy': 'first_why',
        'SecondWhy': 'second_why',
        'ThirdWhy': 'third_why',
        'FourthWhy': 'fourth_why',
        'FifthWhy': 'fifth_why',
        'CorrectiveAction': 'corrective_action',
        'PersonResponsible': 'person_responsible',
        'TargetDate': 'target_date',
        'CompanyShip': 'origin_id',
        'inputCompanyNameDest': 'destiny_id',
        'inputCityShip': 'origin_city',
        'StatesShip': 'origin_state',
        'inputZipShip': 'origin_zip',
        'inputCityDest': 'destiny_city',
        'StatesDest': 'destiny_state',
        'inputZipDest': 'destiny_zip'
    };

    for (const [formFieldId, dbFieldName] of Object.entries(fieldMap)) {
        const element = document.getElementById(formFieldId);
        if (element) {
            let value = element.value;
            
            if (element.tagName === 'SELECT' && typeof jQuery !== 'undefined') {
                const selectedData = jQuery(element).select2('data');
                if (selectedData && selectedData.length > 0) {
                    value = selectedData[0].id || element.value;
                }
            }
            
            formData[dbFieldName] = value;
        }
    }

    const descriptionField = document.getElementById('Description');
    if (descriptionField) {
        formData['description'] = descriptionField.value;
    }

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

        const updateResponse = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/conections/daoUpdatePremiumFreight.php`,
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

        const updateData = await updateResponse.json();
        console.log('[orderEdited.js] Update response:', updateData);

        if (!updateResponse.ok || !updateData.success) {
            throw new Error(updateData.message || 'Failed to submit order update');
        }

        console.log('[orderEdited.js] Order update successful');

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
        console.log('[orderEdited.js] Business logic response:', businessData);

        if (!businessResponse.ok || !businessData.success) {
            throw new Error(businessData.message || 'Failed to determine approval route');
        }

        console.log('[orderEdited.js] Scenario:', businessData.scenario);
        console.log('[orderEdited.js] Next approver:', businessData.nextApprover);

        let nextApproverId = null;
        let notificationMessage = '';

        if (businessData.scenario === 'SCENARIO_3_FULLY_APPROVED') {
            notificationMessage = 'Your order has been updated. Since it is already fully approved, no further approvals are needed.';
            nextApproverId = null;
        } else if (businessData.nextApprover) {
            nextApproverId = businessData.nextApprover.id;
            notificationMessage = `Your order has been updated and sent to ${businessData.nextApprover.name} for review.`;
        } else {
            throw new Error('Unable to determine next approver');
        }

        const tokenMarked = await markTokenAsUsed(tokenId);
        console.log('[orderEdited.js] Token marked as used:', tokenMarked);

        if (nextApproverId) {
            console.log('[orderEdited.js] Sending email notification to approver:', nextApproverId);
            
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
            console.log('[orderEdited.js] Email response:', emailData);
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
        console.error('[orderEdited.js] Error:', error);
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
    if (!orderData) return;

    console.log('[orderEdited.js] Populating form with data:', orderData);

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
        'QuotedCost': 'quoted_cost',
        'Description': 'description',
        'CorrectiveAction': 'corrective_action',
        'PersonResponsible': 'person_responsible',
        'TargetDate': 'due_date'
    };

    for (const [formFieldId, dbFieldName] of Object.entries(fieldMap)) {
        const element = document.getElementById(formFieldId);
        if (element && orderData[dbFieldName] !== undefined) {
            element.value = orderData[dbFieldName];
            console.log(`[orderEdited.js] Set ${formFieldId} to ${orderData[dbFieldName]}`);

            if (typeof jQuery !== 'undefined') {
                jQuery(element).trigger('change');
            }
        }
    }

    if (orderData['origin_company_name']) {
        document.getElementById('CompanyShip').value = orderData['origin_company_name'];
    }
    if (orderData['destiny_company_name']) {
        document.getElementById('inputCompanyNameDest').value = orderData['destiny_company_name'];
    }
    if (orderData['origin_city']) {
        document.getElementById('inputCityShip').value = orderData['origin_city'];
    }
    if (orderData['origin_state']) {
        document.getElementById('StatesShip').value = orderData['origin_state'];
    }
    if (orderData['origin_zip']) {
        document.getElementById('inputZipShip').value = orderData['origin_zip'];
    }
    if (orderData['destiny_city']) {
        document.getElementById('inputCityDest').value = orderData['destiny_city'];
    }
    if (orderData['destiny_state']) {
        document.getElementById('StatesDest').value = orderData['destiny_state'];
    }
    if (orderData['destiny_zip']) {
        document.getElementById('inputZipDest').value = orderData['destiny_zip'];
    }
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
    }
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
}