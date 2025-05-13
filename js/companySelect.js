//==========================================================================================
// Función para inicializar ambos selectores de compañía (origen y destino).
// Llama a las funciones específicas para configurar cada selector.
function initializeCompanySelectors() {
    showCompanySelect();      // Inicializa el selector de compañía de origen.
    showCompanyDestSelect();  // Inicializa el selector de compañía de destino.
}

//==========================================================================================
// Inicializa el widget Select2 para el campo de compañía de origen (CompanyShip).
// Configura la búsqueda AJAX y la opción de agregar una nueva compañía si no se encuentra.
function showCompanySelect() {
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
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php', // URL para buscar compañías
            dataType: 'json',
            delay: 250, // Espera antes de hacer la petición
            data: function (params) {
                // Envía el término de búsqueda al servidor
                return { q: params.term || '' };
            },
            processResults: function (data, params) {
                // Procesa la respuesta del servidor y la adapta al formato que espera Select2
                if (!data || !Array.isArray(data.data)) {
                    console.error("Server data format is incorrect or missing data.data array:", data);
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
                    console.log("Adding new company option:", results);
                }
                return { results };
            },
            cache: true,
            error: function(jqXHR, textStatus, errorThrown) {
                // Maneja errores de la petición AJAX
                console.error("AJAX error for CompanyShip:", textStatus, errorThrown, jqXHR.responseText);
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
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php', // URL para buscar compañías
            dataType: 'json',
            delay: 250,
            data: function (params) {
                // Envía el término de búsqueda al servidor
                return { q: params.term || '' };
            },
            processResults: function (data, params) {
                // Procesa la respuesta del servidor y la adapta al formato que espera Select2
                if (!data || !Array.isArray(data.data)) {
                    console.error("Server data format is incorrect or missing data.data array:", data);
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
                console.error("AJAX error for CompanyDest:", textStatus, errorThrown, jqXHR.responseText);
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
            text: 'Please complete all company fields (Name, City, State and Zip Code).'
        });
        return false;
    }
    try {
        // Realiza la petición POST al servidor para guardar la nueva compañía
        const response = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/elements/daoAddLocation.php', {
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