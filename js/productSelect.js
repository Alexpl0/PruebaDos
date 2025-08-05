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
            // URL to the new endpoint that fetches products by user's plant
            url: window.PF_CONFIG.app.baseURL + 'dao/elements/daoProduct.php',
            dataType: 'json',
            delay: 250, // Wait time after typing before making the request
            processResults: function (response) {
                // Check if the response is valid
                if (!response || response.status !== 'success' || !Array.isArray(response.data)) {
                    console.error("Invalid data format received from server:", response);
                    return { results: [] };
                }

                // Map the server data to the format expected by Select2
                // The endpoint should return 'id' and 'productName'
                const results = response.data.map(product => ({
                    id: product.id,
                    text: product.productName
                }));

                return {
                    results: results
                };
            },
            cache: true, // Cache AJAX requests
            error: function(jqXHR, textStatus, errorThrown) {
                // Handle AJAX request errors
                console.error("AJAX error for Products:", textStatus, errorThrown, jqXHR.responseText);
                // Optionally, show an error message to the user
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
