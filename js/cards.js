/**
 * Premium Freight - Card Functionality (Refactored for Pagination)
 * Handles the creation and management of order cards.
 */

import { getWeekNumber } from './utils.js';
import { showEvidenceUploadModal } from './modals.js';

/**
 * Creates cards for each order for the current page and appends them to the DOM.
 * @param {Array} orders - Array of order objects for the current page.
 */
export function createCards(orders) {
    const mainCards = document.getElementById("card");
    if (!mainCards) return;

    mainCards.innerHTML = ""; // Clear previous cards

    // If no orders, display a message
    if (!orders || orders.length === 0) {
        mainCards.innerHTML = '<p class="text-center text-muted mt-5">No orders found matching your criteria.</p>';
        return;
    }

    // Sort orders for the current page
    orders.sort((a, b) => {
        const getPriority = (statusId, statusName) => {
            if (statusId == 99) return 1; // Highest priority for rejected
            statusName = (statusName || '').toLowerCase();
            if (statusName === 'nuevo' || statusName === '') return 2;
            if (statusName === 'revision') return 3;
            if (statusName === 'aprobado') return 4;
            return 5;
        };
        return getPriority(a.status_id, a.status_name) - getPriority(b.status_id, b.status_name);
    });

    orders.forEach(order => {
        const card = createSingleCard(order);
        mainCards.appendChild(card);
    });

    // Re-initialize tooltips for the new cards
    if (window.jQuery && $.fn.tooltip) {
        $('[data-bs-toggle="tooltip"]').tooltip();
    }

    attachCardEventListeners();
}

/**
 * Creates a single order card.
 * @param {Object} order - Order data.
 * @returns {HTMLElement} The created card element.
 */
function createSingleCard(order) {
    const card = document.createElement("div");
    card.className = "card shadow rounded mx-2 mb-4";
    card.style.cssText = "max-width: 265px; min-height: 250px; display: flex; flex-direction: column; justify-content: space-between; position: relative;";

    const statusName = (order.status_name || '').toLowerCase();

    // --- Lógica de Color de la Tarjeta ---
    // Se da prioridad al status_id = 99 para el color rojo.
    if (order.status_id == 99) {
        card.style.backgroundColor = "#EC5854"; // Rojo para Rechazado
    } else if (statusName === "aprobado") {
        card.style.backgroundColor = "#449843"; // Verde para Aprobado
    } else if (statusName === "revision") {
        card.style.backgroundColor = "#F5F28B"; // Amarillo para Revisión
    } else if (statusName === "nuevo") {
        card.style.backgroundColor = "#F5F5F5"; // Gris claro para Nuevo
    } else {
        card.style.backgroundColor = "#FFFFFF"; // Color por defecto
    }

    const needsEvidence = order.recovery_file && !order.recovery_evidence;
    const falta = getApprovalStatusMessage(order);
    
    let notificationBadge = '';
    if (needsEvidence) {
        notificationBadge = `
            <div class="notification-badge" data-order-id="${order.id}" data-bs-toggle="tooltip" 
                 data-bs-placement="top" title="Evidence of Recovery is yet to be uploaded">
                <i class="exclamation-icon">!</i>
            </div>
        `;
    }

    card.innerHTML = `
        ${notificationBadge}
        <div class="card-body d-flex flex-column">
            <h5 class="card-title">ID: ${order.id || 'N/A'}</h5>
            <h6 class="card-subtitle mb-2 fw-bold text-dark">CW: ${getWeekNumber(order.date)}</h6>
            <p class="card-text flex-grow-1" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                ${order.description || 'No description'} 
            </p>
            <p class="card-p fw-bold">${falta}</p>
        </div>
        <div class="card-footer bg-transparent border-0 text-center pb-3">
             <button class="btn btn-primary ver-btn" data-order-id="${order.id}">View</button>
        </div>
    `;
    
    return card;
}

/**
 * Determines the approval status message to display.
 * @param {Object} order - Order data.
 * @returns {string} Status message.
 */
function getApprovalStatusMessage(order) {
    if (order.status_id == 99) return 'Order Rejected';
    
    const approvalStatus = Number(order.approval_status);
    const requiredAuthLevel = Number(order.required_auth_level || 7);

    if (approvalStatus >= requiredAuthLevel) return 'Fully Approved';

    switch (approvalStatus) {
        case 0: return 'Pending: Logistics Manager';
        case 1: return 'Pending: Controlling';
        case 2: return 'Pending: Plant Manager';
        case 3: return 'Pending: Senior Logistics Manager';
        case 4: return 'Pending: Manager OPS Division';
        case 5: return 'Pending: SR VP Regional';
        case 6: return 'Pending: Regional Division Controlling';
        default: return `Pending: Level ${approvalStatus + 1}`;
    }
}

/**
 * Attaches event listeners to card elements.
 */
function attachCardEventListeners() {
    const currentPage = window.location.pathname;

    document.querySelectorAll('.ver-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            const redirectPage = currentPage.includes('myorders.php') ? 'myOrder.php' : 'view_order.php';
            window.location.href = `${redirectPage}?order=${orderId}`;
        });
    });
    
    document.querySelectorAll('.notification-badge').forEach(badge => {
        badge.addEventListener('click', function(e) {
            e.stopPropagation();
            const orderId = this.getAttribute('data-order-id');
            showEvidenceUploadModal(orderId);
        });
    });
}

/**
 * Gets the search input element from the DOM.
 * @returns {HTMLElement|null}
 */
export function getSearchInput() {
    return document.getElementById('searchInput');
}
