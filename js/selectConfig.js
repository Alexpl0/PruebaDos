/**
 * selectConfig.js
 * -------------------------------------------
 * Configura todos los elementos select del formulario como componentes Select2
 * con funcionalidad de búsqueda en tiempo real.
 * 
 * Características principales:
 * - Convierte selects estándar en componentes Select2 interactivos
 * - Implementa búsqueda con resaltado visual durante la selección
 * - Elimina el resaltado al mostrar la opción seleccionada
 * - Maneja casos especiales para ciertos elementos del formulario
 * - Integra con la validación del formulario
 */

document.addEventListener('DOMContentLoaded', function() {
    //==========================================================================
    // CONFIGURACIÓN GLOBAL Y UTILIDADES
    //==========================================================================
    
    // Configuración global para todos los selects
    $.fn.select2.defaults.set('language', {
        noResults: function() {
            return "No results found";
        },
        searching: function() {
            return "Searching...";
        }
    });
    
    // Función auxiliar para escapar caracteres especiales en términos de búsqueda
    // Por si $.escapeSelector no está disponible en versiones antiguas de jQuery
    const escapeRegExp = function(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    //==========================================================================
    // FUNCIONES DE FORMATEO
    //==========================================================================
    
    /**
     * Formatea opciones durante la búsqueda, CON resaltado visual
     * @param {Object} option - Opción del select a formatear
     * @return {jQuery|HTMLElement} - Elemento con resaltado aplicado
     */
    function formatSearchResult(option) {
        if (!option.id || !option.text) return option.text; // Manejo de opciones inválidas
        
        const term = $('.select2-search__field').val() || '';
        if (!term.trim()) return option.text;
        
        try {
            // Crear un elemento jQuery para poder insertar HTML de forma segura
            const $result = $('<span></span>');
            const safeSearchTerm = escapeRegExp(term);
            const regex = new RegExp('(' + safeSearchTerm + ')', 'gi');
            
            // Usar html() en lugar de text() para interpretar las etiquetas HTML
            $result.html(option.text.replace(regex, '<span class="select2-match">$1</span>'));
            
            return $result;
        } catch (e) {
            console.warn('Error al formatear resultado de búsqueda:', e);
            return option.text; // Si hay error, devolver texto sin formato
        }
    }

    /**
     * Formatea la opción seleccionada, SIN resaltado visual
     * @param {Object} option - Opción seleccionada a formatear
     * @return {String} - Texto limpio sin resaltado
     */
    function formatSelection(option) {
        if (!option.id) return option.text;
        
        // Asegurar que se devuelve texto puro sin ningún resaltado
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = option.text || '';
            return tempDiv.textContent || tempDiv.innerText || option.text;
        } catch (e) {
            console.warn('Error al formatear selección:', e);
            return option.text; // Si hay error, devolver texto original
        }
    }

    //==========================================================================
    // INICIALIZACIÓN DE SELECT2
    //==========================================================================
    
    /**
     * Inicializa Select2 en todos los selects estándar
     * Excluye los que tienen configuración especial
     */
    function initializeSelect2() {
        // Selects estándar (excluyendo los que ya tienen configuración especial)
        $('select').not('#CompanyShip, #inputCompanyNameDest').each(function() {
            const $select = $(this);
            
            // Solo inicializar si no está ya inicializado
            if (!$select.hasClass('select2-hidden-accessible')) {
                $select.select2({
                    width: '100%',
                    placeholder: $select.find('option:selected').text() || 'Select an option',
                    allowClear: false,
                    minimumResultsForSearch: 5, // Solo muestra búsqueda si hay más de 5 opciones
                    dropdownParent: $select.parent(),
                    templateResult: formatSearchResult,
                    templateSelection: formatSelection
                });
                
                // Evento para notificar que se ha inicializado
                $select.trigger('select2:initialized');
            }
        });
    }

    /**
     * Inicializa selects con configuración especial
     * (Reference, Measures, etc.)
     */
    function initializeSpecialSelects() {
        // Referencia - Select con tamaño personalizado
        if ($('#Reference').length && !$('#Reference').hasClass('select2-hidden-accessible')) {
            $('#Reference').select2({
                width: '100%',
                minimumResultsForSearch: Infinity, // Deshabilita búsqueda por ser pocos elementos
                dropdownParent: $('#Reference').parent(),
                templateResult: formatSearchResult,
                templateSelection: formatSelection
            });
        }

        // Medidas - Select con tamaño personalizado
        if ($('#Measures').length && !$('#Measures').hasClass('select2-hidden-accessible')) {
            $('#Measures').select2({
                width: '100%',
                minimumResultsForSearch: Infinity, // Deshabilita búsqueda por ser pocos elementos
                dropdownParent: $('#Measures').parent(),
                templateResult: formatSearchResult,
                templateSelection: formatSelection
            });
        }
    }

    //==========================================================================
    // MANEJO DE EVENTOS Y ACTUALIZACIONES DINÁMICAS
    //==========================================================================
    
    /**
     * Configura los eventos para validación y comportamiento de Select2
     */
    function setupSelect2Events() {
        // Actualización dinámica cuando se agregan/cargan opciones
        $(document).on('optionsLoaded', 'select', function() {
            const $select = $(this);
            
            // Reinicializar si ya estaba usando select2
            if ($select.hasClass('select2-hidden-accessible')) {
                $select.select2('destroy');
            }
            
            // Inicializar nuevamente con opciones actualizadas
            $select.select2({
                width: '100%',
                placeholder: $select.find('option:selected').text() || 'Select an option',
                allowClear: false,
                minimumResultsForSearch: 5,
                dropdownParent: $select.parent(),
                templateResult: formatSearchResult,
                templateSelection: formatSelection
            });
        });

        // Manejo especial para Recovery que debe activar visibilidad de otros campos
        if ($('#Recovery').length) {
            $('#Recovery').on('select2:select', function(e) {
                if (typeof handleRecoveryFileVisibility === 'function') {
                    handleRecoveryFileVisibility();
                }
            });
        }
    }

    /**
     * Configura la validación para componentes Select2
     */
    function setupSelect2Validation() {
        // Validación al seleccionar
        $(document).on('select2:select', 'select', function() {
            const $select = $(this);
            
            // Actualizar clases de validación
            $select.removeClass('is-invalid').addClass('is-valid');
            
            // Verificar si está vacío y es requerido
            if ($select.prop('required')) {
                const value = $select.val();
                if (!value || value === '') {
                    $select.removeClass('is-valid').addClass('is-invalid');
                }
            }
        });
    }

    //==========================================================================
    // INICIALIZACIÓN PRINCIPAL
    //==========================================================================
    
    // Inicializar todos los componentes Select2
    function initializeAll() {
        try {
            // Paso 1: Inicializar selects estándar
            initializeSelect2();
            
            // Paso 2: Inicializar selects especiales
            initializeSpecialSelects();
            
            // Paso 3: Configurar eventos y validación
            setupSelect2Events();
            setupSelect2Validation();
            
            console.log('Select2 initialized successfully');
        } catch (error) {
            console.error('Error initializing Select2:', error);
        }
    }
    
    // Ejecutar inicialización
    initializeAll();

    //==========================================================================
    // API PÚBLICA
    //==========================================================================
    
    /**
     * Expone método para reinicializar Select2 después de cambios dinámicos en el DOM
     * Esta función puede ser llamada desde cualquier parte de la aplicación
     */
    window.reinitializeSelect2 = function() {
        console.log('Reinitializing Select2 components...');
        initializeAll();
    };

    /**
     * Initialize Select2 for all standard select elements
     */
    function initializeSelect2Elements() {
        // Initialize Select2 for all selects except those excluded
        $('select').not('.no-select2').each(function() {
            const $this = $(this);
            
            // Apply Select2 with standard configuration
            $this.select2({
                width: '100%',
                placeholder: $this.attr('placeholder') || 'Select an option',
                allowClear: true
            });
            
            // For Recovery select, add special handling
            if ($this.attr('id') === 'Recovery') {
                $this.on('select2:select', function() {
                    if (typeof handleRecoveryFileVisibility === 'function') {
                        console.log("Select2 Recovery selection changed, calling visibility handler");
                        setTimeout(handleRecoveryFileVisibility, 100);
                    }
                });
            }
        });
        
        // Special additional handling after all Select2 elements are initialized
        setTimeout(function() {
            // Call recovery visibility handler if it exists
            if (typeof handleRecoveryFileVisibility === 'function') {
                handleRecoveryFileVisibility();
            }
        }, 300);
    }

    // Call this function when the document is ready
    $(document).ready(function() {
        initializeSelect2Elements();
    });

    //==========================================================================
    // REINICIALIZACIÓN DE SELECTORES DE COMPAÑÍA
    //==========================================================================
    
    // Función específica para reinicializar los selectores de compañía
    window.reinitializeCompanySelectors = function() {
        console.log("Reinicializando selectores de compañía");
        
        // Destruir instancias previas si existen
        if ($('#CompanyShip').data('select2')) {
            $('#CompanyShip').select2('destroy');
        }
        
        if ($('#inputCompanyNameDest').data('select2')) {
            $('#inputCompanyNameDest').select2('destroy');
        }
        
        // Reinicializar
        if (typeof initializeCompanySelectors === 'function') {
            initializeCompanySelectors();
        } else {
            console.error("Función initializeCompanySelectors no disponible");
        }
    };

    // Asegúrate de que los selectores de compañía se inicialicen después de Select2
    $(document).ready(function() {
        // Esperar un momento para asegurar que Select2 se ha cargado completamente
        setTimeout(function() {
            if (typeof initializeCompanySelectors === 'function') {
                console.log("Inicializando selectores de compañía después de carga completa");
                initializeCompanySelectors();
            }
        }, 500);
    });
});