/**
 * Approval module for the Premium Freight system (Refactored & Corrected)
 *
 * CORRECCIÓN:
 * - Se importan las funciones `sendApprovalNotification` y `sendStatusNotification` desde mailer.js.
 * - Después de una aprobación exitosa, se determina si es una aprobación intermedia o final.
 * - Si es intermedia, se llama a `sendApprovalNotification` para notificar al siguiente aprobador.
 * - Si es final, se llama a `sendStatusNotification` para notificar al creador.
 * - Después de un rechazo exitoso, se llama a `sendStatusNotification` para notificar al creador.
 * - AÑADIDO: Se muestra un modal de carga con Swal.fire mientras se procesan las aprobaciones y rechazos.
 */

import { sendApprovalNotification, sendStatusNotification } from './mailer.js'; // <-- IMPORTANTE: Importamos el mailer

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

        // --- INICIO DE MODAL DE CARGA ---
        Swal.fire({
            title: 'Procesando Aprobación...',
            html: `Por favor espere mientras se actualiza y notifica la orden <strong>#${selectedOrder.id}</strong>.`,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        // --- FIN DE MODAL DE CARGA ---

        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: user.authorizationLevel,
            userLevel: user.authorizationLevel,
            userID: user.id,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        const response = await fetch(`${URLPF}dao/conections/daoStatusUpdate.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Error updating approval level.');

        // --- INICIO DE LA LÓGICA DE CORREO ---
        const newApprovalLevel = Number(user.authorizationLevel);
        const maxRequiredLevel = Number(selectedOrder.required_auth_level || 7);

        if (newApprovalLevel >= maxRequiredLevel) {
            // Aprobación final: notificar al creador.
            console.log(`Final approval for order #${selectedOrder.id}. Notifying creator.`);
            await sendStatusNotification(selectedOrder.id, 'approved');
        } else {
            // Aprobación intermedia: notificar al siguiente en la línea.
            console.log(`Intermediate approval for order #${selectedOrder.id}. Notifying next approver.`);
            await sendApprovalNotification(selectedOrder.id);
        }
        // --- FIN DE LA LÓGICA DE CORREO ---

        Swal.fire({ icon: 'success', title: 'Order Approved!', text: `Order #${selectedOrder.id} approved. Notification sent.`, timer: 2500, timerProgressBar: true });
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

        // --- INICIO DE MODAL DE CARGA ---
        Swal.fire({
            title: 'Procesando Rechazo...',
            html: `Por favor espere mientras se actualiza y notifica la orden <strong>#${selectedOrder.id}</strong>.`,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        // --- FIN DE MODAL DE CARGA ---

        const updateData = {
            orderId: selectedOrder.id, 
            newStatusId: 99, 
            userLevel: user.authorizationLevel,
            userID: user.id,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
            rejection_reason: reason
        };

        const response = await fetch(`${URLPF}dao/conections/daoStatusUpdate.php`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Error updating status to rejected.');

        // --- INICIO DE LA LÓGICA DE CORREO ---
        console.log(`Order #${selectedOrder.id} rejected. Notifying creator.`);
        const rejectorInfo = { name: user.name, reason: reason };
        await sendStatusNotification(selectedOrder.id, 'rejected', rejectorInfo);
        // --- FIN DE LA LÓGICA DE CORREO ---

        Swal.fire({ icon: 'success', title: 'Order Rejected', text: `Order #${selectedOrder.id} has been rejected. Notification sent.`, timer: 2500, timerProgressBar: true });
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
