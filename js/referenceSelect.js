/**
 * referenceSelect.js
 * * This file initializes the Select2 component for the 'ReferenceOrder' input field.
 * It's configured to allow users to search for existing order prefixes and also
 * type freely to complete the order number.
 */

/**
 * Initializes the Select2 for the Reference Order input field.
 */
function initializeReferenceSelector() {
    // Ensure jQuery and Select2 are loaded
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.select2 === 'undefined') {
        console.error("jQuery or Select2 is not loaded. Cannot initialize reference selector.");
        return;
    }

    const $referenceOrder = $('#ReferenceOrder');
    if (!$referenceOrder.length) {
        console.error("Element #ReferenceOrder not found.");
        return; 
    }

    $referenceOrder.select2({
        // The AJAX configuration points to the endpoint that fetches order prefixes.
        ajax: {
            url: window.PF_CONFIG.app.baseURL + 'dao/elements/daoNumOrders.php',
            dataType: 'json',
            delay: 250, // Wait 250ms after the user stops typing to send the request.
            processResults: function (response) {
                // This ensures that the data is in the format Select2 expects ({ results: [...] }).
                if (response && response.status === 'success' && Array.isArray(response.data)) {
                    return {
                        results: response.data
                    };
                }
                console.error("Failed to fetch reference numbers or response format is incorrect:", response);
                return { results: [] };
            },
            cache: true
        },
        placeholder: 'Search for a prefix or enter the full number',
        minimumInputLength: 1, // User must type at least 1 character to trigger the search.

        /**
         * The 'tags' option allows the user to create new values (tags) on the fly
         * that are not present in the search results. This is key for allowing free-form input.
         */
        tags: true,

        /**
         * The `createTag` function formats the new user-entered text so it can be
         * handled as a selectable option.
         * @param {object} params - The parameters containing the user's typed term.
         * @returns {object} - A Select2 data object.
         */
        createTag: function (params) {
            const term = $.trim(params.term);
            if (term === '') {
                return null;
            }
            return {
                id: term,
                text: term,
                isNew: true // A custom flag to identify user-created values.
            };
        }
    });

    /**
     * This event handler fires when a user selects an item from the dropdown.
     * Its main purpose is to repopulate the input field with the selected prefix,
     * allowing the user to immediately continue typing.
     */
    $referenceOrder.on('select2:select', function (e) {
        const data = e.params.data;

        // Store the selected prefix in the element's data attribute for later validation.
        // If it's a new tag created by the user, the prefix is empty.
        const prefix = (data && !data.isNew) ? data.text : '';
        $(this).data('selected-prefix', prefix);

        // If a prefix from the list was selected, we want to allow the user to add to it.
        if (prefix) {
            // We use a short timeout to ensure the Select2 UI has finished its updates.
            setTimeout(() => {
                // Re-insert the selected text into the search field and focus it.
                // This provides a seamless experience for the user to continue typing.
                const searchField = $(this).data('select2').$dropdown.find('.select2-search__field');
                if (searchField.length) {
                    searchField.val(prefix).focus();
                }
            }, 10);
        }
    });
}

// Initialize the selector once the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', function() {
    if (window.PF_CONFIG && window.PF_CONFIG.app && window.PF_CONFIG.app.baseURL) {
        initializeReferenceSelector();
    } else {
        console.error("PF_CONFIG is not defined. Cannot initialize reference selector.");
        // Optional: retry after a short delay if config loads asynchronously
        setTimeout(() => {
            if (window.PF_CONFIG && window.PF_CONFIG.app && window.PF_CONFIG.app.baseURL) {
                initializeReferenceSelector();
            } else {
                 console.error("PF_CONFIG still not available after delay.");
            }
        }, 500);
    }
});
