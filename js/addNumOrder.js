/**
 * addNumOrder.js
 * * Este archivo maneja todas las operaciones relacionadas con la creación 
 * de nuevos números de orden desde el formulario.
 */

(function() {
    /**
     * Comprueba si se ha introducido un nuevo número de orden que necesita ser guardado.
     * @returns {boolean} - True si hay una nueva orden para guardar.
     */
    window.hasNewNumOrderToSave = function() {
        const data = $('#ReferenceOrder').select2('data')[0];
        return data && data.isNew;
    };

    /**
     * Procesa un nuevo número de orden, guardándolo en la base de datos.
     * @returns {Promise<number|null>} - El ID del nuevo número de orden, o null si falla.
     */
    window.saveNewNumOrder = async function() {
        const selectElement = $('#ReferenceOrder');
        const data = selectElement.select2('data')[0];

        if (!data || !data.isNew) {
            return null;
        }

        const orderNumber = data.id;

        // Validación simple del lado del cliente.
        if (!orderNumber || isNaN(orderNumber)) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Order Number',
                text: 'Please enter a valid number for the order.'
            });
            return null;
        }
        
        try {
            // Muestra un indicador de carga.
            Swal.fire({
                title: 'Saving new order number...',
                text: 'Please wait.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            
            // Petición al endpoint para guardar la nueva orden.
            const response = await fetch(URLPF + 'dao/elements/daoAddNumOrder.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: orderNumber })
            });
            
            const result = await response.json();

            if (result.status === 'success') {
                const newOrderId = parseInt(result.order_id, 10);
                console.log("New Order Number saved successfully. ID:", newOrderId);

                // Actualiza el elemento Select2 con la nueva opción válida (con el ID de la BD).
                const newOption = new Option(orderNumber, newOrderId, true, true);
                selectElement.append(newOption).trigger('change');
                selectElement.data('selected-id', newOrderId);

                Swal.close();
                return newOrderId;
            } else {
                throw new Error(result.message || 'Error saving the order number.');
            }
        } catch (error) {
            console.error('Error saving new order number:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not save the new order number: ' + error.message
            });
            return null;
        }
    };

    // Comprueba la disponibilidad de la variable global URLPF.
    if (typeof URLPF === 'undefined') {
        console.warn('URLPF global variable is not defined.');
        window.URLPF = window.URLPF || 'https://grammermx.com/Logistica/PremiumFreight/';
    }

    console.log("NumOrder management functions initialized.");
})();
