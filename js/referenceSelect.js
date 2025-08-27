/**
 * referenceSelect.js (Updated Version)
 * ------------------------------------
 * Manages the initialization of the Reference Order Select2 component.
 * It supports two modes, which can be switched dynamically:
 * 1. Full Mode: Preloads all valid order numbers from the server and allows creating new ones (tags).
 * 2. Limited Mode: Shows a predefined, static list of specific order numbers for recovery scenarios.
 *
 * This file is an ES6 module and exports the necessary functions to be controlled from newOrder.js.
 */

// Helper function to get the base URL from the global config object.
function getBaseUrl() {
    if (window.PF_CONFIG && window.PF_CONFIG.app && window.PF_CONFIG.app.baseURL) {
        return window.PF_CONFIG.app.baseURL;
    }
    console.warn("PF_CONFIG.app.baseURL not found, using a fallback URL.");
    return 'https://grammermx.com/Logistica/PremiumFreight/'; // Fallback URL
}

/**
 * Initializes the Reference Order selector with FULL functionality.
 * It preloads all order numbers and allows users to create new ones.
 * This is the default mode.
 */
export function initializeFullReferenceSelector() {
    const $select = $('#ReferenceOrder');
    if (!$select.length) {
        console.error("Critical Error: The #ReferenceOrder element was not found.");
        return;
    }

    // If Select2 is already initialized, destroy it to re-configure.
    if ($select.hasClass("select2-hidden-accessible")) {
        $select.select2('destroy');
        $select.empty(); // Clear previous options and data
    }

    fetch(getBaseUrl() + 'dao/elements/daoNumOrders.php')
        .then(response => {
            if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
            return response.json();
        })
        .then(apiResponse => {
            if (apiResponse && apiResponse.status === 'success' && Array.isArray(apiResponse.data)) {
                const sanitizedData = apiResponse.data.map(item => ({
                    id: String(item.id || ''), // Ensure ID is a string
                    text: String(item.text || '') // Ensure text is a string
                }));

                $select.select2({
                    width: '100%',
                    placeholder: 'Search or enter an order number',
                    data: sanitizedData,
                    tags: true, // Allow creating new tags
                    createTag: function(params) {
                        const term = $.trim(params.term);
                        if (term === '' || !/^\d+$/.test(term)) {
                            return null; // Only allow numeric tags
                        }
                        return {
                            id: term,
                            text: term,
                            isNew: true // Flag for new tags
                        };
                    },
                    dropdownParent: $select.parent()
                });
            } else {
                throw new Error("Invalid data format received for reference orders.");
            }
        })
        .catch(error => {
            console.error("Failed to load or initialize the full reference selector:", error);
            // Provide a fallback if the fetch fails
            $select.select2({
                width: '100%',
                placeholder: 'Error loading. Enter number manually.',
                tags: true,
                createTag: function(params) {
                    const term = $.trim(params.term);
                    if (term === '') return null;
                    return { id: term, text: term, isNew: true };
                },
                dropdownParent: $select.parent()
            });
        });
}

/**
 * Initializes the Reference Order selector with a LIMITED, static list of options.
 * This is used when a "Recovery" option is selected.
 */
export function initializeLimitedReferenceSelector() {
    const $select = $('#ReferenceOrder');
    if (!$select.length) {
        console.error("Critical Error: The #ReferenceOrder element was not found.");
        return;
    }

    // If Select2 is already initialized, destroy it to re-configure.
    if ($select.hasClass("select2-hidden-accessible")) {
        $select.select2('destroy');
        $select.empty(); // Clear previous options and data
    }

    // These are the specific options required when recovery is active.
    // ID: 42 -> Text: 486406
    // ID: 43 -> Text: 347427
    // ID: 55 -> Text: 344030
    // ID: 67 -> Text: 351959
    const limitedData = [
        { id: '42', text: '486406' },
        { id: '43', text: '347427' },
        { id: '55', text: '324030' },
        { id: '67', text: '351959' },
        { id: '56', text: '349665' },
        { id: '57', text: '349877' },
        { id: '71', text: '337848' },
        { id: '72', text: '352149' }
    ];

    $select.select2({
        width: '100%',
        placeholder: 'Select a recovery order number',
        data: limitedData,
        tags: false, // DO NOT allow creating new tags in this mode
        dropdownParent: $select.parent()
    });
}

/**
 * Main initialization function to be called on page load.
 * It defaults to initializing the full selector.
 * This function is kept for backward compatibility if you were calling it directly.
 */
export function initializeReferenceSelector() {
    initializeFullReferenceSelector();
}
