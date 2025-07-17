/**
 * @file tour-manager.js
 * Manages the initialization and execution of Driver.js tours.
 * It also dynamically populates the "Help" dropdown in the header.
 */

import { tourSteps, pageTours } from './definitions.js';

// Instance of the driver
const driver = window.driver.driver;

/**
 * Starts a tour based on the provided tour name.
 * @param {string} tourName - The key of the tour in the tourSteps object.
 */
export function startTour(tourName) {
    const steps = tourSteps[tourName];
    if (!steps || steps.length === 0) {
        console.error(`Tour "${tourName}" not found or is empty.`);
        return;
    }

    driver({
        showProgress: true,
        steps: steps
    }).drive();
}

/**
 * Initializes the contextual help dropdown in the header.
 * It finds the current page and populates the dropdown with relevant questions.
 */
export function initContextualHelp() {
    const helpDropdown = document.getElementById('help-dropdown-menu');
    if (!helpDropdown) return;

    const currentPage = window.location.pathname.split('/').pop() || 'index.php';
    const relevantTours = pageTours[currentPage];

    if (relevantTours && Object.keys(relevantTours).length > 0) {
        let dropdownHTML = '';
        for (const question in relevantTours) {
            const tourName = relevantTours[question];
            // Use data attributes to store the tour name
            dropdownHTML += `<li><a class="dropdown-item" href="#" data-tour="${tourName}">${question}</a></li>`;
        }
        helpDropdown.innerHTML = dropdownHTML;

        // Add event listeners to each new dropdown item
        helpDropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const tourToStart = this.getAttribute('data-tour');
                startTour(tourToStart);
            });
        });

    } else {
        // If no tours are defined for the page, hide the help menu or show a default message
        const helpContainer = document.getElementById('help-nav-item');
        if(helpContainer) {
            helpContainer.style.display = 'none';
        }
    }
}
