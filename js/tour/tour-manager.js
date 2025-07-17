/**
 * @file tour-manager.js
 * Manages the initialization and execution of Driver.js tours.
 * It also dynamically populates the "Help" dropdown in the header.
 */

import { tourSteps, pageTours } from './definitions.js';

// This variable will hold the driver factory function once it's initialized.
let driverFactory = null;

/**
 * Initializes the driver instance.
 * It checks if the driver library is available on the window object.
 */
function initializeDriver() {
    if (window.driver && typeof window.driver.driver === 'function') {
        // We store the factory function from the library
        driverFactory = window.driver.driver;
    } else {
        console.error("Driver.js library not loaded or failed to initialize. Please check the script tag in your HTML.");
    }
}

/**
 * Starts a tour based on the provided tour name.
 * @param {string} tourName - The key of the tour in the tourSteps object.
 */
export function startTour(tourName) {
    // If the factory isn't ready, try to initialize it again.
    if (!driverFactory) {
        initializeDriver();
    }
    
    // If it's still not available, we cannot proceed.
    if (!driverFactory) {
        console.error("Driver is not initialized. Cannot start tour. The help feature is currently unavailable.");
        // We can use a more modern notification system if available, like SweetAlert2
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Help Unavailable',
                text: 'The interactive guide could not be loaded. Please check your internet connection and try again.',
                timer: 3000
            });
        } else {
            alert("The help feature is currently unavailable. Please check your connection and try again.");
        }
        return;
    }

    const steps = tourSteps[tourName];
    if (!steps || !steps.length) {
        console.error(`Tour "${tourName}" not found or is empty.`);
        return;
    }

    // Create a new tour instance using the factory and drive it
    const tour = driverFactory({
        showProgress: true,
        steps: steps,
        nextBtnText: 'Next',
        prevBtnText: 'Previous',
        doneBtnText: 'Done'
    });
    
    tour.drive();
}

/**
 * Initializes the contextual help dropdown in the header.
 * This function should be called after the DOM is fully loaded.
 */
export function initContextualHelp() {
    // Ensure the driver is ready to be used.
    initializeDriver();

    const helpDropdown = document.getElementById('help-dropdown-menu');
    if (!helpDropdown) {
        // console.log("Help dropdown menu not found on this page.");
        return;
    }

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
        // If no tours are defined for the page, hide the help menu
        const helpContainer = document.getElementById('help-nav-item');
        if(helpContainer) {
            // console.log(`No tours defined for ${currentPage}, hiding help menu.`);
            helpContainer.style.display = 'none';
        }
    }
}
