/**
 * selectConfig.js
 * Configura todos los elementos select del formulario como componentes Select2
 * con funcionalidad de búsqueda en tiempo real.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Configuración global para todos los selects
    $.fn.select2.defaults.set('language', {
        noResults: function() {
            return "No results found";
        },
        searching: function() {
            return "Searching...";
        }
    });

    // Inicializar Select2 en todos los select, excepto aquellos que necesitan configuración especial
    // Esta función convierte los selects estándar en componentes select2 interactivos
    function initializeSelect2() {
        // Selects estándar (excluyendo los que ya tienen configuración especial)
        $('select').not('#CompanyShip, #inputCompanyNameDest').each(function() {
            const $select = $(this);
            
            // Verificar si ya está inicializado para evitar duplicación
            if (!$select.hasClass('select2-hidden-accessible')) {
                $select.select2({
                    width: '100%',
                    placeholder: $select.find('option:selected').text() || 'Select an option',
                    allowClear: false,
                    minimumResultsForSearch: 5, // Solo muestra la caja de búsqueda si hay más de 5 opciones
                    dropdownParent: $select.parent(), // Asegura manejo correcto de z-index
                    templateResult: formatOption,
                    templateSelection: formatOption
                });
                
                // Después de inicialización, disparar evento para cualquier lógica dependiente
                $select.trigger('select2:initialized');
            }
        });
    }

    // Función para formatear opciones con resaltado de términos de búsqueda
    function formatOption(option) {
        if (!option.id) return option.text;
        
        const term = $('.select2-search__field').val() || '';
        if (!term) return option.text;
        
        // Resaltar el término de búsqueda
        const regex = new RegExp('(' + term + ')', 'gi');
        const highlighted = option.text.replace(regex, '<span class="select2-match">$1</span>');
        
        return $('<span>' + highlighted + '</span>');
    }

    // Inicializar Select2 en todos los selects
    initializeSelect2();

    // Evento para manejar dinamismo cuando se agregan/cargan opciones
    $(document).on('optionsLoaded', 'select', function() {
        const $select = $(this);
        
        // Re-inicializar select2 si ya estaba usando select2
        if ($select.hasClass('select2-hidden-accessible')) {
            $select.select2('destroy');
        }
        
        // Inicializar nuevamente con opciones actualizadas
        $select.select2({
            width: '100%',
            placeholder: $select.find('option:selected').text() || 'Select an option',
            allowClear: false,
            minimumResultsForSearch: 5,
            dropdownParent: $select.parent()
        });
    });

    // Manejar caso especial para Reference y Measures
    function initializeSpecialSelects() {
        // Referencia
        $('#Reference').select2({
            width: '100%',
            minimumResultsForSearch: Infinity, // Deshabilita búsqueda por ser pocos elementos
            dropdownParent: $('#Reference').parent()
        });

        // Medidas
        $('#Measures').select2({
            width: '100%',
            minimumResultsForSearch: Infinity, // Deshabilita búsqueda por ser pocos elementos
            dropdownParent: $('#Measures').parent()
        });
    }

    // Inicializar selects especiales
    initializeSpecialSelects();

    // Manejar validación con Select2
    function setupSelect2Validation() {
        // Validación al seleccionar
        $(document).on('select2:select', 'select', function() {
            const $select = $(this);
            
            // Removemos clases de validación
            $select.removeClass('is-invalid').addClass('is-valid');
            
            // Si es un campo requerido
            if ($select.prop('required')) {
                const value = $select.val();
                if (!value || value === '') {
                    $select.removeClass('is-valid').addClass('is-invalid');
                }
            }
        });
    }

    // Configurar validación
    setupSelect2Validation();

    // Integración con Recovery para mostrar/ocultar campo de archivo
    $('#Recovery').on('select2:select', function(e) {
        // Llamada a la función existente para manejar visibilidad del campo de archivo
        if (typeof handleRecoveryFileVisibility === 'function') {
            handleRecoveryFileVisibility();
        }
    });

    // Función para reinicializar select2 después de cambios dinámicos
    window.reinitializeSelect2 = function() {
        initializeSelect2();
        initializeSpecialSelects();
    };
});