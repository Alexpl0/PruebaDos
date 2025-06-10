/**
 * viewOrder.js - Premium Freight Order Viewer
 * 
 * This module handles the individual order view functionality including:
 * - Loading and displaying SVG order content
 * - Approval/rejection functionality
 * - PDF generation
 * - Navigation controls
 * - Real-time order status updates
 */

// Import required modules
import { loadAndPopulateSVG, generatePDF as svgGeneratePDF } from './svgOrders.js';
import { handleApprove, handleReject } from './approval.js';
import { showLoading } from './utils.js';

/**
 * Configuration and global variables
 */
let currentOrder = null;
let isLoading = false;

/**
 * Initialize the view order page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeViewOrder();
});

/**
 * Load order data from the existing PFDB endpoint
 */
async function loadOrderData() {
    try {
        const response = await fetch(`${window.PF_CONFIG.baseURL}dao/conections/daoPremiumFreight.php`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseText = await response.text();
        
        if (!responseText || responseText.trim() === '') {
            throw new Error('Empty response from server');
        }
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error('Invalid JSON response from server');
        }
        
        if (!data.status || data.status !== 'success' || !Array.isArray(data.data)) {
            throw new Error('Invalid data format received');
        }
        
        // Buscar la orden específica en los datos
        const targetOrder = data.data.find(order => order.id === window.PF_CONFIG.orderId);
        
        if (!targetOrder) {
            throw new Error(`Order #${window.PF_CONFIG.orderId} not found`);
        }
        
        // Actualizar datos globales
        window.PF_CONFIG.orderData = targetOrder;
        window.allOrders = [targetOrder];
        window.originalOrders = [targetOrder];
        
        return targetOrder;
        
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error Loading Order',
            text: error.message,
            confirmButtonText: 'Back to Orders',
            customClass: { container: 'swal-on-top' }
        }).then(() => {
            window.location.href = 'orders.php';
        });
        
        throw error;
    }
}

/**
 * Main initialization function
 */
async function initializeViewOrder() {
    try {
        // Load order data first
        const orderData = await loadOrderData();
        
        // Set current order for other functions
        currentOrder = orderData;
        
        // Initialize UI components
        await initializeOrderDisplay();
        
        // Configure buttons based on permissions
        configureActionButtons();
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        // Error already handled in loadOrderData
    }
}

/**
 * Initialize the order display with SVG content
 */
async function initializeOrderDisplay() {
    try {
        // Show loading spinner
        showLoadingSpinner(true);
        
        // Verificar que currentOrder tenga los datos necesarios
        if (!currentOrder) {
            throw new Error('No order data available');
        }
        
        // CORREGIDO: Asegurar que el contenedor SVG esté disponible
        const svgContainer = document.getElementById('svgContent');
        if (!svgContainer) {
            throw new Error('SVG container not found');
        }
        
        // CORREGIDO: Verificar que la orden tenga un ID válido
        if (!currentOrder.id) {
            throw new Error('Order ID is missing');
        }
        
        // Load SVG content using the correct function and container
        await loadAndPopulateSVG(currentOrder, 'svgContent');
        
        // Hide loading spinner and show content
        showLoadingSpinner(false);
        
        // Update page title
        updatePageTitle();
        
    } catch (error) {
        showLoadingSpinner(false);
        
        // Mostrar error en el contenedor SVG
        const svgContainer = document.getElementById('svgContent');
        if (svgContainer) {
            svgContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; color: #dc3545;"></i>
                    <h3>Error Loading Order</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
            svgContainer.classList.remove('hidden');
        }
        
        throw error;
    }
}

/**
 * Setup all event listeners for the page
 */
function setupEventListeners() {
    // Back button
    const backBtn = document.querySelector('.btn-back');
    if (backBtn) {
        backBtn.addEventListener('click', handleGoBack);
    }
    
    // PDF button
    const pdfBtn = document.querySelector('.btn-pdf');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', handleGeneratePDF);
    }
    
    // Approval buttons
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    if (approveBtn) {
        approveBtn.addEventListener('click', handleApprovalClick);
    }
    
    if (rejectBtn) {
        rejectBtn.addEventListener('click', handleRejectionClick);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Check if user has permission to approve this order
 */
function checkApprovalPermissions(user, order) {
    if (!user || !order) {
        return false;
    }

    const userAuthLevel = Number(user.authorizationLevel || window.authorizationLevel);
    const userPlant = parseInt(user.plant || window.userPlant, 10) || null;
    const currentApprovalLevel = Number(order.approval_status);
    const requiredLevel = currentApprovalLevel + 1;
    const creatorPlant = parseInt(order.creator_plant, 10) || 0;

    // 1. Verificar que no esté completamente aprobada
    const maxRequiredLevel = Number(order.required_auth_level || 7);
    if (currentApprovalLevel >= maxRequiredLevel) {
        return false;
    }
    
    // 2. Verificar que no esté rechazada
    if (currentApprovalLevel === 99) {
        return false;
    }

    // 3. Verificar nivel de autorización
    if (userAuthLevel !== requiredLevel) {
        return false;
    }

    // 4. Verificar planta
    if (userPlant !== null && userPlant !== undefined && creatorPlant !== userPlant) {
        return false;
    }

    return true;
}

/**
 * Configure approval/rejection buttons based on user permissions
 */
function configureActionButtons() {
    const user = window.PF_CONFIG?.user;
    const order = currentOrder;
    
    if (!user || !order) {
        return;
    }

    // Configurar variables globales que necesita approval.js
    window.authorizationLevel = user.authorizationLevel;
    window.userPlant = user.plant;
    window.userID = user.id;
    
    // Configurar sessionStorage con el ID de la orden actual
    sessionStorage.setItem('selectedOrderId', order.id.toString());
    
    // Configurar window.allOrders para que approval.js pueda encontrar la orden
    if (!window.allOrders) {
        window.allOrders = [];
    }
    
    const existingOrderIndex = window.allOrders.findIndex(o => o.id === order.id);
    if (existingOrderIndex >= 0) {
        window.allOrders[existingOrderIndex] = order;
    } else {
        window.allOrders.push(order);
    }

    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    const canApprove = checkApprovalPermissions(user, order);
    
    if (canApprove) {
        if (approveBtn) approveBtn.classList.remove('hidden');
        if (rejectBtn) rejectBtn.classList.remove('hidden');
    } else {
        if (approveBtn) approveBtn.classList.add('hidden');
        if (rejectBtn) rejectBtn.classList.add('hidden');
    }
}

/**
 * Handle approval button click
 */
async function handleApprovalClick(event) {
    event.preventDefault();
    
    if (isLoading) return;
    
    try {
        isLoading = true;
        sessionStorage.setItem('selectedOrderId', currentOrder.id.toString());
        await handleApprove();
        await refreshOrderData();
    } catch (error) {
        showErrorMessage('Failed to approve order: ' + error.message);
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
    
    try {
        isLoading = true;
        sessionStorage.setItem('selectedOrderId', currentOrder.id.toString());
        await handleReject();
        await refreshOrderData();
    } catch (error) {
        showErrorMessage('Failed to reject order: ' + error.message);
    } finally {
        isLoading = false;
    }
}

/**
 * Handle PDF generation
 */
async function handleGeneratePDF(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    
    if (isLoading) return;
    
    try {
        isLoading = true;
        
        Swal.fire({
            title: 'Generating PDF',
            html: 'Please wait while the document is being processed...',
            timerProgressBar: true,
            didOpen: () => { Swal.showLoading(); },
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: false,
            customClass: { container: 'swal-on-top' }
        });

        const fileName = await svgGeneratePDF(currentOrder);

        Swal.fire({
            icon: 'success',
            title: 'PDF Generated Successfully!',
            html: `The file <b>${fileName}</b> has been downloaded successfully.`,
            confirmButtonText: 'OK',
            confirmButtonColor: '#28a745',
            customClass: { container: 'swal-on-top' }
        });
        
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error Generating PDF',
            text: error.message || 'An unexpected error occurred.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc3545',
            customClass: { container: 'swal-on-top' }
        });
        
        const tempContainer = document.querySelector('div[style*="left: -9999px"]');
        if (tempContainer) {
            document.body.removeChild(tempContainer);
        }
    } finally {
        isLoading = false;
    }
}

/**
 * Handle back navigation
 */
function handleGoBack() {
    window.location.href = 'orders.php';
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
    if (event.key === 'Escape') {
        handleGoBack();
    }
    
    if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        handleGeneratePDF(event);
    }
    
    if (event.ctrlKey && event.key === 'Enter') {
        const approveBtn = document.getElementById('approveBtn');
        if (approveBtn && !approveBtn.classList.contains('hidden')) {
            event.preventDefault();
            handleApprovalClick(event);
        }
    }
}

/**
 * Update page title with order information
 */
function updatePageTitle() {
    if (currentOrder) {
        document.title = `Order #${currentOrder.id} - ${currentOrder.status_name || 'Premium Freight'} - Grammer AG`;
    }
}

/**
 * Show/hide loading spinner
 */
function showLoadingSpinner(show) {
    const spinner = document.getElementById('loadingSpinner');
    const content = document.getElementById('svgContent');
    
    if (show) {
        if (spinner) spinner.classList.remove('hidden');
        if (content) content.classList.add('hidden');
    } else {
        if (spinner) spinner.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    }
}

/**
 * Show error message to user
 */
function showErrorMessage(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonColor: '#dc3545'
    });
}

/**
 * Refresh order data from server
 */
async function refreshOrderData() {
    try {
        const response = await fetch(`${window.PF_CONFIG.baseURL}dao/conections/daoPremiumFreight.php`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch updated order data');
        }
        
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        
        if (data.status === 'success' && Array.isArray(data.data)) {
            const updatedOrder = data.data.find(order => order.id === currentOrder.id);
            
            if (updatedOrder) {
                currentOrder = updatedOrder;
                window.PF_CONFIG.orderData = currentOrder;
                
                const existingOrderIndex = window.allOrders?.findIndex(o => o.id === currentOrder.id);
                if (existingOrderIndex >= 0) {
                    window.allOrders[existingOrderIndex] = currentOrder;
                } else {
                    if (!window.allOrders) window.allOrders = [];
                    window.allOrders.push(currentOrder);
                }
                
                configureActionButtons();
                await initializeOrderDisplay();
            }
        }
        
    } catch (error) {
        // Silently fail refresh
    }
}

/**
 * Global functions for compatibility
 */
window.goBack = handleGoBack;
window.handleGeneratePDF = handleGeneratePDF;

/**
 * Export functions for use by other modules
 */
export {
    initializeViewOrder,
    handleApprovalClick,
    handleRejectionClick,
    handleGeneratePDF,
    handleGoBack,
    refreshOrderData
};