/**
 * Approval module for the Premium Freight system (Refactored)
 * Ahora es autocontenido y lee directamente de `window.PF_CONFIG`.
 */

let isProcessing = false;

/**
 * Función genérica de aprobación.
 * @param {number|string} orderId - El ID de la orden a aprobar.
 * @param {object} options - Opciones como { showConfirmation: false }.
 * @returns {Promise<object>} - Objeto con el resultado de la operación.
 */
export async function approveOrder(orderId, options = {}) {
    if (isProcessing) return { success: false, message: 'Processing' };
    isProcessing = true;
    
    // Obtener URLs y datos de usuario desde la configuración global.
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
                icon: 'question', showCancelButton: true, confirmButtonColor: '#10B981', confirmButtonText: 'Yes, approve it!',
            });
            if (!isConfirmed) return { success: false, message: 'User cancelled' };
        }

        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: user.authorizationLevel,
            userID: user.id,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        const response = await fetch(`${URLPF}dao/conections/daoStatusUpdate.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Error updating approval level.');

        Swal.fire({ icon: 'success', title: 'Order Approved!', text: `Order #${selectedOrder.id} approved.`, timer: 2000, timerProgressBar: true });
        return { success: true, order: selectedOrder };

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Approval Failed', text: error.message });
        throw error;
    } finally {
        isProcessing = false;
    }
}

/**
 * Función genérica de rechazo.
 * @param {number|string} orderId - El ID de la orden a rechazar.
 * @param {string|null} rejectionReason - La razón del rechazo. Si es null, se le pedirá al usuario.
 * @param {object} options - Opciones como { showConfirmation: false }.
 * @returns {Promise<object>} - Objeto con el resultado de la operación.
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
                title: 'Reject Order', input: 'textarea', inputPlaceholder: 'Please provide a reason for rejecting this order...',
                inputValidator: (value) => !value && 'A reason is required to reject!',
                icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'Reject Order'
            });
            if (!isConfirmed) return { success: false, message: 'User cancelled' };
            reason = value;
        }
        if (!reason) return { success: false, message: 'Reason is required' };

        const updateData = {
            orderId: selectedOrder.id, newStatusId: 99, userID: user.id,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
            rejection_reason: reason
        };

        const response = await fetch(`${URLPF}dao/conections/daoStatusUpdate.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Error updating status to rejected.');

        Swal.fire({ icon: 'success', title: 'Order Rejected', text: `Order #${selectedOrder.id} has been rejected.`, timer: 2000, timerProgressBar: true });
        return { success: true, order: selectedOrder };

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Rejection Failed', text: error.message });
        throw error;
    } finally {
        isProcessing = false;
    }
}

/**
 * Validación de permisos antes de aprobar/rechazar.
 * @param {object} order - El objeto de la orden a validar.
 * @returns {boolean} - True si el usuario tiene permisos, de lo contrario false.
 */
function validateOrderForApproval(order) {
    const user = window.PF_CONFIG.user;
    const userPlant = user.plant !== null ? parseInt(user.plant, 10) : null;
    const creatorPlant = parseInt(order.creator_plant, 10);
    const userAuthLevel = Number(user.authorizationLevel);
    const currentApprovalLevel = Number(order.approval_status);
    const nextRequiredLevel = currentApprovalLevel + 1;
    const requiredLevel = Number(order.required_auth_level || 7);

    let isValid = true;
    let failureReason = '';

    if (currentApprovalLevel >= requiredLevel) {
        isValid = false; failureReason = 'Order is already fully approved.';
    } else if (currentApprovalLevel === 99) {
        isValid = false; failureReason = 'Order was previously rejected.';
    } else if (userAuthLevel !== nextRequiredLevel) {
        isValid = false; failureReason = `Incorrect authorization level. Required: ${nextRequiredLevel}, User has: ${userAuthLevel}.`;
    } else if (userPlant !== null && creatorPlant !== userPlant) {
        isValid = false; failureReason = `Plant mismatch. Order Plant: ${creatorPlant}, User Plant: ${userPlant}.`;
    }

    if (!isValid) {
        Swal.fire({ icon: 'warning', title: 'Permission Denied', text: failureReason });
    }
    
    return isValid;
}
