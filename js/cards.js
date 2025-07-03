/**
 * Premium Freight - Card Functionality (Refactored)
 * Handles the creation and management of order cards using PF_CONFIG.
 */

import { getWeekNumber } from './utils.js';
import { showModal } from './modals.js';
import { showEvidenceUploadModal } from './modals.js';

/**
 * Creates cards for each order and appends them to the DOM.
 * @param {Array} orders - Array of order objects.
 */
export function createCards(orders) {
    const mainCards = document.getElementById("card");
    if (!mainCards) return;

    mainCards.innerHTML = "";
    window.originalOrders = orders.slice();
    window.allOrders = orders;

    orders.sort((a, b) => {
        const getPriority = (status) => {
            status = (status || '').toLowerCase();
            if (status === 'nuevo' || status === '') return 1;
            if (status === 'revision') return 2;
            if (status === 'rechazado') return 3;
            if (status === 'aprobado') return 4;
            return 5;
        };
        return getPriority(a.status_name) - getPriority(b.status_name);
    });

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
 * Creates a single order card.
 * @param {Object} order - Order data.
 * @returns {HTMLElement} The created card element.
 */
function createSingleCard(order) {
    const card = document.createElement("div");
    card.className = "card shadow rounded mx-2 mb-4";
    card.style.cssText = "max-width: 265px; min-height: 250px; display: flex; flex-direction: column; justify-content: space-between; position: relative;";

    const statusName = (order.status_name || '').toLowerCase();
    if (statusName === "aprobado") card.style.backgroundColor = "#449843";
    else if (statusName === "nuevo") card.style.backgroundColor = "#F5F5F5";
    else if (statusName === "revision") card.style.backgroundColor = "#F5F28B";
    else if (statusName === "rechazado") card.style.backgroundColor = "#EC5854";
    else card.style.backgroundColor = "#FFFFFF";

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
    const approvalStatus = Number(order.approval_status);
    const requiredAuthLevel = Number(order.required_auth_level || 7);

    if (approvalStatus === 99) return 'Order Rejected';
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
 * Sets up search functionality.
 */
export function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = searchInput.value.trim().toLowerCase();
            const orders = window.originalOrders || [];
            const filtered = query ? orders.filter(order => 
                String(order.id).toLowerCase().includes(query) || 
                (order.description || '').toLowerCase().includes(query)
            ) : orders;
            createCards(filtered);
        });
    }
}
