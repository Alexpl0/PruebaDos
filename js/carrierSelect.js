/**
 * carrierSelect.js
 * Módulo para la gestión y selección de transportistas (carriers)
 * Incluye funciones para inicializar el selector, cargar transportistas y validar selecciones
 */

//==========================================================================================
// Function to initialize the carrier selector
function initializeCarrierSelector() {
    showCarrierSelect();
    // Load all carriers initially
    loadAllCarriers();
    console.log("Carrier selector initialized");
}

//==========================================================================================
// Function to load all carriers when the page first loads
function loadAllCarriers() {
    // Make a fetch request to get all carriers
    fetch(URLPF + 'dao/elements/daoCarriers.php')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success' && Array.isArray(data.data)) {
                // Create options for each carrier
                const options = data.data.map(carrier => {
                    return new Option(carrier.name, carrier.id, false, false);
                });
                
                // Add the options to the select
                const carrierSelect = $('#Carrier');
                carrierSelect.append(options);
                
                // Trigger change to update Select2
                carrierSelect.trigger('change');
                
            } else {
                console.error("Failed to load initial carriers:", data);
            }
        })
        .catch(error => {
            console.error("Error fetching initial carriers:", error);
        });
}

//==========================================================================================
// Initialize the Select2 widget for the carrier field
// Configure AJAX search and the option to add a new carrier if not found
function showCarrierSelect() {
    // Check if the element exists
    const carrierElement = $('#Carrier');
    console.log("Carrier element exists:", carrierElement.length > 0);
    
    if (carrierElement.length === 0) {
        console.error("Cannot initialize Select2: #Carrier element not found in the DOM");
        return;
    }
    
    // Initialize Select2 on the element with ID 'Carrier'
    $('#Carrier').select2({
        placeholder: "Search carrier",
        allowClear: true,
        minimumInputLength: 0, // Allow showing all options without typing
        ajax: {
            url: URLPF + 'dao/elements/daoCarriers.php', // URLPF to search for carriers
            dataType: 'json',
            delay: 250, // Wait before making the request
            data: function (params) {
                // Send the search term to the server
                return { q: params.term || '' };
            },

            processResults: function (data, params) {
                // Process the server response and adapt it to the format Select2 expects
                if (!data || !Array.isArray(data.data)) {
                    console.error("Server data format is incorrect or missing data.data array:", data);
                    return { results: [] };
                }

                
                // Map results for Select2
                const results = data.data.map(carrier => ({
                    id: carrier.id,
                    text: carrier.name
                }));
                
                console.log("Results length before check:", results.length);
                
                // If there are no results and the user typed something, allow adding a new carrier
                if (params.term && results.length === 0) {
                    console.log("Adding 'Add new carrier' option for:", params.term);
                    results.push({
                        id: params.term,
                        text: `Add new carrier: "${params.term}"`,
                        isNew: true
                    });
                }
                
                console.log("Final results:", results);
                return { results };
            },
            cache: true,
            error: function(jqXHR, textStatus, errorThrown) {
                // Handle AJAX request errors
                console.error("AJAX error for Carrier:", textStatus, errorThrown, jqXHR.responseText);
            }
        }
    })
    // Event when an option is selected in the Select2
    .on('select2:select', function(e) {
        const data = e.params.data;
        // Save the selected ID (if applicable)
        if (!data.isNew && data.id) {
            $(this).data('selected-id', parseInt(data.id, 10));
        }
    });

    if(!$('#Carrier').data('select2')) {
        console.error("Select2 not initialized on #Carrier");
    }
}

//==========================================================================================
// Function to validate and get the carrier ID
function validateCarrierId() {
    const carrierId = $('#Carrier').data('selected-id') || 
                      ($('#Carrier').select2('data')[0] ? 
                       parseInt($('#Carrier').select2('data')[0].id, 10) : null);
    
    console.log("Validating carrier ID:", carrierId);
    
    return {
        valid: Boolean(carrierId),
        carrierId: carrierId
    };
}

//==========================================================================================
// Verificación de disponibilidad de la variable URL
// En caso de que el script se cargue antes que la variable esté definida
if (typeof URLPF === 'undefined') {
    console.warn('URLPF global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    // Fallback a URLPF hardcodeada solo como último recurso
    window.URLPF = window.URLPF || 'https://grammermx.com/Logistica/PremiumFreight/';
}