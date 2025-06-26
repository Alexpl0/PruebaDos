/**
 * viewOrder.js - Premium Freight Order Viewer
 *
 * This module handles the individual order view functionality.
 * ACTUALIZADO: Ahora usa las funciones modernas approveOrder y rejectOrder.
 */

// Import required modules
import { loadAndPopulateSVG, generatePDF as svgGeneratePDF } from './svgOrders.js';
// CORREGIDO: Se importan las funciones correctas desde approval.js
import { approveOrder, rejectOrder } from './approval.js';
import { showLoading } from './utils.js';

/**
 * Configuration and global variables
 */
let currentOrder = null;
let isLoading = false;
let progressData = null;

/**
 * Initialize the view order page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeViewOrder();
});

/**
 * Main initialization function
 */
async function initializeViewOrder() {
    try {
        const orderData = await loadOrderData();
        if (!orderData) return;
        currentOrder = orderData;
        await loadProgressData();
        await initializeOrderDisplay();
        configureActionButtons();
        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize view order:', error);
    }
}

/**
 * Load order data from the PFDB endpoint
 */
async function loadOrderData() {
    try {
        const response = await fetch(`${window.PF_CONFIG.baseURL}dao/conections/daoPremiumFreight.php`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status !== 'success' || !Array.isArray(result.data)) {
            throw new Error('Invalid data format received');
        }
        const targetOrder = result.data.find(order => order.id === window.PF_CONFIG.orderId);
        if (!targetOrder) {
            showAccessDeniedError(`Order #${window.PF_CONFIG.orderId} not found`, 'The order may not exist or you may not have permission to view it.');
            return null;
        }
        window.PF_CONFIG.orderData = targetOrder;
        window.allOrders = [targetOrder]; // Para que approval.js la encuentre
        return targetOrder;
    } catch (error) {
        showGenericError('Error Loading Order', error.message);
        throw error;
    }
}

/**
 * Initialize the order display with SVG content
 */
async function initializeOrderDisplay() {
    try {
        showLoadingSpinner(true);
        if (!currentOrder || !currentOrder.id) throw new Error('Order data or ID is missing.');
        const svgContainer = document.getElementById('svgContent');
        if (!svgContainer) throw new Error('SVG container not found');
        await loadAndPopulateSVG(currentOrder, 'svgContent');
        showLoadingSpinner(false);
        updatePageTitle();
    } catch (error) {
        showLoadingSpinner(false);
        const svgContainer = document.getElementById('svgContent');
        if (svgContainer) {
            svgContainer.innerHTML = `<div class="svg-error-message"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Order</h3><p>${error.message}</p><button onclick="location.reload()" class="btn btn-primary">Retry</button></div>`;
            svgContainer.classList.remove('hidden');
        }
        throw error;
    }
}

/**
 * Setup all event listeners for the page
 */
function setupEventListeners() {
    document.querySelector('.btn-back')?.addEventListener('click', () => window.location.href = 'orders.php');
    document.querySelector('.btn-pdf')?.addEventListener('click', handleGeneratePDF);
    document.getElementById('approveBtn')?.addEventListener('click', handleApprovalClick);
    document.getElementById('rejectBtn')?.addEventListener('click', handleRejectionClick);
}

/**
 * Check if user has permission to approve this order
 */
function checkApprovalPermissions(user, order) {
    if (!user || !order) return false;

    const userAuthLevel = Number(user.authorizationLevel || window.authorizationLevel);
    const userPlant = user.plant !== null ? parseInt(user.plant, 10) : null;
    const currentApprovalLevel = Number(order.approval_status);
    const requiredLevel = currentApprovalLevel + 1;
    const creatorPlant = parseInt(order.creator_plant, 10) || 0;
    const maxRequiredLevel = Number(order.required_auth_level || 7);

    if (currentApprovalLevel >= maxRequiredLevel || currentApprovalLevel === 99 || userAuthLevel !== requiredLevel) {
        return false;
    }
    if (userPlant !== null && creatorPlant !== userPlant) {
        return false;
    }
    return true;
}

/**
 * Configure approval/rejection buttons based on user permissions
 */
function configureActionButtons() {
    const user = window.PF_CONFIG?.user;
    if (!user || !currentOrder) return;

    // Configurar variables globales que necesita approval.js
    window.authorizationLevel = user.authorizationLevel;
    window.userPlant = user.plant;
    window.userID = user.id;

    const canApprove = checkApprovalPermissions(user, currentOrder);
    document.getElementById('approveBtn')?.classList.toggle('hidden', !canApprove);
    document.getElementById('rejectBtn')?.classList.toggle('hidden', !canApprove);
}

/**
 * Handle approval button click
 */
async function handleApprovalClick(event) {
    event.preventDefault();
    if (isLoading) return;
    isLoading = true;

    try {
        // La validación de permisos ahora está en approval.js
        // Pasamos el ID de la orden directamente.
        const result = await approveOrder(currentOrder.id);
        if (result && result.success) {
            await refreshOrderData();
            await loadProgressData();
        }
    } catch (error) {
        // El módulo `approval.js` ya muestra el error en un Swal.
        console.error('Failed to approve order:', error);
    } finally {
        isLoading = false;
    }
}

/**
 * Handle rejection button click
 */
async function handleRejectionClick(event) {
    event.preventDefault();
    if (isLoading) return;
    isLoading = true;

    try {
        // Pasamos el ID y null para la razón, para que la pida al usuario.
        const result = await rejectOrder(currentOrder.id, null);
        if (result && result.success) {
            await refreshOrderData();
            await loadProgressData();
        }
    } catch (error) {
        console.error('Failed to reject order:', error);
    } finally {
        isLoading = false;
    }
}

/**
 * Handle PDF generation
 */
async function handleGeneratePDF(event) {
    event?.preventDefault();
    if (isLoading) return;
    isLoading = true;

    try {
        Swal.fire({ title: 'Generating PDF', html: 'Please wait...', timerProgressBar: true, didOpen: () => Swal.showLoading() });
        const fileName = await svgGeneratePDF(currentOrder);
        Swal.fire({ icon: 'success', title: 'PDF Generated!', html: `File <b>${fileName}</b> downloaded.` });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error Generating PDF', text: error.message });
    } finally {
        isLoading = false;
    }
}

/**
 * Refresh all data on the page
 */
async function refreshOrderData() {
    try {
        const orderData = await loadOrderData();
        if (!orderData) return;
        currentOrder = orderData;
        await initializeOrderDisplay();
        configureActionButtons();
    } catch (error) {
        console.error("Failed to refresh order data:", error);
    }
}

// --- Otras funciones de utilidad (sin cambios) ---

async function loadProgressData() { /* ... Lógica existente ... */ }
function renderProgressLine() { /* ... Lógica existente ... */ }
function updatePageTitle() {
    if (currentOrder) {
        document.title = `Order #${currentOrder.id} - ${currentOrder.status_name || 'Premium Freight'}`;
    }
}
function showLoadingSpinner(show) {
    document.getElementById('loadingSpinner')?.classList.toggle('hidden', !show);
    document.getElementById('svgContent')?.classList.toggle('hidden', show);
}
function showAccessDeniedError(title, details) {
    Swal.fire({ icon: 'warning', title, html: `<div style="text-align: left;"><p>${details}</p></div>`, confirmButtonText: 'Back to Orders' })
        .then(() => window.location.href = 'orders.php');
}
function showGenericError(title, message) {
    Swal.fire({ icon: 'error', title, text: message, confirmButtonText: 'Back to Orders' })
        .then(() => window.location.href = 'orders.php');
}
