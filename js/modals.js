/**
 * Premium Freight - Modal Functionality
 * 
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - Usa approvalLevel para configuración de botones
 */

import { approveOrder, rejectOrder } from './approval.js';

let currentModal = null;

export function showModal(orderId) {
    const selectedOrder = window.allOrders?.find(order => order.id == orderId);
    
    if (!selectedOrder) {
        console.error('[modals.js] Order not found:', orderId);
        return;
    }

    currentModal = selectedOrder;
    configureActionButtons(selectedOrder);
    loadSvgContent(selectedOrder);
}

export function hideModal() {
    currentModal = null;
    // Lógica de cierre de modal
}

/**
 * Configures the approval and rejection buttons based on user permissions
 * ACTUALIZADO: Usa approvalLevel
 */
function configureActionButtons(selectedOrder) {
    const approveBtn = document.getElementById('approveOrderBtn');
    const rejectBtn = document.getElementById('rejectOrderBtn');
    const user = window.PF_CONFIG.user;

    if (!user || !selectedOrder) {
        approveBtn?.classList.add('d-none');
        rejectBtn?.classList.add('d-none');
        return;
    }

    // ACTUALIZADO: Usar approvalLevel
    const userApprovalLevel = Number(user.approvalLevel);
    const currentApprovalLevel = Number(selectedOrder.approval_status || 0);
    const nextRequiredLevel = currentApprovalLevel + 1;
    const isRejected = currentApprovalLevel === 99;
    const isFullyApproved = currentApprovalLevel >= Number(selectedOrder.required_auth_level);

    // Verificar si el usuario es el siguiente aprobador
    const isNextApprover = userApprovalLevel === nextRequiredLevel;

    // Verificar planta
    const userPlant = user.plant;
    const orderPlant = selectedOrder.creator_plant;
    const plantMatches = userPlant === null || userPlant === orderPlant;

    if (isNextApprover && plantMatches && !isRejected && !isFullyApproved) {
        approveBtn?.classList.remove('d-none');
        rejectBtn?.classList.remove('d-none');
        
        // Configurar event listeners
        approveBtn?.addEventListener('click', async () => {
            await approveOrder(selectedOrder.id, { showConfirmation: true });
            hideModal();
        });
        
        rejectBtn?.addEventListener('click', async () => {
            await rejectOrder(selectedOrder.id, null, { showConfirmation: true });
            hideModal();
        });
    } else {
        approveBtn?.classList.add('d-none');
        rejectBtn?.classList.add('d-none');
    }
}

async function loadSvgContent(selectedOrder) {
    // Implementar lógica de carga de SVG
    console.log('[modals.js] Loading SVG for order:', selectedOrder.id);
}

export function updateModalButtonsContainer() {
    // Implementar actualización de contenedor de botones
}

export function updateModalButtons() {
    // Implementar actualización de botones
}

export function showEvidenceUploadModal(orderId) {
    console.log('[modals.js] Showing evidence upload modal for order:', orderId);
}

export function showEvidenceFileUploadForm(orderId) {
    console.log('[modals.js] Showing evidence file upload form for order:', orderId);
}

export async function handleSavePDF() {
    if (!currentModal) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No order selected' });
        return;
    }

    try {
        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Lógica de generación de PDF

        Swal.fire({ 
            icon: 'success', 
            title: 'PDF Saved!', 
            timer: 1500 
        });
        
    } catch (error) {
        console.error('[modals.js] PDF save error:', error);
        Swal.fire({ 
            icon: 'error', 
            title: 'Failed to Save PDF', 
            text: error.message 
        });
    }
}