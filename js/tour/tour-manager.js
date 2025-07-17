/**
 * @file tour-manager.js
 * Manages the initialization and execution of Driver.js tours.
 * It also dynamically populates the "Help" dropdown in the header.
 */

import { tourSteps, pageTours } from './definitions.js';

// This variable will hold the driver instance once it's initialized.
let driverInstance = null;

/**
 * Initializes the driver instance.
 * It checks if the driver library is available on the window object.
 * This function is called after the DOM is fully loaded.
 */
function initializeDriver() {
    if (window.driver) {
        // We get the factory function from the library
        driverInstance = window.driver.driver;
    } else {
        console.error("Driver.js library not loaded. Please ensure the script is included in your HTML file before your main application script.");
    }
}

/**
 * Starts a tour based on the provided tour name.
 * @param {string} tourName - The key of the tour in the tourSteps object.
 */
export function startTour(tourName) {
    // Check if the driver was initialized successfully
    if (!driverInstance) {
        console.error("Driver is not initialized. Cannot start tour.");
        // Notify the user gracefully in case of an error.
        alert("The help feature is currently unavailable. Please ensure you have a stable internet connection and try again.");
        return;
    }

    const steps = tourSteps[tourName];
    if (!steps || !steps.length) {
        console.error(`Tour "${tourName}" not found or is empty.`);
        return;
    }

    // Create a new tour instance and drive it
    const tour = driverInstance({
        showProgress: true,
        steps: steps
    });
    
    tour.drive();
}

/**
 * Initializes the contextual help dropdown in the header.
 * It finds the current page and populates the dropdown with relevant questions.
 */
export function initContextualHelp() {
    // First, ensure the driver is ready to be used. This should run after the page is loaded.
    initializeDriver();

    const helpDropdown = document.getElementById('help-dropdown-menu');
    if (!helpDropdown) return;

    const currentPage = window.location.pathname.split('/').pop() || 'index.php';
    const relevantTours = pageTours[currentPage];

    if (relevantTours && Object.keys(relevantTours).length > 0) {
        let dropdownHTML = '';
        for (const question in relevantTours) {
            const tourName = relevantTours[question];
            dropdownHTML += `<li><a class="dropdown-item" href="#" data-tour="${tourName}">${question}</a></li>`;
        }
        helpDropdown.innerHTML = dropdownHTML;

        helpDropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const tourToStart = this.getAttribute('data-tour');
                startTour(tourToStart);
            });
        });

    } else {
        const helpContainer = document.getElementById('help-nav-item');
        if(helpContainer) {
            helpContainer.style.display = 'none';
        }
    }
}