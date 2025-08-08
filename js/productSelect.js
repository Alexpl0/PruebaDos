/**
 * productSelect.js
 * Module for managing the product selector.
 * Initializes a Select2 dropdown that fetches products based on the user's plant.
 */

/**
 * Initializes the product selector with Select2 and AJAX data loading.
 */
export function initializeProductSelector() {
    const productSelect = $('#Products');

    // Check if the element exists before initializing
    if (productSelect.length === 0) {
        console.error("Cannot initialize Select2: #Products element not found in the DOM.");
        return;
    }

    productSelect.select2({
        placeholder: "Search for a product",
        allowClear: true,
        minimumInputLength: 0, // Allows showing options without typing
        ajax: {
            // URL to the endpoint that fetches products by user's plant
            url: window.PF_CONFIG.app.baseURL + '/dao/elements/daoProduct.php',
            dataType: 'json',
            delay: 250, // Wait time after typing before making the request
            
            // --- NUEVO ---
            // This function formats the data sent to the server.
            // We're telling Select2 to send the user's input as a 'term' parameter.
            data: function (params) {
                return {
                    term: params.term || '' // params.term is the text entered by the user
                };
            },
            
            processResults: function (response) {
                // Check if the response is valid
                if (!response || response.status !== 'success' || !Array.isArray(response.data)) {
                    console.error("Invalid data format received from server:", response);
                    return { results: [] };
                }

                // Map the server data to the format expected by Select2
                const results = response.data.map(product => ({
                    id: product.id,
                    text: product.productName
                }));

                return {
                    results: results
                };
            },
            cache: true, // Cache AJAX requests
            error: function (jqXHR, textStatus, errorThrown) {
                // Ignore aborted requests (normal behavior in Select2)
                if (textStatus === 'abort') {
                    return;
                }
                console.error("AJAX error for Products:", textStatus, errorThrown, jqXHR.responseText);
                Swal.fire({
                    icon: 'error',
                    title: 'Could not load products',
                    text: 'There was an issue fetching the product list. Please try again later.'
                });
            }
        }
    });

    console.log("Product selector initialized");
}
