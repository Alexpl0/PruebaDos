/**
 * addCarrier.js
 * This file handles all operations related to 
 * creating and managing new carriers during the form submission process.
 */

// IIFE wrapper to avoid global scope pollution
(function() {
    /**
     * Checks if there are new carriers that need to be saved before form submission
     * @returns {boolean} - true if there are new carriers, false if not
     */
    window.hasNewCarrierToSave = function() {
        return $('#Carrier').select2('data')[0] && $('#Carrier').select2('data')[0].isNew;
    };

    /**
     * Processes new carriers, saving them to the database
     * @returns {Promise<Object>} - Object with success status and the ID of the new carrier
     */
    window.processNewCarrier = async function() {
        // Select the Carrier Select2 element
        const carrierElement = $('#Carrier');
        
        // Get the data associated with the current selection in the Carrier field
        const carrierData = carrierElement.select2('data')[0];
        
        // Object to store the ID of the new carrier
        let newCarrierId = null;

        // Handle the carrier if it's new
        if (carrierData && carrierData.isNew) {
            const result = await saveNewCarrier(carrierData, carrierElement);
            if (!result.success) {
                return { success: false };
            }
            newCarrierId = result.carrierId;
        }

        // Return success and the new ID
        return { 
            success: true,
            newCarrierId: newCarrierId
        };
    };

    /**
     * Saves a new carrier
     * @param {Object} carrierData - Carrier data from the Select2 selector
     * @param {jQuery} selectElement - Select2 element to update
     * @returns {Promise<Object>} - Result of the operation
     */
    async function saveNewCarrier(carrierData, selectElement) {
        console.log("Saving new carrier:", carrierData.id);
        
        // Get the carrier name
        const carrierName = carrierData.id;
        
        // Validation
        if (!carrierName) {
            Swal.fire({
                icon: 'warning',
                title: 'Incomplete Carrier Data',
                text: 'Please enter a carrier name.'
            });
            return { success: false };
        }
        
        try {
            // Show loading indicator
            Swal.fire({
                title: 'Saving carrier...',
                text: 'Please wait.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            
            // Make the POST request to the server
            const result = await saveCarrierToServer(carrierName);
            
            if (result.status === 'success') {
                console.log("Carrier saved successfully. ID:", result.carrier_id);
                
                // Update the Select2 with the new ID
                const newOption = new Option(carrierName, result.carrier_id, true, true);
                selectElement.append(newOption).trigger('change');
                
                // Close the loading indicator
                Swal.close();
                
                return { 
                    success: true, 
                    carrierId: parseInt(result.carrier_id) 
                };
            } else {
                throw new Error(result.message || 'Error saving carrier');
            }
        } catch (error) {
            console.error('Error saving new carrier:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not save the carrier: ' + error.message
            });
            return { success: false };
        }
    }

    /**
     * Makes the request to the server to save a new carrier
     * @param {string} carrierName - Name of the carrier
     * @returns {Promise<Object>} - Server response
     */
    async function saveCarrierToServer(carrierName) {
        // Usando la variable global URL definida en el archivo PHP
        const response = await fetch(URL + 'dao/elements/daoAddCarrier.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: carrierName
            })
        });
        
        return await response.json();
    }

    /**
     * Verificación de disponibilidad de la variable URL
     * En caso de que el script se cargue antes que la variable esté definida
     */
    if (typeof URL === 'undefined') {
        console.warn('URL global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
        // Fallback to hard-coded URL only as last resort
        window.URL = window.URL || 'https://grammermx.com/Jesus/PruebaDos/';
    }

    // Log initialization to console
    console.log("Carrier management functions initialized and ready.");
})();