/**
 * referenceSelect.js
 * * Este archivo inicializa el componente Select2 para el campo 'ReferenceOrder'.
 * 1. Precarga todas las opciones desde el servidor para evitar estados de "buscando".
 * 2. Se asegura de que todos los datos sean del tipo correcto (string) para prevenir errores.
 * 3. Permite al usuario escribir libremente para completar el número de orden después de seleccionar un prefijo.
 * Esta versión está diseñada para ser segura y no interferir con otros scripts de la página.
 */

(function() {
    /**
     * Inicializa el selector para el campo de Órden de Referencia.
     */
    function initializeReferenceSelector() {
        // Nos aseguramos que jQuery y Select2 estén listos.
        if (typeof jQuery === 'undefined' || typeof jQuery.fn.select2 === 'undefined') {
            console.error("Error Crítico: jQuery o Select2 no se han cargado. No se puede inicializar el selector de referencia.");
            return;
        }

        const $referenceOrder = $('#ReferenceOrder');
        if (!$referenceOrder.length) {
            console.error("Error Crítico: El elemento #ReferenceOrder no se encontró en la página.");
            return;
        }

        // Primero, obtenemos todos los números de referencia del servidor.
        fetch(window.PF_CONFIG.app.baseURL + 'dao/elements/daoNumOrders.php')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error de Red al cargar las órdenes: ${response.statusText}`);
                }
                return response.json();
            })
            .then(response => {
                if (response && response.status === 'success' && Array.isArray(response.data)) {
                    
                    // CORRECCIÓN CLAVE: Nos aseguramos que la propiedad 'text' de cada objeto sea un string.
                    // Esto previene el error 'toUpperCase is not a function' que detenía otros scripts.
                    const sanitizedData = response.data.map(item => ({
                        id: item.id,
                        text: String(item.text || '') // Convertimos a String y aseguramos que no sea nulo.
                    }));

                    // Una vez que tenemos los datos limpios, inicializamos Select2.
                    $referenceOrder.select2({
                        placeholder: 'Selecciona un prefijo o escribe el número completo',
                        data: sanitizedData, // Usamos los datos precargados y corregidos.
                        tags: true, // Permitimos que el usuario cree nuevas entradas (texto libre).
                        createTag: function(params) {
                            const term = $.trim(params.term);
                            if (term === '') {
                                return null;
                            }
                            return {
                                id: term,
                                text: term,
                                isNew: true // Marcamos la entrada como nueva.
                            };
                        }
                    });

                } else {
                    // Si la respuesta del servidor no es la esperada.
                    throw new Error("El formato de datos recibido para las órdenes de referencia es inválido.");
                }
            })
            .catch(error => {
                console.error("Falló la carga o inicialización del selector de referencia:", error);
                // Plan B: Si todo falla, inicializamos Select2 solo con la opción de texto libre.
                $referenceOrder.select2({
                    placeholder: 'Error al cargar prefijos. Escribe el número manualmente.',
                    tags: true,
                    createTag: function(params) {
                        const term = $.trim(params.term);
                        if (term === '') { return null; }
                        return { id: term, text: term, isNew: true };
                    }
                });
            });

        // Este evento se dispara cuando el usuario selecciona una opción.
        $referenceOrder.on('select2:select', function(e) {
            const data = e.params.data;
            const prefix = (data && !data.isNew) ? data.text : '';
            $(this).data('selected-prefix', prefix); // Guardamos el prefijo para la validación.

            if (prefix) {
                // Pequeño truco para que el usuario pueda seguir escribiendo en el campo.
                setTimeout(() => {
                    const searchField = $(this).data('select2').$dropdown.find('.select2-search__field');
                    if (searchField.length) {
                        searchField.val(prefix).focus();
                    }
                }, 10);
            }
        });
    }

    // Esperamos a que el DOM esté listo y la configuración global exista.
    document.addEventListener('DOMContentLoaded', function() {
        if (window.PF_CONFIG && window.PF_CONFIG.app && window.PF_CONFIG.app.baseURL) {
            initializeReferenceSelector();
        } else {
            console.error("PF_CONFIG no está definido. No se puede inicializar el selector de referencia.");
        }
    });

})();
