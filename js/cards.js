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

    orders.forEach(order => {
        const card = createSingleCard(order);
        mainCards.appendChild(card);
    });

    // Initialize Bootstrap tooltips after cards are created
    if (window.bootstrap && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
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

    // --- Card Color Logic ---
    const approvalStatus = Number(order.approval_status || 0);
    const requiredLevel = Number(order.required_auth_level || 7);

    if (approvalStatus === 99) {
        card.style.backgroundColor = "#EC5854"; // Rejected -> Red
    } else if (approvalStatus >= requiredLevel) {
        card.style.backgroundColor = "#449843"; // Fully Approved -> Green
    } else if (approvalStatus > 0) {
        card.style.backgroundColor = "#F5F28B"; // In Progress -> Yellow
    } else {
        card.style.backgroundColor = "#F5F5F5"; // New -> White/Gray
    }

    // --- File Status Badge Logic ---
    const hasRecoveryFile = order.recovery_file && order.recovery_file.trim() !== '';
    const hasRecoveryEvidence = order.recovery_evidence && order.recovery_evidence.trim() !== '';
    const falta = getApprovalStatusMessage(order);
    
    let fileStatusBadge = '';

    if (hasRecoveryFile && hasRecoveryEvidence) {
        // Case 1: Both files exist -> Show "Complete" badge (green check)
        fileStatusBadge = `
            <div class="file-status-badge status-complete" data-bs-toggle="tooltip" 
                 data-bs-placement="top" title="Recovery documents are complete.">
                <i class="fas fa-check"></i>
            </div>
        `;
    } else if (hasRecoveryFile && !hasRecoveryEvidence) {
        // Case 2: Only recovery file exists -> Show "Warning" badge (yellow exclamation)
        fileStatusBadge = `
            <div class="file-status-badge status-warning" data-order-id="${order.id}" data-bs-toggle="tooltip" 
                 data-bs-placement="top" title="Evidence of Recovery is pending. Click to upload.">
                <i class="fas fa-exclamation"></i>
            </div>
        `;
    }
    // Case 3: No recovery file needed, so no badge is rendered.

    card.innerHTML = `
        ${fileStatusBadge}
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

    if (approvalStatus === 99) return 'Order Rejected';
    if (approvalStatus >= requiredLevel) return 'Fully Approved';

    switch (approvalStatus) {
        case 0: return 'Pending: Trafico';
        case 1: return 'Pending: Transport Specialist'; // <-- Nuevo caso agregado aquí
        case 2: return 'Pending: Logistics Manager';
        case 3: return 'Pending: Controlling';
        case 4: return 'Pending: Plant Manager';
        case 5: return 'Pending: Senior Manager Logistics';
        case 6: return 'Pending: Manager OPS Division';
        case 7: return 'Pending: Division Controlling Regional';
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
    
    // Attach click listener ONLY to the warning badges
    document.querySelectorAll('.file-status-badge.status-warning').forEach(badge => {
        badge.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent card click event
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
