/**
 * Premium Freight - Main Orders Module (Refactored for Pagination)
 * Coordinates all order-related functionality, including pagination and search.
 */

import { addNotificationStyles } from './utils.js';
import { createCards, getSearchInput } from './cards.js';
import { setupModalEventListeners } from './modals.js';
import { approveOrder, rejectOrder } from './approval.js';

// --- State Variables ---
let currentPage = 1;
const ordersPerPage = 24; // As requested
let currentSearchQuery = '';
let debounceTimer; // For search input delay

document.addEventListener('DOMContentLoaded', function() {
    Swal.fire({
        title: 'Loading Application', text: 'Please wait...', allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    addNotificationStyles();
    loadOrderData(currentPage, currentSearchQuery); // Initial data load
    
    // Setup modal buttons
    document.querySelector('#myModal .modal-buttons').innerHTML = `
        <button id="savePdfBtn" class="save-pdf-button icon-only-btn" title="Save as PDF"><i class="fas fa-file-pdf"></i></button>
        <button id="approveBtn" class="icon-only-btn" title="Approve Order"><i class="fas fa-check-circle"></i></button>
        <button id="rejectBtn" class="icon-only-btn" title="Reject Order"><i class="fas fa-times-circle"></i></button>
    `;

    try {
        setupModalEventListeners();
        document.getElementById('approveBtn')?.addEventListener('click', handleApprovalClick);
        document.getElementById('rejectBtn')?.addEventListener('click', handleRejectionClick);
        setupSearchListener(); // Set up the new search handler
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        Swal.fire({ icon: 'error', title: 'Initialization Error', text: 'There was a problem initializing the application.' });
    }
});

/**
 * Fetches order data from the new paginated backend endpoint.
 * @param {number} page - The page number to load.
 * @param {string} search - The search query.
 */
function loadOrderData(page, search = '') {
    Swal.fire({
        title: 'Loading Orders...', text: 'Please wait.', allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const URLPF = window.PF_CONFIG.app.baseURL;
    // --- IMPORTANTE: Apuntamos al nuevo endpoint paginado ---
    const fetchUrl = new URL(`${URLPF}dao/conections/daoOrdersByPage.php`);
    fetchUrl.searchParams.append('page', page);
    fetchUrl.searchParams.append('limit', ordersPerPage);
    if (search) {
        fetchUrl.searchParams.append('search', search);
    }

    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(apiResponse => {
            if (apiResponse.status !== 'success' || !apiResponse.data || !apiResponse.pagination) {
                throw new Error('Invalid API response format');
            }
            
            const { data: orders, pagination } = apiResponse;
            window.allOrders = orders; // This global now holds only the current page's data
            
            updatePageTitle(window.PF_CONFIG.user.plant, orders.length, pagination.total);
            createCards(orders);
            setupPagination(pagination);
            Swal.close();
        })
        .catch(error => {
            console.error('Error loading data:', error);
            Swal.fire({ icon: 'error', title: 'Data Loading Error', text: 'Could not load orders data.' });
            document.getElementById("card").innerHTML = '<p class="text-center text-danger">Failed to load orders.</p>';
            document.getElementById("pagination-container").innerHTML = '';
        });
}

/**
 * Creates and manages the pagination controls.
 * @param {object} pagination - The pagination object from the API { total, page, totalPages }.
 */
function setupPagination({ total, page, totalPages }) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    currentPage = page;

    const createPageLink = (p, text, isDisabled = false, isActive = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" data-page="${p}">${text}</a>`;
        return li;
    };

    // Previous button
    paginationContainer.appendChild(createPageLink(page - 1, 'Previous', page === 1));

    // Page number buttons (simplified for brevity, can be expanded with "...")
    for (let i = 1; i <= totalPages; i++) {
        paginationContainer.appendChild(createPageLink(i, i, false, i === page));
    }

    // Next button
    paginationContainer.appendChild(createPageLink(page + 1, 'Next', page === totalPages));

    // Add event listeners
    paginationContainer.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = Number(link.dataset.page);
            const parentLi = link.parentElement;
            if (targetPage && !parentLi.classList.contains('disabled') && !parentLi.classList.contains('active')) {
                loadOrderData(targetPage, currentSearchQuery);
            }
        });
    });
}

/**
 * Sets up the event listener for the search input field.
 */
function setupSearchListener() {
    const searchInput = getSearchInput();
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            // Use a debounce to avoid making API calls on every keystroke
            debounceTimer = setTimeout(() => {
                if (query !== currentSearchQuery) {
                    currentSearchQuery = query;
                    loadOrderData(1, currentSearchQuery); // Reset to page 1 for new search
                }
            }, 500);
        });
    }
}

/**
 * Updates the page subtitle with current filter and count info.
 */
function updatePageTitle(userPlant, displayedCount, totalCount) {
    const title2Element = document.getElementById('title2');
    if (title2Element) {
        const plantInfo = userPlant ? `from Plant: ${userPlant}` : '(Global Access)';
        const totalInfo = totalCount > 0 ? `(Showing ${displayedCount} of ${totalCount} orders)` : '(No orders found)';
        title2Element.textContent = `Orders ${plantInfo} ${totalInfo}`;
        title2Element.style.cssText = "font-size: 1.2em; color: #666; font-weight: normal;";
    }
}

async function handleApprovalClick() {
    const orderId = sessionStorage.getItem('selectedOrderId');
    if (!orderId) return;
    const result = await approveOrder(orderId);
    if (result?.success) refreshOrderData();
}

async function handleRejectionClick() {
    const orderId = sessionStorage.getItem('selectedOrderId');
    if (!orderId) return;
    const result = await rejectOrder(orderId);
    if (result?.success) refreshOrderData();
}

/**
 * Refreshes the data on the current page.
 */
export function refreshOrderData() {
    Swal.fire({
        title: 'Refreshing Data', text: 'Updating order information...', allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    // Reload the current page with the current search query
    loadOrderData(currentPage, currentSearchQuery);
    setTimeout(() => Swal.close(), 1000);
}
