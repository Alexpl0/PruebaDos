/**
 * Premium Freight - Main Orders Module (Refactored)
 * Coordinates all order-related functionality using PF_CONFIG.
 */

import { addNotificationStyles } from './utils.js';
import { createCards, setupSearch } from './cards.js';
import { setupModalEventListeners } from './modals.js';
import { approveOrder, rejectOrder } from './approval.js';

document.addEventListener('DOMContentLoaded', function() {
    Swal.fire({
        title: 'Loading Application', text: 'Please wait...', allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    addNotificationStyles();
    loadOrderData();
    
    document.querySelector('#myModal .modal-buttons').innerHTML = `
        <button id="savePdfBtn" class="save-pdf-button icon-only-btn" title="Save as PDF"><i class="fas fa-file-pdf"></i></button>
        <button id="approveBtn" class="icon-only-btn" title="Approve Order"><i class="fas fa-check-circle"></i></button>
        <button id="rejectBtn" class="icon-only-btn" title="Reject Order"><i class="fas fa-times-circle"></i></button>
    `;

    try {
        setupModalEventListeners();
        document.getElementById('approveBtn')?.addEventListener('click', handleApprovalClick);
        document.getElementById('rejectBtn')?.addEventListener('click', handleRejectionClick);
        setupSearch();
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        Swal.fire({ icon: 'error', title: 'Initialization Error', text: 'There was a problem initializing the application.' });
    }
    Swal.close();
});

function loadOrderData() {
    const URLPF = window.PF_CONFIG.app.baseURL;
    const user = window.PF_CONFIG.user;

    fetch(`${URLPF}dao/conections/daoPremiumFreight.php`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!data || !data.data) throw new Error('No data received from API or incorrect format');
            
            let filteredOrders = data.data;
            if (user.plant) {
                filteredOrders = data.data.filter(order => order.creator_plant === user.plant);
            }
            
            window.allOrders = filteredOrders;
            window.originalOrders = [...filteredOrders];
            
            updatePageTitle(user.plant);
            createCards(filteredOrders);
        })
        .catch(error => {
            console.error('Error loading data:', error);
            Swal.fire({ icon: 'error', title: 'Data Loading Error', text: 'Could not load orders data.' });
        });
}

function updatePageTitle(userPlant) {
    const title2Element = document.getElementById('title2');
    if (title2Element) {
        title2Element.textContent = userPlant ? `Showing orders from Plant: ${userPlant}` : 'Showing all orders (Global Access)';
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

export function refreshOrderData() {
    Swal.fire({
        title: 'Refreshing Data', text: 'Updating order information...', allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    loadOrderData();
    setTimeout(() => Swal.close(), 1000);
}
