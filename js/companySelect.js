//==========================================================================================
// Función para inicializar ambos selectores de compañía (origen y destino).
// Llama a las funciones específicas para configurar cada selector.
function initializeCompanySelectors() {
    showCompanySelect(); // Inicializa el selector de compañía de origen.
    showCompanyDestSelect(); // Inicializa el selector de compañía de destino.
}

//==========================================================================================
// Función para inicializar el widget Select2 para el campo de compañía de origen (CompanyShip).
// Configura la búsqueda AJAX y la opción de agregar una nueva compañía si no se encuentra.
function showCompanySelect() {
    // Establece los campos de dirección como de solo lectura inicialmente.
    $('#inputCityShip').prop('readonly', true);
    $('#StatesShip').prop('readonly', true);
    $('#inputZipShip').prop('readonly', true);

    // Inicializa Select2 en el elemento con ID 'CompanyShip'.
    $('#CompanyShip').select2({
        placeholder: "Search company",
        allowClear: true,
        minimumInputLength: 0,
        ajax: {
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return { q: params.term || '' };
            },
            processResults: function (data, params) {
                if (!data || !Array.isArray(data.data)) {
                    console.error("Los datos del servidor no tienen el formato esperado o data.data falta o no es un array:", data);
                    return { results: [] };
                }
                const results = data.data.map(company => ({
                    id: company.id,
                    text: company.company_name,
                    city: company.city,
                    state: company.state,
                    zip: company.zip
                }));
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
                console.error("Error AJAX para CompanyShip:", textStatus, errorThrown, jqXHR.responseText);
            }
        }
    }).on('select2:select', function(e) {
        const data = e.params.data;
        if (data) {
            if (data.isNew) {
                $('#inputCityShip').val('').prop('readonly', false);
                $('#StatesShip').val('').prop('readonly', false);
                $('#inputZipShip').val('').prop('readonly', false);
                $('#inputCityShip').focus();
            } else {
                $('#inputCityShip').val(data.city);
                $('#StatesShip').val(data.state);
                $('#inputZipShip').val(data.zip);
                $('#inputCityShip').prop('readonly', false);
                $('#StatesShip').prop('readonly', false);
                $('#inputZipShip').prop('readonly', false);
            }
        }
        if (!data.isNew && data.id) {
            $(this).data('selected-id', parseInt(data.id, 10));
        }
    }).on('select2:clear', function() {
        $('#inputCityShip').val('').prop('readonly', true);
        $('#StatesShip').val('').prop('readonly', true);
        $('#inputZipShip').val('').prop('readonly', true);
    });
}

//==========================================================================================
// Función para inicializar el widget Select2 para el campo de compañía de destino (inputCompanyNameDest).
function showCompanyDestSelect() {
    $('#inputCityDest').prop('readonly', true);
    $('#StatesDest').prop('readonly', true);
    $('#inputZipDest').prop('readonly', true);

    $('#inputCompanyNameDest').select2({
        placeholder: "Search destination company",
        allowClear: true,
        minimumInputLength: 0,
        ajax: {
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return { q: params.term || '' };
            },
            processResults: function (data, params) {
                if (!data || !Array.isArray(data.data)) {
                    console.error("Los datos del servidor no tienen el formato esperado o data.data falta o no es un array:", data);
                    return { results: [] };
                }
                const results = data.data.map(company => ({
                    id: company.id,
                    text: company.company_name,
                    city: company.city,
                    state: company.state,
                    zip: company.zip
                }));
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
                console.error("Error AJAX para CompanyDest:", textStatus, errorThrown, jqXHR.responseText);
            }
        }
    }).on('select2:select', function(e) {
        const data = e.params.data;
        if (data) {
            if (data.isNew) {
                $('#inputCityDest').val('').prop('readonly', false);
                $('#StatesDest').val('').prop('readonly', false);
                $('#inputZipDest').val('').prop('readonly', false);
                $('#inputCityDest').focus();
            } else {
                $('#inputCityDest').val(data.city);
                $('#StatesDest').val(data.state);
                $('#inputZipDest').val(data.zip);
                $('#inputCityDest').prop('readonly', false);
                $('#StatesDest').prop('readonly', false);
                $('#inputZipDest').prop('readonly', false);
            }
        }
        if (!data.isNew && data.id) {
            $(this).data('selected-id', parseInt(data.id, 10));
        }
    }).on('select2:clear', function() {
        $('#inputCityDest').val('').prop('readonly', true);
        $('#StatesDest').val('').prop('readonly', true);
        $('#inputZipDest').val('').prop('readonly', true);
    });
}

//==========================================================================================
// Función asíncrona para guardar una nueva ubicación de compañía en la base de datos.
async function saveNewCompany(companyName, city, state, zip) {
    if (!companyName || !city || !state || !zip) {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete Data',
            text: 'Please complete all company fields (Name, City, State and Zip Code).'
        });
        return false;
    }
    try {
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
            Swal.fire({
                icon: 'success',
                title: 'Company Saved',
                text: `The company "${companyName}" has been added to the database.`
            });
            return result.company_id || true;
        } else {
            throw new Error(result.message || 'Error saving company');
        }
    } catch (error) {
        console.error('Error al guardar nueva compañía:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not save the company: ' + error.message
        });
        return false;
    }
}

//==========================================================================================
// Intercepta el submit del formulario para manejar compañías nuevas en origen y destino
$('#myForm').on('submit', async function(e) {
    // Detecta si la compañía de origen es nueva
    const companyShipData = $('#CompanyShip').select2('data')[0];
    // Detecta si la compañía de destino es nueva
    const companyDestData = $('#inputCompanyNameDest').select2('data')[0];

    let newCompanyShipId = null;
    let newCompanyDestId = null;
    let needSubmit = false;

    // Si alguna es nueva, detenemos el submit
    if ((companyShipData && companyShipData.isNew) || (companyDestData && companyDestData.isNew)) {
        e.preventDefault();

        // Guardar compañía de origen si es nueva
        if (companyShipData && companyShipData.isNew) {
            const companyName = companyShipData.id;
            const city = $('#inputCityShip').val();
            const state = $('#StatesShip').val();
            const zip = $('#inputZipShip').val();
            newCompanyShipId = await saveNewCompany(companyName, city, state, zip);
            if (newCompanyShipId) {
                const newOption = new Option(companyName, newCompanyShipId, true, true);
                $('#CompanyShip').append(newOption).trigger('change');
                needSubmit = true;
            } else {
                needSubmit = false;
            }
        }

        // Guardar compañía de destino si es nueva
        if (companyDestData && companyDestData.isNew) {
            const companyName = companyDestData.id;
            const city = $('#inputCityDest').val();
            const state = $('#StatesDest').val();
            const zip = $('#inputZipDest').val();
            newCompanyDestId = await saveNewCompany(companyName, city, state, zip);
            if (newCompanyDestId) {
                const newOption = new Option(companyName, newCompanyDestId, true, true);
                $('#inputCompanyNameDest').append(newOption).trigger('change');
                needSubmit = true;
            } else {
                needSubmit = false;
            }
        }

        // Si ambas compañías nuevas se guardaron correctamente, o solo una era nueva y se guardó, envía el formulario
        if (needSubmit) {
            this.submit();
        }
        // Si alguna falla, no se envía el formulario
    }
    // Si ninguna es nueva, el submit sigue normal
});