//==========================================================================================
// Global variables
let euros = 0;
let selectedCurrency = "MXN"; // Default currency
let range = 0; // Authorization range, declared with let

//==========================================================================================
// Function to initialize Select2 for CompanyShip with AJAX and add-new support
/*
function showCompanySelect() {
    $('#CompanyShip').select2({
        placeholder: "Buscar o agregar compañía",
        allowClear: true,
        minimumInputLength: 1, // Empieza a buscar desde el primer carácter
        ajax: {
            url: 'https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php',
            dataType: 'json',
            delay: 20,
            data: function (params) {
                return { q: params.term || '' };
            },
            processResults: function (data) {
                // Ajusta según la estructura de tu respuesta
                const results = (data.data || []).map(company => ({
                    id: company.company_name,
                    text: company.company_name
                }));
                return { results };
            },
            cache: true
        },
        tags: true,
        createTag: function (params) {
            return {
                id: params.term,
                text: 'Agregar nueva compañía: "' + params.term + '"',
                newOption: true
            };
        },
        templateResult: function (data) {
            if (data.newOption) {
                return $('<span style="color:green;">' + data.text + '</span>');
            }
            return data.text;
        },
        templateSelection: function (data) {
            return data.text.replace(/^Agregar nueva compañía: "/, '').replace(/"$/, '');
        }
    });
*/
    // Evento cuando se selecciona una opción (existente o nueva)
    $('#CompanyShip').on('select2:select', function (e) {
        const data = e.params.data;
        if (data.newOption) {
            // Llama al endpoint para registrar la nueva compañía
            fetch('https://grammermx.com/Jesus/PruebaDos/dao/elements/addCompany.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_name: data.id })
            })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    // Reemplaza la opción temporal por la definitiva
                    const newOption = new Option(data.id, data.id, true, true);
                    $('#CompanyShip').append(newOption).trigger('change');
                    Swal.fire('¡Compañía agregada!', '', 'success');
                } else {
                    Swal.fire('Error', result.message, 'error');
                    // Limpia la selección si hubo error
                    $('#CompanyShip').val(null).trigger('change');
                }
            })
            .catch(() => {
                Swal.fire('Error', 'No se pudo registrar la compañía.', 'error');
                $('#CompanyShip').val(null).trigger('change');
            });
        }
    });
//}

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
        'inputCompanyNameShip', 'inputCityShip', 'StatesShip', 'inputZipShip',
        'inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest'
    ];

    // List of select field IDs where the visible text should be sent
    const textFields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'Area', 'IntExt', 'PaidBy',
        'CategoryCause', 'ProjectStatus', 'Recovery', 'Carrier'
        // Add 'StatesShip', 'StatesDest' if you want their text, otherwise their value (abbreviation?) will be sent
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
// Initialize event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    const btnMXN = document.getElementById('MXN');
    const btnUSD = document.getElementById('USD');
    const btnSubmit = document.getElementById('enviar'); // Submit button

    // Initial population of company select
    showCompanySelect();

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