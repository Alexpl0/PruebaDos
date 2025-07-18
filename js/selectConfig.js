/**
 * selectConfig.js
 * -------------------------------------------
 * Configura todos los elementos select del formulario como componentes Select2
 * con funcionalidad de búsqueda en tiempo real.
 * * MODIFICADO: Se excluyen los selects que tienen su propio archivo de configuración
 * para evitar conflictos de inicialización.
 */

document.addEventListener('DOMContentLoaded', function() {
    //==========================================================================
    // CONFIGURACIÓN GLOBAL Y UTILIDADES
    //==========================================================================
    
    $.fn.select2.defaults.set('language', {
        noResults: function() {
            return "No results found";
        },
        searching: function() {
            return "Searching...";
        }
    });
    
    const escapeRegExp = function(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    //==========================================================================
    // FUNCIONES DE FORMATEO
    //==========================================================================
    
    function formatSearchResult(option) {
        if (!option.id || !option.text) return option.text;
        
        const term = $('.select2-search__field').val() || '';
        if (!term.trim()) return option.text;
        
        try {
            const $result = $('<span></span>');
            const safeSearchTerm = escapeRegExp(term);
            const regex = new RegExp('(' + safeSearchTerm + ')', 'gi');
            
            $result.html(option.text.replace(regex, '<span class="select2-match">$1</span>'));
            
            return $result;
        } catch (e) {
            console.warn('Error al formatear resultado de búsqueda:', e);
            return option.text;
        }
    }

    function formatSelection(option) {
        if (!option.id) return option.text;
        
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = option.text || '';
            return tempDiv.textContent || tempDiv.innerText || option.text;
        } catch (e) {
            console.warn('Error al formatear selección:', e);
            return option.text;
        }
    }

    //==========================================================================
    // INICIALIZACIÓN DE SELECT2
    //==========================================================================
    
    function initializeSelect2() {
        // ======================= INICIO DE LA MODIFICACIÓN =======================
        // Se excluyen los selects con configuración propia: Company, Carrier y ReferenceOrder.
        const excludedSelectors = '#CompanyShip, #inputCompanyNameDest, #Carrier, #ReferenceOrder';
        // ======================== FIN DE LA MODIFICACIÓN =========================

        $('select').not(excludedSelectors).each(function() {
            const $select = $(this);
            
            if (!$select.hasClass('select2-hidden-accessible')) {
                $select.select2({
                    width: '100%',
                    placeholder: $select.find('option:first-child').text() || 'Select an option',
                    allowClear: false,
                    minimumResultsForSearch: 5,
                    dropdownParent: $select.parent(),
                    templateResult: formatSearchResult,
                    templateSelection: formatSelection
                });
                
                $select.trigger('select2:initialized');
            }
        });
    }

    //==========================================================================
    // MANEJO DE EVENTOS Y ACTUALIZACIONES DINÁMICAS
    //==========================================================================
    
    function setupSelect2Events() {
        $(document).on('optionsLoaded', 'select', function() {
            const $select = $(this);
            
            if ($select.hasClass('select2-hidden-accessible')) {
                $select.select2('destroy');
            }
            
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

        if ($('#Recovery').length) {
            $('#Recovery').on('select2:select', function(e) {
                if (typeof handleRecoveryFileVisibility === 'function') {
                    handleRecoveryFileVisibility();
                }
            });
        }
    }

    function setupSelect2Validation() {
        $(document).on('select2:select', 'select', function() {
            const $select = $(this);
            
            $select.removeClass('is-invalid').addClass('is-valid');
            
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
    
    function initializeAll() {
        try {
            initializeSelect2();
            setupSelect2Events();
            setupSelect2Validation();
            console.log('Generic Select2 initialized successfully on applicable elements.');
        } catch (error) {
            console.error('Error initializing generic Select2:', error);
        }
    }
    
    initializeAll();
});
