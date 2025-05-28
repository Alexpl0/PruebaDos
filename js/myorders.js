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
 * Gets the current user ID from the page
 * Safely handles cases where the global variable might not be set
 * @returns {number} The user ID or 0 if not found
 */
function getCurrentUserId() {
    // Try different ways to get the user ID
    if (typeof window.userID !== 'undefined' && window.userID) {
        return parseInt(window.userID, 10);
    }
    
    // Try to get it from a data attribute if set on the body or a specific element
    const userIdElement = document.querySelector('[data-user-id]');
    if (userIdElement && userIdElement.dataset.userId) {
        return parseInt(userIdElement.dataset.userId, 10);
    }
    
    // As a last resort, try to get it from local storage if you're using that
    const storedUserId = localStorage.getItem('userID');
    if (storedUserId) {
        return parseInt(storedUserId, 10);
    }
    
    console.warn('Could not find user ID. Using default value 0.');
    return 0;
}

/**
 * Loads order data from the API
 * Uses the global URL variable to construct the API endpoint
 */
function loadOrderData() {
    // Get the user ID using the safe method
    const userId = getCurrentUserId();
    
    // Check if we have a valid user ID
    if (!userId) {
        Swal.fire({
            icon: 'error',
            title: 'Authentication Error',
            text: 'Your user ID could not be found. Please log in again.'
        });
        return;
    }
    
    // Show loading indicator
    Swal.fire({
        title: 'Loading Orders',
        text: 'Fetching your orders...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    // Ensure URL is defined
    const apiUrl = getApiBaseUrl() + 'dao/conections/daoOrdersByUser.php';

    // Send a POST request with the user ID
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: userId })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Close loading indicator
        Swal.close();
        
        if (data && data.success && data.orders) {
            // Store orders data in global variables for access by other modules
            window.allOrders = data.orders;
            window.originalOrders = [...data.orders]; // Keep an original copy for filtering/reset
            
            // Create cards with the data
            createCards(data.orders);
        } else {
            throw new Error(data.message || 'No data received from API or incorrect format');
        }
    })
    .catch(error => {
        // Close loading indicator
        Swal.close();
        
        console.error('Error loading data:', error);
        Swal.fire({
            icon: 'error',
            title: 'Data Loading Error',
            text: 'Could not load your orders. Please try refreshing the page.'
        });
    });
}

/**
 * Gets the API base URL, ensuring it ends with a slash
 * @returns {string} The base URL for API calls
 */
function getApiBaseUrl() {
    // Check if URL is defined in the global scope
    if (typeof URL === 'undefined' || !URL) {
        console.warn('URL global variable is not defined, using fallback URL');
        return 'https://grammermx.com/Jesus/PruebaDos/';
    }
    
    // Ensure URL ends with a slash
    return URL.endsWith('/') ? URL : URL + '/';
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

// Ensure URL is available when needed
document.addEventListener('DOMContentLoaded', function() {
    if (typeof URL === 'undefined') {
        console.warn('URL global variable is not defined. Setting fallback URL.');
        window.URL = 'https://grammermx.com/Jesus/PruebaDos/';
    }
});