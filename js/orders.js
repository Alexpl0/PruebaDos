/**
 * Premium Freight - Main Orders Module
 * Coordinates all order-related functionality including data loading,
 * UI rendering, search, and modal interactions.
 */

import { addNotificationStyles } from './utils.js';
import { createCards, setupSearch } from './cards.js';
import { updateModalButtons, setupModalEventListeners } from './modals.js';
import { setupApprovalEventListeners } from './approval.js';

/**
 * Initialize the application when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Show loading message
    Swal.fire({
        title: 'Loading Application',
        text: 'Please wait...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Add notification badge styles
    addNotificationStyles();
    
    // Load order data from API
    loadOrderData();
    
    // Update modal buttons to icon-only version
    document.querySelector('#myModal .modal-buttons').innerHTML = `
        <button id="savePdfBtn" class="save-pdf-button icon-only-btn" title="Save as PDF">
            <i class="fas fa-file-pdf"></i>
        </button>
        <button id="approveBtn" class="icon-only-btn" title="Approve Order">
            <i class="fas fa-check-circle"></i>
        </button>
        <button id="rejectBtn" class="icon-only-btn" title="Reject Order">
            <i class="fas fa-times-circle"></i>
        </button>
    `;

    try {
        // Set up event listeners
        setupModalEventListeners();
        setupApprovalEventListeners();
        setupSearch();
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: 'There was a problem initializing the application: ' + error.message
        });
    }

    // Close loading message
    Swal.close();
});

/**
 * Loads order data from the API
 * Uses the global URL variable to construct the API endpoint
 */
function loadOrderData() {
    fetch(URL + 'dao/conections/daoPremiumFreight.php')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.data) {
                // Store user info globally for plant-based filtering
                if (data.user_info) {
                    window.userPlant = data.user_info.plant;
                    window.userAuthLevel = data.user_info.authorization_level;
                    
                    // Log plant filtering info
                    if (window.userPlant) {
                        console.log(`User plant: ${window.userPlant} - Showing orders from same plant only`);
                    } else {
                        console.log('User has no plant assigned - Showing all orders');
                    }
                }
                
                // Apply additional client-side filtering if needed
                let filteredOrders = data.data;
                
                // Filter orders based on user plant (redundant with server-side filtering, but good for consistency)
                if (window.userPlant) {
                    filteredOrders = data.data.filter(order => order.creator_plant === window.userPlant);
                    console.log(`Filtered ${data.data.length} orders to ${filteredOrders.length} orders from user's plant`);
                }
                
                // Store orders data in global variables for access by other modules
                window.allOrders = filteredOrders;
                window.originalOrders = [...filteredOrders]; // Keep an original copy for filtering/reset
                
                // Log recovery data for debugging
                const ordersWithRecovery = filteredOrders.filter(order => order.recovery_file);
                if (ordersWithRecovery.length > 0) {
                    console.log(`Found ${ordersWithRecovery.length} orders with recovery files`);
                }
                
                // Update page title to show plant filter if applicable
                updatePageTitle();
                
                // Create cards with the filtered data
                createCards(filteredOrders);
            } else {
                throw new Error('No data received from API or incorrect format');
            }
        })
        .catch(error => {
            console.error('Error loading data:', error);
            Swal.fire({
                icon: 'error',
                title: 'Data Loading Error',
                text: 'Could not load orders data. Please try refreshing the page.'
            });
        });
}

/**
 * Updates the page title to reflect plant filtering
 */
function updatePageTitle() {
    const title2Element = document.getElementById('title2');
    if (title2Element && window.userPlant) {
        title2Element.textContent = `Showing orders from Plant: ${window.userPlant}`;
        title2Element.style.fontSize = '1.2em';
        title2Element.style.color = '#666';
        title2Element.style.fontWeight = 'normal';
    } else if (title2Element && !window.userPlant) {
        title2Element.textContent = 'Showing all orders (Global Access)';
        title2Element.style.fontSize = '1.2em';
        title2Element.style.color = '#666';
        title2Element.style.fontWeight = 'normal';
    }
}

/**
 * Refreshes order data from the API
 * Used after actions that modify order status
 */
export function refreshOrderData() {
    // Show loading message
    Swal.fire({
        title: 'Refreshing Data',
        text: 'Updating order information...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    loadOrderData();
    
    // Close loading after a short delay to ensure data is processed
    setTimeout(() => {
        Swal.close();
    }, 1000);
}

/**
 * Global error handler for uncaught exceptions
 */
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    Swal.fire({
        icon: 'error',
        title: 'Application Error',
        text: 'An unexpected error occurred. Please reload the page and try again.'
    });
});

/**
 * Verificación de disponibilidad de la variable URL
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URL === 'undefined') {
    console.warn('URL global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    // Fallback a URL hardcodeada solo como último recurso
    window.URL = window.URL || 'https://grammermx.com/Jesus/PruebaDos/';
}