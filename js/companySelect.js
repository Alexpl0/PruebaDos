/**
 * companySelect.js
 * Este archivo maneja la inicialización y funcionalidad de los selectores de compañías
 * para el origen y destino, incluyendo la capacidad de buscar y crear nuevas compañías.
 */

//==========================================================================================
// Función para inicializar ambos selectores de compañía (origen y destino).
// Llama a las funciones específicas para configurar cada selector.
function initializeCompanySelectors() {
    console.log("Inicializando selectores de compañía");
    
    // Primero verifica si los elementos existen
    const originSelector = document.getElementById('CompanyShip');
    const destSelector = document.getElementById('inputCompanyNameDest');
    
    if (!originSelector) {
        console.error("Elemento CompanyShip no encontrado en el DOM");
    }
    
    if (!destSelector) {
        console.error("Elemento inputCompanyNameDest no encontrado en el DOM");
    }
    
    // Luego inicializa
    if (originSelector) showCompanySelect();
    if (destSelector) showCompanyDestSelect();
    
    console.log("Inicialización de selectores de compañía completada");
}

//==========================================================================================
// Inicializa el widget Select2 para el campo de compañía de origen (CompanyShip).
// Configura la búsqueda AJAX y la opción de agregar una nueva compañía si no se encuentra.
function showCompanySelect() {
    console.log("Inicializando selector de compañía de origen con URL:", URLPF);
    console.log("Endpoint completo:", URLPF + 'dao/elements/daoLocation.php');

    // Los campos de dirección se ponen como solo lectura al inicio.
    $('#inputCityShip').prop('readonly', true);
    $('#StatesShip').prop('readonly', true);
    $('#inputZipShip').prop('readonly', true);

    // Inicializa Select2 en el elemento con ID 'CompanyShip'.
    $('#CompanyShip').select2({
        placeholder: "Search company",
        allowClear: true,
        minimumInputLength: 0,
        ajax: {
            url: URLPF + 'dao/elements/daoLocation.php', // URLPF para buscar compañías
            dataType: 'json',
            delay: 250, // Espera antes de hacer la petición
            data: function (params) {
                console.log("Enviando solicitud de búsqueda con parámetro:", params.term || '');
                // Envía el término de búsqueda al servidor
                return { q: params.term || '' };
            },
            processResults: function (data, params) {
                console.log("Respuesta del servidor para compañías:", data);
                
                // Verifica si la estructura de datos es correcta
                if (!data || !Array.isArray(data.data)) {
                    console.error("Formato de datos incorrecto:", data);
                    return { results: [] };
                }
                // Mapea los resultados para Select2
                const results = data.data.map(company => ({
                    id: company.id,
                    text: company.company_name,
                    city: company.city,
                    state: company.state,
                    zip: company.zip
                }));
                // Si no hay resultados y el usuario escribió algo, permite agregar una nueva compañía
                if (params.term && results.length === 0) {
                    results.push({
                        id: params.term,
                        text: `Add new company: "${params.term}"`,
                        isNew: true
                    });
                }
                return { results };
            },
            cache: true,
            error: function(jqXHR, textStatus, errorThrown) {
                // Maneja errores de la petición AJAX
                console.error("Error en la solicitud AJAX para compañías:", {
                    status: jqXHR.status,
                    statusText: jqXHR.statusText,
                    responseText: jqXHR.responseText,
                    error: errorThrown
                });
            }
        }
    })
    // Evento cuando se selecciona una opción en el Select2
    .on('select2:select', function(e) {
        const data = e.params.data;
        if (data) {
            if (data.isNew) {
                // Si es una nueva compañía, habilita los campos para que el usuario los llene
                $('#inputCityShip').val('').prop('readonly', false);
                $('#StatesShip').val('').prop('readonly', false);
                $('#inputZipShip').val('').prop('readonly', false);
                $('#inputCityShip').focus();
            } else {
                // Si es una compañía existente, llena los campos y los deja editables
                $('#inputCityShip').val(data.city);
                $('#StatesShip').val(data.state);
                $('#inputZipShip').val(data.zip);
                $('#inputCityShip').prop('readonly', false);
                $('#StatesShip').prop('readonly', false);
                $('#inputZipShip').prop('readonly', false);
            }
        }
        // Guarda el ID seleccionado (si aplica)
        if (!data.isNew && data.id) {
            $(this).data('selected-id', parseInt(data.id, 10));
        }
    })
    // Evento cuando se limpia el Select2
    .on('select2:clear', function() {
        // Limpia y bloquea los campos de dirección
        $('#inputCityShip').val('').prop('readonly', true);
        $('#StatesShip').val('').prop('readonly', true);
        $('#inputZipShip').val('').prop('readonly', true);
    });
}

//==========================================================================================
// Inicializa el widget Select2 para el campo de compañía de destino (inputCompanyNameDest).
// Configura la búsqueda AJAX y la opción de agregar una nueva compañía si no se encuentra.
function showCompanyDestSelect() {
    // Los campos de dirección se ponen como solo lectura al inicio.
    $('#inputCityDest').prop('readonly', true);
    $('#StatesDest').prop('readonly', true);
    $('#inputZipDest').prop('readonly', true);

    // Inicializa Select2 en el elemento con ID 'inputCompanyNameDest'.
    $('#inputCompanyNameDest').select2({
        placeholder: "Search destination company",
        allowClear: true,
        minimumInputLength: 0,
        ajax: {
            url: URLPF + 'dao/elements/daoLocation.php', // URLPF para buscar compañías
            dataType: 'json',
            delay: 250,
            data: function (params) {
                // Envía el término de búsqueda al servidor
                return { q: params.term || '' };
            },
            processResults: function (data, params) {
                // Procesa la respuesta del servidor y la adapta al formato que espera Select2
                console.log("Respuesta del servidor para compañías destino:", data);
                
                // Verifica si la estructura de datos es correcta
                if (!data || !Array.isArray(data.data)) {
                    console.error("Formato de datos incorrecto:", data);
                    return { results: [] };
                }
                // Mapea los resultados para Select2
                const results = data.data.map(company => ({
                    id: company.id,
                    text: company.company_name,
                    city: company.city,
                    state: company.state,
                    zip: company.zip
                }));
                // Si no hay resultados y el usuario escribió algo, permite agregar una nueva compañía
                if (params.term && results.length === 0) {
                    results.push({
                        id: params.term,
                        text: `Add new company: "${params.term}"`,
                        isNew: true
                    });
                }
                return { results };
            },
            cache: true,
            error: function(jqXHR, textStatus, errorThrown) {
                // Maneja errores de la petición AJAX
                console.error("Error en la solicitud AJAX para compañías destino:", {
                    status: jqXHR.status,
                    statusText: jqXHR.statusText,
                    responseText: jqXHR.responseText,
                    error: errorThrown
                });
            }
        }
    })
    // Evento cuando se selecciona una opción en el Select2
    .on('select2:select', function(e) {
        const data = e.params.data;
        if (data) {
            if (data.isNew) {
                // Si es una nueva compañía, habilita los campos para que el usuario los llene
                $('#inputCityDest').val('').prop('readonly', false);
                $('#StatesDest').val('').prop('readonly', false);
                $('#inputZipDest').val('').prop('readonly', false);
                $('#inputCityDest').focus();
            } else {
                // Si es una compañía existente, llena los campos y los deja editables
                $('#inputCityDest').val(data.city);
                $('#StatesDest').val(data.state); 
                $('#inputZipDest').val(data.zip);
                $('#inputCityDest').prop('readonly', false);
                $('#StatesDest').prop('readonly', false);
                $('#inputZipDest').prop('readonly', false);
            }
        }
        // Guarda el ID seleccionado (si aplica)
        if (!data.isNew && data.id) {
            $(this).data('selected-id', parseInt(data.id, 10));
        }
    })
    // Evento cuando se limpia el Select2
    .on('select2:clear', function() {
        // Limpia y bloquea los campos de dirección
        $('#inputCityDest').val('').prop('readonly', true);
        $('#StatesDest').val('').prop('readonly', true);
        $('#inputZipDest').val('').prop('readonly', true);
    });
}

//==========================================================================================
// Función asíncrona para guardar una nueva ubicación de compañía en la base de datos.
// Recibe los datos de la compañía y realiza una petición POST al servidor.
// Si la operación es exitosa, retorna el ID de la nueva compañía.
async function saveNewCompany(companyName, city, state, zip) {
    // Valida que todos los campos estén llenos
    if (!companyName || !city || !state || !zip) {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete Data',
            text: 'Please complete all company fields (Name, City, State and ZIP Code).'
        });
        return false;
    }
    try {
        // Realiza la petición POST al servidor para guardar la nueva compañía
        const response = await fetch(URLPF + 'dao/elements/daoAddLocation.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                company_name: companyName,
                city: city,
                state: state,
                zip: zip
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            // Si la compañía se guardó correctamente, muestra mensaje y retorna el ID
            Swal.fire({
                icon: 'success',
                title: 'Company Saved',
                text: `The company "${companyName}" has been added to the database.`
            });
            return result.company_id || true;
        } else {
            // Si hubo un error en el servidor, lanza una excepción
            throw new Error(result.message || 'Error saving company');
        }
    } catch (error) {
        // Maneja errores de red o del servidor
        console.error('Error saving new company:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not save the company: ' + error.message
        });
        return false;
    }
}

//==========================================================================================
// Verificación de disponibilidad de la variable URLPF
// En caso de que el script se cargue antes que la variable esté definida
if (typeof URLPF === 'undefined') {
    console.warn('URLPF global variable is not defined. Make sure this script runs after the URLPF is defined in your PHP page.');
    // Fallback a URLPF hardcodeada solo como último recurso
    window.URLPF = window.URLPF || 'https://grammermx.com/Logistica/PremiumFreight/';
}

// Registra la inicialización en la consola
console.log("Company selection module loaded successfully");