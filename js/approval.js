/**
 * Approval module for the Premium Freight system - REFACTORED for reusability
 * 
 * NOTA: Este módulo anteriormente usaba modales de orders.php (hideModal, createCards)
 * pero se removió esa dependencia para hacerlo más versátil y reutilizable.
 * Ahora funciona tanto en contexto de modales como en páginas independientes.
 */

// Define the URL variable for this module
const URL = window.URL_BASE || window.BASE_URL || 'https://grammermx.com/Jesus/PruebaDos/';

/**
 * Variable to control processing state
 */
let isProcessing = false;

/**
 * NUEVO: Generic approval function that can work with any context
 */
export async function approveOrder(orderId, options = {}) {
    // Prevent multiple clicks
    if (isProcessing) {
        console.log('Already processing an approval, please wait');
        return;
    }
    
    isProcessing = true;
    
    try {
        // Find the order
        const selectedOrder = window.allOrders?.find(order => order.id === parseInt(orderId)) || 
                            window.PF_CONFIG?.pendingOrders?.find(order => order.id === parseInt(orderId));
        
        if (!selectedOrder) {
            throw new Error('Order not found');
        }

        // Client-side validation
        if (!validateOrderForApproval(selectedOrder)) {
            return;
        }

        // Show confirmation if requested
        if (options.showConfirmation !== false) {
            const confirmation = await Swal.fire({
                title: 'Approve Order?',
                html: `
                    <p>Are you sure you want to approve order <strong>#${selectedOrder.id}</strong>?</p>
                    <p><small>Created by: ${selectedOrder.creator_name}</small></p>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10B981',
                confirmButtonText: 'Yes, approve it!',
                cancelButtonText: 'Cancel',
                customClass: { container: 'swal-on-top' }
            });

            if (!confirmation.isConfirmed) {
                return;
            }
        }

        // Show progress indicator
        Swal.fire({
            title: 'Processing Approval...',
            text: 'Please wait while we process your approval.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            customClass: { container: 'swal-on-top' }
        });

        // Use current user's authorization_level as new approval status
        const newApprovalLevel = Number(window.authorizationLevel || window.PF_CONFIG?.user?.authorizationLevel);
        const requiredLevel = Number(selectedOrder.required_auth_level || 7);
        
        // Prepare data for API
        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: newApprovalLevel,
            userLevel: newApprovalLevel,
            userID: window.userID || window.PF_CONFIG?.user?.id,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        // Determine if will be fully approved after this approval
        const willBeFullyApproved = (newApprovalLevel >= requiredLevel);
        
        // Determine textual status ID
        let updatedStatusTextId = 2; // Default: 'under review'
        if (willBeFullyApproved) {
            updatedStatusTextId = 3; // 'approved'
        }

        // Update approval level in database
        const responseApproval = await fetch(URL + 'dao/conections/daoStatusUpdate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        // Process approval update response
        const resultApproval = await responseApproval.json();
        if (!resultApproval.success) {
            throw new Error(resultApproval.message || 'Error updating approval level.');
        }

        // Update status text in database if needed
        if (options.updateStatusText !== false) {
            const updateStatusText = {
                orderId: selectedOrder.id,
                statusid: updatedStatusTextId
            };

            const responseStatusText = await fetch(URL + 'dao/conections/daoStatusText.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatusText)
            });
            
            const resultStatusText = await responseStatusText.json();
            if (!resultStatusText.success) {
                console.error('Error updating status text:', resultStatusText.message);
            }
        }

        // Update local data
        selectedOrder.approval_status = newApprovalLevel;
        selectedOrder.status_id = updatedStatusTextId;
        
        // Update status name for UI reflection
        if (updatedStatusTextId === 3) selectedOrder.status_name = 'approved';
        else if (updatedStatusTextId === 2) selectedOrder.status_name = 'under review';

        // Send notification based on final status
        if (options.sendNotifications !== false) {
            if (willBeFullyApproved) {
                // Order fully approved - notify ONLY the creator
                console.log(`[APPROVAL DEBUG] Order fully approved. Sending final notification to creator`);
                await sendEmailNotification(selectedOrder.id, 'approved');
            } else {
                // Order needs more approvals - send email to NEXT approver (NOT current)
                console.log(`[APPROVAL DEBUG] Order requires more approvals. Current level: ${newApprovalLevel}, Required: ${requiredLevel}`);
                await sendEmailNotification(selectedOrder.id, 'approval');
            }
        }

        // Show success message
        const statusMessage = willBeFullyApproved ? 
            'The order has been fully approved.' : 
            'The order has been approved for the next level.';
            
        Swal.fire({
            icon: 'success',
            title: 'Order Approved!',
            text: `Order #${selectedOrder.id} has been approved successfully. ${statusMessage}`,
            timer: options.autoClose ? 3000 : undefined,
            timerProgressBar: options.autoClose,
            confirmButtonText: 'Accept',
            customClass: { container: 'swal-on-top' }
        });
        
        // Handle UI updates based on context
        if (options.onSuccess) {
            options.onSuccess(selectedOrder, 'approve');
        }
        // REMOVIDO: Ya no maneja modales automáticamente
        // Las páginas que necesiten actualizar UI específica deben usar onSuccess

        return { success: true, order: selectedOrder };
        
    } catch (error) {
        // Handle errors during approval process
        console.error('Error approving order:', error);
        Swal.fire({
            icon: 'error',
            title: 'Approval Failed',
            text: error.message || 'Failed to approve order. Please try again.',
            confirmButtonColor: '#dc3545',
            customClass: { container: 'swal-on-top' }
        });
        
        if (options.onError) {
            options.onError(error);
        }
        
        return { success: false, error: error.message };
    } finally {
        // Always reset processing flag
        isProcessing = false;
    }
}

/**
 * NUEVO: Generic rejection function that can work with any context
 */
export async function rejectOrder(orderId, rejectionReason = null, options = {}) {
    if (isProcessing) {
        console.log('Already processing a rejection, please wait');
        return;
    }
    
    isProcessing = true;
    
    try {
        // Find the order
        const selectedOrder = window.allOrders?.find(order => order.id === parseInt(orderId)) || 
                            window.PF_CONFIG?.pendingOrders?.find(order => order.id === parseInt(orderId));
        
        if (!selectedOrder) {
            throw new Error('Order not found');
        }

        // Client-side validation
        if (!validateOrderForApproval(selectedOrder)) {
            return;
        }

        // Ask for rejection reason if not provided
        if (!rejectionReason && options.requireReason !== false) {
            const { value: reason, isConfirmed } = await Swal.fire({
                title: 'Reject Order',
                html: `
                    <p>Please provide a reason for rejecting order <strong>#${selectedOrder.id}</strong>:</p>
                    <textarea 
                        id="rejection-reason"
                        class="swal2-textarea"
                        placeholder="Enter rejection reason..."
                        style="min-height: 100px; width: 85%; margin-top: 10px;"></textarea>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Reject Order',
                cancelButtonText: 'Cancel',
                customClass: { container: 'swal-on-top' },
                preConfirm: () => {
                    const reason = document.getElementById('rejection-reason').value.trim();
                    if (!reason) {
                        Swal.showValidationMessage('Please provide a rejection reason');
                        return false;
                    }
                    return reason;
                }
            });

            if (!isConfirmed || !reason) {
                return;
            }
            
            rejectionReason = reason;
        }

        // Show progress indicator
        Swal.fire({
            title: 'Processing Rejection...',
            text: 'Please wait while we process your rejection.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            customClass: { container: 'swal-on-top' }
        });

        // Configure rejection status (99)
        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: 99,
            userLevel: window.authorizationLevel || window.PF_CONFIG?.user?.authorizationLevel,
            userID: window.userID || window.PF_CONFIG?.user?.id,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
            rejection_reason: rejectionReason
        };

        // Update approval level in database
        const responseApproval = await fetch(URL + 'dao/conections/daoStatusUpdate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        const resultApproval = await responseApproval.json();
        if (!resultApproval.success) {
            throw new Error(resultApproval.message || 'Error updating status to rejected.');
        }

        // Update status text in database if needed
        if (options.updateStatusText !== false) {
            const updateStatusText = {
                orderId: selectedOrder.id,
                statusid: 4 // rejected
            };

            const responseStatusText = await fetch(URL + 'dao/conections/daoStatusText.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateStatusText)
            });
            
            const resultStatusText = await responseStatusText.json();
            if (!resultStatusText.success) {
                console.error('Error updating status text to rejected:', resultStatusText.message);
            }
        }

        // Update local data
        selectedOrder.approval_status = 99;
        selectedOrder.status_id = 4;
        selectedOrder.status_name = 'rejected';

        // Send rejection notification to creator
        if (options.sendNotifications !== false) {
            console.log(`[REJECT DEBUG] Order rejected. Sending notification to creator`);
            await sendEmailNotification(selectedOrder.id, 'rejected');
        }

        // Show confirmation
        Swal.fire({
            icon: 'success',
            title: 'Order Rejected',
            text: `Order #${selectedOrder.id} has been rejected.`,
            timer: options.autoClose ? 3000 : undefined,
            timerProgressBar: options.autoClose,
            confirmButtonText: 'Accept',
            customClass: { container: 'swal-on-top' }
        });
        
        // Handle UI updates based on context
        if (options.onSuccess) {
            options.onSuccess(selectedOrder, 'reject');
        }
        // REMOVIDO: Ya no maneja modales automáticamente
        // Las páginas que necesiten actualizar UI específica deben usar onSuccess

        return { success: true, order: selectedOrder };

    } catch (error) {
        console.error('Error rejecting order:', error);
        Swal.fire({
            icon: 'error',
            title: 'Rejection Failed',
            text: error.message || 'Failed to reject order. Please try again.',
            confirmButtonColor: '#dc3545',
            customClass: { container: 'swal-on-top' }
        });
        
        if (options.onError) {
            options.onError(error);
        }
        
        return { success: false, error: error.message };
    } finally {
        isProcessing = false;
    }
}

/**
 * Sends email notification based on action type
 */
async function sendEmailNotification(orderId, notificationType) {
    console.log(`[EMAIL DEBUG] Starting email send - Order: ${orderId}, Type: ${notificationType}`);
    
    try {
        let endpoint = '';
        const emailData = { orderId: orderId };

        // Determine endpoint based on notification type
        switch (notificationType) {
            case 'approval':
                // Send email to next approver
                endpoint = 'https://grammermx.com/Mailer/PFMailer/PFmailNotification.php';
                console.log(`[EMAIL DEBUG] Setting up send to next approver`);
                break;
            case 'approved':
                // Send final status email (approved) to creator
                endpoint = 'https://grammermx.com/Mailer/PFMailer/PFmailStatus.php';
                emailData.status = 'approved';
                console.log(`[EMAIL DEBUG] Setting up final status send (approved) to creator`);
                break;
            case 'rejected':
                // Send final status email (rejected) to creator
                endpoint = 'https://grammermx.com/Mailer/PFMailer/PFmailStatus.php';
                emailData.status = 'rejected';
                console.log(`[EMAIL DEBUG] Setting up final status send (rejected) to creator`);
                break;
            default:
                console.warn(`[EMAIL DEBUG] Unrecognized notification type: ${notificationType}`);
                return;
        }

        console.log(`[EMAIL DEBUG] Selected endpoint: ${endpoint}`);
        console.log(`[EMAIL DEBUG] Email data:`, emailData);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData)
        });

        console.log(`[EMAIL DEBUG] HTTP response received - Status: ${response.status}, OK: ${response.ok}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Get response text first for diagnosis
        const responseText = await response.text();
        console.log(`[EMAIL DEBUG] Server response (text):`, responseText);

        // Try to parse as JSON
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`[EMAIL DEBUG] Error parsing JSON:`, parseError);
            console.error(`[EMAIL DEBUG] Response received:`, responseText);
            throw new Error(`Server response is not valid JSON: ${responseText.substring(0, 200)}...`);
        }

        console.log(`[EMAIL DEBUG] Server result (parsed):`, result);

        if (!result.success) {
            console.warn(`[EMAIL DEBUG] Error reported by server: ${result.message}`);
        } else {
            console.log(`[EMAIL DEBUG] ✅ Email sent successfully - Order: ${orderId}, Type: ${notificationType}`);
        }
    } catch (error) {
        console.error(`[EMAIL DEBUG] ❌ Error sending email - Order: ${orderId}, Type: ${notificationType}:`, error);
        console.error(`[EMAIL DEBUG] Error details:`, {
            message: error.message,
            stack: error.stack
        });
    }
}

/**
 * Validates if an order can be approved by current user
 */
function validateOrderForApproval(order) {
    // Force conversion to integers for correct comparison
    const userPlantInt = window.userPlant !== null && window.userPlant !== undefined ? 
        parseInt(window.userPlant, 10) : null;
    const creatorPlantInt = parseInt(order.creator_plant, 10) || 0;
    
    console.log('DEBUG Plant comparison:', {
        'window.userPlant (original)': window.userPlant,
        'userPlantInt': userPlantInt,
        'order.creator_plant (original)': order.creator_plant,
        'creatorPlantInt': creatorPlantInt,
        'userPlant type': typeof window.userPlant,
        'creator_plant type': typeof order.creator_plant,
        'comparison result': userPlantInt !== null && userPlantInt !== undefined && creatorPlantInt !== userPlantInt
    });

    // Check plant: allow if userPlant is null/undefined OR if it matches exactly with creator_plant
    if (userPlantInt !== null && userPlantInt !== undefined && 
        creatorPlantInt !== userPlantInt) {
        Swal.fire({
            icon: 'warning',
            title: 'No Permissions',
            text: 'You do not have permissions to approve orders from other plants. Current user is assigned to plant: ' 
            + userPlantInt + ' and the order belongs to plant: ' + creatorPlantInt,
            customClass: { container: 'swal-on-top' }
        });
        return false;
    }
    
    // Check authorization level: must be exactly (approval_status + 1)
    const currentApprovalLevel = Number(order.approval_status);
    const nextRequiredLevel = currentApprovalLevel + 1;
    
    if (Number(window.authorizationLevel) !== nextRequiredLevel) {
        Swal.fire({
            icon: 'warning',
            title: 'Incorrect Authorization Level',
            text: `Your authorization level (${window.authorizationLevel}) does not match what's required for this order (${nextRequiredLevel}).`,
            customClass: { container: 'swal-on-top' }
        });
        return false;
    }
    
    // Check that it's not fully approved (approval_status >= required_auth_level)
    const requiredLevel = Number(order.required_auth_level || 7);
    if (currentApprovalLevel >= requiredLevel) {
        Swal.fire({
            icon: 'warning',
            title: 'Order Already Approved',
            text: 'This order is already fully approved.',
            customClass: { container: 'swal-on-top' }
        });
        return false;
    }
    
    // Check that it's not rejected (approval_status = 99)
    if (currentApprovalLevel === 99) {
        Swal.fire({
            icon: 'warning',
            title: 'Order Rejected',
            text: 'This order was previously rejected.',
            customClass: { container: 'swal-on-top' }
        });
        return false;
    }
    
    return true;
}

/**
 * LEGACY: Handles approve button click (for backward compatibility)
 */
export async function handleApprove() {
    const selectedOrderId = sessionStorage.getItem('selectedOrderId');
    if (!selectedOrderId) {
        console.error('No order selected');
        return;
    }
    
    return await approveOrder(selectedOrderId);
}

/**
 * LEGACY: Handles reject button click (for backward compatibility)
 */
export async function handleReject() {
    const selectedOrderId = sessionStorage.getItem('selectedOrderId');
    if (!selectedOrderId) {
        console.error('No order selected');
        return;
    }
    
    return await rejectOrder(selectedOrderId);
}

/**
 * Sets up event listeners for approval/rejection buttons
 */
export function setupApprovalEventListeners() {
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');

    // Check and configure approve button
    if (!approveBtn) {
        console.error('Approve button not found in DOM');
    } else {
        approveBtn.onclick = handleApprove;
    }
    
    // Check and configure reject button
    if (!rejectBtn) {
        console.error('Reject button not found in DOM');
    } else {
        rejectBtn.onclick = handleReject;
    }
}