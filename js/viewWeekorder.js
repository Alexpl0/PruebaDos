/**
 * viewWeekorder.js - Visor de Órdenes Semanales (Refactorizado)
 * CORREGIDO: Se ajusta la llamada a generatePDF para que coincida con la función existente
 * en svgOrders.js, evitando así la necesidad de modificar ese archivo.
 */

import { approveOrder, rejectOrder } from './approval.js';
import { generatePDF, loadAndPopulateSVG } from './svgOrders.js'; 

let allOrders = [];
let filteredOrders = [];
const processedOrders = new Set();

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        await fetchAndFilterOrders();
        renderOrderCards();
        setupEventListeners();
        updateSummary();
    } catch (error) {
        console.error('Error during initialization:', error);
        displayErrorState('Could not initialize the application. Please try again later.');
    }
}

async function fetchAndFilterOrders() {
    const URLBASE = window.PF_CONFIG.app.baseURL;
    const user = window.PF_CONFIG.user;
    try {
        const response = await fetch(`${URLBASE}dao/conections/daoPremiumFreight.php`);
        if (!response.ok) throw new Error(`Network error: ${response.status}`);
        
        const result = await response.json();
        if (!result || !Array.isArray(result.data)) throw new Error('Invalid data format received.');
        
        window.allOrders = result.data;
        filteredOrders = result.data.filter(
            (order) =>
                parseInt(order.approval_status, 10) + 1 === user.authorizationLevel &&
                parseInt(order.approval_status, 10) < parseInt(order.required_auth_level, 10)
        );
    } catch (error) {
        console.error('Error in fetchAndFilterOrders:', error);
        throw error;
    }
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
    } else {
        console.error("Event Listener Error: Element with ID 'orders-grid' not found.");
    }

    if (approveAllBtn) approveAllBtn.addEventListener('click', () => handleBulkAction('approve'));
    if (rejectAllBtn) rejectAllBtn.addEventListener('click', () => handleBulkAction('reject'));
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', handleDownloadAll);
    } else {
        console.error("Event Listener Error: Element with ID 'download-all-btn' not found.");
    }
}

/**
 * CORREGIDO: Llama a generatePDF con los argumentos que espera la función original.
 */
async function handleDownloadOrder(orderId) {
    const orderData = filteredOrders.find((o) => o.id == orderId);
    if (!orderData) return Swal.fire('Error', 'Order data not found.', 'error');
    try {
        Swal.fire({ title: 'Generating PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        // Se pasa el nombre del archivo como un string, no como un objeto.
        await generatePDF(orderData, `PF_Order_${orderId}`);
        Swal.close();
    } catch (error) {
        Swal.fire('PDF Error', 'Failed to generate the PDF.', 'error');
    }
}

/**
 * CORREGIDO: Llama a generatePDF en el ciclo con los argumentos correctos.
 */
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
                // Se pasa el nombre del archivo como un string, no como un objeto.
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

// --- El resto de las funciones de ayuda (sin cambios) ---
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
        grid.innerHTML = `<div class="empty-state"><h2>No pending orders found</h2><p>There are no orders requiring your approval at this moment.</p></div>`;
    }
}

function displayErrorState(message) {
    const grid = document.getElementById('orders-grid');
    if (grid) {
        grid.innerHTML = `<div class="error-state"><h2>An Error Occurred</h2><p>${message}</p></div>`;
    } else {
        console.error("Fatal Error: 'orders-grid' container not found. Displaying error in body.");
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-state';
        errorDiv.style.padding = '2rem';
        errorDiv.innerHTML = `<h2>An Error Occurred</h2><p>${message}</p>`;
        document.body.innerHTML = ''; 
        document.body.appendChild(errorDiv);
    }
}

async function handleIndividualAction(orderId, action) {
    if (processedOrders.has(orderId)) return;
    try {
        const options = { showConfirmation: true };
        const result = action === 'approve' ? await approveOrder(orderId, options) : await rejectOrder(orderId, null, options);
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
        const { value: reason } = await Swal.fire({ title: 'Bulk Rejection Reason', input: 'textarea', inputPlaceholder: 'Enter a reason for rejecting all orders...', showCancelButton: true });
        if (!reason) return;
        bulkReason = reason;
    }

    Swal.fire({ title: 'Processing Orders...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    for (const order of pendingOrders) {
        try {
            const result = action === 'approve' ? await approveOrder(order.id, { showConfirmation: false }) : await rejectOrder(order.id, bulkReason, { showConfirmation: false });
            if (result?.success) {
                processedOrders.add(order.id.toString());
                markOrderAsProcessed(order.id, action);
            }
        } catch (error) {
            console.error(`Error processing order #${order.id} in bulk:`, error);
        }
    }
    updateSummary();
    Swal.fire('Completed!', `All ${pendingOrders.length} orders have been processed.`, 'success');
}
