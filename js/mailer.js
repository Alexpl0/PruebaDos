/**
 * Email notification module for the Premium Freight system
 * This module contains functions to send different types of email notifications
 * to system users, such as approval notifications, status changes, etc. Reads configuration from `window.PF_CONFIG`.
 */

/**
 * Sends an email notification to the next approver in line.
 * @param {number} orderId - The Premium Freight order ID.
 * @returns {Promise<object>} - Promise resolved to an object { success: boolean, message: string }.
 */
function sendApprovalNotification(orderId) {
    if (!orderId || isNaN(Number(orderId))) {
        console.error('sendApprovalNotification: Invalid orderId provided:', orderId);
        return Promise.resolve({ success: false, message: 'Invalid or missing order ID' });
    }

    const numericOrderId = Number(orderId);
    const endpoint = window.PF_CONFIG.app.mailerURL + 'PFmailNotification.php';
    const payload = { 
        orderId: numericOrderId,
        timestamp: new Date().toISOString()
    };
    
    // ✅ AGREGAR ESTO PARA DEBUG
    console.log('[mailer.js] 📧 Sending approval notification:', {
        endpoint,
        payload,
        fullURL: window.PF_CONFIG.app.mailerURL
    });
    
    return fetch(endpoint, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        console.log('[mailer.js] 📥 Response status:', response.status);
        
        if (!response.ok) {
            return response.json().catch(() => response.text()).then(errorInfo => {
                console.error('[mailer.js] ❌ Error response:', errorInfo);
                const errorMessage = typeof errorInfo === 'object' ? errorInfo.message : errorInfo;
                throw new Error(errorMessage || `Server error: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('[mailer.js] ✅ Success response:', data);
        
        if (data.success) {
            return { success: true, message: data.message };
        } else {
            return { success: false, message: data.message || 'Error sending notification' };
        }
    })
    .catch(error => {
        console.error('[mailer.js] 💥 Fetch error:', error);
        return { success: false, message: `Network or server error: ${error.message}` };
    });
}

/**
 * Sends a final status notification (approved or rejected) to the order creator.
 * @param {number} orderId - The Premium Freight order ID.
 * @param {string} status - The order status ('approved' or 'rejected').
 * @param {Object} [rejectorInfo=null] - Optional info about who rejected the order.
 * @returns {Promise<object>} - Promise resolved to the operation result.
 */
function sendStatusNotification(orderId, status, rejectorInfo = null) {
    const endpoint = window.PF_CONFIG.app.mailerURL + 'PFmailStatus.php';
    
    return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            orderId: orderId,
            status: status,
            rejectorInfo: rejectorInfo
        })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error(data.message || 'Unknown error sending status notification.');
        }
        return data;
    })
    .catch(error => {
        console.error('Error in sendStatusNotification:', error);
        return { success: false, message: error.message };
    });
}

/**
 * Sends an email notification to request the recovery evidence file.
 * @param {number} orderId - The Premium Freight order ID.
 * @returns {Promise<object>} - Promise resolved to the operation result.
 */
async function sendRecoveryNotification(orderId) {
    if (!orderId || isNaN(Number(orderId))) {
        console.error('sendRecoveryNotification: Invalid orderId provided.');
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'A valid order ID is required to send the notification.'
        });
        return { success: false, message: 'Invalid Order ID' };
    }

    // Build the endpoint URL.
    const endpoint = window.PF_CONFIG.app.mailerURL + 'PFmailRecoveryIndividual.php';

    // Show a "loading" alert for better user experience.
    Swal.fire({
        title: 'Sending Notification...',
        text: 'Please wait while your request is being processed.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // The payload is simple, only contains the orderId.
        const payload = {
            orderId: Number(orderId)
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Read the response as JSON, since our endpoint always returns JSON.
        const result = await response.json();

        // If the HTTP response was not successful (e.g. 404, 500), throw an error.
        // The error message will be the one defined in the backend.
        if (!response.ok) {
            // Close the loading alert before showing error
            Swal.close();
            throw new Error(result.message || `Server responded with status: ${response.status}`);
        }

        // If the response was successful (200 OK), show the corresponding message.
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: result.message
        });
        return { success: true, message: result.message };

    } catch (error) {
        // This block catches both network errors (fetch failed) and errors thrown above.
        console.error('Error in sendRecoveryNotification:', error);
        
        // Close loading alert if it's still open
        Swal.close();
        
        Swal.fire({
            icon: 'error',
            title: 'Request Failed',
            text: error.message // The error message will be clear and informative.
        });
        return { success: false, message: error.message };
    }
}


// Export the functions for use in other modules
export { 
    sendApprovalNotification,
    sendStatusNotification,
    sendRecoveryNotification
};
