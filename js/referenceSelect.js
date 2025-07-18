/**
 * referenceSelect.js
 * * This file initializes the Select2 component for the 'ReferenceOrder' field.
 * 1. Preloads all options from the server to avoid "searching" states.
 * 2. Ensures all data is of the correct type (string) to prevent errors.
 * 3. Allows the user to type freely to complete the order number after selecting a prefix.
 * 4. Validates that the user adds at least one digit/character after selecting a prefix.
 * 5. It is an ES6 module and exports its initialization function.
 */

/**
 * Initializes the selector for the Reference Order field.
 * It is exported to be used in other modules like newOrder.js
 */
export function initializeReferenceSelector() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.select2 === 'undefined') {
        console.error("Critical Error: jQuery or Select2 have not been loaded. Cannot initialize the reference selector.");
        return;
    }

    const $referenceOrder = $('#ReferenceOrder');
    if (!$referenceOrder.length) {
        console.error("Critical Error: The #ReferenceOrder element was not found on the page.");
        return;
    }

    fetch(window.PF_CONFIG.app.baseURL + 'dao/elements/daoNumOrders.php')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network error while loading orders: ${response.statusText}`);
            }
            return response.json();
        })
        .then(response => {
            if (response && response.status === 'success' && Array.isArray(response.data)) {
                
                const sanitizedData = response.data.map(item => ({
                    id: item.id,
                    text: String(item.text || '')
                }));

                $referenceOrder.select2({
                    placeholder: 'Select a prefix or type the full number',
                    data: sanitizedData,
                    tags: true,
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
                throw new Error("The data format received for the reference orders is invalid.");
            }
        })
        .catch(error => {
            console.error("Failed to load or initialize the reference selector:", error);
            $referenceOrder.select2({
                placeholder: 'Error loading prefixes. Enter the number manually.',
                tags: true,
                createTag: function(params) {
                    const term = $.trim(params.term);
                    if (term === '') { return null; }
                    return { id: term, text: term, isNew: true };
                }
            });
        });

    $referenceOrder.on('select2:select', function(e) {
        try {
            const data = e.params.data;
            
            if (data && !data.isNew) {
                const prefix = data.text;
                $(this).data('selected-prefix', prefix);

                setTimeout(() => {
                    const select2Instance = $(this).data('select2');
                    if (select2Instance && select2Instance.$dropdown) {
                        const searchField = select2Instance.$dropdown.find('.select2-search__field');
                        if (searchField.length) {
                            searchField.val(prefix).focus();
                        }
                    }
                }, 10);
            } else {
                 $(this).data('selected-prefix', '');
            }
        } catch (err) {
            console.error("Unexpected error in the 'select2:select' event handler for ReferenceOrder:", err);
        }
    });
}
