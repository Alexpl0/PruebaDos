/**
 * referenceSelect.js
 * * This file initializes the Select2 component for the 'ReferenceOrder' input field.
 * It pre-loads all available options to avoid a "searching" state and fixes data type errors.
 * It still allows users to type freely to complete the order number after selecting a prefix.
 */

(function() {
    /**
     * Initializes the Select2 component for the Reference Order field.
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

        // Fetch all reference numbers from the server first.
        fetch(window.PF_CONFIG.app.baseURL + 'dao/elements/daoNumOrders.php')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network Error: ${response.statusText}`);
                }
                return response.json();
            })
            .then(response => {
                if (response && response.status === 'success' && Array.isArray(response.data)) {
                    // CRITICAL FIX: Ensure all 'text' properties are strings to prevent the .toUpperCase() error.
                    const stringifiedData = response.data.map(item => ({
                        id: item.id,
                        text: String(item.text) // Convert number to string
                    }));

                    // Now, initialize Select2 with the pre-loaded data.
                    $referenceOrder.select2({
                        placeholder: 'Select a prefix or enter the full number',
                        data: stringifiedData, // Use the pre-loaded and sanitized data
                        tags: true, // Allow free-text entry
                        createTag: function(params) {
                            const term = $.trim(params.term);
                            if (term === '') {
                                return null;
                            }
                            return {
                                id: term,
                                text: term,
                                isNew: true
                            };
                        }
                    });

                } else {
                    throw new Error("Invalid data format received from server.");
                }
            })
            .catch(error => {
                console.error("Failed to load or initialize reference selector:", error);
                // Fallback: Initialize with tags enabled even if data loading fails
                $referenceOrder.select2({
                    placeholder: 'Error loading prefixes. Enter number manually.',
                    tags: true,
                    createTag: function(params) {
                        const term = $.trim(params.term);
                        if (term === '') { return null; }
                        return { id: term, text: term, isNew: true };
                    }
                });
            });

        /**
         * Event handler for when an item is selected.
         * This allows the user to continue typing after selecting a prefix.
         */
        $referenceOrder.on('select2:select', function(e) {
            const data = e.params.data;
            const prefix = (data && !data.isNew) ? data.text : '';
            $(this).data('selected-prefix', prefix);

            if (prefix) {
                setTimeout(() => {
                    const searchField = $(this).data('select2').$dropdown.find('.select2-search__field');
                    if (searchField.length) {
                        searchField.val(prefix).focus();
                    }
                }, 10);
            }
        });
    }

    // Initialize the selector once the DOM is fully loaded and config is available.
    document.addEventListener('DOMContentLoaded', function() {
        if (window.PF_CONFIG && window.PF_CONFIG.app && window.PF_CONFIG.app.baseURL) {
            initializeReferenceSelector();
        } else {
            console.error("PF_CONFIG is not defined. Cannot initialize reference selector.");
        }
    });

})();
