/**
 * Premium Freight - Approval Functionality
 * Handles order approval and rejection logic
 */

import { hideModal } from './modals.js';
import { createCards } from './cards.js';

console.log('Approval module loaded');

/**
 * Handles approve button click
 */
export async function handleApprove() {
    console.log('Approve button clicked');
    const selectedOrderId = sessionStorage.getItem('selectedOrderId');
    console.log('Selected order ID:', selectedOrderId);
    const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
    console.log('Selected order details:', selectedOrder);
    
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
    console.log('Reject button clicked');
    const selectedOrderId = sessionStorage.getItem('selectedOrderId');
    console.log('Selected order ID:', selectedOrderId);
    const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
    console.log('Selected order details:', selectedOrder);
    
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
 * Sets up approval/rejection button listeners
 */
export function setupApprovalEventListeners() {
    console.log('Setting up approval event listeners');
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    if (!approveBtn) {
        console.error('Approve button not found in the DOM');
    } else {
        console.log('Approve button found, attaching event listener');
        approveBtn.onclick = handleApprove;
    }
    
    if (!rejectBtn) {
        console.error('Reject button not found in the DOM');
    } else {
        console.log('Reject button found, attaching event listener');
        rejectBtn.onclick = handleReject;
    }
    
    // Check if event listeners were attached
    if (approveBtn) {
        console.log('Approve button has onclick handler:', !!approveBtn.onclick);
    }
    if (rejectBtn) {
        console.log('Reject button has onclick handler:', !!rejectBtn.onclick);
    }
}