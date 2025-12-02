/**
 * tokenController.js - Token Validation and Management
 * Validates edit tokens and manages access to editOrder.php
 */

export async function validateEditToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const orderId = urlParams.get('order');
    const userId = window.PF_CONFIG?.user?.id;

    console.log('[tokenController.js] Starting validation...', { orderId, token: token ? 'present' : 'missing', userId });

    if (!token || !orderId) {
        showTokenError('Missing token or order ID. Invalid edit link.');
        return false;
    }

    if (!userId) {
        showTokenError('User not authenticated. Please log in first.');
        return false;
    }

    try {
        const response = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/edits/daoEditTokens.php?action=validate&token=${encodeURIComponent(token)}&orderId=${orderId}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const data = await response.json();
        console.log('[tokenController.js] Validation response:', data);

        if (!data.success) {
            showTokenError(data.message || 'Invalid or expired token.');
            return false;
        }

        if (data.userId !== userId) {
            showTokenError('This token does not belong to your account.');
            return false;
        }

        window.EDIT_TOKEN = {
            token: token,
            tokenId: data.tokenId,
            orderId: orderId,
            userId: userId
        };

        console.log('[tokenController.js] Token validation SUCCESS');
        return true;

    } catch (error) {
        console.error('[tokenController.js] Validation error:', error);
        showTokenError('An error occurred while validating your token.');
        return false;
    }
}

export async function getOrderDetailsForEdit(orderId) {
    try {
        console.log('[tokenController.js] Fetching order details for:', orderId);
        
        const response = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/conections/daoPremiumFreight.php`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderId })
            }
        );

        const data = await response.json();
        console.log('[tokenController.js] Order details response:', data);

        if (!data.success || !data.data || data.data.length === 0) {
            console.error('[tokenController.js] Error getting order details:', data.message);
            return null;
        }

        const orderData = data.data[0];
        console.log('[tokenController.js] Order data loaded successfully:', orderData);
        return orderData;

    } catch (error) {
        console.error('[tokenController.js] Error:', error);
        return null;
    }
}

export async function markTokenAsUsed(tokenId) {
    try {
        console.log('[tokenController.js] Marking token as used:', tokenId);
        
        const response = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/edits/daoEditTokens.php?action=mark_used`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokenId: tokenId })
            }
        );

        const data = await response.json();
        console.log('[tokenController.js] Mark used response:', data);
        return data.success;

    } catch (error) {
        console.error('[tokenController.js] Error marking token as used:', error);
        return false;
    }
}

export async function getEditAuditLog(orderId) {
    try {
        const response = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/edits/daoEditTokens.php?action=get_audit_log&orderId=${orderId}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const data = await response.json();

        if (!data.success) {
            return [];
        }

        return data.data || [];

    } catch (error) {
        console.error('[tokenController.js] Error getting audit log:', error);
        return [];
    }
}

function showTokenError(message) {
    const container = document.getElementById('tokenErrorContainer');
    
    if (container) {
        container.innerHTML = `
            <div style="
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 16px;
                border-radius: 6px;
                margin: 20px 0;
            ">
                <strong>Access Denied:</strong> ${message}
                <br><br>
                <a href="${window.PF_CONFIG.app.baseURL}orders.php" 
                   style="color: #721c24; text-decoration: underline;">
                    Return to Orders
                </a>
            </div>
        `;
    }

    const formElement = document.getElementById('plant-form');
    if (formElement) {
        formElement.style.display = 'none';
    }
}

export class EditChangeTracker {
    constructor(originalData) {
        this.originalData = JSON.parse(JSON.stringify(originalData));
        this.changedFields = {};
    }

    recordChange(fieldName, originalValue, newValue) {
        if (String(originalValue).trim() !== String(newValue).trim()) {
            this.changedFields[fieldName] = {
                original: originalValue,
                new: newValue
            };
        }
    }

    getChanges() {
        return this.changedFields;
    }

    hasChanges() {
        return Object.keys(this.changedFields).length > 0;
    }

    getSummary() {
        const changes = this.getChanges();
        const summary = [];

        for (const [field, data] of Object.entries(changes)) {
            summary.push({
                field: this.formatFieldName(field),
                original: data.original,
                new: data.new
            });
        }

        return summary;
    }

    formatFieldName(fieldName) {
        return fieldName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}

export async function showChangesSummaryModal(changeTracker) {
    const changes = changeTracker.getSummary();

    if (!changes.length) {
        Swal.fire({
            icon: 'warning',
            title: 'No Changes',
            text: 'You have not made any changes to this order.'
        });
        return false;
    }

    let changesHtml = '<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">';
    changesHtml += '<tr style="background-color: #f0f0f0;"><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Field</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Original</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">New Value</th></tr>';

    changes.forEach(change => {
        changesHtml += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${change.field}</td>
                <td style="padding: 8px; border: 1px solid #ddd; background-color: #ffe6e6;">${change.original || '(empty)'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; background-color: #e6ffe6;">${change.new || '(empty)'}</td>
            </tr>
        `;
    });

    changesHtml += '</table>';

    const result = await Swal.fire({
        icon: 'info',
        title: 'Review Your Changes',
        html: changesHtml,
        showCancelButton: true,
        confirmButtonText: 'Send Update',
        confirmButtonColor: '#28a745',
        cancelButtonText: 'Cancel',
        cancelButtonColor: '#6c757d'
    });

    return result.isConfirmed;
}

export async function initializeTokenValidation() {
    console.log('[tokenController.js] initializeTokenValidation starting...');
    
    const isValid = await validateEditToken();

    if (!isValid) {
        console.error('[tokenController.js] Token validation failed');
        const formElement = document.getElementById('plant-form');
        if (formElement) {
            formElement.style.display = 'none';
        }
        return false;
    }

    const orderId = new URLSearchParams(window.location.search).get('order');
    console.log('[tokenController.js] Loading order details for orderId:', orderId);
    
    const orderData = await getOrderDetailsForEdit(orderId);

    if (!orderData) {
        showTokenError('Could not load order details.');
        return false;
    }

    window.EDIT_ORDER_DATA = orderData;
    console.log('[tokenController.js] Token validation SUCCESS - Order data stored:', orderData);
    
    return true;
}