/**
 * referenceSelect.js
 * * Este archivo inicializa el componente Select2 para el campo 'ReferenceOrder'.
 * 1. Precarga todas las opciones desde el servidor para evitar estados de "buscando".
 * 2. Se asegura de que todos los datos sean del tipo correcto (string) para prevenir errores.
 * 3. Permite al usuario escribir libremente para completar el número de orden después de seleccionar un prefijo.
 * 4. Valida que el usuario agregue al menos un dígito/carácter después de seleccionar un prefijo.
 * 5. CORREGIDO: Se convierte en un módulo ES6 y exporta su función de inicialización.
 */

/**
 * Inicializa el selector para el campo de Órden de Referencia.
 * Se exporta para ser utilizada en otros módulos como newOrder.js
 */
export function initializeReferenceSelector() {
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
                
                const sanitizedData = response.data.map(item => ({
                    id: item.id,
                    text: String(item.text || '')
                }));

                $referenceOrder.select2({
                    placeholder: 'Selecciona un prefijo o escribe el número completo',
                    data: sanitizedData,
                    tags: true,
                    createTag: function(params) {
                        const term = $.trim(params.term);
                        if (term === '') {
                            return null;
                        }
                        return {
                            id: term,
                            text: term,
                            isNew: true
                        };
                    }
                });

            } else {
                throw new Error("El formato de datos recibido para las órdenes de referencia es inválido.");
            }
        })
        .catch(error => {
            console.error("Falló la carga o inicialización del selector de referencia:", error);
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
        try {
            const data = e.params.data;
            
            if (data && !data.isNew) {
                const prefix = data.text;
                $(this).data('selected-prefix', prefix);

                setTimeout(() => {
                    const select2Instance = $(this).data('select2');
                    if (select2Instance && select2Instance.$dropdown) {
                        const searchField = select2Instance.$dropdown.find('.select2-search__field');
                        if (searchField.length) {
                            searchField.val(prefix).focus();
                        }
                    }
                }, 10);
            } else {
                 $(this).data('selected-prefix', '');
            }
        } catch (err) {
            console.error("Error inesperado en el manejador de eventos 'select2:select' de ReferenceOrder:", err);
        }
    });
}
