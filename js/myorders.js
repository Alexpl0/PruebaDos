/**
 * Premium Freight - My Orders Module (Refactored & Corrected)
 * Muestra y filtra las órdenes creadas por el usuario actual.
 */

import { addNotificationStyles } from './utils.js';
// CORREGIDO: Importamos 'getSearchInput' en lugar del inexistente 'setupSearch'
import { createCards, getSearchInput } from './cards.js';
// Asumimos que modals.js existe y exporta esta función.
import { setupModalEventListeners } from './modals.js'; 

let debounceTimer; // Para el retardo en la búsqueda

document.addEventListener('DOMContentLoaded', function() {
    Swal.fire({
        title: 'Loading Your Orders',
        text: 'Please wait...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    addNotificationStyles();
    loadUserOrderData();
    
    // Simplificamos el innerHTML para el modal, ya que es solo para visualización
    document.querySelector('#myModal .modal-buttons').innerHTML = `
        <button id="savePdfBtn" class="save-pdf-button icon-only-btn" title="Save as PDF">
            <i class="fas fa-file-pdf"></i>
        </button>
    `;

    try {
        // Asumimos que esta función existe en modals.js
        setupModalEventListeners();
        // NUEVO: Llamamos a la nueva función para configurar la búsqueda del lado del cliente
        setupClientSideSearch();
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        Swal.fire({ icon: 'error', title: 'Initialization Error', text: 'There was a problem initializing the application.' });
    }
});

/**
 * Carga las órdenes del usuario desde la API.
 */
function loadUserOrderData() {
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
        Swal.close();
        if (data && data.success && Array.isArray(data.orders)) {
            // Guardamos la lista original para poder filtrar sobre ella
            window.originalOrders = data.orders;
            updatePageTitle(data.orders.length);
            createCards(data.orders);
        } else {
             // Si no hay órdenes, mostramos un mensaje amigable
            window.originalOrders = [];
            updatePageTitle(0);
            createCards([]);
        }
    })
    .catch(error => {
        console.error('Error loading data:', error);
        Swal.fire({ icon: 'error', title: 'Data Loading Error', text: 'Could not load your orders. Please try refreshing the page.' });
        updatePageTitle(0);
        createCards([]);
    });
}

/**
 * NUEVO: Configura el listener para el input de búsqueda para filtrar las tarjetas en el cliente.
 */
function setupClientSideSearch() {
    const searchInput = getSearchInput();
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.toLowerCase().trim();

        // Usamos un debounce para no filtrar en cada pulsación de tecla
        debounceTimer = setTimeout(() => {
            if (!window.originalOrders) return;

            const filteredOrders = window.originalOrders.filter(order => {
                const orderId = order.id ? order.id.toString().toLowerCase() : '';
                const description = order.description ? order.description.toLowerCase() : '';
                return orderId.includes(query) || description.includes(query);
            });
            
            // Re-renderiza las tarjetas con los resultados filtrados
            createCards(filteredOrders);
            updatePageTitle(filteredOrders.length, window.originalOrders.length);

        }, 300); // 300ms de espera
    });
}

/**
 * NUEVO: Actualiza el subtítulo de la página con el conteo de órdenes.
 * @param {number} displayedCount - El número de órdenes que se muestran actualmente.
 * @param {number} [totalCount] - El número total de órdenes (opcional).
 */
function updatePageTitle(displayedCount, totalCount) {
    const title2Element = document.getElementById('title2');
    if (!title2Element) return;

    const total = totalCount !== undefined ? totalCount : displayedCount;
    let text = `Found ${total} order(s).`;

    if (totalCount !== undefined && displayedCount !== totalCount) {
        text = `Showing ${displayedCount} of ${total} order(s).`;
    }

    title2Element.textContent = text;
    title2Element.style.cssText = "font-size: 1.2em; color: #666; font-weight: normal; margin-top: 0.5rem;";
}
