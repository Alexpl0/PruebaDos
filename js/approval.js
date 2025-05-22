import { hideModal } from './modals.js';
import { createCards } from './cards.js';
import { sendApprovalNotification } from './mailer.js';

/**
 * Handles approve button click
 */
export async function handleApprove() {
    const selectedOrderId = sessionStorage.getItem('selectedOrderId');
    const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
    
    try {
        Swal.fire({
            title: 'Processing...',
            text: 'Updating order status',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            customClass: { container: 'swal-on-top' }
        });

        const currentStatus = Number(selectedOrder.approval_status);
        const newStatusId = currentStatus + 1;
        
        // Prepare data for API
        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: newStatusId,
            userLevel: window.authorizationLevel,
            userID: window.userID,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')

        };

        // Determine text status ID
        let updatedStatusTextId = 2; // Default: 'revision'
        const requiredLevel = Number(selectedOrder.required_auth_level || 7);
        if (newStatusId >= requiredLevel) {
            updatedStatusTextId = 3; // 'aprobado'
        }

        // Prepare status text data
        const updateStatusText = {
            orderId: selectedOrder.id,
            statusid: updatedStatusTextId
        };

        // Update approval status
        const responseApproval = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        const resultApproval = await responseApproval.json();
        if (!resultApproval.success) {
            throw new Error(resultApproval.message || 'Error updating approval level.');
        }

        // Update status text
        const responseStatusText = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusText.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateStatusText)
        });
        
        const resultStatusText = await responseStatusText.json();
        if (!resultStatusText.success) {
            console.error('Error updating status text:', resultStatusText.message);
        }

        // Update local data
        selectedOrder.approval_status = newStatusId;
        selectedOrder.status_id = updatedStatusTextId;
        
        if (updatedStatusTextId === 3) selectedOrder.status_name = 'aprobado';
        else if (updatedStatusTextId === 2) selectedOrder.status_name = 'revision';

        // Show success message
        Swal.fire({
            icon: 'success',
            title: 'Order Approved',
            text: `Order ${selectedOrder.id} has been approved for the next level.`,
            confirmButtonText: 'OK',
            customClass: { container: 'swal-on-top' }
        });
        
        hideModal();
        createCards(window.allOrders);

        // Send notification to next approver
        try {
            await sendApprovalNotification(selectedOrder.id);
            console.log('Notification email sent to next approver');
        } catch (error) {
            console.error('Failed to send notification email:', error);
        }

        // Aqui pondremos el trigger para el mailer
        // Debe Obtener el newStatusId +1 para saber a quien enviarlo
        // Se debe enviar a la siguiente persona en la cadena de autorizacion
        // Para saber quien es la siguiente persona debemos consultar la tabla Users 
        // y obtener el authorization_level
        // y el id del usuario que tiene ese nivel

    } catch (error) {
        console.error('Error approving order:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not update the order: ' + error.message,
            confirmButtonText: 'OK',
            customClass: { container: 'swal-on-top' }
        });
    }
}

/**
 * Handles reject button click
 */
export async function handleReject() {
    const selectedOrderId = sessionStorage.getItem('selectedOrderId');
    const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
    
    try {
        // Ask for confirmation
        const confirmation = await Swal.fire({
            title: 'Are you sure?',
            text: `Do you really want to reject order ${selectedOrderId}? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, reject it',
            cancelButtonText: 'Cancel',
            customClass: { container: 'swal-on-top' }
        });

        if (!confirmation.isConfirmed) {
            return;
        }

        Swal.fire({
            title: 'Processing...',
            text: 'Rejecting order',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            customClass: { container: 'swal-on-top' }
        });

        // Set rejection status (99)
        const newStatusId = 99;
        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: newStatusId,
            userLevel: window.authorizationLevel,
            userID: window.userID,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        // Set text status to 'rechazado'
        const updatedStatusTextId = 4;
        const updateStatusText = {
            orderId: selectedOrder.id,
            statusid: updatedStatusTextId
        };

        // Update approval status
        const responseApproval = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusUpdate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        const resultApproval = await responseApproval.json();
        if (!resultApproval.success) {
            throw new Error(resultApproval.message || 'Error updating approval status to rejected.');
        }

        // Update status text
        const responseStatusText = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoStatusText.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateStatusText)
        });
        
        const resultStatusText = await responseStatusText.json();
        if (!resultStatusText.success) {
            console.error('Error updating status text to rejected:', resultStatusText.message);
        }

        // Update local data
        selectedOrder.approval_status = newStatusId;
        selectedOrder.status_id = updatedStatusTextId;
        selectedOrder.status_name = 'rechazado';

        // Show confirmation
        Swal.fire({
            icon: 'error',
            title: 'Order Rejected',
            text: `Order ${selectedOrderId} has been successfully rejected.`,
            confirmButtonText: 'OK',
            customClass: { container: 'swal-on-top' }
        });
        
        hideModal();
        createCards(window.allOrders);

    } catch (error) {
        console.error('Error rejecting order:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not reject the order: ' + error.message,
            confirmButtonText: 'OK',
            customClass: { container: 'swal-on-top' }
        });
    }
}

/**
 * Sends a status notification to the order creator
 * @param {number} orderId - The Premium Freight order ID
 * @param {string} status - The order status ('approved' or 'rejected')
 * @param {object} rejectorInfo - Optional information about the rejector
 * @returns {Promise} - Promise resolving to the result of the operation
 */
function sendStatusNotification(orderId, status, rejectorInfo = null) {
    return new Promise((resolve, reject) => {
        fetch('https://grammermx.com/Jesus/PruebaDos/mailer/PFmailStatus.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                orderId: orderId,
                status: status,
                rejectorInfo: rejectorInfo
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                resolve(data);
            } else {
                reject(new Error(data.message || 'Failed to send status notification'));
            }
        })
        .catch(error => {
            reject(error);
        });
    });
}

/**
 * Sends a recovery check notification to a user
 * @param {number} userId - The user ID (optional)
 * @param {number} orderId - The Premium Freight order ID (optional)
 * @returns {Promise} - Promise resolving to the result of the operation
 */
function sendRecoveryCheckNotification(userId = null, orderId = null) {
    const requestData = {};
    
    if (userId) requestData.userId = userId;
    if (orderId) requestData.orderId = orderId;
    
    return new Promise((resolve, reject) => {
        fetch('https://grammermx.com/Jesus/PruebaDos/mailer/PFmailRecoveryNotification.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                resolve(data);
            } else {
                reject(new Error(data.message || 'Failed to send recovery check notification'));
            }
        })
        .catch(error => {
            reject(error);
        });
    });
}

/**
 * Sets up approval/rejection button listeners
 */
export function setupApprovalEventListeners() {
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');

    
    if (!approveBtn) {
        console.error('Approve button not found in the DOM');
    } else {
        approveBtn.onclick = handleApprove;
    }
    
    if (!rejectBtn) {
        console.error('Reject button not found in the DOM');
    } else {
        rejectBtn.onclick = handleReject;
    }
}