/**
 * Premium Freight - Main Orders Module
 * Coordinates all order-related functionality
 */

import { addNotificationStyles } from './utils.js';
import { createCards, setupSearch } from './cards.js';
import { updateModalButtons, 
    setupModalEventListeners 
} from './modals.js';
import { setupApprovalEventListeners } from './approval.js';

// console.log('All modules imported successfully');

// Document ready handler
document.addEventListener('DOMContentLoaded', function() {
    // console.log('DOM content loaded');
    
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
    
    try {
        // console.log('Setting up event listeners...');
        // Set up event listeners
        setupModalEventListeners();
        // console.log('Modal event listeners set up successfully');
        
        setupApprovalEventListeners();
        console.log('Approval event listeners set up successfully');
        
        setupSearch();
        // console.log('Search set up successfully');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
    
    // Update modal buttons to icon-only version
    document.querySelector('#myModal .modal-buttons').innerHTML = `
        <button id="savePdfBtn" class="save-pdf-button icon-only-btn" title="Save as PDF">
            <span class="material-symbols-outlined">picture_as_pdf</span>
        </button>
        <button id="approveBtn" class="icon-only-btn" title="Approve Order">
            <span class="material-symbols-outlined">check_circle</span>
        </button>
        <button id="rejectBtn" class="icon-only-btn" title="Reject Order">
            <span class="material-symbols-outlined">cancel</span>
        </button>
    `;
    
    console.log('Modal buttons updated');
    
    // Verify buttons exist and have event listeners
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    console.log('Approve button exists:', !!approveBtn);
    console.log('Reject button exists:', !!rejectBtn);

    // Close loading message
    Swal.close();
});

/**
 * Loads order data from the API
 */
function loadOrderData() {
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php')
        .then(response => response.json())
        .then(data => {
            if (data && data.data) {
                // console.log("API response received:", data);
                
                // Log recovery data for debugging
                const ordersWithRecovery = data.data.filter(order => order.recovery_file);
                // console.log("Orders with recovery files:", ordersWithRecovery.length);
                if (ordersWithRecovery.length > 0) {
                    // console.log("Sample recovery order:", ordersWithRecovery[0]);
                }
                
                // Create cards with the data
                createCards(data.data);
            } else {
                console.error('Error: No data received from API or incorrect format.');
            }
        })
        .catch(error => console.error('Error loading data:', error));
}

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    Swal.fire({
        icon: 'error',
        title: 'Application Error',
        text: 'An unexpected error occurred. Please reload the page and try again.'
    });
});