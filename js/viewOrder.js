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
 * Configure approval/rejection buttons based on user permissions
 */
function configureActionButtons() {
    const user = window.PF_CONFIG?.user;
    const order = currentOrder;
    
    if (!user || !order) return;
    
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    // Check if user can approve this order
    const canApprove = checkApprovalPermissions(user, order);
    
    if (canApprove) {
        // Show approval buttons
        if (approveBtn) {
            approveBtn.classList.remove('hidden');
        }
        if (rejectBtn) {
            rejectBtn.classList.remove('hidden');
        }
    } else {
        // Hide approval buttons
        if (approveBtn) {
            approveBtn.classList.add('hidden');
        }
        if (rejectBtn) {
            rejectBtn.classList.add('hidden');
        }
    }
}

/**
 * Check if user has permission to approve this order
 */
function checkApprovalPermissions(user, order) {
    // Users with authorization level 0 cannot approve
    if (user.authorizationLevel === 0) {
        return false;
    }
    
    // Check plant permission
    if (user.plant && order.creator_plant && user.plant !== order.creator_plant) {
        return false;
    }
    
    // Check if order is in a state that can be approved
    const approvableStatuses = [1, 2, 3, 4]; // Adjust based on your status IDs
    if (!approvableStatuses.includes(parseInt(order.statusid))) {
        return false;
    }
    
    // Check authorization level vs order cost
    if (order.euros && user.authorizationLevel) {
        // Define cost thresholds based on authorization level
        const costThresholds = {
            1: 1000,   // Level 1 can approve up to 1000 EUR
            2: 5000,   // Level 2 can approve up to 5000 EUR
            3: 15000,  // Level 3 can approve up to 15000 EUR
            4: 50000,  // Level 4 can approve up to 50000 EUR
            5: Infinity // Level 5 can approve any amount
        };
        
        const maxAmount = costThresholds[user.authorizationLevel] || 0;
        if (parseFloat(order.euros) > maxAmount) {
            return false;
        }
    }
    
    return true;
}

/**
 * Handle approval button click
 */
async function handleApprovalClick(event) {
    event.preventDefault();
    
    if (isLoading) return;
    
    try {
        isLoading = true;
        
        // Use the approval module
        await handleApprove();
        
        // Refresh order data after approval
        await refreshOrderData();
        
    } catch (error) {
        console.error('Error during approval:', error);
        showErrorMessage('Failed to approve order');
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
        
        // Use the approval module
        await handleReject();
        
        // Refresh order data after rejection
        await refreshOrderData();
        
    } catch (error) {
        console.error('Error during rejection:', error);
        showErrorMessage('Failed to reject order');
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
        const fileName = await svgGeneratePDF(currentOrder, `Order_${currentOrder.id}`);
        
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
    // Try to go back in history first
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // Fallback to orders page
        window.location.href = 'orders.php';
    }
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
 */
async function refreshOrderData() {
    try {
        const response = await fetch(`${window.PF_CONFIG.baseURL}dao/orders/get_order.php?id=${currentOrder.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch updated order data');
        }
        
        const updatedOrder = await response.json();
        
        if (updatedOrder.success && updatedOrder.data) {
            // Update current order data
            currentOrder = updatedOrder.data;
            window.PF_CONFIG.orderData = currentOrder;
            window.allOrders = [currentOrder];
            
            // Reconfigure buttons
            configureActionButtons();
            
            // Update display
            await initializeOrderDisplay();
            
            console.log('Order data refreshed successfully');
        }
        
    } catch (error) {
        console.error('Error refreshing order data:', error);
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