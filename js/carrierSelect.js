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
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/elements/daoCarriers.php')
        .then(response => response.json())
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
                
                console.log(`Loaded ${options.length} carriers initially`);
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
    // Initialize Select2 on the element with ID 'Carrier'
    $('#Carrier').select2({
        placeholder: "Search carrier",
        allowClear: true,
        minimumInputLength: 0, // Allow showing all options without typing
        ajax: {
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/elements/daoCarriers.php', // URL to search for carriers
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
                // If there are no results and the user typed something, allow adding a new carrier
                if (params.term && results.length === 0) {
                    results.push({
                        id: params.term,
                        text: `Add new carrier: "${params.term}"`,
                        isNew: true
                    });
                }
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