/**
 * viewOrder.js - Premium Freight Order Viewer (Refactored)
 * Ahora usa PF_CONFIG para una gestión de datos consistente.
 */

import { loadAndPopulateSVG, generatePDF as svgGeneratePDF } from './svgOrders.js';
import { approveOrder, rejectOrder } from './approval.js';

let currentOrder = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', initializeViewOrder);

async function initializeViewOrder() {
    try {
        const orderData = await loadOrderData();
        if (!orderData) return;
        currentOrder = orderData;
        
        await initializeOrderDisplay();
        configureActionButtons();
        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize view order:', error);
    }
}

async function loadOrderData() {
    try {
        const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/conections/daoPremiumFreight.php`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        if (result.status !== 'success' || !Array.isArray(result.data)) {
            throw new Error('Invalid data format received');
        }

        const targetOrder = result.data.find(order => order.id === window.PF_CONFIG.orderId);
        if (!targetOrder) {
            Swal.fire({ icon: 'warning', title: `Order #${window.PF_CONFIG.orderId} not found`, text: 'The order may not exist or you may not have permission to view it.' })
                .then(() => window.location.href = 'orders.php');
            return null;
        }
        
        window.allOrders = [targetOrder]; // Para que approval.js la encuentre
        return targetOrder;
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error Loading Order', text: error.message });
        throw error;
    }
}

async function initializeOrderDisplay() {
    try {
        document.getElementById('loadingSpinner')?.classList.remove('hidden');
        if (!currentOrder || !currentOrder.id) throw new Error('Order data is missing.');
        
        await loadAndPopulateSVG(currentOrder, 'svgContent');
        
        document.getElementById('loadingSpinner')?.classList.add('hidden');
        document.getElementById('svgContent')?.classList.remove('hidden');
        document.title = `Order #${currentOrder.id} - ${currentOrder.status_name || 'Premium Freight'}`;
    } catch (error) {
        document.getElementById('loadingSpinner')?.classList.add('hidden');
        const svgContainer = document.getElementById('svgContent');
        if (svgContainer) {
            svgContainer.innerHTML = `<div class="svg-error-message"><h3>Error Loading Order</h3><p>${error.message}</p></div>`;
            svgContainer.classList.remove('hidden');
        }
        throw error;
    }
}

function setupEventListeners() {
    document.querySelector('.btn-back')?.addEventListener('click', () => window.location.href = 'orders.php');
    document.querySelector('.btn-pdf')?.addEventListener('click', handleGeneratePDF);
    document.getElementById('approveBtn')?.addEventListener('click', handleApprovalClick);
    document.getElementById('rejectBtn')?.addEventListener('click', handleRejectionClick);
}

function checkApprovalPermissions(user, order) {
    if (!user || !order) return false;
    const userAuthLevel = Number(user.authorizationLevel);
    const userPlant = user.plant !== null ? parseInt(user.plant, 10) : null;
    const currentApprovalLevel = Number(order.approval_status);
    const requiredLevel = currentApprovalLevel + 1;
    const creatorPlant = parseInt(order.creator_plant, 10) || 0;
    const maxRequiredLevel = Number(order.required_auth_level || 7);

    if (currentApprovalLevel >= maxRequiredLevel || currentApprovalLevel === 99 || userAuthLevel !== requiredLevel) {
        return false;
    }
    return !(userPlant !== null && creatorPlant !== userPlant);
}

function configureActionButtons() {
    const user = window.PF_CONFIG?.user;
    if (!user || !currentOrder) return;

    const canApprove = checkApprovalPermissions(user, currentOrder);
    document.getElementById('approveBtn')?.classList.toggle('hidden', !canApprove);
    document.getElementById('rejectBtn')?.classList.toggle('hidden', !canApprove);
}

async function handleApprovalClick(event) {
    event.preventDefault();
    if (isLoading) return;
    isLoading = true;
    try {
        const result = await approveOrder(currentOrder.id);
        if (result?.success) await refreshPageData();
    } finally {
        isLoading = false;
    }
}

async function handleRejectionClick(event) {
    event.preventDefault();
    if (isLoading) return;
    isLoading = true;
    try {
        const result = await rejectOrder(currentOrder.id);
        if (result?.success) await refreshPageData();
    } finally {
        isLoading = false;
    }
}

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

async function refreshPageData() {
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
