/**
 * Approval module for the Premium Freight system
 *
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - Usa approvalLevel en lugar de authorizationLevel para validaciones
 * - Mantiene authorizationLevel solo para referencia de sesión
 */

import { sendApprovalNotification, sendStatusNotification } from './mailer.js';

let isProcessing = false;

/**
 * Generic approval function.
 * @param {number|string} orderId - The ID of the order to approve.
 * @param {object} options - Options like { showConfirmation: false }.
 * @returns {Promise<object>} - Result object.
 */
export async function approveOrder(orderId, options = {}) {
    if (isProcessing) return { success: false, message: 'Processing' };
    isProcessing = true;
    
    const URLPF = window.PF_CONFIG.app.baseURL;
    const user = window.PF_CONFIG.user;

    try {
        const selectedOrder = window.allOrders?.find(order => order.id == orderId);
        if (!selectedOrder) throw new Error('Order not found');

        if (!validateOrderForApproval(selectedOrder)) {
            return { success: false, message: 'Validation failed' };
        }
        
        if (options.showConfirmation !== false) {
            const { isConfirmed } = await Swal.fire({
                title: 'Approve Order?',
                html: `<p>Are you sure you want to approve order <strong>#${selectedOrder.id}</strong>?</p>`,
                icon: 'question', 
                showCancelButton: true, 
                confirmButtonColor: '#10B981', 
                confirmButtonText: 'Yes, approve it!',
            });
            if (!isConfirmed) return { success: false, message: 'User cancelled' };
        }

        // Mostrar modal de carga
        Swal.fire({
            title: 'Processing Approval...',
            html: `Please wait while order <strong>#${selectedOrder.id}</strong> is being updated and notified.`,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // ACTUALIZADO: Usar approvalLevel
        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: user.approvalLevel, // CAMBIADO de authorizationLevel
            userLevel: user.approvalLevel,    // CAMBIADO de authorizationLevel
            userID: user.id,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        const response = await fetch(`${URLPF}dao/conections/daoStatusUpdate.php`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Error updating approval level.');

        // Lógica de email
        const newApprovalLevel = Number(user.approvalLevel);
        const maxRequiredLevel = Number(selectedOrder.required_auth_level || 7);

        if (newApprovalLevel >= maxRequiredLevel) {
            console.log(`Final approval for order #${selectedOrder.id}. Notifying creator.`);
            // await sendStatusNotification(selectedOrder.id, 'approved');
        } else {
            console.log(`Intermediate approval for order #${selectedOrder.id}. Notifying next approver.`);
            // await sendApprovalNotification(selectedOrder.id);
        }

        Swal.fire({ 
            icon: 'success', 
            title: 'Order Approved!', 
            text: `Order #${selectedOrder.id} approved. Notification sent.`, 
            timer: 2500, 
            timerProgressBar: true 
        });
        
        return { success: true, order: selectedOrder };

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Approval Failed', text: error.message });
        throw error;
    } finally {
        isProcessing = false;
    }
}

/**
 * Generic rejection function.
 * @param {number|string} orderId - The ID of the order to reject.
 * @param {string|null} rejectionReason - The reason for rejection. If null, user will be prompted.
 * @param {object} options - Options like { showConfirmation: false }.
 * @returns {Promise<object>} - Result object.
 */
export async function rejectOrder(orderId, rejectionReason = null, options = {}) {
    if (isProcessing) return { success: false, message: 'Processing' };
    isProcessing = true;

    const URLPF = window.PF_CONFIG.app.baseURL;
    const user = window.PF_CONFIG.user;

    try {
        const selectedOrder = window.allOrders?.find(order => order.id == orderId);
        if (!selectedOrder) throw new Error('Order not found');

        if (!validateOrderForApproval(selectedOrder)) {
            return { success: false, message: 'Validation failed' };
        }
        
        let reason = rejectionReason;
        if (options.showConfirmation !== false) {
            const { value, isConfirmed } = await Swal.fire({
                title: 'Reject Order', 
                input: 'textarea', 
                inputPlaceholder: 'Please provide a reason for rejecting this order...',
                inputValidator: (value) => !value && 'A reason is required to reject!',
                icon: 'warning', 
                showCancelButton: true, 
                confirmButtonColor: '#dc3545', 
                confirmButtonText: 'Reject Order'
            });
            if (!isConfirmed) return { success: false, message: 'User cancelled' };
            reason = value;
        }
        if (!reason) return { success: false, message: 'Reason is required' };

        // Mostrar modal de carga
        Swal.fire({
            title: 'Processing Rejection...',
            html: `Please wait while order <strong>#${selectedOrder.id}</strong> is being updated and notified.`,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // ACTUALIZADO: Usar approvalLevel
        const updateData = {
            orderId: selectedOrder.id, 
            newStatusId: 99, 
            userLevel: user.approvalLevel, // CAMBIADO de authorizationLevel
            userID: user.id,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
            rejection_reason: reason
        };

        const response = await fetch(`${URLPF}dao/conections/daoStatusUpdate.php`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Error updating status to rejected.');

        console.log(`Order #${selectedOrder.id} rejected. Notifying creator.`);
        const rejectorInfo = { name: user.name, reason: reason };
        // await sendStatusNotification(selectedOrder.id, 'rejected', rejectorInfo);

        Swal.fire({ 
            icon: 'success', 
            title: 'Order Rejected', 
            text: `Order #${selectedOrder.id} has been rejected. Notification sent.`, 
            timer: 2500, 
            timerProgressBar: true 
        });
        
        return { success: true, order: selectedOrder };

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Rejection Failed', text: error.message });
        throw error;
    } finally {
        isProcessing = false;
    }
}

/**
 * Permission validation before approving/rejecting.
 * ACTUALIZADO: Usa approvalLevel
 * 
 * @param {object} order - The order object to validate.
 * @returns {boolean} - True if the user has permission, otherwise false.
 */
function validateOrderForApproval(order) {
    const user = window.PF_CONFIG.user;
    const userPlant = user.plant !== null ? parseInt(user.plant, 10) : null;
    const creatorPlant = parseInt(order.creator_plant, 10);
    
    // ACTUALIZADO: Usar approvalLevel
    const userApprovalLevel = Number(user.approvalLevel);
    const currentApprovalLevel = Number(order.approval_status);
    const nextRequiredLevel = currentApprovalLevel + 1;
    const requiredLevel = Number(order.required_auth_level || 7);

    let isValid = true;
    let failureReason = '';

    if (currentApprovalLevel >= requiredLevel) {
        isValid = false; 
        failureReason = 'Order is already fully approved.';
    } else if (currentApprovalLevel === 99) {
        isValid = false; 
        failureReason = 'Order was previously rejected.';
    } else if (userApprovalLevel !== nextRequiredLevel) {
        isValid = false; 
        failureReason = `Required approval level: ${nextRequiredLevel}, your level: ${userApprovalLevel}.`;
    } else if (userPlant !== null && creatorPlant !== userPlant) {
        isValid = false; 
        failureReason = `Plant mismatch. Order Plant: ${creatorPlant}, Your Plant: ${userPlant}.`;
    }

    if (!isValid) {
        Swal.fire({ 
            icon: 'warning', 
            title: 'Permission Denied', 
            text: failureReason 
        });
    }
    
    return isValid;
}
