/**
 * Premium Freight - My Orders Module (Refactored)
 * Muestra solo las órdenes creadas por el usuario actual.
 */

import { addNotificationStyles } from './utils.js';
import { createCards, setupSearch } from './cards.js';
import { setupModalEventListeners } from './modals.js';

document.addEventListener('DOMContentLoaded', function() {
    Swal.fire({
        title: 'Loading Your Orders', text: 'Please wait...', allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    addNotificationStyles();
    loadOrderData();
    
    document.querySelector('#myModal .modal-buttons').innerHTML = `
        <button id="savePdfBtn" class="save-pdf-button icon-only-btn" title="Save as PDF">
            <i class="fas fa-file-pdf"></i>
        </button>
    `;

    try {
        setupModalEventListeners();
        setupSearch();
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        Swal.fire({ icon: 'error', title: 'Initialization Error', text: 'There was a problem initializing the application.' });
    }
    Swal.close();
});

/**
 * Carga las órdenes del usuario desde la API.
 */
function loadOrderData() {
    const user = window.PF_CONFIG.user;
    const URLPF = window.PF_CONFIG.app.baseURL;
    
    if (!user || !user.id) {
        Swal.fire({ icon: 'error', title: 'Authentication Error', text: 'Your user ID could not be found. Please log in again.' });
        return;
    }
    
    const apiUrl = `${URLPF}dao/conections/daoOrdersByUser.php`;

    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (data && data.success && data.orders) {
            window.allOrders = data.orders;
            window.originalOrders = [...data.orders];
            createCards(data.orders);
        } else {
            throw new Error(data.message || 'No data received from API or incorrect format');
        }
    })
    .catch(error => {
        console.error('Error loading data:', error);
        Swal.fire({ icon: 'error', title: 'Data Loading Error', text: 'Could not load your orders. Please try refreshing the page.' });
    });
}
