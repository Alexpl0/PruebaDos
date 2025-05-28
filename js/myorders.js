/**
 * My Orders Module
 * 
 * Handles fetching and displaying orders created by the current user.
 * Similar to orders.js but without approval functionality.
 */

import { createCards } from './cards.js';
import { showModal, hideModal } from './modals.js';
import { downloadPDF } from './createPDF.js';

// URL for the mail API
const URLM = URL;

/**
 * Fetches orders created by the current user
 */
async function fetchMyOrders() {
    try {
        // Show loading indicator
        Swal.fire({
            title: 'Loading...',
            text: 'Fetching your orders',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // Get the current user ID
        const userId = window.userID;

        // Fetch only orders created by the current user
        const response = await fetch(`${URL}dao/conections/daoOrdersByUser.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: userId })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        
        // Close loading indicator
        Swal.close();

        if (data.success) {
            // Store orders in a global variable for later use
            window.allOrders = data.orders;
            
            // Create cards with the orders
            createCards(data.orders);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Could not load your orders'
            });
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load your orders: ' + error.message
        });
    }
}

/**
 * Sets up event listeners for the page
 */
function setupEventListeners() {
    // Modal close button
    document.getElementById('closeModal').addEventListener('click', hideModal);
    
    // PDF save button
    document.getElementById('savePdfBtn').addEventListener('click', () => {
        const selectedOrderId = sessionStorage.getItem('selectedOrderId');
        if (selectedOrderId) {
            downloadPDF(selectedOrderId);
        }
    });
}

/**
 * Initialize the page
 */
document.addEventListener('DOMContentLoaded', () => {
    // Fetch orders when page loads
    fetchMyOrders();
    
    // Set up event listeners
    setupEventListeners();
});