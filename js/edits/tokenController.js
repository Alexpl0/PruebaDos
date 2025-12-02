/**
 * tokenController.js - Token Validation and Management
 * Validates edit tokens and manages access to editOrder.php
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

export async function validateEditToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const orderId = urlParams.get('order');
    const userId = window.PF_CONFIG?.user?.id;

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

        if (!data.success) {
            showTokenError(data.message || 'Invalid or expired token.');
            return false;
        }

        // Verify user matches token
        if (data.userId != userId) {
            showTokenError('This token does not belong to your account.');
            return false;
        }

        // Store token info in window for later use
        window.EDIT_TOKEN = {
            token: token,
            tokenId: data.tokenId,
            orderId: orderId,
            userId: userId
        };

        return true;

    } catch (error) {
        console.error('[tokenController.js] Validation error:', error);
        showTokenError('An error occurred while validating your token.');
        return false;
    }
}

/**
 * Marks token as used after successful edit submission
 */
export async function markTokenAsUsed(tokenId) {
    try {
        const response = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/edits/daoEditTokens.php?action=mark_used`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokenId: tokenId })
            }
        );

        const data = await response.json();
        return data.success;

    } catch (error) {
        console.error('[tokenController.js] Error marking token as used:', error);
        return false;
    }
}

/**
 * Gets order details for form population
 */
export async function getOrderDetailsForEdit(orderId) {
    try {
        const response = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/edits/daoEditTokens.php?action=get_order_details&orderId=${orderId}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const data = await response.json();

        if (!data.success) {
            console.error('[tokenController.js] Error getting order details:', data.message);
            return null;
        }

        return data.data;

    } catch (error) {
        console.error('[tokenController.js] Error:', error);
        return null;
    }
}

/**
 * Gets audit log for the order edits
 */
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

/**
 * Shows token error message in a styled container
 */
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
                <a href="${window.PF_CONFIG.app.baseURL}myOrder.php?order=${new URLSearchParams(window.location.search).get('order')}" 
                   style="color: #721c24; text-decoration: underline;">
                    Return to Order Details
                </a>
            </div>
        `;
    }

    document.getElementById('plant-form')?.style.display = 'none';
}

/**
 * Comparison object for tracking changes between original and edited data
 */
export class EditChangeTracker {
    constructor(originalData) {
        this.originalData = JSON.parse(JSON.stringify(originalData));
        this.changedFields = {};
    }

    /**
     * Records a change
     */
    recordChange(fieldName, originalValue, newValue) {
        if (originalValue !== newValue) {
            this.changedFields[fieldName] = {
                original: originalValue,
                new: newValue
            };
        }
    }

    /**
     * Gets all changes
     */
    getChanges() {
        return this.changedFields;
    }

    /**
     * Checks if there are any changes
     */
    hasChanges() {
        return Object.keys(this.changedFields).length > 0;
    }

    /**
     * Gets a readable summary of changes
     */
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

    /**
     * Formats field name for display
     */
    formatFieldName(fieldName) {
        return fieldName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}

/**
 * Shows confirmation modal with changes summary
 */
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

/**
 * Initializes token validation on page load
 */
export async function initializeTokenValidation() {
    const isValid = await validateEditToken();

    if (!isValid) {
        document.getElementById('plant-form').style.display = 'none';
        return false;
    }

    // Load order details for form population
    const orderId = new URLSearchParams(window.location.search).get('order');
    const orderData = await getOrderDetailsForEdit(orderId);

    if (!orderData) {
        showTokenError('Could not load order details.');
        return false;
    }

    // Store order data in window for later use
    window.EDIT_ORDER_DATA = orderData;

    return true;
}