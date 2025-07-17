/**
 * referenceSelect.js
 * * Módulo para la gestión y selección de Órdenes de Referencia.
 * Incluye funciones para inicializar el selector, cargar órdenes y manejar nuevas entradas.
 * Es similar a carrierSelect.js pero adaptado para NumOrders.
 */

(function() {
    /**
     * Inicializa el selector Select2 para las órdenes de referencia.
     */
    function initializeReferenceSelector() {
        const referenceElement = $('#ReferenceOrder');
        if (referenceElement.length === 0) {
            console.error("Cannot initialize Select2: #ReferenceOrder element not found in the DOM");
            return;
        }

        referenceElement.select2({
            placeholder: "Search for an Order Number",
            allowClear: true,
            minimumInputLength: 0, 
            ajax: {
                url: URLPF + 'dao/elements/daoNumOrders.php', // Endpoint para buscar órdenes
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return { q: params.term || '' }; // Envía el término de búsqueda
                },
                processResults: function (data, params) {
                    if (!data || !Array.isArray(data.data)) {
                        console.error("Server data format is incorrect:", data);
                        return { results: [] };
                    }
                    
                    const results = data.data;

                    // Permite añadir un nuevo número de orden si no se encuentra y es un número válido.
                    if (params.term && results.length === 0 && !isNaN(params.term)) {
                        results.push({
                            id: params.term,
                            text: `Add new order: "${params.term}"`,
                            isNew: true
                        });
                    }
                    
                    return { results };
                },
                cache: true,
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error("AJAX error for Reference Order:", textStatus, errorThrown, jqXHR.responseText);
                }
            }
        }).on('select2:select', function(e) {
            const data = e.params.data;
            // Almacena el ID seleccionado en el atributo data del elemento.
            if (!data.isNew && data.id) {
                $(this).data('selected-id', parseInt(data.id, 10));
            } else {
                 $(this).data('selected-id', null);
            }
        });

        console.log("Reference Order selector initialized");
    }

    // Expone la función de inicialización al ámbito global para que pueda ser llamada desde otros scripts.
    window.initializeReferenceSelector = initializeReferenceSelector;

    // Comprueba la disponibilidad de la variable global URLPF.
    if (typeof URLPF === 'undefined') {
        console.warn('URLPF global variable is not defined.');
        // URL de fallback por si acaso.
        window.URLPF = window.URLPF || 'https://grammermx.com/Jesus/PruebaDos/';
    }
})();
