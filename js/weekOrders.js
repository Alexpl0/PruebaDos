/**
 * weekOrders.js - Premium Freight Weekly Orders Viewer
 * 
 * This module handles the weekly orders view functionality including:
 * - Loading orders data from daoPremiumFreight.php endpoint
 * - Filtering pending orders for current user
 * - Loading and displaying SVG content for multiple orders
 * - Individual order approval/rejection functionality
 * - Bulk operations (approve all, download all)
 * - PDF generation for individual orders
 * - Navigation controls
 */

// Import required modules - same as view_order.php
import { loadAndPopulateSVG, generatePDF as svgGeneratePDF } from './svgOrders.js';
import { handleApprove, handleReject } from './approval.js';

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
 * Load orders data from the existing daoPremiumFreight.php endpoint
 */
async function loadOrdersData() {
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
            throw new Error('Invalid JSON response from server: ' + parseError.message);
        }
        
        if (!data.status || data.status !== 'success' || !Array.isArray(data.data)) {
            throw new Error('Invalid data structure received from server');
        }
        
        return data.data;
        
    } catch (error) {
        console.error('Error loading orders:', error);
        throw error;
    }
}

/**
 * Filter orders to show only those pending approval by current user
 */
function filterPendingOrders(allOrders) {
    const user = window.PF_CONFIG.user;
    const userAuthLevel = user.authorizationLevel;
    const userPlant = user.plant !== null && user.plant !== undefined ? parseInt(user.plant, 10) : null;
    
    return allOrders.filter(order => {
        // Convert to numbers for proper comparison
        const currentApprovalLevel = Number(order.approval_status || 0);
        const requiredLevel = Number(order.required_auth_level || 7);
        const creatorPlant = parseInt(order.creator_plant, 10) || 0;
        const nextRequiredLevel = currentApprovalLevel + 1;
        
        // 1. Check if order needs approval at user's authorization level
        if (userAuthLevel !== nextRequiredLevel) {
            return false;
        }
        
        // 2. Check if not fully approved yet
        if (currentApprovalLevel >= requiredLevel) {
            return false;
        }
        
        // 3. Check if not rejected
        if (currentApprovalLevel === 99) {
            return false;
        }
        
        // 4. Check plant permissions
        if (userPlant !== null && userPlant !== undefined && creatorPlant !== userPlant) {
            return false;
        }
        
        return true;
    });
}

/**
 * Main initialization function
 */
async function initializeWeeklyOrders() {
    try {
        // Show initial loading
        showMainLoading(true);
        
        // Load all orders from endpoint
        const allOrders = await loadOrdersData();
        
        // Filter to get only pending orders for current user
        pendingOrders = filterPendingOrders(allOrders);
        
        // Update global variables for compatibility
        window.PF_CONFIG.pendingOrders = pendingOrders;
        window.allOrders = pendingOrders;
        window.originalOrders = pendingOrders;
        
        // Update UI
        updateOrderCount();
        updateActionButtons();
        
        if (pendingOrders.length === 0) {
            showNoOrdersMessage();
        } else {
            // Render orders
            await renderOrders();
            
            // Initialize SVG content for all orders
            await initializeAllOrderDisplays();
        }
        
        // Hide main loading
        showMainLoading(false);
        
    } catch (error) {
        console.error('Error initializing weekly orders:', error);
        showMainLoading(false);
        showErrorMessage('Error loading orders: ' + error.message);
    }
}

/**
 * Update order count in header
 */
function updateOrderCount() {
    const orderCountElement = document.getElementById('orderCount');
    if (orderCountElement) {
        const count = pendingOrders.length;
        orderCountElement.textContent = count === 0 ? 
            'No orders pending your approval' : 
            `${count} order${count === 1 ? '' : 's'} pending your approval`;
    }
}

/**
 * Update action buttons visibility
 */
function updateActionButtons() {
    const approveAllBtn = document.querySelector('.btn-approve-all');
    const downloadAllBtn = document.querySelector('.btn-download-all');
    
    if (pendingOrders.length > 1) {
        if (approveAllBtn) approveAllBtn.classList.remove('hidden');
        if (downloadAllBtn) downloadAllBtn.classList.remove('hidden');
    } else {
        if (approveAllBtn) approveAllBtn.classList.add('hidden');
        if (downloadAllBtn) downloadAllBtn.classList.add('hidden');
    }
}

/**
 * Show main loading spinner
 */
function showMainLoading(show) {
    const loadingElement = document.getElementById('loadingOrders');
    const contentElement = document.getElementById('ordersContent');
    
    if (show) {
        if (loadingElement) loadingElement.classList.remove('hidden');
        if (contentElement) contentElement.classList.add('hidden');
    } else {
        if (loadingElement) loadingElement.classList.add('hidden');
        if (contentElement) contentElement.classList.remove('hidden');
    }
}

/**
 * Show no orders message
 */
function showNoOrdersMessage() {
    const contentElement = document.getElementById('ordersContent');
    if (contentElement) {
        contentElement.innerHTML = `
            <div class="no-orders-message">
                <div class="no-orders-content">
                    <i class="fas fa-check-circle"></i>
                    <h3>No Pending Orders</h3>
                    <p>You have no orders pending approval at this time.</p>
                    <button class="action-btn-compact btn-back" onclick="goBack()">
                        <i class="fas fa-arrow-left"></i>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        `;
        contentElement.classList.remove('hidden');
    }
}

/**
 * Render all orders
 */
async function renderOrders() {
    const contentElement = document.getElementById('ordersContent');
    if (!contentElement) return;
    
    let html = '';
    
    for (const order of pendingOrders) {
        html += `
            <div class="order-card" data-order-id="${order.id}">
                <!-- Order Header -->
                <div class="order-card-header">
                    <div class="order-card-info">
                        <h3 class="order-card-title">Order #${order.id}</h3>
                        <p class="order-card-subtitle">
                            Created by ${escapeHtml(order.creator_name || 'Unknown')} • 
                            €${Number(order.cost_euros || 0).toFixed(2)} • 
                            ${formatDate(order.date)}
                        </p>
                    </div>
                    <div class="order-card-actions">
                        <button class="action-btn-compact btn-pdf" onclick="handleOrderPDF(${order.id})">
                            <i class="fas fa-file-pdf"></i>
                            PDF
                        </button>
                        <button class="action-btn-compact btn-approve" onclick="handleOrderApprove(${order.id})">
                            <i class="fas fa-check-circle"></i>
                            Approve
                        </button>
                        <button class="action-btn-compact btn-reject" onclick="handleOrderReject(${order.id})">
                            <i class="fas fa-times-circle"></i>
                            Reject
                        </button>
                    </div>
                </div>
                
                <!-- SVG Container -->
                <div class="svg-container">
                    <div class="svg-content">
                        <div class="loading-spinner" id="loadingSpinner-${order.id}">
                            <div class="spinner"></div>
                            Loading order details...
                        </div>
                        <div id="svgContent-${order.id}" class="hidden"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    contentElement.innerHTML = html;
    contentElement.classList.remove('hidden');
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
 * Handle individual order approval - SAME LOGIC AS viewOrder.js
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
 * Handle individual order rejection - SAME LOGIC AS viewOrder.js
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
 * Handle PDF generation for individual order - SAME LOGIC AS viewOrder.js
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
    window.location.href = 'orders.php';
}

window.goBack = handleGoBack;

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
 * Utility functions
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, function(m) { return map[m]; }) : '';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (error) {
        return dateString;
    }
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