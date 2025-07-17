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
                    // ================== DEBUGGING LOGS ==================
                    console.log("1. Datos crudos recibidos del endpoint:", data);
                    // ====================================================
                    
                    // Se comprueba si la respuesta del servidor es válida.
                    if (!data || !Array.isArray(data.data)) {
                        console.error("Server data format is incorrect or missing data array:", data);
                        return { results: [] };
                    }

                    // Se mapean los resultados para asegurar que la propiedad 'text' sea un string.
                    // Select2 requiere que el texto a mostrar sea una cadena.
                    const mappedResults = data.data.map(item => {
                        return {
                            id: item.id,
                            text: String(item.text) // Se convierte explícitamente el número a string.
                        };
                    });
                    
                    // ================== DEBUGGING LOGS ==================
                    console.log("2. Datos mapeados (text como string):", mappedResults);
                    // ====================================================

                    // Permite añadir un nuevo número de orden si no se encuentra y es un número válido.
                    // Se ha mejorado la lógica para que no solo compruebe si no hay resultados,
                    // sino si el término específico no está en la lista.
                    if (params.term && !mappedResults.some(item => item.text === params.term) && !isNaN(params.term)) {
                        mappedResults.push({
                            id: params.term,
                            text: `Add new order: "${params.term}"`,
                            isNew: true
                        });
                    }
                    
                    const finalResults = {
                        results: mappedResults
                    };

                    // ================== DEBUGGING LOGS ==================
                    console.log("3. Resultados finales enviados a Select2:", finalResults);
                    // ====================================================

                    return finalResults;
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
