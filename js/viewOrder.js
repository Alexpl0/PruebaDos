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

// Import required modules - Corregir los imports
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
 * Main initialization function
 */
async function initializeViewOrder() {
    try {
        // Show initial loading
        showLoadingSpinner(true);
        
        // Get order data from global configuration
        currentOrder = window.PF_CONFIG?.orderData;
        
        if (!currentOrder) {
            throw new Error('Order data not available');
        }
        
        // Initialize components
        await initializeOrderDisplay();
        setupEventListeners();
        configureActionButtons();
        
        // Hide loading spinner
        showLoadingSpinner(false);
        
        console.log('ViewOrder initialized successfully for order:', currentOrder.id);
        
    } catch (error) {
        console.error('Error initializing view order:', error);
        showErrorMessage('Failed to load order details');
    }
}

/**
 * Initialize the order display with SVG content
 */
async function initializeOrderDisplay() {
    try {
        // Load SVG content using the correct function and container
        await loadAndPopulateSVG(currentOrder, 'svgContent');
        
        // Update page title
        updatePageTitle();
        
    } catch (error) {
        console.error('Error loading order display:', error);
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
 * ACTUALIZADO: Siguiendo exactamente la misma lógica que approval.js
 */
function checkApprovalPermissions(user, order) {
    // Verificar que existan los datos necesarios
    if (!user || !order) {
        console.log('[VIEWORDER DEBUG] Datos de usuario u orden no disponibles');
        return false;
    }

    // Obtener datos necesarios para validación
    const userAuthLevel = Number(user.authorizationLevel || window.authorizationLevel);
    const userPlant = user.plant || window.userPlant;
    const currentApprovalLevel = Number(order.approval_status);
    const requiredLevel = Number(order.required_auth_level || 7);
    const creatorPlant = order.creator_plant;

    console.log('[VIEWORDER DEBUG] Validando permisos:', {
        userAuthLevel,
        userPlant,
        currentApprovalLevel,
        requiredLevel,
        creatorPlant
    });

    // 1. Verificar que no esté completamente aprobada (act_approv >= required_auth_level)
    if (currentApprovalLevel >= requiredLevel) {
        console.log('[VIEWORDER DEBUG] Orden ya completamente aprobada');
        return false;
    }
    
    // 2. Verificar que no esté rechazada (act_approv = 99)
    if (currentApprovalLevel === 99) {
        console.log('[VIEWORDER DEBUG] Orden fue rechazada previamente');
        return false;
    }

    // 3. Verificar nivel de autorización: debe ser exactamente (act_approv + 1)
    const nextRequiredLevel = currentApprovalLevel + 1;
    if (userAuthLevel !== nextRequiredLevel) {
        console.log('[VIEWORDER DEBUG] Nivel de autorización incorrecto:', {
            userLevel: userAuthLevel,
            requiredLevel: nextRequiredLevel
        });
        return false;
    }

    // 4. Verificar planta: debe ser la misma planta O el usuario no debe tener planta (regional)
    if (userPlant !== null && userPlant !== undefined && creatorPlant !== userPlant) {
        console.log('[VIEWORDER DEBUG] Usuario no tiene permisos de planta:', {
            userPlant,
            creatorPlant
        });
        return false;
    }

    console.log('[VIEWORDER DEBUG] ✅ Usuario tiene permisos para aprobar esta orden');
    return true;
}

/**
 * Configure approval/rejection buttons based on user permissions
 * ACTUALIZADO: Configurar correctamente las variables globales para approval.js
 */
function configureActionButtons() {
    const user = window.PF_CONFIG?.user;
    const order = currentOrder;
    
    if (!user || !order) {
        console.log('[VIEWORDER DEBUG] Datos de usuario u orden no disponibles para configurar botones');
        return;
    }

    // IMPORTANTE: Configurar variables globales que necesita approval.js
    window.authorizationLevel = user.authorizationLevel;
    window.userPlant = user.plant;
    window.userID = user.id;
    
    // Configurar sessionStorage con el ID de la orden actual para approval.js
    sessionStorage.setItem('selectedOrderId', order.id.toString());
    
    // Configurar window.allOrders para que approval.js pueda encontrar la orden
    if (!window.allOrders) {
        window.allOrders = [];
    }
    
    // Asegurar que la orden actual esté en allOrders
    const existingOrderIndex = window.allOrders.findIndex(o => o.id === order.id);
    if (existingOrderIndex >= 0) {
        window.allOrders[existingOrderIndex] = order;
    } else {
        window.allOrders.push(order);
    }

    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    // Check if user can approve this order using the corrected logic
    const canApprove = checkApprovalPermissions(user, order);
    
    console.log('[VIEWORDER DEBUG] Configurando botones - canApprove:', canApprove);
    
    if (canApprove) {
        // Show approval buttons
        if (approveBtn) {
            approveBtn.classList.remove('hidden');
            console.log('[VIEWORDER DEBUG] Mostrando botón de aprobar');
        }
        if (rejectBtn) {
            rejectBtn.classList.remove('hidden');
            console.log('[VIEWORDER DEBUG] Mostrando botón de rechazar');
        }
    } else {
        // Hide approval buttons
        if (approveBtn) {
            approveBtn.classList.add('hidden');
            console.log('[VIEWORDER DEBUG] Ocultando botón de aprobar');
        }
        if (rejectBtn) {
            rejectBtn.classList.add('hidden');
            console.log('[VIEWORDER DEBUG] Ocultando botón de rechazar');
        }
    }
}

/**
 * Handle approval button click
 * ACTUALIZADO: Simplificado para usar directamente approval.js
 */
async function handleApprovalClick(event) {
    event.preventDefault();
    
    if (isLoading) {
        console.log('[VIEWORDER DEBUG] Ya se está procesando, ignorando clic');
        return;
    }
    
    try {
        isLoading = true;
        
        console.log('[VIEWORDER DEBUG] Iniciando proceso de aprobación desde viewOrder');
        
        // Asegurar que los datos estén actualizados
        sessionStorage.setItem('selectedOrderId', currentOrder.id.toString());
        
        // Use the approval module - que ya tiene toda la lógica correcta
        await handleApprove();
        
        // Refresh order data after approval to update the UI
        await refreshOrderData();
        
        console.log('[VIEWORDER DEBUG] Proceso de aprobación completado desde viewOrder');
        
    } catch (error) {
        console.error('[VIEWORDER DEBUG] Error durante approval:', error);
        showErrorMessage('Failed to approve order: ' + error.message);
    } finally {
        isLoading = false;
    }
}

/**
 * Handle rejection button click
 * ACTUALIZADO: Simplificado para usar directamente approval.js
 */
async function handleRejectionClick(event) {
    event.preventDefault();
    
    if (isLoading) {
        console.log('[VIEWORDER DEBUG] Ya se está procesando, ignorando clic');
        return;
    }
    
    try {
        isLoading = true;
        
        console.log('[VIEWORDER DEBUG] Iniciando proceso de rechazo desde viewOrder');
        
        // Asegurar que los datos estén actualizados
        sessionStorage.setItem('selectedOrderId', currentOrder.id.toString());
        
        // Use the approval module - que ya tiene toda la lógica correcta
        await handleReject();
        
        // Refresh order data after rejection to update the UI
        await refreshOrderData();
        
        console.log('[VIEWORDER DEBUG] Proceso de rechazo completado desde viewOrder');
        
    } catch (error) {
        console.error('[VIEWORDER DEBUG] Error durante rejection:', error);
        showErrorMessage('Failed to reject order: ' + error.message);
    } finally {
        isLoading = false;
    }
}

/**
 * Handle PDF generation
 */
async function handleGeneratePDF(event) {
    event.preventDefault();
    
    if (isLoading) return;
    
    try {
        isLoading = true;
        
        // Show loading
        showLoading('Generating PDF', 'Please wait while we create your document...');
        
        // Generate PDF using the svgOrders module
        const fileName = await generatePDF(currentOrder, `Order_${currentOrder.id}`);
        
        // Show success message
        Swal.fire({
            icon: 'success',
            title: 'PDF Generated',
            text: `${fileName} has been downloaded successfully`,
            confirmButtonColor: '#28a745'
        });
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showErrorMessage('Failed to generate PDF');
    } finally {
        isLoading = false;
    }
}

/**
 * Handle back navigation
 */
function handleGoBack() {
    // Always redirect to orders page
    window.location.href = 'orders.php';
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
    // Escape key - go back
    if (event.key === 'Escape') {
        handleGoBack();
    }
    
    // Ctrl+P - generate PDF
    if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        handleGeneratePDF(event);
    }
    
    // Ctrl+Enter - approve (if allowed)
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
 * ACTUALIZADO: Mejorado para mantener sincronización con approval.js
 */
async function refreshOrderData() {
    try {
        console.log('[VIEWORDER DEBUG] Refrescando datos de la orden:', currentOrder.id);
        
        const response = await fetch(`${window.PF_CONFIG.baseURL}dao/orders/get_order.php?id=${currentOrder.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch updated order data');
        }
        
        const updatedOrder = await response.json();
        
        if (updatedOrder.success && updatedOrder.data) {
            // Update current order data
            currentOrder = updatedOrder.data;
            window.PF_CONFIG.orderData = currentOrder;
            
            // Update window.allOrders to keep it synchronized
            const existingOrderIndex = window.allOrders?.findIndex(o => o.id === currentOrder.id);
            if (existingOrderIndex >= 0) {
                window.allOrders[existingOrderIndex] = currentOrder;
            } else {
                if (!window.allOrders) window.allOrders = [];
                window.allOrders.push(currentOrder);
            }
            
            // Reconfigure buttons with updated data
            configureActionButtons();
            
            // Update display
            await initializeOrderDisplay();
            
            console.log('[VIEWORDER DEBUG] Datos de orden refrescados exitosamente');
        }
        
    } catch (error) {
        console.error('[VIEWORDER DEBUG] Error refreshing order data:', error);
    }
}

/**
 * Global functions for compatibility
 */
window.goBack = handleGoBack;
window.generatePDF = handleGeneratePDF;

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