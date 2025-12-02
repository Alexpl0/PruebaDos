/**
 * referenceSelect.js (Updated Version)
 * ------------------------------------
 * Manages the initialization of the Reference Order Select2 component.
 * It supports two modes, which can be switched dynamically:
 * 1. Full Mode: Preloads all valid order numbers from the server and allows creating new ones (tags).
 * 2. Limited Mode: Shows a predefined, static list of specific order numbers for recovery scenarios.
 *
 * This file is an ES6 module and exports the necessary functions to be controlled from newOrder.js.
 */

/**
 * Helper function to get the base URL from the global config object.
 */
function getBaseUrl() {
    if (window.PF_CONFIG && window.PF_CONFIG.app && window.PF_CONFIG.app.baseURL) {
        return window.PF_CONFIG.app.baseURL;
    }
    console.warn("PF_CONFIG.app.baseURL not found, using a fallback URL.");
    return 'https://grammermx.com/Logistica/PremiumFreight/';
}

/**
 * Check if current user should have full access
 * User ID 303 gets full access, others get limited
 */
function shouldHaveFullAccess() {
    if (window.PF_CONFIG && window.PF_CONFIG.user && window.PF_CONFIG.user.id) {
        return window.PF_CONFIG.user.id === 303;
    }
    return false;
}

/**
 * ✅ LISTA DE ÓRDENES QUE REQUIEREN INPUT ADICIONAL
 */
const ORDERS_REQUIRING_ADDITIONAL_REFERENCE = [
    '347427',
    '486406',
    '346506',
    '346507',
    '346508',
    '485869',
    '485870',
    '485871'
];

/**
 * ✅ MAPEO DE IDs QUE REQUIEREN INPUT ADICIONAL
 * Basado en el ID de la base de datos, no en el número de orden
 */
const IDS_REQUIRING_ADDITIONAL_REFERENCE = [
    1,    // 346506
    2,    // 346507
    3,    // 346508
    5,    // 485869
    6,    // 485870
    7,    // 485871
    38,   // 485871 (duplicado con ID diferente)
    42,   // 486406
    43    // 347427
];

/**
 * ✅ FUNCIÓN ACTUALIZADA: Validar por ID, no por texto
 * Mostrar/ocultar input adicional para referencia complementaria
 */
function showAdditionalReferenceInput() {
    const $select = $('#ReferenceOrder');
    
    // ✅ CAMBIO: Obtener el ID del objeto Select2, no el value
    const selectedData = $select.select2('data');
    const selectedId = selectedData && selectedData.length > 0 ? selectedData[0].id : null;
    
    const $container = $('#additionalReferenceContainer');

    if (!$container.length) {
        console.warn('Container #additionalReferenceContainer not found');
        return;
    }

    // ✅ CAMBIO: Validar por ID numérico
    const requiresAdditionalReference = selectedId && IDS_REQUIRING_ADDITIONAL_REFERENCE.includes(parseInt(selectedId, 10));

    if (selectedId && requiresAdditionalReference) {
        console.log(`✅ Orden con ID ${selectedId} requiere referencia adicional`);
        $container.show();
        const $input = $('#AdditionalReference');
        $input.val(''); // Limpiar el valor anterior
        $input.focus();
    } else {
        if (selectedId) {
            console.log(`ℹ️ Orden con ID ${selectedId} NO requiere referencia adicional`);
        }
        $container.hide();
        $('#AdditionalReference').val('');
    }
}

/**
 * Initializes the Reference Order selector with FULL functionality.
 * It preloads all order numbers and allows users to create new ones.
 * This is the default mode.
 */
export function initializeFullReferenceSelector() {
    const $select = $('#ReferenceOrder');
    if (!$select.length) {
        console.error("Critical Error: The #ReferenceOrder element was not found.");
        return;
    }

    // If Select2 is already initialized, destroy it to re-configure.
    if ($select.hasClass("select2-hidden-accessible")) {
        $select.select2('destroy');
        $select.empty();
    }

    fetch(getBaseUrl() + 'dao/elements/daoNumOrders.php')
        .then(response => {
            if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
            return response.json();
        })
        .then(apiResponse => {
            if (apiResponse && apiResponse.status === 'success' && Array.isArray(apiResponse.data)) {
                // ✅ Asegurar que los datos tengan ID y text correctos
                const sanitizedData = apiResponse.data.map(item => ({
                    id: String(item.id || ''),
                    text: String(item.text || item.numero || item.numero_orden || '')
                }));

                console.log('[referenceSelect.js] ✅ Loaded orders:', sanitizedData);

                $select.select2({
                    width: '100%',
                    placeholder: 'Search and select an order number',
                    data: sanitizedData,
                    tags: false,
                    dropdownParent: $select.parent()
                });

                // ✅ Evento change para mostrar/ocultar input adicional
                $select.on('change', function() {
                    showAdditionalReferenceInput();
                });

            } else {
                throw new Error("Invalid data format received for reference orders.");
            }
        })
        .catch(error => {
            console.error("Failed to load or initialize the full reference selector:", error);
            $select.select2({
                width: '100%',
                placeholder: 'Error loading. Please try again.',
                tags: false,
                dropdownParent: $select.parent()
            });
        });
}

/**
 * Initializes the Reference Order selector with a LIMITED, static list of options.
 * This is used when a "Recovery" option is selected.
 */
export function initializeLimitedReferenceSelector() {
    const $select = $('#ReferenceOrder');
    if (!$select.length) {
        console.error("Critical Error: The #ReferenceOrder element was not found.");
        return;
    }

    // If Select2 is already initialized, destroy it to re-configure.
    if ($select.hasClass("select2-hidden-accessible")) {
        $select.select2('destroy');
        $select.empty();
    }

    // ✅ ACTUALIZADO: Usar el mapeo correcto de ID => número de orden
    const limitedData = [
        { id: '42', text: '486406' },
        { id: '43', text: '347427' },
        { id: '1', text: '346506' },
        { id: '2', text: '346507' },
        { id: '3', text: '346508' },
        { id: '5', text: '485869' },
        { id: '6', text: '485870' },
        { id: '7', text: '485871' },
        { id: '350', text: '349188' }  // ID 38 mapped to '349188'
    ];

    $select.select2({
        width: '100%',
        placeholder: 'Select a recovery order number',
        data: limitedData,
        tags: false,
        dropdownParent: $select.parent()
    });

    // ✅ Evento change para mostrar/ocultar input adicional
    $select.on('change', function() {
        showAdditionalReferenceInput();
    });
}

/**
 * Main initialization function to be called on page load.
 * Checks user ID and initializes accordingly.
 */
export function initializeReferenceSelector() {
    if (shouldHaveFullAccess()) {
        console.log('✅ User 303 detected - granting full reference order access');
        initializeFullReferenceSelector();
    } else {
        console.log('📋 Standard user - using full reference order selector');
        initializeFullReferenceSelector();
    }
}
