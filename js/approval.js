/**
 * Approval module for the Premium Freight system - REFACTORED for reusability
 * Con logs de depuración detallados.
 */

const URLPF = window.URL_BASE || window.BASE_URL || 'https://grammermx.com/Jesus/PruebaDos/';
let isProcessing = false;

/**
 * Función genérica de aprobación.
 */
export async function approveOrder(orderId, options = {}) {
    if (isProcessing) {
        console.warn('🟡 Approval already in process, please wait.');
        return { success: false, message: 'Processing' };
    }
    isProcessing = true;
    console.group(`➡️ Approving Order #${orderId}`);
    try {
        const selectedOrder = window.allOrders?.find(order => order.id == orderId);
        if (!selectedOrder) throw new Error('Order not found in window.allOrders');
        
        console.log('📄 Orden encontrada:', selectedOrder);

        if (!validateOrderForApproval(selectedOrder)) {
            // La validación ya muestra un Swal, así que solo retornamos.
            console.warn(`🔴 Validation failed for order #${orderId}.`);
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
            if (!isConfirmed) {
                console.log('Approval cancelled by user.');
                return { success: false, message: 'User cancelled' };
            }
        }

        const newApprovalLevel = Number(window.authorizationLevel);
        const requiredLevel = Number(selectedOrder.required_auth_level || 7);
        const willBeFullyApproved = (newApprovalLevel >= requiredLevel);
        const updatedStatusTextId = willBeFullyApproved ? 3 : 2; // 3: approved, 2: under review

        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: newApprovalLevel,
            userLevel: newApprovalLevel,
            userID: window.userID,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        console.log('⬆️ Sending data to daoStatusUpdate.php:', updateData);

        const responseApproval = await fetch(URLPF + 'dao/conections/daoStatusUpdate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const resultApproval = await responseApproval.json();
        console.log('⬇️ Received response from daoStatusUpdate.php:', resultApproval);
        if (!resultApproval.success) throw new Error(resultApproval.message || 'Error updating approval level.');

        console.log('✅ Order approved successfully in backend.');
        Swal.fire({ icon: 'success', title: 'Order Approved!', text: `Order #${selectedOrder.id} approved.`, timer: 2000, timerProgressBar: true });

        return { success: true, order: selectedOrder };
    } catch (error) {
        console.error('❌ Error in approveOrder:', error);
        Swal.fire({ icon: 'error', title: 'Approval Failed', text: error.message });
        throw error;
    } finally {
        isProcessing = false;
        console.groupEnd();
    }
}

/**
 * Función genérica de rechazo.
 */
export async function rejectOrder(orderId, rejectionReason = null, options = {}) {
    if (isProcessing) {
        console.warn('🟡 Rejection already in process, please wait.');
        return { success: false, message: 'Processing' };
    }
    isProcessing = true;
    console.group(`➡️ Rejecting Order #${orderId}`);
    try {
        const selectedOrder = window.allOrders?.find(order => order.id == orderId);
        if (!selectedOrder) throw new Error('Order not found in window.allOrders');

        console.log('📄 Orden encontrada:', selectedOrder);
        
        // La validación de rechazo es la misma que la de aprobación.
        if (!validateOrderForApproval(selectedOrder)) {
             console.warn(`🔴 Validation failed for order #${orderId}.`);
            return { success: false, message: 'Validation failed' };
        }
        
        if (options.showConfirmation !== false) {
             const { value: reason, isConfirmed } = await Swal.fire({
                title: 'Reject Order',
                input: 'textarea',
                inputPlaceholder: 'Please provide a reason for rejecting this order...',
                inputValidator: (value) => !value && 'A reason is required to reject!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Reject Order'
            });
            if (!isConfirmed) {
                console.log('Rejection cancelled by user.');
                return { success: false, message: 'User cancelled' };
            }
            rejectionReason = reason;
        }

        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: 99,
            userLevel: window.authorizationLevel,
            userID: window.userID,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
            rejection_reason: rejectionReason
        };

        console.log('⬆️ Sending data to daoStatusUpdate.php:', updateData);

        const response = await fetch(URLPF + 'dao/conections/daoStatusUpdate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        console.log('⬇️ Received response from daoStatusUpdate.php:', result);
        if (!result.success) throw new Error(result.message || 'Error updating status to rejected.');

        console.log('✅ Order rejected successfully in backend.');
        Swal.fire({ icon: 'success', title: 'Order Rejected', text: `Order #${selectedOrder.id} has been rejected.`, timer: 2000, timerProgressBar: true });

        return { success: true, order: selectedOrder };
    } catch (error) {
        console.error('❌ Error in rejectOrder:', error);
        Swal.fire({ icon: 'error', title: 'Rejection Failed', text: error.message });
        throw error;
    } finally {
        isProcessing = false;
        console.groupEnd();
    }
}

/**
 * Envío de notificaciones por correo.
 */
export async function sendEmailNotification(orderId, notificationType) {
    console.group(`➡️ Sending Email for Order #${orderId} (Type: ${notificationType})`);
    try {
        let endpoint = '';
        const emailData = { orderId: parseInt(orderId) };

        switch (notificationType) {
            case 'approval':
                endpoint = 'https://grammermx.com/Mailer/PFMailer/PFmailNotification.php';
                break;
            case 'rejected':
                endpoint = 'https://grammermx.com/Mailer/PFMailer/PFmailStatus.php';
                emailData.status = 'rejected';
                break;
            default:
                console.warn(`⚠️ Unrecognized notification type: ${notificationType}`);
                console.groupEnd();
                return;
        }

        console.log(`⬆️ Sending data to: ${endpoint}`, emailData);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData)
        });

        const result = await response.json();
        console.log(`⬇️ Received response from mailer:`, result);

        if (result.success) {
            console.log('✅ Email sent successfully.');
        } else {
            console.error('🔴 Mailer reported an error:', result.message);
        }
    } catch (error) {
        console.error('❌ Failed to send email:', error);
    } finally {
        console.groupEnd();
    }
}

/**
 * Validación de permisos antes de aprobar/rechazar.
 */
function validateOrderForApproval(order) {
    console.group("🔎 Validating permissions for order #" + order.id);
    
    const userPlant = window.userPlant !== null ? parseInt(window.userPlant, 10) : null;
    const creatorPlant = parseInt(order.creator_plant, 10);
    const userAuthLevel = Number(window.authorizationLevel);
    const currentApprovalLevel = Number(order.approval_status);
    const nextRequiredLevel = currentApprovalLevel + 1;
    const requiredLevel = Number(order.required_auth_level || 7);

    let isValid = true;
    let failureReason = '';

    // 1. Validar que no esté totalmente aprobada
    if (currentApprovalLevel >= requiredLevel) {
        isValid = false;
        failureReason = 'Order is already fully approved.';
    }
    // 2. Validar que no esté rechazada
    else if (currentApprovalLevel === 99) {
        isValid = false;
        failureReason = 'Order was previously rejected.';
    }
    // 3. Validar nivel de autorización
    else if (userAuthLevel !== nextRequiredLevel) {
        isValid = false;
        failureReason = `Incorrect authorization level. Required: ${nextRequiredLevel}, User has: ${userAuthLevel}.`;
    }
    // 4. Validar planta (solo si el usuario tiene una asignada)
    else if (userPlant !== null && creatorPlant !== userPlant) {
        isValid = false;
        failureReason = `Plant mismatch. Order Plant: ${creatorPlant}, User Plant: ${userPlant}.`;
    }

    if (isValid) {
        console.log('✅ Validation successful.');
    } else {
        console.warn(`🔴 Validation failed: ${failureReason}`);
        Swal.fire({ icon: 'warning', title: 'Permission Denied', text: failureReason });
    }
    
    console.groupEnd();
    return isValid;
}
