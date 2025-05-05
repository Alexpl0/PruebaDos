//==========================================================================================
// Global variables
let euros = 0;

// Global variable for the selected currency
let selectedCurrency = "MXN"; // Default "MXN", adjust according to your logic

let range = 0; // Variable for the authorization range

//==========================================================================================
// Function to display the company selection select

async function showCompanySelect() {
    const locationURL = `https://grammermx.com/Jesus/PruebaDos/dao/elements/daoLocation.php`;
    try {
        const response = await fetch(locationURL);
        const responseData = await response.json();
        console.log("Data obtained from Location API:", responseData);

        // Assuming your data is in responseData.data
        const locations = responseData.data || [];

        // Select the select element
        const select = document.getElementById('CompanyShip');
        if (!select) return;

        // Clear the select
        select.innerHTML = '';

        // Add an option for each company
        locations.forEach(company => {
            const option = document.createElement('option');
            option.value = company.company_name;
            option.textContent = company.company_name; // Change if the correct field is different
            select.appendChild(option);

            console.log(company.company_name)
        });

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

//==========================================================================================
// Function to get the exchange rate from the API
async function getExchangeRate(currency) {
    const url = `https://api.frankfurter.dev/v1/latest?base=${currency}&symbols=EUR`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Data obtained from API:", data);

        if (data && data.rates && typeof data.rates.EUR === 'number') {
            return data.rates.EUR;
        } else {
            console.error('Unexpected API response:', data);
            return null;
        }
    } catch (error) {
        console.error('Error getting exchange rate:', error);
        return null;
    }
}

async function calculateEuros(currency) {
    const quotedCostInput = document.getElementById('QuotedCost');
    const costEurosElement = document.getElementById('CostoEuros'); // Renamed variable for clarity
    const value = parseFloat(quotedCostInput.value);

    if (!quotedCostInput.value || isNaN(value) || value <= 0) {
        costEurosElement.value = "Enter a valid cost"; // Changed textContent to value for input field
        console.log("Invalid value:", quotedCostInput.value);
        return;
    }

    const exchangeRate = await getExchangeRate(currency);
    if (!exchangeRate) {
        costEurosElement.value = "Could not get exchange rate"; // Changed textContent to value
        console.log("Could not get exchange rate");
        return;
    }

    euros = value * exchangeRate;
    costEurosElement.value = euros.toLocaleString('en-US', { style: 'currency', currency: 'EUR' }); // Use en-US locale for formatting
    console.log("Cost in Euros:", euros);
    console.log("Exchange rate:", exchangeRate);
    console.log("Entered value:", value);
    console.log("Currency:", currency);
    console.log("Formatted Cost in Euros:", costEurosElement.value);
}


//==========================================================================================
// Function to validate and send the form to the Database

function submitForm(event) { // Renamed function to submitForm
    event.preventDefault();

    // List of form fields
    const fields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'CostoEuros', 'Description',
        'Area', 'IntExt', 'PaidBy', 'CategoryCause', 'ProjectStatus', 'Recovery',
        'Weight', 'Measures', 'Products', 'Carrier', 'QuotedCost', 'Reference', 'ReferenceNumber',
        'inputCompanyNameShip', 'inputCityShip', 'StatesShip', 'inputZipShip',
        'inputCompanyNameDest', 'inputCityDest', 'StatesDest', 'inputZipDest'
    ];

    // If you want to send the visible text of these selects:
    const textFields = [
        'planta', 'codeplanta', 'transport', 'InOutBound', 'Area', 'IntExt', 'PaidBy',
        'CategoryCause', 'ProjectStatus', 'Recovery', 'Carrier'
    ];

    let data = {};
    let emptyFields = [];

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            let value = el.value;
            // Get text from select if it's in textFields list
            if (el.tagName === 'SELECT' && textFields.includes(id)) {
                value = el.options[el.selectedIndex]?.text || '';
            }
            if (typeof value === 'string') value = value.trim(); // Trim whitespace
            data[id] = value;
            // Check if the value is empty after trimming
            if (!value && value !== 0) { // Allow 0 as a valid value if needed
                 emptyFields.push(id);
            }
        } else {
             console.warn(`Element with ID '${id}' not found.`); // Warn if an element is missing
        }
    });


    // Validate empty fields
    if (emptyFields.length > 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Empty Fields',
            text: 'Please complete all fields: ' + emptyFields.join(', ')
        });
        return;
    }
    //==========================================================================================
    // Validate Range based on the value in euros (or quoted cost)
    const quotedCost = parseFloat(data['QuotedCost']); // Ensure this field is a number

    // Ensure quotedCost is a valid number before calculating the range
    if (isNaN(quotedCost)) {
         Swal.fire({
            icon: 'warning',
            title: 'Invalid Cost',
            text: 'The Quoted Cost field must be a valid number.'
        });
        return; // Stop if the cost is not valid
    }

    // --- Calculate range (removed returns) ---
    if (quotedCost <= 1500) {
        range = 3;
    } else if (quotedCost > 1500 && quotedCost <= 5000) {
        range = 4;
    } else if (quotedCost > 5000 && quotedCost <= 10000) {
        range = 6;
    } else if (quotedCost > 10000) {
        range = 7;
    } else {
        // Optional: Handle case if no condition is met
        console.warn("Could not determine the range for the cost:", quotedCost);
        range = 0; // Or an appropriate default value
    }
    // --- End range calculation ---

    console.log("Calculated Range:", range); // Verify the range is assigned

    //==========================================================================================
    // Map the data to the format expected by the table/backend
    const payload = { // Renamed 'data' to 'payload' to avoid confusion
        user_id: 1, // Change this to the actual user ID if available
        date: new Date().toISOString().slice(0, 19).replace('T', ' '), // MySQL DATETIME format
        planta: data['planta'],
        code_planta: data['codeplanta'],
        transport: data['transport'],
        in_out_bound: data['InOutBound'],
        // Ensure CostoEuros is sent as a number if required by backend, otherwise keep formatted string
        // cost_euros: euros, // Send the calculated numeric value
        cost_euros: data['CostoEuros'], // Or send the formatted string as before
        description: data['Description'],
        area: data['Area'],
        int_ext: data['IntExt'],
        paid_by: data['PaidBy'],
        category_cause: data['CategoryCause'],
        project_status: data['ProjectStatus'],
        recovery: data['Recovery'],
        weight: data['Weight'],
        measures: data['Measures'],
        products: data['Products'],
        carrier: data['Carrier'],
        quoted_cost: data['QuotedCost'], // Send as string or number depending on backend
        reference: data['Reference'],
        reference_number: data['ReferenceNumber'],
        // Assuming these IDs are placeholders or will be determined differently
        origin_id: 1,
        destiny_id: 1,
        status_id: 1, // Starts at 1 because it's new
        required_auth_level: range,
        moneda: selectedCurrency // Use the selected currency
    };

    console.log("Data to send:", JSON.stringify(payload));

    //==========================================================================================
    // Send the JSON to the backend using fetch
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFpost.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload) // Send the payload object
    })
    .then(response => {
        // Check if response is ok (status in the range 200-299)
        if (!response.ok) {
            // Try to parse error response from backend if available
            return response.json().then(err => {
                throw new Error(err.message || `Server responded with status: ${response.status}`);
            }).catch(() => {
                // If no JSON error message, throw generic error
                throw new Error(`Server responded with status: ${response.status}`);
            });
        }
        return response.json(); // Parse JSON body for successful responses
    })
    .then(result => {
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Data Saved',
                text: result.message || 'Information saved successfully.' // Provide default message
            });
            // Optionally reset the form or redirect user
            // document.getElementById('your-form-id').reset();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error Saving Data',
                text: result.message || 'Could not save the information.' // Provide default message
            });
        }
    })
    .catch(error => {
        Swal.fire({
            icon: 'error',
            title: 'Request Error',
            text: error.message || 'Error connecting to the server.' // Display specific error message
        });
        console.error('Fetch Error:', error);
    });
}


//==========================================================================================
// Function to initialize click events on currency buttons
document.addEventListener('DOMContentLoaded', function () {
    const btnMXN = document.getElementById('MXN');
    const btnUSD = document.getElementById('USD');
    showCompanySelect(); // Changed function name

    if(!btnMXN || !btnUSD) {
        console.warn("Currency buttons not found"); // Use warn for non-critical issues
        // return; // Decide if execution should stop if buttons are missing
    }

    if (btnMXN) {
        btnMXN.addEventListener('click', function () {
            calculateEuros('MXN');
            selectedCurrency = "MXN";
            btnMXN.classList.add('moneda-activa'); // Keep class name or change if needed
            if (btnUSD) btnUSD.classList.remove('moneda-activa');
            console.log("MXN button pressed");
        });
    }
    if (btnUSD) {
        btnUSD.addEventListener('click', function () {
            calculateEuros('USD');
            selectedCurrency = "USD";
            btnUSD.classList.add('moneda-activa');
            if (btnMXN) btnMXN.classList.remove('moneda-activa');
            console.log("USD button pressed");
        });
    }


    //==========================================================================================
    // Initialize the click event for the submit button
    const btnSubmit = document.getElementById('enviar'); // Assuming 'enviar' is the ID of the submit button
    if (btnSubmit) {
        btnSubmit.addEventListener('click', submitForm); // Changed function name
    } else {
        console.warn("Submit button ('enviar') not found.");
    }
});

