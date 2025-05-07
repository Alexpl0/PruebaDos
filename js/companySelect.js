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
    // El usuario no podrá editar estos campos hasta que seleccione una compañía o decida agregar una nueva.
    $('#inputCityShip').prop('readonly', true); // Campo de ciudad de origen.
    $('#StatesShip').prop('readonly', true); // Campo de estado de origen.
    $('#inputZipShip').prop('readonly', true); // Campo de código postal de origen.
    
    // Inicializa Select2 en el elemento con ID 'CompanyShip'.
    $('#CompanyShip').select2({
        placeholder: "Search company", // Texto que se muestra antes de escribir.
        allowClear: true, // Permite borrar la selección actual.
        minimumInputLength: 0, // Permite iniciar la búsqueda sin escribir caracteres (muestra todos al abrir).
        ajax: { // Configuración para la búsqueda de datos vía AJAX.
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php', // URL del script PHP que devuelve los datos de las compañías.
            dataType: 'json', // Tipo de datos esperado del servidor.
            delay: 250, // Retraso en milisegundos antes de realizar la petición AJAX después de que el usuario deja de escribir.
            data: function (params) { // Función para construir los parámetros de la petición AJAX.
                return { q: params.term || '' }; // Envía el término de búsqueda (params.term) o una cadena vacía si no hay término.
            },
            processResults: function (data, params) { // Función para procesar los resultados recibidos del servidor.
                // Verifica si la respuesta del servidor tiene el formato esperado.
                if (!data || !Array.isArray(data.data)) {
                    console.error("Los datos del servidor no tienen el formato esperado o data.data falta o no es un array:", data);
                    return { results: [] }; // Devuelve un array vacío si hay un problema.
                }
                // Mapea los datos recibidos al formato que Select2 espera.
                const results = data.data.map(company => ({
                    id: company.company_name, // El valor único para la opción.
                    text: company.company_name, // El texto que se muestra en la opción.
                    // Almacena datos adicionales de la compañía para usarlos después.
                    city: company.city, 
                    state: company.state,
                    zip: company.zip
                }));
                
                // Si hay un término de búsqueda y no se encontraron resultados,
                // agrega una opción para crear una nueva compañía.
                if (params.term && results.length === 0) {
                    results.push({
                        id: params.term, // El ID será el propio término de búsqueda (nombre de la nueva compañía).
                        text: `Add new company: "${params.term}"`, // Texto para la opción de agregar.
                        isNew: true // Propiedad personalizada para identificar esta opción como "nueva compañía".
                    });
                }
                
                return { results }; // Devuelve los resultados procesados a Select2.
            },
            cache: true, // Habilita el almacenamiento en caché de las respuestas AJAX para evitar peticiones repetidas.
            error: function(jqXHR, textStatus, errorThrown) { // Función para manejar errores de la petición AJAX.
                console.error("Error AJAX para CompanyShip:", textStatus, errorThrown, jqXHR.responseText);
            }
        }
    }).on('select2:select', function(e) { // Evento que se dispara cuando se selecciona una opción.
        const data = e.params.data; // Obtiene los datos de la opción seleccionada.
        if (data) {
            if (data.isNew) { // Si la opción seleccionada es para agregar una nueva compañía.
                const companyName = data.id; // El nombre de la compañía es el ID que se estableció.
                
                // Limpia los campos de dirección y los habilita para edición.
                $('#inputCityShip').val('').prop('readonly', false);
                $('#StatesShip').val('').prop('readonly', false);
                $('#inputZipShip').val('').prop('readonly', false);
                
                // Opcional: enfoca el campo de ciudad para facilitar la entrada de datos.
                $('#inputCityShip').focus();
            } else { // Si se seleccionó una compañía existente.
                // Autocompleta los campos de dirección con los datos de la compañía.
                $('#inputCityShip').val(data.city);
                $('#StatesShip').val(data.state);
                $('#inputZipShip').val(data.zip);
                
                // Habilita los campos de dirección para que puedan ser editados si es necesario.
                $('#inputCityShip').prop('readonly', false);
                $('#StatesShip').prop('readonly', false); 
                $('#inputZipShip').prop('readonly', false);
            }
        }
    }).on('select2:clear', function() { // Evento que se dispara cuando se borra la selección.
        // Limpia los campos de dirección y los vuelve a poner como de solo lectura.
        $('#inputCityShip').val('').prop('readonly', true);
        $('#StatesShip').val('').prop('readonly', true);
        $('#inputZipShip').val('').prop('readonly', true);
    });
}

//==========================================================================================
// Función para inicializar el widget Select2 para el campo de compañía de destino (inputCompanyNameDest).
// Similar a showCompanySelect, pero para los campos de destino.
function showCompanyDestSelect() {
    // Establece los campos de dirección de destino como de solo lectura inicialmente.
    $('#inputCityDest').prop('readonly', true);
    $('#StatesDest').prop('readonly', true);
    $('#inputZipDest').prop('readonly', true);
    
    // Inicializa Select2 en el elemento con ID 'inputCompanyNameDest'.
    $('#inputCompanyNameDest').select2({
        placeholder: "Search destination company", // Texto placeholder.
        allowClear: true, // Permite borrar la selección.
        minimumInputLength: 0, // Permite búsqueda sin escribir.
        ajax: { // Configuración AJAX.
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php', // Endpoint para datos de compañías.
            dataType: 'json', // Tipo de datos esperado.
            delay: 250, // Retraso para la petición.
            data: function (params) { // Parámetros de la petición.
                return { q: params.term || '' }; // Término de búsqueda.
            },
            processResults: function (data, params) { // Procesamiento de resultados.
                if (!data || !Array.isArray(data.data)) {
                    console.error("Los datos del servidor no tienen el formato esperado o data.data falta o no es un array:", data);
                    return { results: [] };
                }
                const results = data.data.map(company => ({
                    id: company.company_name,
                    text: company.company_name,
                    city: company.city, 
                    state: company.state,
                    zip: company.zip
                }));
                
                if (params.term && results.length === 0) { // Opción para agregar nueva compañía.
                    results.push({
                        id: params.term,
                        text: `Add new company: "${params.term}"`,
                        isNew: true
                    });
                }
                
                return { results };
            },
            cache: true, // Habilitar caché.
            error: function(jqXHR, textStatus, errorThrown) { // Manejo de errores AJAX.
                console.error("Error AJAX para CompanyDest:", textStatus, errorThrown, jqXHR.responseText);
            }
        }
    }).on('select2:select', function(e) { // Evento al seleccionar una opción.
        const data = e.params.data;
        if (data) {
            if (data.isNew) { // Si es una nueva compañía.
                const companyName = data.id;
                
                // Limpiar y habilitar campos de dirección de destino.
                $('#inputCityDest').val('').prop('readonly', false);
                $('#StatesDest').val('').prop('readonly', false);
                $('#inputZipDest').val('').prop('readonly', false);
                
                $('#inputCityDest').focus(); // Enfocar campo de ciudad de destino.
            } else { // Si es una compañía existente.
                // Autocompletar y habilitar campos de dirección de destino.
                $('#inputCityDest').val(data.city);
                $('#StatesDest').val(data.state);
                $('#inputZipDest').val(data.zip);
                
                $('#inputCityDest').prop('readonly', false);
                $('#StatesDest').prop('readonly', false);
                $('#inputZipDest').prop('readonly', false);
            }
        }
    }).on('select2:clear', function() { // Evento al borrar la selección.
        // Limpiar y deshabilitar (solo lectura) campos de dirección de destino.
        $('#inputCityDest').val('').prop('readonly', true);
        $('#StatesDest').val('').prop('readonly', true);
        $('#inputZipDest').val('').prop('readonly', true);
    });
}

//==========================================================================================
// Función asíncrona para guardar una nueva ubicación de compañía en la base de datos.
// Recibe el nombre de la compañía, ciudad, estado, código postal y un booleano opcional para indicar si es destino.
// Modify the saveNewCompany function to return the company ID from the server response
async function saveNewCompany(companyName, city, state, zip, isDestination = false) {
    // Valida que todos los campos necesarios tengan valor.
    if (!companyName || !city || !state || !zip) {
        Swal.fire({ // Muestra una alerta si faltan datos.
            icon: 'warning',
            title: 'Incomplete Data',
            text: 'Please complete all company fields (Name, City, State and Zip Code).'
        });
        return false; // Retorna falso indicando que no se guardó.
    }
    
    try {
        // Realiza una petición POST al script PHP para agregar la nueva ubicación.
        const response = await fetch('https://grammermx.com/Jesus/PruebaDos/dao/elements/daoAddLocation.php', {
            method: 'POST', // Método de la petición.
            headers: {
                'Content-Type': 'application/json', // Indica que el cuerpo es JSON.
            },
            body: JSON.stringify({ // Cuerpo de la petición con los datos de la compañía.
                company_name: companyName,
                city: city,
                state: state,
                zip: zip
            })
        });
        
        const result = await response.json(); // Parsea la respuesta del servidor como JSON.
        
        if (result.status === 'success') { // Si el servidor indica que la operación fue exitosa.
            Swal.fire({ // Muestra una alerta de éxito.
                icon: 'success',
                title: 'Company Saved',
                text: `The company "${companyName}" has been added to the database.`
            });
            
            // Return the new company ID if provided by the server
            return result.company_id || true;
        } else {
            // Si el servidor indica un error, lanza una excepción con el mensaje del servidor.
            throw new Error(result.message || 'Error saving company');
        }
    } catch (error) { // Captura errores de la petición fetch o excepciones lanzadas.
        console.error('Error al guardar nueva compañía:', error);
        Swal.fire({ // Muestra una alerta de error.
            icon: 'error',
            title: 'Error',
            text: 'Could not save the company: ' + error.message
        });
        return false; // Retorna falso indicando que no se guardó.
    }
}