//==========================================================================================
// Global variables
let euros = 0;
let selectedCurrency = "MXN"; // Default currency
let range = 0; // Authorization range, declared with let

//==========================================================================================
// Function to initialize Select2 for CompanyShip with AJAX and add-new support

function showCompanySelect() {
    // Hacer que los campos de dirección no sean editables inicialmente
    $('#inputCityShip').prop('readonly', true);
    $('#StatesShip').prop('readonly', true); // Cambiado de 'disabled' a 'readonly' porque es un input text
    $('#inputZipShip').prop('readonly', true);
    
    $('#CompanyShip').select2({
        placeholder: "Buscar compañía",
        allowClear: true,
        minimumInputLength: 0, // Permite buscar desde el inicio, sin escribir caracteres
        ajax: {
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return { q: params.term || '' }; // Envía el término de búsqueda (puede ser vacío)
            },
            processResults: function (data, params) {
                if (!data || !Array.isArray(data.data)) {
                    console.error("Data from server is not in the expected format or data.data is missing/not an array:", data);
                    return { results: [] };
                }
                const results = data.data.map(company => ({
                    id: company.company_name,
                    text: company.company_name,
                    // Almacenamos todos los datos de la compañía para usarlos después
                    city: company.city, 
                    state: company.state,
                    zip: company.zip
                }));
                
                // Si hay un término de búsqueda y no se encontraron resultados, agregar opción para crear nueva compañía
                if (params.term && results.length === 0) {
                    results.push({
                        id: "new:" + params.term,
                        text: `Agregar nueva compañía: "${params.term}"`,
                        isNew: true
                    });
                }
                
                return { results };
            },
            cache: true,
            error: function(jqXHR, textStatus, errorThrown) {
                console.error("AJAX Error for CompanyShip:", textStatus, errorThrown, jqXHR.responseText);
            }
        }
    }).on('select2:select', function(e) {
        // Cuando se selecciona una compañía, completamos los campos automáticamente
        const data = e.params.data;
        if (data) {
            if (data.isNew) {
                // Si es una nueva compañía, extraer el nombre del ID (después de "new:")
                const companyName = data.id.substring(4); // Quita "new:"
                
                // Establecer el nombre en el campo y habilitar campos para edición
                $('#CompanyShip').val(companyName).trigger('change');
                
                // Limpiar y habilitar los campos para edición
                $('#inputCityShip').val('').prop('readonly', false);
                $('#StatesShip').val('').prop('readonly', false);
                $('#inputZipShip').val('').prop('readonly', false);
                
                // Opcional: enfocar el siguiente campo para facilitar la introducción de datos
                $('#inputCityShip').focus();
            } else {
                // Completar campos relacionados con datos existentes
                $('#inputCityShip').val(data.city);
                $('#StatesShip').val(data.state);
                $('#inputZipShip').val(data.zip);
                
                // Hacemos que los campos sean editables después de autocompletar
                $('#inputCityShip').prop('readonly', false);
                $('#StatesShip').prop('readonly', false); 
                $('#inputZipShip').prop('readonly', false);
            }
        }
    }).on('select2:clear', function() {
        // Si se limpia la selección de compañía, limpiar y desactivar los campos relacionados
        $('#inputCityShip').val('').prop('readonly', true);
        $('#StatesShip').val('').prop('readonly', true);
        $('#inputZipShip').val('').prop('readonly', true);
    });
}

//==========================================================================================
// Function to initialize Select2 for CompanyDest with AJAX and add-new support

function showCompanyDestSelect() {
    // Hacer que los campos de dirección no sean editables inicialmente
    $('#inputCityDest').prop('readonly', true);
    $('#StatesDest').prop('readonly', true); // Input de texto, usamos readonly
    $('#inputZipDest').prop('readonly', true);
    
    $('#inputCompanyNameDest').select2({
        placeholder: "Buscar compañía de destino",
        allowClear: true,
        minimumInputLength: 0, // Permite buscar desde el inicio, sin escribir caracteres
        ajax: {
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return { q: params.term || '' }; // Envía el término de búsqueda (puede ser vacío)
            },
            processResults: function (data, params) {
                if (!data || !Array.isArray(data.data)) {
                    console.error("Data from server is not in the expected format or data.data is missing/not an array:", data);
                    return { results: [] };
                }
                const results = data.data.map(company => ({
                    id: company.company_name,
                    text: company.company_name,
                    // Almacenamos todos los datos de la compañía para usarlos después
                    city: company.city, 
                    state: company.state,
                    zip: company.zip
                }));
                
                // Si hay un término de búsqueda y no se encontraron resultados, agregar opción para crear nueva compañía
                if (params.term && results.length === 0) {
                    results.push({
                        id: "new:" + params.term,
                        text: `Agregar nueva compañía: "${params.term}"`,
                        isNew: true
                    });
                }
                
                return { results };
            },
            cache: true,
            error: function(jqXHR, textStatus, errorThrown) {
                console.error("AJAX Error for CompanyDest:", textStatus, errorThrown, jqXHR.responseText);
            }
        }
    }).on('select2:select', function(e) {
        // Cuando se selecciona una compañía, completamos los campos automáticamente
        const data = e.params.data;
        if (data) {
            if (data.isNew) {
                // Si es una nueva compañía, extraer el nombre del ID (después de "new:")
                const companyName = data.id.substring(4); // Quita "new:"
                
                // Establecer el nombre en el campo y habilitar campos para edición
                $('#inputCompanyNameDest').val(companyName).trigger('change');
                
                // Limpiar y habilitar los campos para edición
                $('#inputCityDest').val('').prop('readonly', false);
                $('#StatesDest').val('').prop('readonly', false);
                $('#inputZipDest').val('').prop('readonly', false);
                
                // Opcional: enfocar el siguiente campo para facilitar la introducción de datos
                $('#inputCityDest').focus();
            } else {
                // Completar campos relacionados con datos existentes
                $('#inputCityDest').val(data.city);
                $('#StatesDest').val(data.state);
                $('#inputZipDest').val(data.zip);
                
                // Hacemos que los campos sean editables después de autocompletar
                $('#inputCityDest').prop('readonly', false);
                $('#StatesDest').prop('readonly', false);
                $('#inputZipDest').prop('readonly', false);
            }
        }
    }).on('select2:clear', function() {
        // Si se limpia la selección de compañía, limpiar y desactivar los campos relacionados
        $('#inputCityDest').val('').prop('readonly', true);
        $('#StatesDest').val('').prop('readonly', true);
        $('#inputZipDest').val('').prop('readonly', true);
    });
}

//==========================================================================================
// Function to get the exchange rate from the API
async function getExchangeRate(baseCurrency) {
    // Use EUR as the base for conversion to EUR, request the rate for the baseCurrency
    const url = `https://api.frankfurter.app/latest?from=${baseCurrency}&to=EUR`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Exchange rate data obtained from API:", data);

        if (data && data.rates && typeof data.rates.EUR === 'number') {
            return data.rates.EUR;
        } else {
            console.error('Unexpected API response format:', data);
            return null;
        }
    } catch (error) {
        console.error('Error getting exchange rate:', error);
        return null;
    }
}

//==========================================================================================
// Function to calculate and display the cost in Euros
async function calculateEuros(currency) {
    const quotedCostInput = document.getElementById('QuotedCost');
    const costEurosElement = document.getElementById('CostoEuros'); // Input field for Euros

    if (!quotedCostInput || !costEurosElement) {
        console.error("Required input elements ('QuotedCost' or 'CostoEuros') not found.");
        return;
    }

    const value = parseFloat(quotedCostInput.value);

    if (!quotedCostInput.value || isNaN(value) || value <= 0) {
        costEurosElement.value = "Enter a valid cost";
        console.log("Invalid cost value entered:", quotedCostInput.value);
        euros = 0; // Reset euros value
        return;
    }

    if (currency === 'EUR') {
        euros = value; // If the input is already EUR, no conversion needed
        costEurosElement.value = euros.toLocaleString('en-US', { style: 'currency', currency: 'EUR' });
        console.log("Cost is already in Euros:", euros);
        return;
    }

    const exchangeRate = await getExchangeRate(currency);
    if (exchangeRate === null) { // Check for null specifically
        costEurosElement.value = "Could not get exchange rate";
        console.log("Failed to retrieve exchange rate.");
        euros = 0; // Reset euros value
        return;
    }

    euros = value * exchangeRate;
    costEurosElement.value = euros.toLocaleString('en-US', { style: 'currency', currency: 'EUR' });
    console.log("Calculated Cost in Euros:", euros);
    console.log("Exchange rate used:", exchangeRate);
    console.log("Entered value:", value);
    console.log("Selected currency:", currency);
    console.log("Formatted Cost in Euros:", costEurosElement.value);
}


//==========================================================================================
// Function to validate and submit the form data
function submitForm(event) {
    event.preventDefault(); // Prevent default form submission

    // List of form field IDs
    const fields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'CostoEuros', 'Description',
        'Area', 'IntExt', 'PaidBy', 'CategoryCause', 'ProjectStatus', 'Recovery',
        'Weight', 'Measures', 'Products', 'Carrier', 'QuotedCost', 'Reference', 'ReferenceNumber',
        'CompanyShip', 'inputCityShip', 'StatesShip', 'inputZipShip',
        'inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest'
    ];

    // List of select field IDs where the visible text should be sent
    const textFields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'Area', 'IntExt', 'PaidBy',
        'CategoryCause', 'ProjectStatus', 'Recovery', 'Carrier',
        'CompanyShip', 'inputCompanyNameDest', 'StatesDest'
    ];
    
    let formData = {}; // Use a more descriptive name
    let emptyFields = [];

    // Collect data from form fields
    fields.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            let value = element.value;
            // Get selected text for specific select fields
            if (element.tagName === 'SELECT' && textFields.includes(id)) {
                value = element.options[element.selectedIndex]?.text || '';
            }
            // Trim whitespace from string values
            if (typeof value === 'string') {
                value = value.trim();
            }
            formData[id] = value;
            // Check for empty fields (allow 0 as a valid value)
            if (value === '' || value === null || value === undefined) {
                 // Exclude CostoEuros from empty check if it's calculated automatically
                 if (id !== 'CostoEuros') {
                    emptyFields.push(id);
                 }
            }
        } else {
             console.warn(`Form element with ID '${id}' not found.`);
        }
    });

    // Validate required fields
    if (emptyFields.length > 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Information',
            text: 'Please complete all required fields: ' + emptyFields.join(', ')
        });
        return; // Stop submission
    }

    //==========================================================================================
    // Validate and Calculate Authorization Range based on Quoted Cost
    // Assuming QuotedCost is the primary value for range calculation
    const quotedCost = parseFloat(formData['QuotedCost']);

    if (isNaN(quotedCost)) {
         Swal.fire({
            icon: 'warning',
            title: 'Invalid Cost',
            text: 'The "Quoted Cost" field must contain a valid number.'
        });
        return; // Stop submission
    }

    // Calculate range (ensure 'range' is declared with 'let' globally)
    if (quotedCost <= 1500) {
        range = 3;
    } else if (quotedCost > 1500 && quotedCost <= 5000) {
        range = 4;
    } else if (quotedCost > 5000 && quotedCost <= 10000) {
        range = 6;
    } else if (quotedCost > 10000) {
        range = 7;
    } else {
        // This case should ideally not be reached if quotedCost is a non-negative number
        console.warn("Could not determine the authorization range for the cost:", quotedCost);
        range = 0; // Assign a default or handle as an error
    }
    console.log("Calculated Authorization Range:", range);

    //==========================================================================================
    // Prepare payload for the backend API
    const payload = {
        user_id: 1, // TODO: Replace with actual logged-in user ID
        date: new Date().toISOString().slice(0, 19).replace('T', ' '), // Format for MySQL DATETIME
        planta: formData['planta'],
        code_planta: formData['codeplanta'],
        transport: formData['transport'],
        in_out_bound: formData['InOutBound'],
        // Send the formatted Euro string, or the calculated numeric value 'euros'
        // depending on what the backend expects. Sending the string for now.
        cost_euros: formData['CostoEuros'],
        // cost_euros: euros, // Alternative: send the numeric value
        description: formData['Description'],
        area: formData['Area'],
        int_ext: formData['IntExt'],
        paid_by: formData['PaidBy'],
        category_cause: formData['CategoryCause'],
        project_status: formData['ProjectStatus'],
        recovery: formData['Recovery'],
        weight: formData['Weight'], // Ensure backend handles potential units if included
        measures: formData['Measures'], // Ensure backend handles potential units if included
        products: formData['Products'],
        carrier: formData['Carrier'],
        // Send QuotedCost as a number if the backend expects float/decimal, otherwise string
        quoted_cost: quotedCost, // Sending the parsed number
        // quoted_cost: formData['QuotedCost'], // Alternative: send original string
        reference: formData['Reference'],
        reference_number: formData['ReferenceNumber'],
        // TODO: Determine how origin_id and destiny_id should be set
        // Maybe based on selected company names or codes? Requires backend logic or more frontend data.
        origin_id: 1, // Placeholder
        destiny_id: 1, // Placeholder
        status_id: 1, // Default status for new entries
        required_auth_level: range,
        moneda: selectedCurrency // Use the globally selected currency ('MXN' or 'USD')
    };

    console.log("Data to send to backend:", JSON.stringify(payload, null, 2)); // Pretty print JSON

    //==========================================================================================
    // Send data to the backend using Fetch API
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFpost.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json' // Often good practice to include Accept header
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        // Check if the response status indicates success
        if (!response.ok) {
            // Try to parse error details from the response body
            return response.json().then(err => {
                // Throw an error with the message from the backend, or a default server status message
                throw new Error(err.message || `Server responded with status: ${response.status}`);
            }).catch(() => {
                // If the response body isn't JSON or parsing fails, throw a generic error
                throw new Error(`Server responded with status: ${response.status}`);
            });
        }
        // If response is ok, parse the JSON body
        return response.json();
    })
    .then(result => {
        console.log("Backend response:", result);
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Data Saved',
                text: result.message || 'Information saved successfully.'
            });
            // Optionally reset the form after successful submission
            // document.getElementById('your-form-id').reset(); // Replace 'your-form-id' with your actual form ID
        } else {
            // Handle cases where the backend indicates failure (e.g., validation error)
            Swal.fire({
                icon: 'error',
                title: 'Error Saving Data',
                text: result.message || 'Could not save the information. Please check the details.'
            });
        }
    })
    .catch(error => {
        // Handle network errors or errors thrown during response processing
        console.error('Fetch Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Request Error',
            text: error.message || 'An error occurred while communicating with the server.'
        });
    });
}


//==========================================================================================
// Function to save a new company location to the database
async function saveNewCompany(companyName, city, state, zip, isDestination = false) {
    // Validar que todos los campos tengan valor
    if (!companyName || !city || !state || !zip) {
        Swal.fire({
            icon: 'warning',
            title: 'Datos incompletos',
            text: 'Por favor complete todos los campos de la compañía (Nombre, Ciudad, Estado y Código Postal).'
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
                title: 'Compañía guardada',
                text: `La compañía "${companyName}" ha sido agregada a la base de datos.`
            });
            
            // Actualizamos el select con el valor actual (ya que ahora existe en la BD)
            if (isDestination) {
                // Crear una nueva opción que no tenga el prefijo "new:"
                const newOption = new Option(companyName, companyName, true, true);
                $('#inputCompanyNameDest').append(newOption).trigger('change');
            } else {
                // Crear una nueva opción que no tenga el prefijo "new:"
                const newOption = new Option(companyName, companyName, true, true);
                $('#CompanyShip').append(newOption).trigger('change');
            }
            
            return true;
        } else {
            throw new Error(result.message || 'Error al guardar la compañía');
        }
    } catch (error) {
        console.error('Error saving new company:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar la compañía: ' + error.message
        });
        return false;
    }
}

//==========================================================================================
// Initialize event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Inicializamos los selectores de compañía
    showCompanySelect();
    showCompanyDestSelect();
    
    const btnMXN = document.getElementById('MXN');
    const btnUSD = document.getElementById('USD');
    const btnSubmit = document.getElementById('enviar'); // Submit button

    // Initial population of company select
    showCompanySelect();
    showCompanyDestSelect(); // Añadir esta línea

    // --- Currency Button Event Listeners ---
    if (btnMXN) {
        btnMXN.addEventListener('click', function () {
            calculateEuros('MXN'); // Recalculate Euros based on QuotedCost
            selectedCurrency = "MXN";
            btnMXN.classList.add('moneda-activa');
            if (btnUSD) btnUSD.classList.remove('moneda-activa');
            console.log("MXN currency selected");
        });
        // Set initial active state if MXN is default
        if (selectedCurrency === "MXN") {
             btnMXN.classList.add('moneda-activa');
        }
    } else {
        console.warn("MXN currency button not found.");
    }

    if (btnUSD) {
        btnUSD.addEventListener('click', function () {
            calculateEuros('USD'); // Recalculate Euros based on QuotedCost
            selectedCurrency = "USD";
            btnUSD.classList.add('moneda-activa');
            if (btnMXN) btnMXN.classList.remove('moneda-activa');
            console.log("USD currency selected");
        });
         // Set initial active state if USD is default (adjust if needed)
        if (selectedCurrency === "USD") {
             btnUSD.classList.add('moneda-activa');
        }
    } else {
        console.warn("USD currency button not found.");
    }

    // --- Submit Button Event Listener ---
    if (btnSubmit) {
        btnSubmit.addEventListener('click', submitForm);
    } else {
        console.error("Submit button ('enviar') not found. Form cannot be submitted.");
    }

    // --- Optional: Recalculate Euros when QuotedCost changes ---
    const quotedCostInput = document.getElementById('QuotedCost');
    if (quotedCostInput) {
        quotedCostInput.addEventListener('input', function() {
            // Recalculate using the currently selected currency
            calculateEuros(selectedCurrency);
        });
    }
});