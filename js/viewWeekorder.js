/**
 * viewWeekorder.js - Visor de Órdenes Semanales
 * 
 * ACTUALIZACIÓN v3.0 (2025-10-07):
 * - Soporte completo para usuarios con múltiples niveles de aprobación
 * - Selector de rol dinámico en el header
 * - Filtrado basado en el rol seleccionado
 */

import { approveOrder, rejectOrder } from './approval.js';
import { generatePDF, loadAndPopulateSVG } from './svgOrders.js'; 

let allOrders = [];
let filteredOrders = [];
const processedOrders = new Set();
let userApprovalRoles = [];
let selectedRole = null;

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        await loadUserApprovalRoles();
        await fetchAllOrders();
        createRoleSelector();
        applyFilters();
        renderOrderCards();
        setupEventListeners();
        updateSummary();
    } catch (error) {
        console.error('Error during initialization:', error);
        displayErrorState('Could not initialize the application. Please try again later.');
    }
}

/**
 * Carga todos los roles de aprobación del usuario
 */
async function loadUserApprovalRoles() {
    const URLPF = window.PF_CONFIG.app.baseURL;
    const fetchUrl = `${URLPF}dao/conections/daoGetUserApprovalRoles.php`;

    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const apiResponse = await response.json();
        
        if (apiResponse.status === 'success' && apiResponse.data) {
            userApprovalRoles = apiResponse.data;
            console.log('[viewWeekorder.js] User approval roles loaded:', userApprovalRoles);
        }
    } catch (error) {
        console.error('[viewWeekorder.js] Error loading user approval roles:', error);
        userApprovalRoles = [];
    }
}

/**
 * Obtiene todas las órdenes del sistema
 */
async function fetchAllOrders() {
    const URLBASE = window.PF_CONFIG.app.baseURL;
    try {
        const response = await fetch(`${URLBASE}dao/conections/daoPremiumFreight.php`);
        if (!response.ok) throw new Error(`Network error: ${response.status}`);
        
        const result = await response.json();
        if (!result || !Array.isArray(result.data)) throw new Error('Invalid data format received.');
        
        allOrders = result.data;
        window.allOrders = result.data;
        console.log('[viewWeekorder.js] All orders loaded:', allOrders.length);
    } catch (error) {
        console.error('Error in fetchAllOrders:', error);
        throw error;
    }
}

/**
 * Crea el selector de roles en el header
 */
function createRoleSelector() {
    const container = document.getElementById('role-selector-container');
    if (!container) {
        console.error('[viewWeekorder.js] Role selector container not found');
        return;
    }

    // Si no hay roles o solo hay uno, no mostrar selector
    if (userApprovalRoles.length === 0) {
        container.innerHTML = '<p class="text-muted small mt-2">No approval roles assigned</p>';
        return;
    }

    if (userApprovalRoles.length === 1) {
        // Solo un rol - mostrar como badge
        const role = userApprovalRoles[0];
        selectedRole = role;
        container.innerHTML = `
            <div class="role-badge-single">
                <i class="fas fa-user-check"></i>
                <span>${role.display_name}</span>
            </div>
        `;
        return;
    }

    // Múltiples roles - crear selector
    container.innerHTML = `
        <div class="role-selector-wrapper">
            <label for="roleSelect" class="role-selector-label">
                <i class="fas fa-user-tag"></i>
                Viewing as:
            </label>
            <select id="roleSelect" class="role-selector-dropdown">
                <option value="">All My Roles</option>
                ${userApprovalRoles.map(role => `
                    <option value="${encodeURIComponent(JSON.stringify({
                        approval_level: role.approval_level,
                        plant: role.plant
                    }))}">
                        ${role.display_name}
                    </option>
                `).join('')}
            </select>
        </div>
    `;

    // Event listener para cambio de rol
    const selectElement = document.getElementById('roleSelect');
    if (selectElement) {
        selectElement.addEventListener('change', function() {
            const value = this.value;
            if (value === '') {
                selectedRole = null;
            } else {
                try {
                    const roleData = JSON.parse(decodeURIComponent(value));
                    selectedRole = userApprovalRoles.find(r => 
                        r.approval_level === roleData.approval_level && 
                        r.plant === roleData.plant
                    );
                } catch (e) {
                    console.error('Error parsing role data:', e);
                    selectedRole = null;
                }
            }
            
            console.log('[viewWeekorder.js] Role changed to:', selectedRole);
            processedOrders.clear(); // Limpiar órdenes procesadas al cambiar filtro
            applyFilters();
            renderOrderCards();
            updateSummary();
        });
    }
}

/**
 * Aplica filtros a las órdenes según el rol seleccionado
 */
function applyFilters() {
    if (selectedRole === null) {
        // Vista de "Todos mis roles" - mostrar órdenes de cualquier rol válido
        filteredOrders = allOrders.filter(order => {
            const currentApprovalLevel = parseInt(order.approval_status, 10);
            const requiredLevel = parseInt(order.required_auth_level, 10);
            const orderPlant = order.creator_plant;
            
            // Orden no debe estar completamente aprobada ni rechazada
            if (currentApprovalLevel >= requiredLevel || currentApprovalLevel === 99) {
                return false;
            }
            
            const nextRequiredLevel = currentApprovalLevel + 1;
            
            // Verificar si alguno de los roles del usuario puede aprobar esta orden
            return userApprovalRoles.some(role => {
                if (role.approval_level !== nextRequiredLevel) return false;
                if (role.plant !== null && role.plant !== orderPlant) return false;
                return true;
            });
        });
    } else {
        // Vista de rol específico
        filteredOrders = allOrders.filter(order => {
            const currentApprovalLevel = parseInt(order.approval_status, 10);
            const requiredLevel = parseInt(order.required_auth_level, 10);
            const orderPlant = order.creator_plant;
            
            // Orden no debe estar completamente aprobada ni rechazada
            if (currentApprovalLevel >= requiredLevel || currentApprovalLevel === 99) {
                return false;
            }
            
            const nextRequiredLevel = currentApprovalLevel + 1;
            
            // Verificar que el rol seleccionado puede aprobar esta orden
            if (selectedRole.approval_level !== nextRequiredLevel) return false;
            if (selectedRole.plant !== null && selectedRole.plant !== orderPlant) return false;
            
            return true;
        });
    }
    
    console.log('[viewWeekorder.js] Filtered orders:', filteredOrders.length);
}

function renderOrderCards() {
    const grid = document.getElementById('orders-grid');
    if (!grid) {
        console.error("Render Error: Element 'orders-grid' not found.");
        return;
    }
    grid.innerHTML = '';
    if (filteredOrders.length === 0) {
        displayEmptyState();
        return;
    }
    filteredOrders.forEach(order => {
        const card = createOrderCardElement(order);
        grid.appendChild(card);
        loadOrderSVG(order, `svg-container-${order.id}`);
    });
}

function createOrderCardElement(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.setAttribute('data-order-id', order.id);
    card.innerHTML = `
        <div class="order-header">
            <h2 class="order-title">Order #${order.id}</h2>
            <div class="order-actions">
                <button class="order-action-btn btn-approve-order" title="Approve"><i class="fas fa-check"></i></button>
                <button class="order-action-btn btn-reject-order" title="Reject"><i class="fas fa-times"></i></button>
                <button class="order-action-btn btn-download-order" title="Download PDF"><i class="fas fa-download"></i></button>
            </div>
        </div>
        <div class="order-content">
            <div class="order-svg-container" id="svg-container-${order.id}"><div class="loading-spinner"></div></div>
        </div>`;
    return card;
}

function setupEventListeners() {
    const grid = document.getElementById('orders-grid');
    const approveAllBtn = document.getElementById('approve-all-btn');
    const rejectAllBtn = document.getElementById('reject-all-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');

    if (grid) {
        grid.addEventListener('click', (event) => {
            const btn = event.target.closest('.order-action-btn');
            if (!btn) return;
            const orderId = btn.closest('.order-card').dataset.orderId;
            if (btn.classList.contains('btn-approve-order')) handleIndividualAction(orderId, 'approve');
            else if (btn.classList.contains('btn-reject-order')) handleIndividualAction(orderId, 'reject');
            else if (btn.classList.contains('btn-download-order')) handleDownloadOrder(orderId);
        });
    }

    if (approveAllBtn) approveAllBtn.addEventListener('click', () => handleBulkAction('approve'));
    if (rejectAllBtn) rejectAllBtn.addEventListener('click', () => handleBulkAction('reject'));
    if (downloadAllBtn) downloadAllBtn.addEventListener('click', handleDownloadAll);
}

async function handleDownloadOrder(orderId) {
    const orderData = filteredOrders.find((o) => o.id == orderId);
    if (!orderData) return Swal.fire('Error', 'Order data not found.', 'error');
    try {
        Swal.fire({ title: 'Generating PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        await generatePDF(orderData, `PF_Order_${orderId}`);
        Swal.close();
    } catch (error) {
        Swal.fire('PDF Error', 'Failed to generate the PDF.', 'error');
    }
}

async function handleDownloadAll() {
    const ordersToDownload = filteredOrders.filter(o => !processedOrders.has(o.id.toString()));
    if (ordersToDownload.length === 0) {
        return Swal.fire('No Orders to Download', 'There are no pending orders to download.', 'info');
    }

    const { isConfirmed } = await Swal.fire({
        title: 'Download All PDFs?',
        text: `This will start downloading ${ordersToDownload.length} PDF files one by one.`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Yes, download all!',
    });

    if (!isConfirmed) return;

    Swal.fire({
        title: 'Starting Downloads...',
        html: `Please wait. Preparing to download file <b>1 / ${ordersToDownload.length}</b>.`,
        allowOutsideClick: false,
        timer: 1500,
        didOpen: () => Swal.showLoading(),
    });

    try {
        let count = 0;
        for (const order of ordersToDownload) {
            count++;
            Swal.update({
                title: 'Downloading Files...',
                html: `Downloading file <b>${count} / ${ordersToDownload.length}</b>...`,
            });
            
            try {
                await generatePDF(order, `PF_Order_${order.id}`);
                await new Promise(resolve => setTimeout(resolve, 750)); 
            } catch (pdfError) {
                console.error(`Failed to download PDF for order #${order.id}:`, pdfError);
            }
        }

        Swal.fire('Downloads Complete', `All ${ordersToDownload.length} files have been processed.`, 'success');

    } catch (error) {
        console.error('Error during bulk PDF download:', error);
        Swal.fire('An Error Occurred', 'Could not complete all downloads.', 'error');
    }
}

async function loadOrderSVG(orderData, containerId) {
    try {
        await loadAndPopulateSVG(orderData, containerId);
    } catch (error) {
        console.error(`Error loading SVG for order #${orderData.id}:`, error);
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = `<div class="svg-error-message"><p>Error loading visualization</p></div>`;
    }
}

function updateSummary() {
    const pendingCountEl = document.getElementById('pending-count');
    const processedCountEl = document.getElementById('processed-count');
    
    if (pendingCountEl) {
        pendingCountEl.textContent = filteredOrders.length - processedOrders.size;
    }
    if (processedCountEl) {
        processedCountEl.textContent = processedOrders.size;
    }
}

function markOrderAsProcessed(orderId, action) {
    const orderCard = document.querySelector(`.order-card[data-order-id="${orderId}"]`);
    if (!orderCard) return;
    orderCard.classList.add('processed');
    const orderHeader = orderCard.querySelector('.order-header');
    if (orderHeader) {
        orderHeader.classList.add(action === 'approve' ? 'header-approved' : 'header-rejected');
        orderHeader.querySelector('.order-actions').remove();
        const title = orderHeader.querySelector('.order-title');
        const statusBadge = document.createElement('span');
        statusBadge.className = 'status-badge';
        statusBadge.textContent = action === 'approve' ? 'APPROVED' : 'REJECTED';
        title.insertAdjacentElement('beforeend', statusBadge);
    }
}

function displayEmptyState() {
    const grid = document.getElementById('orders-grid');
    if (grid) {
        const roleText = selectedRole 
            ? `for role: ${selectedRole.display_name}` 
            : 'for any of your roles';
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h2>No pending orders found</h2>
                <p>There are no orders requiring your approval ${roleText} at this moment.</p>
            </div>
        `;
    }
}

function displayErrorState(message) {
    const grid = document.getElementById('orders-grid');
    if (grid) {
        grid.innerHTML = `<div class="error-state"><h2>An Error Occurred</h2><p>${message}</p></div>`;
    }
}

/**
 * Determina qué rol usar para una acción individual
 */
function getRoleForOrder(orderId) {
    const order = filteredOrders.find(o => o.id == orderId);
    if (!order) return null;
    
    const currentApprovalLevel = parseInt(order.approval_status, 10);
    const nextRequiredLevel = currentApprovalLevel + 1;
    const orderPlant = order.creator_plant;
    
    // Si hay un rol seleccionado, usarlo
    if (selectedRole) {
        return selectedRole;
    }
    
    // Si no hay rol seleccionado, encontrar el primer rol válido
    const validRole = userApprovalRoles.find(role => {
        if (role.approval_level !== nextRequiredLevel) return false;
        if (role.plant !== null && role.plant !== orderPlant) return false;
        return true;
    });
    
    return validRole;
}

async function handleIndividualAction(orderId, action) {
    if (processedOrders.has(orderId)) return;
    
    const roleToUse = getRoleForOrder(orderId);
    if (!roleToUse) {
        Swal.fire('Error', 'No valid approval role found for this order.', 'error');
        return;
    }
    
    try {
        const options = { 
            showConfirmation: true,
            approvalLevelToUse: roleToUse.approval_level,
            plantToUse: roleToUse.plant
        };
        
        const result = action === 'approve' 
            ? await approveOrder(orderId, options) 
            : await rejectOrder(orderId, null, options);
            
        if (result?.success) {
            processedOrders.add(orderId);
            markOrderAsProcessed(orderId, action);
            updateSummary();
        }
    } catch (error) {
        console.error(`Action '${action}' failed for order #${orderId}:`, error);
    }
}

async function handleBulkAction(action) {
    const pendingOrders = filteredOrders.filter(o => !processedOrders.has(o.id.toString()));
    if (pendingOrders.length === 0) return Swal.fire('No Pending Orders', 'All orders have been processed.', 'info');
    
    const { isConfirmed } = await Swal.fire({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} All Orders?`,
        text: `This will ${action} ${pendingOrders.length} pending orders.`,
        icon: 'warning', showCancelButton: true, confirmButtonText: `Yes, ${action} all!`,
    });
    if (!isConfirmed) return;

    let bulkReason = null;
    if (action === 'reject') {
        const { value: reason } = await Swal.fire({ 
            title: 'Bulk Rejection Reason', 
            input: 'textarea', 
            inputPlaceholder: 'Enter a reason for rejecting all orders...', 
            showCancelButton: true 
        });
        if (!reason) return;
        bulkReason = reason;
    }

    Swal.fire({ title: 'Processing Orders...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    for (const order of pendingOrders) {
        const roleToUse = getRoleForOrder(order.id);
        if (!roleToUse) {
            console.warn(`No valid role for order #${order.id}, skipping`);
            continue;
        }
        
        try {
            const options = { 
                showConfirmation: false,
                approvalLevelToUse: roleToUse.approval_level,
                plantToUse: roleToUse.plant
            };
            
            const result = action === 'approve' 
                ? await approveOrder(order.id, options) 
                : await rejectOrder(order.id, bulkReason, options);
                
            if (result?.success) {
                processedOrders.add(order.id.toString());
                markOrderAsProcessed(order.id, action);
            }
        } catch (error) {
            console.error(`Error processing order #${order.id} in bulk:`, error);
        }
    }
    
    updateSummary();
    Swal.fire('Completed!', `All pending orders have been processed.`, 'success');
}