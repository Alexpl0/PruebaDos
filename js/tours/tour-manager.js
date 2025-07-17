/**
 * @file tour-manager.js
 * Manages the initialization and execution of Driver.js tours.
 * This script is called after the window 'load' event, so external libraries should be ready.
 */

import { tourSteps, pageTours } from './definitions.js';

let driverFactory = null;

/**
 * Initializes the driver factory function. This is the first step.
 */
function initializeDriver() {
    if (window.driver && typeof window.driver.driver === 'function') {
        driverFactory = window.driver.driver;
    } else {
        console.error("Driver.js library (window.driver) is not available. The help feature will be disabled.");
    }
}

/**
 * Starts a tour based on the provided tour name.
 * @param {string} tourName - The key of the tour in the tourSteps object.
 */
export function startTour(tourName) {
    if (!driverFactory) {
        console.error("Driver factory not initialized. Cannot start tour.");
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Help Unavailable',
                text: 'The interactive guide could not be loaded. Please try refreshing the page.',
            });
        } else {
            alert("The help feature is currently unavailable. Please try refreshing the page.");
        }
        return;
    }

    const steps = tourSteps[tourName];
    if (!steps || !steps.length) {
        console.error(`Tour "${tourName}" not found or is empty.`);
        return;
    }

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
 * Initializes the contextual help dropdown menu in the header.
 */
export function initContextualHelp() {
    // Step 1: Try to get the driver library ready.
    initializeDriver();

    const helpDropdownMenu = document.getElementById('help-dropdown-menu');
    const helpNavItem = document.getElementById('help-nav-item');

    // If the driver library failed to load, hide the help menu completely.
    if (!driverFactory) {
        if (helpNavItem) {
            helpNavItem.style.display = 'none';
        }
        return;
    }
    
    // Step 2: Populate the menu with relevant questions for the current page.
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';
    const relevantTours = pageTours[currentPage];

    if (relevantTours && Object.keys(relevantTours).length > 0) {
        let dropdownHTML = '';
        for (const question in relevantTours) {
            const tourName = relevantTours[question];
            dropdownHTML += `<li><a class="dropdown-item" href="#" data-tour="${tourName}">${question}</a></li>`;
        }
        helpDropdownMenu.innerHTML = dropdownHTML;

        // Step 3: Add click listeners to start the tours.
        helpDropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const tourToStart = this.getAttribute('data-tour');
                startTour(tourToStart);
            });
        });
    } else {
        // If no tours are defined for this page, hide the help menu.
        if (helpNavItem) {
            helpNavItem.style.display = 'none';
        }
    }
}
