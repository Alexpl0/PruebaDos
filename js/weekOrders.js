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

// Import required modules - but NOT approval.js since it expects different DOM
import { loadAndPopulateSVG, generatePDF as svgGeneratePDF } from './svgOrders.js';

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
 * Filter and sort orders to show only those pending approval by current user
 */
function filterPendingOrders(allOrders) {
    const user = window.PF_CONFIG.user;
    const userAuthLevel = user.authorizationLevel;
    const userPlant = user.plant !== null && user.plant !== undefined ? parseInt(user.plant, 10) : null;
    
    console.log('[Filter Debug] Filtering orders:', {
        totalOrders: allOrders.length,
        userAuthLevel,
        userPlant,
        sampleOrder: allOrders[0] ? {
            id: allOrders[0].id,
            approval_status: allOrders[0].approval_status,
            required_auth_level: allOrders[0].required_auth_level,
            creator_plant: allOrders[0].creator_plant,
            hasDescription: !!allOrders[0].description,
            hasCarrier: !!allOrders[0].carrier,
            hasLocations: !!(allOrders[0].origin_company_name && allOrders[0].destiny_company_name)
        } : 'No orders'
    });
    
    const filtered = allOrders.filter(order => {
        // Convert to numbers for proper comparison
        const currentApprovalLevel = Number(order.approval_status || 0);
        const requiredLevel = Number(order.required_auth_level || 7);
        const creatorPlant = parseInt(order.creator_plant, 10) || 0;
        const nextRequiredLevel = currentApprovalLevel + 1;
        
        // Debug individual order
        const reasons = [];
        
        // 1. Check if order needs approval at user's authorization level
        if (userAuthLevel !== nextRequiredLevel) {
            reasons.push(`Auth level mismatch: user(${userAuthLevel}) !== required(${nextRequiredLevel})`);
        }
        
        // 2. Check if not fully approved yet
        if (currentApprovalLevel >= requiredLevel) {
            reasons.push(`Already approved: current(${currentApprovalLevel}) >= required(${requiredLevel})`);
        }
        
        // 3. Check if not rejected
        if (currentApprovalLevel === 99) {
            reasons.push('Order is rejected (status 99)');
        }
        
        // 4. Check plant permissions
        if (userPlant !== null && userPlant !== undefined && creatorPlant !== userPlant) {
            reasons.push(`Plant mismatch: user(${userPlant}) !== creator(${creatorPlant})`);
        }
        
        const include = reasons.length === 0;
        
        if (!include) {
            console.log(`[Filter Debug] Excluding order ${order.id}:`, reasons);
        }
        
        return include;
    });
    
    // NUEVO: Ordenar las órdenes filtradas por fecha (más antigua primero)
    const sorted = filtered.sort((a, b) => {
        // Convertir fechas a objetos Date para comparación
        const dateA = new Date(a.date || '1970-01-01');
        const dateB = new Date(b.date || '1970-01-01');
        
        // Ordenar por fecha ascendente (más antigua primero)
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }
        
        // Si las fechas son iguales, ordenar por ID ascendente
        return (a.id || 0) - (b.id || 0);
    });
    
    console.log('[Filter Debug] Filter and sort result:', {
        originalCount: allOrders.length,
        filteredCount: sorted.length,
        filteredIds: sorted.map(o => ({ id: o.id, date: o.date })),
        sortOrder: 'Oldest first (ASC)'
    });
    
    return sorted;
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
        // CORREGIDO: Usar los campos correctos del endpoint daoPremiumFreight.php
        const creatorName = escapeHtml(order.creator_name || 'Unknown');
        const creatorRole = escapeHtml(order.creator_role || '');
        const costEuros = Number(order.cost_euros || 0).toFixed(2);
        const orderDate = formatDate(order.date);
        const area = escapeHtml(order.area || '');
        
        html += `
            <div class="order-card" data-order-id="${order.id}">
                <!-- Order Header -->
                <div class="order-card-header">
                    <div class="order-card-info">
                        <h3 class="order-card-title">Order #${order.id}</h3>
                        <p class="order-card-subtitle">
                            Created by ${creatorName} (${area}) • 
                            ${orderDate}
                        </p>
                    </div>
                    <div class="order-card-actions">
                        <button class="action-btn-compact btn-pdf" onclick="handleOrderPDF(${order.id})">
                            <i class="fas fa-file-pdf"></i>
                            <span>PDF</span>
                        </button>
                        <button class="action-btn-compact btn-approve" onclick="handleOrderApprove(${order.id})">
                            <i class="fas fa-check-circle"></i>
                            <span>Approve</span>
                        </button>
                        <button class="action-btn-compact btn-reject" onclick="handleOrderReject(${order.id})">
                            <i class="fas fa-times-circle"></i>
                            <span>Reject</span>
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
        
        console.log(`[SVG Debug] Inicializando SVG para orden ${order.id}:`, {
            containerId,
            orderData: {
                id: order.id,
                creator_name: order.creator_name,
                cost_euros: order.cost_euros,
                date: order.date,
                description: order.description?.substring(0, 50) + '...',
                carrier: order.carrier,
                origin_company_name: order.origin_company_name,
                destiny_company_name: order.destiny_company_name
            }
        });
        
        // Show loading spinner
        showLoadingSpinner(true, spinnerId, containerId);
        
        // CORREGIDO: Verificar que el contenedor existe antes de cargar
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container ${containerId} not found in DOM`);
        }
        
        // Load SVG content using the same function as view_order.php
        await loadAndPopulateSVG(order, containerId);
        
        console.log(`[SVG Debug] SVG cargado exitosamente para orden ${order.id}`);
        
        // Hide loading spinner and show content
        showLoadingSpinner(false, spinnerId, containerId);
        
    } catch (error) {
        console.error(`[SVG Error] Error loading SVG for order ${order.id}:`, error);
        
        const container = document.getElementById(`svgContent-${order.id}`);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; color: #dc3545;"></i>
                    <h3>Error Loading Order</h3>
                    <p>${error.message}</p>
                    <button onclick="retryLoadOrder(${order.id})" class="btn btn-primary">Retry</button>
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
 * CORREGIDO: Handle individual order approval - STANDALONE VERSION for weekOrders
 */
async function handleOrderApprove(orderId) {
    if (isLoading || processedOrders.has(orderId)) {
        return;
    }
    
    try {
        isLoading = true;
        
        const order = pendingOrders.find(o => o.id === orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        
        // Show confirmation dialog
        const result = await Swal.fire({
            title: 'Approve Order?',
            html: `
                <p>Are you sure you want to approve order <strong>#${order.id}</strong>?</p>
                <p><small>Created by: ${order.creator_name}</small></p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            confirmButtonText: 'Yes, approve it!',
            cancelButtonText: 'Cancel',
            customClass: { container: 'swal-on-top' }
        });

        if (!result.isConfirmed) {
            return;
        }

        // Show processing dialog
        Swal.fire({
            title: 'Processing Approval...',
            text: 'Please wait while we process your approval.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            customClass: { container: 'swal-on-top' }
        });
        
        // CORREGIDO: Call the approval endpoint directly
        const approvalResponse = await fetch(`${window.PF_CONFIG.baseURL}dao/approvals/approve_order.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                order_id: orderId,
                user_id: window.PF_CONFIG.user.id,
                action: 'approve'
            })
        });

        if (!approvalResponse.ok) {
            throw new Error(`HTTP error! status: ${approvalResponse.status}`);
        }

        const approvalResult = await approvalResponse.json();
        
        if (approvalResult.status !== 'success') {
            throw new Error(approvalResult.message || 'Failed to approve order');
        }

        // Mark order as processed
        markOrderAsProcessed(orderId, 'approve');

        // Show success message
        Swal.fire({
            icon: 'success',
            title: 'Order Approved!',
            text: `Order #${order.id} has been approved successfully.`,
            timer: 3000,
            timerProgressBar: true,
            customClass: { container: 'swal-on-top' }
        });
        
    } catch (error) {
        console.error('Error approving order:', error);
        Swal.fire({
            icon: 'error',
            title: 'Approval Failed',
            text: error.message || 'Failed to approve order. Please try again.',
            confirmButtonColor: '#dc3545',
            customClass: { container: 'swal-on-top' }
        });
    } finally {
        isLoading = false;
    }
}

/**
 * CORREGIDO: Handle individual order rejection - STANDALONE VERSION for weekOrders
 */
async function handleOrderReject(orderId) {
    if (isLoading || processedOrders.has(orderId)) {
        return;
    }
    
    try {
        isLoading = true;
        
        const order = pendingOrders.find(o => o.id === orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        
        // Show rejection reason dialog
        const { value: rejectionReason, isConfirmed } = await Swal.fire({
            title: 'Reject Order',
            html: `
                <p>Please provide a reason for rejecting order <strong>#${order.id}</strong>:</p>
                <textarea 
                    id="rejection-reason" 
                    class="swal2-textarea" 
                    placeholder="Enter rejection reason..."
                    style="min-height: 100px; width: 100%; margin-top: 10px;"
                ></textarea>
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

        if (!isConfirmed || !rejectionReason) {
            return;
        }

        // Show processing dialog
        Swal.fire({
            title: 'Processing Rejection...',
            text: 'Please wait while we process your rejection.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            customClass: { container: 'swal-on-top' }
        });
        
        // CORREGIDO: Call the rejection endpoint directly
        const rejectionResponse = await fetch(`${window.PF_CONFIG.baseURL}dao/approvals/reject_order.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                order_id: orderId,
                user_id: window.PF_CONFIG.user.id,
                rejection_reason: rejectionReason,
                action: 'reject'
            })
        });

        if (!rejectionResponse.ok) {
            throw new Error(`HTTP error! status: ${rejectionResponse.status}`);
        }

        const rejectionResult = await rejectionResponse.json();
        
        if (rejectionResult.status !== 'success') {
            throw new Error(rejectionResult.message || 'Failed to reject order');
        }

        // Mark order as processed
        markOrderAsProcessed(orderId, 'reject');

        // Show success message
        Swal.fire({
            icon: 'success',
            title: 'Order Rejected',
            text: `Order #${order.id} has been rejected.`,
            timer: 3000,
            timerProgressBar: true,
            customClass: { container: 'swal-on-top' }
        });
        
    } catch (error) {
        console.error('Error rejecting order:', error);
        Swal.fire({
            icon: 'error',
            title: 'Rejection Failed',
            text: error.message || 'Failed to reject order. Please try again.',
            confirmButtonColor: '#dc3545',
            customClass: { container: 'swal-on-top' }
        });
    } finally {
        isLoading = false;
    }
}

/**
 * Retry loading a specific order's SVG
 */
window.retryLoadOrder = async function(orderId) {
    const order = pendingOrders.find(o => o.id === orderId);
    if (order) {
        await initializeOrderDisplay(order);
    }
};

/**
 * Handle PDF generation for individual order - SAME LOGIC AS viewOrder.js
 */
async function handleOrderPDF(orderId) {
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
}

/**
 * Handle approve all orders
 */
async function handleApproveAll() {
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
        text: `This will approve ${pendingOrdersList.length} remaining orders. This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Yes, approve all!',
        cancelButtonText: 'Cancel',
        customClass: { container: 'swal-on-top' }
    });

    if (result.isConfirmed) {
        // Mostrar progreso
        Swal.fire({
            title: 'Approving Orders...',
            text: `Processing 0 of ${pendingOrdersList.length} orders...`,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            customClass: { container: 'swal-on-top' }
        });

        let processed = 0;
        for (const order of pendingOrdersList) {
            try {
                // Procesar la aprobación sin mostrar dialogs individuales
                const approvalResponse = await fetch(`${window.PF_CONFIG.baseURL}dao/approvals/approve_order.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        order_id: order.id,
                        user_id: window.PF_CONFIG.user.id,
                        action: 'approve'
                    })
                });

                if (approvalResponse.ok) {
                    const result = await approvalResponse.json();
                    if (result.status === 'success') {
                        markOrderAsProcessed(order.id, 'approve');
                    }
                }
                
                processed++;
                
                // Actualizar progreso
                Swal.update({
                    text: `Processing ${processed} of ${pendingOrdersList.length} orders...`
                });
                
                // Pequeña pausa entre procesamiento
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                console.error(`Error approving order ${order.id}:`, error);
            }
        }

        // Mostrar resultado final
        Swal.fire({
            icon: 'success',
            title: 'Bulk Approval Complete!',
            text: `Successfully processed ${processed} orders.`,
            timer: 3000,
            timerProgressBar: true,
            customClass: { container: 'swal-on-top' }
        });
    }
}

/**
 * Handle download all PDFs
 */
async function handleDownloadAll() {
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
}

/**
 * Mark order as processed and hide its card
 */
function markOrderAsProcessed(orderId, action) {
    processedOrders.add(orderId);
    
    const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
    if (orderCard) {
        // Add status indicator first (visible briefly)
        const orderHeader = orderCard.querySelector('.order-card-header');
        const statusIndicator = document.createElement('div');
        statusIndicator.className = `status-indicator status-${action}d`;
        statusIndicator.textContent = action === 'approve' ? 'APPROVED' : 'REJECTED';
        statusIndicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: ${action === 'approve' ? '#10B981' : '#dc3545'};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
            z-index: 10;
        `;
        orderHeader.style.position = 'relative';
        orderHeader.appendChild(statusIndicator);
        
        // Add processed class for styling
        orderCard.classList.add('processed', action === 'approve' ? 'approved' : 'rejected');
        
        // Disable action buttons immediately
        const actionButtons = orderCard.querySelectorAll('.btn-approve, .btn-reject');
        actionButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
        
        // NUEVO: Animar la tarjeta y luego ocultarla
        setTimeout(() => {
            // Aplicar animación de desvanecimiento
            orderCard.style.transition = 'all 0.5s ease-out';
            orderCard.style.transform = 'scale(0.95)';
            orderCard.style.opacity = '0.7';
            
            // Después de la animación, ocultar completamente
            setTimeout(() => {
                orderCard.style.maxHeight = orderCard.offsetHeight + 'px';
                orderCard.style.overflow = 'hidden';
                
                setTimeout(() => {
                    orderCard.style.transition = 'all 0.3s ease-out';
                    orderCard.style.maxHeight = '0px';
                    orderCard.style.marginBottom = '0px';
                    orderCard.style.paddingTop = '0px';
                    orderCard.style.paddingBottom = '0px';
                    orderCard.style.opacity = '0';
                    
                    // Finalmente, ocultar completamente el elemento
                    setTimeout(() => {
                        orderCard.style.display = 'none';
                        
                        // Actualizar contadores después de ocultar
                        updateOrderCountAfterProcessing();
                        
                    }, 300);
                }, 50);
            }, 500);
        }, 1500); // Mostrar el indicador por 1.5 segundos antes de ocultar
    }
}

/**
 * NUEVO: Actualizar contadores después de procesar órdenes
 */
function updateOrderCountAfterProcessing() {
    const remainingOrders = pendingOrders.filter(order => !processedOrders.has(order.id));
    
    // Actualizar el contador en el header
    const orderCountElement = document.getElementById('orderCount');
    if (orderCountElement) {
        const count = remainingOrders.length;
        orderCountElement.textContent = count === 0 ? 
            'All orders have been processed!' : 
            `${count} order${count === 1 ? '' : 's'} remaining`;
    }
    
    // Actualizar visibilidad de botones de acción masiva
    const approveAllBtn = document.querySelector('.btn-approve-all');
    const downloadAllBtn = document.querySelector('.btn-download-all');
    
    if (remainingOrders.length <= 1) {
        if (approveAllBtn) approveAllBtn.classList.add('hidden');
    }
    
    if (remainingOrders.length === 0) {
        if (downloadAllBtn) downloadAllBtn.classList.add('hidden');
        
        // Mostrar mensaje de completado si no quedan órdenes
        setTimeout(() => {
            showAllOrdersProcessedMessage();
        }, 500);
    }
}

/**
 * NUEVO: Mostrar mensaje cuando todas las órdenes han sido procesadas
 */
function showAllOrdersProcessedMessage() {
    const contentElement = document.getElementById('ordersContent');
    if (contentElement && processedOrders.size === pendingOrders.length) {
        
        // Verificar si aún hay tarjetas visibles
        const visibleCards = contentElement.querySelectorAll('.order-card:not([style*="display: none"])');
        
        if (visibleCards.length === 0) {
            contentElement.innerHTML = `
                <div class="no-orders-message">
                    <div class="no-orders-content">
                        <i class="fas fa-check-circle" style="color: #10B981;"></i>
                        <h3>All Orders Processed!</h3>
                        <p>You have successfully processed all pending orders.</p>
                        <div style="margin-top: 20px;">
                            <button class="action-btn-compact btn-back" onclick="goBack()" style="margin-right: 10px;">
                                <i class="fas fa-arrow-left"></i>
                                Back to Dashboard
                            </button>
                            <button class="action-btn-compact" onclick="location.reload()">
                                <i class="fas fa-refresh"></i>
                                Refresh Page
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// Assign to window for onclick handlers in HTML
window.handleOrderApprove = handleOrderApprove;
window.handleOrderReject = handleOrderReject;
window.handleOrderPDF = handleOrderPDF;
window.handleApproveAll = handleApproveAll;
window.handleDownloadAll = handleDownloadAll;
window.goBack = handleGoBack;

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