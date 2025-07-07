/**
 * Premium Freight - Card Functionality (Corrected Logic)
 * Handles the creation and management of order cards with correct status and color logic.
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

    if (!orders || orders.length === 0) {
        mainCards.innerHTML = '<p class="text-center text-muted mt-5">No orders found matching your criteria.</p>';
        return;
    }

    // No sorting needed here as it's handled by the backend or can be done after creation if necessary.
    orders.forEach(order => {
        const card = createSingleCard(order);
        mainCards.appendChild(card);
    });

    if (window.jQuery && $.fn.tooltip) {
        $('[data-bs-toggle="tooltip"]').tooltip();
    }

    attachCardEventListeners();
}

/**
 * Creates a single order card with the correct color and status message.
 * @param {Object} order - Order data.
 * @returns {HTMLElement} The created card element.
 */
function createSingleCard(order) {
    const card = document.createElement("div");
    card.className = "card shadow rounded mx-2 mb-4";
    card.style.cssText = "max-width: 265px; min-height: 250px; display: flex; flex-direction: column; justify-content: space-between; position: relative;";

    // --- LÓGICA DE COLOR DE LA TARJETA (CORREGIDA) ---
    const approvalStatus = Number(order.approval_status || 0);
    const requiredLevel = Number(order.required_auth_level || 7);

    if (approvalStatus === 99) {
        // Regla: Orden Rechazada -> Rojo
        card.style.backgroundColor = "#EC5854";
    } else if (approvalStatus >= requiredLevel) {
        // Regla: Orden Completamente Aprobada -> Verde
        card.style.backgroundColor = "#449843";
    } else if (approvalStatus > 0) {
        // Regla: En proceso de aprobación -> Amarillo
        // (approvalStatus 1 es el primer nivel de aprobación, por lo tanto, ya está en proceso)
        card.style.backgroundColor = "#F5F28B";
    } else {
        // Regla: Orden recién creada (approvalStatus es 0 o null) -> Blanco/Gris claro
        card.style.backgroundColor = "#F5F5F5";
    }

    const needsEvidence = order.recovery_file && !order.recovery_evidence;
    const falta = getApprovalStatusMessage(order); // Obtiene el mensaje de estado
    
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
 * Determines the approval status message to display based on the business rules.
 * @param {Object} order - Order data.
 * @returns {string} Status message.
 */
function getApprovalStatusMessage(order) {
    const approvalStatus = Number(order.approval_status || 0);
    const requiredLevel = Number(order.required_auth_level || 7);

    // Regla: Orden Rechazada
    if (approvalStatus === 99) return 'Order Rejected';
    
    // Regla: Orden Completamente Aprobada
    if (approvalStatus >= requiredLevel) return 'Fully Approved';

    // Regla: Pendiente de aprobación (muestra el siguiente nivel requerido)
    // El 'approvalStatus' actual indica el último nivel aprobado. El siguiente es 'approvalStatus + 1'.
    switch (approvalStatus) {
        case 0: return 'Pending: Logistics Manager'; // Nivel 1
        case 1: return 'Pending: Controlling';       // Nivel 2
        case 2: return 'Pending: Plant Manager';     // Nivel 3
        case 3: return 'Pending: Senior Logistics Manager'; // Nivel 4
        case 4: return 'Pending: Manager OPS Division'; // Nivel 5
        case 5: return 'Pending: SR VP Regional';       // Nivel 6
        case 6: return 'Pending: Regional Division Controlling'; // Nivel 7
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
