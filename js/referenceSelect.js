/**
 * referenceSelect.js
 * * Módulo para la gestión y selección de Órdenes de Referencia.
 * MODIFICADO: Ahora carga todas las referencias al inicio para facilitar la depuración.
 */

(function() {
    /**
     * Carga todas las órdenes de referencia desde el endpoint y las añade al select.
     */
    async function loadAllReferences() {
        const referenceElement = $('#ReferenceOrder');
        if (referenceElement.length === 0) {
            console.error("Elemento #ReferenceOrder no encontrado.");
            return;
        }

        try {
            console.log("Iniciando la carga de todas las órdenes de referencia...");
            const response = await fetch(URLPF + 'dao/elements/daoNumOrders.php');
            
            if (!response.ok) {
                throw new Error(`Error en la red: ${response.status}`);
            }

            const data = await response.json();
            console.log("1. Datos crudos recibidos del endpoint:", data);

            if (data.status === 'success' && Array.isArray(data.data)) {
                // Limpiar opciones existentes (excepto la primera si es un placeholder)
                referenceElement.find('option:not(:first)').remove();

                // Mapear y añadir las nuevas opciones
                data.data.forEach(item => {
                    // Asegurarse de que el texto sea un string
                    const optionText = String(item.text); 
                    const newOption = new Option(optionText, item.id, false, false);
                    referenceElement.append(newOption);
                });

                console.log("2. Opciones añadidas al select. El elemento ahora contiene:", referenceElement.html());

                // Forzar a Select2 a actualizarse con las nuevas opciones
                referenceElement.trigger('change');
                
                console.log("3. Select2 actualizado.");

            } else {
                console.error("El formato de los datos del servidor es incorrecto:", data);
            }

        } catch (error) {
            console.error("Falló la carga de las órdenes de referencia:", error);
        }
    }

    /**
     * Inicializa el selector Select2 para las órdenes de referencia.
     * Ahora se configura como un select estándar, ya que los datos se precargan.
     */
    function initializeReferenceSelector() {
        const referenceElement = $('#ReferenceOrder');
        if (referenceElement.length === 0) {
            return; // El error ya se reportó en loadAllReferences
        }

        // Inicializa Select2 con configuración estándar (sin AJAX)
        referenceElement.select2({
            placeholder: "Select a Reference Order",
            allowClear: true
        });

        console.log("Selector de Órdenes de Referencia inicializado (modo de carga inicial).");

        // Carga los datos después de inicializar el componente base.
        loadAllReferences();
    }

    // Expone la función de inicialización al ámbito global.
    window.initializeReferenceSelector = initializeReferenceSelector;

    // Comprobación de la variable global URLPF.
    if (typeof URLPF === 'undefined') {
        console.warn('URLPF global variable is not defined.');
        window.URLPF = window.URLPF || 'https://grammermx.com/Jesus/PruebaDos/';
    }
})();
