/**
 * weekOrders.js - Premium Freight Weekly Orders Viewer
 * 
 * This module handles the weekly orders view functionality including:
 * - Loading and displaying SVG content for multiple orders
 * - Individual order approval/rejection functionality
 * - Bulk operations (approve all, download all)
 * - PDF generation for individual orders
 * - Navigation controls
 */

// Import required modules - same as view_order.php
import { loadAndPopulateSVG, generatePDF as svgGeneratePDF } from './svgOrders.js';
import { handleApprove, handleReject } from './approval.js';
import { showLoading } from './utils.js';

/**
 * Configuration and global variables
 */
let pendingOrders = [];
let isLoading = false;
let processedOrders = new Set();

/**
 * Initialize the weekly orders page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeWeeklyOrders();
});

/**
 * Main initialization function
 */
async function initializeWeeklyOrders() {
    try {
        // Get pending orders from global config
        pendingOrders = window.PF_CONFIG.pendingOrders || [];
        
        if (pendingOrders.length === 0) {
            console.log('No pending orders to display');
            return;
        }
        
        // Initialize SVG content for all orders
        await initializeAllOrderDisplays();
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Error initializing weekly orders:', error);
        showErrorMessage('Error loading orders: ' + error.message);
    }
}

/**
 * Initialize SVG content for all orders
 */
async function initializeAllOrderDisplays() {
    const promises = pendingOrders.map(order => initializeOrderDisplay(order));
    await Promise.all(promises);
}

/**
 * Initialize SVG display for a single order
 */
async function initializeOrderDisplay(order) {
    try {
        const containerId = `svgContent-${order.id}`;
        const spinnerId = `loadingSpinner-${order.id}`;
        
        // Show loading spinner
        showLoadingSpinner(true, spinnerId, containerId);
        
        // Load SVG content using the same function as view_order.php
        await loadAndPopulateSVG(order, containerId);
        
        // Hide loading spinner and show content
        showLoadingSpinner(false, spinnerId, containerId);
        
    } catch (error) {
        console.error(`Error loading SVG for order ${order.id}:`, error);
        
        const container = document.getElementById(`svgContent-${order.id}`);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; color: #dc3545;"></i>
                    <h3>Error Loading Order</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
            container.classList.remove('hidden');
        }
        
        const spinner = document.getElementById(`loadingSpinner-${order.id}`);
        if (spinner) {
            spinner.classList.add('hidden');
        }
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Back button
    const backBtn = document.querySelector('.btn-back');
    if (backBtn) {
        backBtn.addEventListener('click', handleGoBack);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Handle individual order approval
 */
window.handleOrderApprove = async function(orderId) {
    if (isLoading || processedOrders.has(orderId)) {
        return;
    }
    
    try {
        isLoading = true;
        
        const order = pendingOrders.find(o => o.id === orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        
        // Set up session storage for approval.js
        sessionStorage.setItem('selectedOrderId', orderId.toString());
        
        // Update allOrders for approval.js compatibility
        if (!window.allOrders) {
            window.allOrders = [];
        }
        
        const existingOrderIndex = window.allOrders.findIndex(o => o.id === orderId);
        if (existingOrderIndex >= 0) {
            window.allOrders[existingOrderIndex] = order;
        } else {
            window.allOrders.push(order);
        }
        
        // Call the same approval function as view_order.php
        await handleApprove();
        
        // Mark order as processed
        markOrderAsProcessed(orderId, 'approve');
        
    } catch (error) {
        showErrorMessage('Failed to approve order: ' + error.message);
    } finally {
        isLoading = false;
    }
};

/**
 * Handle individual order rejection
 */
window.handleOrderReject = async function(orderId) {
    if (isLoading || processedOrders.has(orderId)) {
        return;
    }
    
    try {
        isLoading = true;
        
        const order = pendingOrders.find(o => o.id === orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        
        // Set up session storage for approval.js
        sessionStorage.setItem('selectedOrderId', orderId.toString());
        
        // Update allOrders for approval.js compatibility
        if (!window.allOrders) {
            window.allOrders = [];
        }
        
        const existingOrderIndex = window.allOrders.findIndex(o => o.id === orderId);
        if (existingOrderIndex >= 0) {
            window.allOrders[existingOrderIndex] = order;
        } else {
            window.allOrders.push(order);
        }
        
        // Call the same rejection function as view_order.php
        await handleReject();
        
        // Mark order as processed
        markOrderAsProcessed(orderId, 'reject');
        
    } catch (error) {
        showErrorMessage('Failed to reject order: ' + error.message);
    } finally {
        isLoading = false;
    }
};

/**
 * Handle PDF generation for individual order
 */
window.handleOrderPDF = async function(orderId) {
    if (isLoading) return;
    
    try {
        isLoading = true;
        
        const order = pendingOrders.find(o => o.id === orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        
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

        // Use the same PDF generation function as view_order.php
        const fileName = await svgGeneratePDF(order);

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
    } finally {
        isLoading = false;
    }
};

/**
 * Handle approve all orders
 */
window.handleApproveAll = async function() {
    const pendingOrdersList = pendingOrders.filter(order => !processedOrders.has(order.id));
    
    if (pendingOrdersList.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'No Pending Orders',
            text: 'All orders have been processed already.',
            customClass: { container: 'swal-on-top' }
        });
        return;
    }
    
    const result = await Swal.fire({
        title: 'Approve All Orders?',
        text: `This will approve ${pendingOrdersList.length} orders. This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Yes, approve all!',
        cancelButtonText: 'Cancel',
        customClass: { container: 'swal-on-top' }
    });

    if (result.isConfirmed) {
        for (const order of pendingOrdersList) {
            try {
                await window.handleOrderApprove(order.id);
            } catch (error) {
                console.error(`Error approving order ${order.id}:`, error);
            }
        }
    }
};

/**
 * Handle download all PDFs
 */
window.handleDownloadAll = async function() {
    if (pendingOrders.length === 0) {
        return;
    }
    
    const result = await Swal.fire({
        title: 'Download All Orders?',
        text: `This will generate PDFs for ${pendingOrders.length} orders. This may take a few moments.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#034C8C',
        confirmButtonText: 'Yes, download all!',
        cancelButtonText: 'Cancel',
        customClass: { container: 'swal-on-top' }
    });

    if (result.isConfirmed) {
        try {
            Swal.fire({
                title: 'Generating PDFs...',
                text: 'Please wait while we generate all PDFs.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
                customClass: { container: 'swal-on-top' }
            });

            for (let i = 0; i < pendingOrders.length; i++) {
                const order = pendingOrders[i];
                await svgGeneratePDF(order);
                
                const progress = ((i + 1) / pendingOrders.length) * 100;
                Swal.update({
                    text: `Generated ${i + 1} of ${pendingOrders.length} PDFs (${Math.round(progress)}%)`
                });
            }

            Swal.fire({
                icon: 'success',
                title: 'All PDFs Downloaded!',
                text: `Successfully generated ${pendingOrders.length} PDF files.`,
                timer: 3000,
                timerProgressBar: true,
                customClass: { container: 'swal-on-top' }
            });
        } catch (error) {
            console.error('Error generating PDFs:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to generate some PDFs. Please try again.',
                customClass: { container: 'swal-on-top' }
            });
        }
    }
};

/**
 * Mark order as processed
 */
function markOrderAsProcessed(orderId, action) {
    processedOrders.add(orderId);
    
    const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
    if (orderCard) {
        orderCard.classList.add('processed', action === 'approve' ? 'approved' : 'rejected');
        
        // Add status indicator
        const orderHeader = orderCard.querySelector('.order-card-header');
        const statusIndicator = document.createElement('div');
        statusIndicator.className = `status-indicator status-${action}d`;
        statusIndicator.textContent = action === 'approve' ? 'APPROVED' : 'REJECTED';
        orderHeader.style.position = 'relative';
        orderHeader.appendChild(statusIndicator);
        
        // Disable action buttons
        const actionButtons = orderCard.querySelectorAll('.btn-approve, .btn-reject');
        actionButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }
}

/**
 * Handle back navigation
 */
function handleGoBack() {
    window.location.href = 'dashboard.php';
}

window.goBack = handleGoBack;

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
    if (event.key === 'Escape') {
        handleGoBack();
    }
}

/**
 * Show/hide loading spinner for specific order
 */
function showLoadingSpinner(show, spinnerId, containerId) {
    const spinner = document.getElementById(spinnerId);
    const content = document.getElementById(containerId);
    
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
        confirmButtonColor: '#dc3545',
        customClass: { container: 'swal-on-top' }
    });
}

/**
 * Export functions for use by other modules
 */
export {
    initializeWeeklyOrders,
    handleOrderApprove,
    handleOrderReject,
    handleOrderPDF,
    handleApproveAll,
    handleDownloadAll,
    handleGoBack
};