/**
 * Premium Freight - Card Functionality
 * Handles the creation and management of order cards
 */

import { getWeekNumber } from './utils.js';
import { showModal } from './modals.js';
import { showEvidenceUploadModal } from './modals.js';

/**
 * Creates cards for each order and appends them to the DOM
 * @param {Array} orders - Array of order objects
 */
export function createCards(orders) {
    // Get the container for the cards
    const mainCards = document.getElementById("card");
    if (!mainCards) {
        // console.error("Element with ID 'card' not found.");
        return;
    }
    
    // Clear existing cards
    mainCards.innerHTML = "";
    
    // Store original orders if not already stored
    if (!window.originalOrders) {
        window.originalOrders = orders.slice();
    }
    window.allOrders = orders;

    // Sort orders by status
    orders.sort((a, b) => {
        const statusA = (a.status_name || '').toLowerCase();
        const statusB = (b.status_name || '').toLowerCase();
        
        const getPriority = (status) => {
            if (status === 'nuevo' || status === '') return 1;
            if (status === 'revision') return 2;
            if (status === 'rechazado') return 3;
            if (status === 'aprobado') return 4;
            return 5;
        };
        
        return getPriority(statusA) - getPriority(statusB);
    });

    // Debug logging
    // console.log("Total orders to display:", orders.length);
    const ordersNeedingEvidence = orders.filter(order => order.recovery_file && !order.recovery_evidence);
    // console.log("Orders needing evidence:", ordersNeedingEvidence.length);

    // Create card for each order
    orders.forEach(order => {
        const card = createSingleCard(order);
        mainCards.appendChild(card);
    });

    // Initialize tooltips for notification badges
    if (window.jQuery && $.fn.tooltip) {
        $('[data-bs-toggle="tooltip"]').tooltip();
    }

    // Attach event listeners to card buttons
    attachCardEventListeners();
}

/**
 * Creates a single order card
 * @param {Object} order - Order data
 * @returns {HTMLElement} The created card element
 */
function createSingleCard(order) {
    const semana = getWeekNumber(order.date);
    const card = document.createElement("div");
    
    // Set up card styling
    card.className = "card shadow rounded mx-2 mb-4";
    card.style.maxWidth = "265px";
    card.style.minHeight = "250px";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.justifyContent = "space-between";
    card.style.position = "relative";

    // Apply color based on status
    const statusName = (order.status_name || '').toLowerCase();
    if (statusName === "aprobado") card.style.backgroundColor = "#449843";
    else if (statusName === "nuevo") card.style.backgroundColor = "#F5F5F5";
    else if (statusName === "revision") card.style.backgroundColor = "#F5F28B";
    else if (statusName === "rechazado") card.style.backgroundColor = "#EC5854";
    else card.style.backgroundColor = "#FFFFFF";

    // Check if order needs evidence notification
    const needsEvidence = order.recovery_file && !order.recovery_evidence;
    
    // Get approval status message
    const falta = getApprovalStatusMessage(order);
    
    // Create notification badge if needed
    let notificationBadge = '';
    if (needsEvidence) {
        notificationBadge = `
            <div class="notification-badge" data-order-id="${order.id}" data-bs-toggle="tooltip" 
                 data-bs-placement="top" title="Evidence of Recovery is yet to be uploaded">
                <i class="exclamation-icon">!</i>
            </div>
        `;
    }

    // Set card content
    card.innerHTML = `
        ${notificationBadge}
        <div class="card-body d-flex flex-column">
            <h5 class="card-title">ID: ${order.id || 'N/A'}</h5>
            <h6 class="card-subtitle mb-2 fw-bold text-dark">CW: ${semana}</h6>
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
 * Determines the approval status message to display
 * @param {Object} order - Order data
 * @returns {string} Status message
 */
function getApprovalStatusMessage(order) {
    let message = '';
    const approvalStatus = order.approval_status;
    const requiredAuthLevel = order.required_auth_level || 7;
    const statusName = (order.status_name || '').toLowerCase();

    if (approvalStatus === null || approvalStatus >= requiredAuthLevel) {
        message = 'Fully Approved';
        if (statusName === "rechazado") {
            message = 'Order Rejected';
        }
    } else if (approvalStatus === 99) {
        message = 'Order Rejected';
    } else {
        switch (Number(approvalStatus)) {
            case 0: message = 'Pending: Logistics Manager'; break;
            case 1: message = 'Pending: Controlling'; break;
            case 2: message = 'Pending: Plant Manager'; break;
            case 3: message = 'Pending: Senior Logistics Manager'; break;
            case 4: message = 'Pending: Manager OPS Division'; break;
            case 5: message = 'Pending: SR VP Regional'; break;
            case 6: message = 'Pending: Regional Division Controlling'; break;
            default: message = `Pending: Level ${approvalStatus + 1}`;
        }
    }
    
    return message;
}

/**
 * Attaches event listeners to card elements
 */
function attachCardEventListeners() {
    // Determine the current page
    const currentPage = window.location.pathname;

    // Attach click handlers to View buttons
    document.querySelectorAll('.ver-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            
            // Redirect based on the current page
            if (currentPage.includes('orders.js')) {
                window.location.href = `view_order.php?order=${orderId}`;
            } else if (currentPage.includes('myorders.php')) {
                window.location.href = `myOrder.php?order=${orderId}`;
            } else {
                console.warn('Page not recognized for redirection.');
            }
        });
    });
    
    // Attach click handlers to notification badges
    document.querySelectorAll('.notification-badge').forEach(badge => {
        badge.addEventListener('click', function(e) {
            e.stopPropagation();
            const orderId = this.getAttribute('data-order-id');
            showEvidenceUploadModal(orderId);
        });
    });
}

/**
 * Sets up search functionality
 */
export function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = searchInput.value.trim().toLowerCase();
            if (!window.originalOrders) return;

            if (query === "") {
                createCards(window.originalOrders);
            } else {
                const filtered = window.originalOrders.filter(order => {
                    const idMatch = String(order.id).toLowerCase().includes(query);
                    const descMatch = (order.description || '').toLowerCase().includes(query);
                    return idMatch || descMatch;
                });
                createCards(filtered);
            }
        });
    }
}