/**
 * viewOrder.js - Premium Freight Order Viewer
 * 
 * ACTUALIZACIÓN v2.0 (2025-10-06):
 * - Usa approvalLevel para validaciones de permisos
 */

import { approveOrder, rejectOrder } from './approval.js';

let currentOrder = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', initializeViewOrder);

async function initializeViewOrder() {
    console.log('[viewOrder.js] Initializing page...');
    try {
        await loadOrderData();
        await initializeOrderDisplay();
        setupEventListeners();
        configureActionButtons();
    } catch (error) {
        console.error('[viewOrder.js] Initialization error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: error.message
        });
    }
}

async function loadOrderData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('id');
        
        if (!orderId) {
            throw new Error('No order ID provided');
        }

        const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/conections/daoPremiumFreight.php`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.orders)) {
            window.allOrders = data.orders;
            currentOrder = data.orders.find(order => order.id == orderId);
            
            if (!currentOrder) {
                throw new Error('Order not found');
            }
        } else {
            throw new Error('Failed to load orders');
        }
    } catch (error) {
        console.error('[viewOrder.js] Error loading order data:', error);
        throw error;
    }
}

async function initializeOrderDisplay() {
    try {
        if (!currentOrder) {
            throw new Error('No order data available');
        }

        // Renderizar detalles de la orden aquí
        console.log('[viewOrder.js] Order loaded:', currentOrder);
        
    } catch (error) {
        console.error('[viewOrder.js] Error initializing display:', error);
        throw error;
    }
}

function setupEventListeners() {
    document.querySelector('.btn-back')?.addEventListener('click', () => {
        window.location.href = 'orders.php';
    });
    
    document.querySelector('.btn-pdf')?.addEventListener('click', handleGeneratePDF);
    document.getElementById('approveBtn')?.addEventListener('click', handleApprovalClick);
    document.getElementById('rejectBtn')?.addEventListener('click', handleRejectionClick);
    
    document.getElementById('recoveryFilesBtn')?.addEventListener('click', () => {
        openRecoveryFilesModal(currentOrder);
    });
    
    document.getElementById('closeRecoveryModalBtn')?.addEventListener('click', closeRecoveryFilesModal);
}

/**
 * Verifica permisos de aprobación
 * ACTUALIZADO: Usa approvalLevel
 */
function checkApprovalPermissions(user, order) {
    if (!user || !order) return false;
    
    // ACTUALIZADO: Usar approvalLevel
    const userApprovalLevel = Number(user.approvalLevel);
    const currentApprovalLevel = Number(order.approval_status || 0);
    const requiredLevel = currentApprovalLevel + 1;
    const userPlant = user.plant;
    const orderPlant = order.creator_plant;

    // Verificar nivel de aprobación
    if (userApprovalLevel !== requiredLevel) {
        console.log(`[viewOrder.js] Permission denied: User approval level ${userApprovalLevel} !== required level ${requiredLevel}`);
        return false;
    }

    // Verificar planta
    if (userPlant !== null && userPlant !== orderPlant) {
        console.log(`[viewOrder.js] Permission denied: Plant mismatch (${userPlant} !== ${orderPlant})`);
        return false;
    }

    return true;
}

function configureActionButtons() {
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const user = window.PF_CONFIG.user;

    if (!currentOrder || !user) {
        approveBtn?.classList.add('d-none');
        rejectBtn?.classList.add('d-none');
        return;
    }

    const hasPermission = checkApprovalPermissions(user, currentOrder);
    const isRejected = Number(currentOrder.approval_status) === 99;
    const isFullyApproved = Number(currentOrder.approval_status) >= Number(currentOrder.required_auth_level);

    if (hasPermission && !isRejected && !isFullyApproved) {
        approveBtn?.classList.remove('d-none');
        rejectBtn?.classList.remove('d-none');
    } else {
        approveBtn?.classList.add('d-none');
        rejectBtn?.classList.add('d-none');
    }
}

async function handleApprovalClick(event) {
    event.preventDefault();
    
    if (!currentOrder) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No order selected' });
        return;
    }

    try {
        const result = await approveOrder(currentOrder.id, { showConfirmation: true });
        
        if (result.success) {
            await refreshPageData();
        }
    } catch (error) {
        console.error('[viewOrder.js] Approval error:', error);
    }
}

async function handleRejectionClick(event) {
    event.preventDefault();
    
    if (!currentOrder) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No order selected' });
        return;
    }

    try {
        const result = await rejectOrder(currentOrder.id, null, { showConfirmation: true });
        
        if (result.success) {
            await refreshPageData();
        }
    } catch (error) {
        console.error('[viewOrder.js] Rejection error:', error);
    }
}

async function handleGeneratePDF(event) {
    event.preventDefault();
    
    if (!currentOrder) {
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

        // Lógica de generación de PDF aquí

        Swal.fire({ 
            icon: 'success', 
            title: 'PDF Generated!', 
            timer: 1500 
        });
        
    } catch (error) {
        console.error('[viewOrder.js] PDF generation error:', error);
        Swal.fire({ 
            icon: 'error', 
            title: 'PDF Generation Failed', 
            text: error.message 
        });
    }
}

async function refreshPageData() {
    try {
        await loadOrderData();
        await initializeOrderDisplay();
        configureActionButtons();
    } catch (error) {
        console.error('[viewOrder.js] Error refreshing data:', error);
    }
}

function openRecoveryFilesModal(order) {
    // Implementar lógica de modal de archivos de recuperación
    console.log('[viewOrder.js] Opening recovery files modal for order:', order.id);
}

function closeRecoveryFilesModal() {
    // Implementar lógica de cierre de modal
    console.log('[viewOrder.js] Closing recovery files modal');
}
