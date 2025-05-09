//==========================================================================================
// Global variables
// 'range' stores the authorization level required for the order.
// Using 'let' because its value will be calculated and assigned dynamically
// by the 'calculateAuthorizationRange' function based on the quoted cost.
let range = 0;

//==========================================================================================
// Asynchronous function to validate and submit form data.
// This function executes when the user clicks the form submit button.
// It orchestrates validation, processing of new companies, payload preparation,
// and final data submission to the server.
async function submitForm(event) {
    // Prevents the default form submission behavior,
    // which would normally reload the page. This allows handling the submission with JavaScript
    // asynchronously without page reloads (SPA-like behavior).
    event.preventDefault();

    // Calls the 'validateCompleteForm' function (defined in formValidation.js)
    // to perform comprehensive validation of all form fields.
    // This function returns an object containing:
    // - isValid: a boolean indicating whether the form is valid.
    // - formData: an object with the collected form data.
    // - errorMessage: a string with detailed error message if validation fails.
    const validationResult = validateCompleteForm();

    // Checks if form validation was unsuccessful.
    // 'validationResult.isValid' will be 'false' if there are validation errors (missing fields, incorrect formats, etc.).
    if (!validationResult.isValid) {
        // If validation fails, displays an alert to the user using the SweetAlert library.
        // The alert indicates missing information and shows a detailed error message.
        Swal.fire({
            icon: 'warning', // Warning icon for the alert.
            title: 'Missing Information', // Alert title.
            html: validationResult.errorMessage.replace(/\n/g, '<br>'), // Error message. Line breaks are replaced by <br> for proper HTML formatting in the alert.
            confirmButtonText: 'Complete Form' // Text for the alert's confirmation button.
        });
        return; // Stops execution of the 'submitForm' function, preventing form submission until errors are corrected.
    }

    // If validation is successful, extracts form data from the 'validationResult' object.
    // 'validationResult.formData' contains a key-value object with all form field values.
    const formData = validationResult.formData;

    // First processes any new companies the user may have entered in the origin or destination fields.
    // Calls 'processNewCompanies' (defined in formValidation.js) which handles the logic of detecting
    // if a new company was entered and, if so, saves it to the database.
    // This function is asynchronous, so 'await' is used to wait for its result.
    const processResult = await processNewCompanies();
    // Checks if there was any error during new company processing.
    if (!processResult.success) {
        // If 'processResult.success' is false, it means an error occurred (e.g., failed to save the new company).
        // In this case, execution is stopped to prevent sending inconsistent data.
        // It's assumed that 'processNewCompanies' already showed an error message to the user.
        return;
    }

    // Validates that valid IDs have been selected or created for origin and destination companies.
    // Calls 'validateCompanyIds' to obtain company IDs.
    const companyValidation = validateCompanyIds();
    // If company ID validation fails (i.e., one is missing).
    if (!companyValidation.valid) {
        // Shows an alert to the user indicating that valid companies must be selected.
        Swal.fire({
            icon: 'warning',
            title: 'Company Selection Required',
            text: 'Please select valid companies for both origin and destination.'
        });
        return; // Stops form submission.
    }

    //==========================================================================================
    // Calculates the authorization range needed based on the quoted cost.
    // First, converts the 'QuotedCost' value (which could be a string) to a floating-point number.
    const quotedCost = parseFloat(formData['QuotedCost']);
    // Calls the helper function 'calculateAuthorizationRange' to determine the authorization level.
    range = calculateAuthorizationRange(quotedCost);

    //==========================================================================================
    // Prepares the 'payload' object with the data to be sent to the backend API.
    // This object structures the form data according to what the server expects.
    const payload = {
        user_id: 1, // TODO: Replace with the dynamically authenticated user ID. This is a placeholder value.
        date: new Date().toISOString().slice(0, 19).replace('T', ' '), // Current date and time in 'YYYY-MM-DD HH:MM:SS' format.
        planta: formData['planta'], // Value of the 'planta' field.
        code_planta: formData['codeplanta'], // Value of the 'codeplanta' field.
        transport: formData['transport'], // Value of the 'transport' field.
        in_out_bound: formData['InOutBound'], // Value of the 'InOutBound' field.
        cost_euros: (typeof euros === 'number' && !isNaN(euros)) ? euros : 0, // Cost in euros. Uses the global 'euros' variable (calculated by currency conversion). Ensures it's a number; if not, uses 0.
        description: formData['Description'], // Value of the 'Description' field.
        area: formData['Area'], // Value of the 'Area' field.
        int_ext: formData['IntExt'], // Value of the 'IntExt' field.
        paid_by: formData['PaidBy'], // Value of the 'PaidBy' field.
        category_cause: formData['CategoryCause'], // Value of the 'CategoryCause' field.
        project_status: formData['ProjectStatus'], // Value of the 'ProjectStatus' field.
        recovery: formData['Recovery'], // Value of the 'Recovery' field.
        weight: formData['Weight'], // Value of the 'Weight' field.
        measures: formData['Measures'], // Value of the 'Measures' field.
        products: formData['Products'], // Value of the 'Products' field.
        carrier: formData['Carrier'], // Value of the 'Carrier' field.
        quoted_cost: quotedCost, // Quoted cost, already converted to a number.
        reference: formData['Reference'], // Value of the 'Reference' field.
        reference_number: formData['ReferenceNumber'], // Value of the 'ReferenceNumber' field.
        // Assigns the origin company ID. Prioritizes the ID of a new company if created.
        // If not, uses the selected company ID obtained from 'companyValidation'.
        origin_id: processResult.newCompanyIds.origin_id || companyValidation.originId,
        // Assigns the destination company ID. Similar to 'origin_id'.
        destiny_id: processResult.newCompanyIds.destiny_id || companyValidation.destinyId,
        status_id: 1, // Initial status ID for the order (e.g., 'Pending Approval'). This is a fixed value for now.
        required_auth_level: range, // Calculated authorization level.
        moneda: getSelectedCurrency() // Currency selected by the user (e.g., 'MXN', 'USD'), obtained from 'currencyUtils.js'.
    };

    // Critical field verification before final submission.
    // Ensures that origin and destination company IDs are present in the payload.
    if (!payload.origin_id || !payload.destiny_id) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Company Information',
            text: 'Please select or create valid companies for origin and destination.'
        });
        return; // Stops submission if any company ID is missing.
    }

    // Verifies that the cost in euros is valid (greater than zero).
    // A cost in euros of 0 or negative could indicate a problem with currency conversion.
    if (!payload.cost_euros || payload.cost_euros <= 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Currency Conversion Problem',
            text: 'There was a problem calculating the cost in Euros. Please check your connection and try again.'
        });
        return; // Stops submission if there is a problem with the cost in euros.
    }

    // Complete payload log for debugging purposes.
    // This shows in the browser console the exact object that will be sent to the server.
    console.log("Final payload being sent:", payload);

    // Additional log to verify that all data is correct and in the expected format.
    // JSON.stringify with indentation for easier reading.
    console.log("Complete validated data for submission:", JSON.stringify(payload, null, 2));
    
    // More detailed logs to debug company ID types and values.
    // Useful for tracking problems if IDs are not of the type expected by the backend.
    console.log("Origin ID Type:", typeof payload.origin_id, "Value:", payload.origin_id);
    console.log("Destination ID Type:", typeof payload.destiny_id, "Value:", payload.destiny_id);

    // Check if a recovery file upload is needed
    const recoverySelect = document.getElementById('Recovery');
    const noRecoveryValue = "NO RECOVERY"; // Adjust this value as needed
    const recoveryFile = document.getElementById('recoveryFile');
    const needsFile = recoverySelect.value !== noRecoveryValue;
    
    // Save form data first and then the file if needed
    try {
        // Send form data as is currently done
        const result = await sendFormDataAsync(payload);
        
        // If successfully saved and a file is needed
        if (result.success && needsFile && recoveryFile && recoveryFile.files && recoveryFile.files.length > 0) {
            // Create FormData for the file
            const formData = new FormData();
            formData.append('premium_freight_id', result.id); // ID returned by the server
            formData.append('recoveryFile', recoveryFile.files[0]);
            
            Swal.fire({
                title: 'Uploading recovery file...',
                text: 'Please wait.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading(); // Shows a loading indicator while uploading
                }
            });
            // Upload the file
            await uploadRecoveryFile(formData);
        }
        
        // Show success message
        Swal.fire({
            icon: 'success',
            title: 'Data Saved',
            text: 'The premium freight order was created successfully.'
        });
        
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'An error occurred while processing your request.'
        });
    }
    
    return; // Stop execution here to prevent the original sendFormData from being called
}

// Function to send form data as a promise
function sendFormDataAsync(payload) {
    return new Promise((resolve, reject) => {
        fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFpost.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || `Server responded with status: ${response.status}`);
                }).catch(() => {
                    throw new Error(`Server responded with status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(result => {
            if (result.success) {
                resolve(result);
            } else {
                reject(new Error(result.message || 'Could not save information'));
            }
        })
        .catch(error => {
            reject(error);
        });
    });
}

// Function to upload the recovery file
function uploadRecoveryFile(formData) {
    return fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoUploadRecovery.php', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error uploading file: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        if (!result.success) {
            throw new Error(result.message || 'Error uploading recovery file');
        }
        return result;
    });
}

//==========================================================================================
// Function to send form data (payload) to the backend via an HTTP request.
function sendFormData(payload) {
    // Makes a POST request to the specified endpoint on the server.
    // This endpoint is responsible for receiving and processing the new order data.
    fetch('https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPFpost.php', {
        method: 'POST', // Specifies the HTTP method as POST, since we're sending data to create a new resource.
        headers: { // HTTP headers for the request.
            'Content-Type': 'application/json', // Tells the server that the request body is in JSON format.
            'Accept': 'application/json' // Tells the server that the client expects a JSON response.
        },
        body: JSON.stringify(payload) // Converts the JavaScript 'payload' object to a JSON-formatted string. This is the request body.
    })
    .then(response => { // First promise: resolves when the server sends an initial response (headers).
        // Checks if the server response was successful (HTTP status code in the 200-299 range).
        if (!response.ok) {
            // If the response is not successful (e.g., 400, 500 error), try to parse the body as JSON
            // to get a more specific error message from the backend.
            return response.json().then(err => {
                // Throws an error using the message provided by the backend (if it exists),
                // or a generic message with the HTTP status if the backend doesn't return a structured error message.
                throw new Error(err.message || `Server responded with status: ${response.status}`);
            }).catch(() => {
                // If the error response body is not JSON or parsing fails,
                // throws a generic error with the HTTP status code.
                throw new Error(`Server responded with status: ${response.status}`);
            });
        }
        // If the response is successful (response.ok is true), parse the response body as JSON.
        // The backend is expected to return a JSON response indicating the operation result.
        return response.json();
    })
    .then(result => { // Second promise: resolves with the parsed JSON result from the response body.
        console.log("Backend response:", result); // Shows the complete backend response in the console for debugging.
        if (result.success) { // If the backend explicitly indicates the operation was successful (e.g., result.success === true).
            // Shows a success alert to the user using SweetAlert.
            Swal.fire({
                icon: 'success',
                title: 'Data Saved',
                text: 'The premium freight order and approval record were created successfully.'
            });
            // Optionally, the form could be reset after a successful submission.
            // document.getElementById('plant-form').reset(); // Uncomment this line if you want to clear the form.
        } else {
            // If the backend indicates there was an error (e.g., result.success === false or the 'success' property is missing).
            // Shows an error alert to the user with the message provided by the backend.
            Swal.fire({
                icon: 'error',
                title: 'Error Saving Data',
                text: result.message || 'Could not save the information. Please verify the details.' // Generic error message if the backend doesn't provide one.
            });
        }
    })
    .catch(error => { // Handles errors that may occur during the fetch request.
                      // This includes network errors (e.g., no internet connection) or errors thrown
                      // in the previous .then() blocks (e.g., if response.json() fails or an Error is thrown).
        console.error('Fetch Error:', error); // Shows the complete error object in the console for debugging.
        // Shows a generic error alert to the user.
        Swal.fire({
            icon: 'error',
            title: 'Request Error',
            text: error.message || 'An error occurred while communicating with the server.' // Shows the error message or a generic one.
        });
    });
}

//==========================================================================================
// Helper function to calculate the authorization range or level required
// based on the quoted cost of the order.
// Defines different cost thresholds to assign an authorization level.
function calculateAuthorizationRange(quotedCost) {
    // Ensures quotedCost is a number for comparison.
    const cost = parseFloat(quotedCost);

    if (isNaN(cost)) {
        // If the cost is not a valid number after conversion,
        // a warning is logged and a default or error range is returned.
        console.warn("Quoted cost is not a valid number:", quotedCost);
        return 0; // Range 0 could indicate an error or undefined state.
    }

    if (cost <= 1500) {
        return 3; // Authorization level 3 for costs up to 1500.
    } else if (cost > 1500 && cost <= 5000) {
        return 4; // Authorization level 4 for costs between 1500 (exclusive) and 5000 (inclusive).
    } else if (cost > 5000 && cost <= 10000) {
        return 6; // Authorization level 6 for costs between 5000 (exclusive) and 10000 (inclusive).
    } else if (cost > 10000) {
        return 7; // Authorization level 7 for costs greater than 10000.
    } else {
        // This case theoretically shouldn't be reached if 'cost' is a number,
        // since the previous conditions cover all positive numbers.
        // Could be relevant if negative or zero costs are expected with special treatment not defined.
        console.warn("Could not determine authorization range for cost:", cost);
        return 0; // Default value or to indicate an error in the range logic.
    }
}

//==========================================================================================
// Function to validate and obtain the IDs of origin and destination companies.
// Uses jQuery to interact with Select2 elements.
// Returns an object with a validity indicator and the obtained IDs.
function validateCompanyIds() {
    // Tries to get the origin company ID.
    // First, checks if there's an ID stored in the 'data-selected-id' attribute of the Select2 element.
    // This could be used if the ID is set externally or after creation.
    // If not, tries to get the ID from the current Select2 selection data.
    // Parses to integer (base 10). If there's no selection, the result will be null.
    const originCompanyId = $('#CompanyShip').data('selected-id') || 
                           ($('#CompanyShip').select2('data')[0] ? 
                            parseInt($('#CompanyShip').select2('data')[0].id, 10) : null);
    
    // Similar logic to get the destination company ID.
    const destCompanyId = $('#inputCompanyNameDest').data('selected-id') || 
                          ($('#inputCompanyNameDest').select2('data')[0] ? 
                           parseInt($('#inputCompanyNameDest').select2('data')[0].id, 10) : null);
    
    // Shows the obtained IDs in console for debugging.
    console.log("Validating company IDs - Origin:", originCompanyId, "Destination:", destCompanyId);
    
    // Returns an object with:
    // - valid: boolean that is true if both IDs (origin and destination) have a value (not null, undefined, 0, etc.).
    // - originId: the obtained origin company ID.
    // - destinyId: the obtained destination company ID.
    return {
        valid: Boolean(originCompanyId && destCompanyId), // True if both IDs are "truthy".
        originId: originCompanyId,
        destinyId: destCompanyId
    };
}

//==========================================================================================
/**
 * Handles the visibility of the recovery file upload field based on the Recovery selection.
 * Works with both standard HTML selects and Select2 components.
 */
function handleRecoveryFileVisibility() {
    try {
        // Get the recovery select element
        const recoverySelect = document.getElementById('Recovery');
        
        if (!recoverySelect) {
            console.error("Recovery select element not found");
            return;
        }
        
        // Get the file container element
        const fileContainer = document.getElementById('recoveryFileContainer');
        
        if (!fileContainer) {
            console.error("Recovery file container not found");
            return;
        }
        
        // Define the "No Recovery" text value to compare against
        const noRecoveryValue = "NO RECOVERY";
        
        // Check if Select2 is being used
        if (window.jQuery && $.fn.select2 && $(recoverySelect).data('select2')) {
            // Select2 is active - get the selected text from the Select2 container
            const select2Container = document.getElementById('select2-Recovery-container');
            
            if (select2Container) {
                const selectedText = select2Container.textContent.trim();
                console.log('Recovery selected (Select2):', selectedText);
                
                // Show/hide based on selected text
                if (selectedText !== noRecoveryValue) {
                    fileContainer.style.display = 'block';
                    console.log('Showing recovery file upload field');
                } else {
                    fileContainer.style.display = 'none';
                    // Clear any previously selected file
                    const fileInput = document.getElementById('recoveryFile');
                    if (fileInput) fileInput.value = '';
                    console.log('Hiding recovery file upload field');
                }
                return;
            }
        }
        
        // Fallback for standard select element
        const selectedOption = recoverySelect.options[recoverySelect.selectedIndex];
        const selectedText = selectedOption ? selectedOption.textContent.trim() : '';
        console.log('Recovery selected (standard):', selectedText);
        
        // Show/hide based on selected text
        if (selectedText !== noRecoveryValue) {
            fileContainer.style.display = 'block';
            console.log('Showing recovery file upload field');
        } else {
            fileContainer.style.display = 'none';
            // Clear any previously selected file
            const fileInput = document.getElementById('recoveryFile');
            if (fileInput) fileInput.value = '';
            console.log('Hiding recovery file upload field');
        }
        
    } catch (error) {
        console.error('Error in handleRecoveryFileVisibility:', error);
    }
}

//==========================================================================================
// Initializes event listeners and other configurations when the DOM (Document Object Model)
// is fully loaded and ready to be manipulated.
// This ensures that all HTML elements are available before attempting to interact with them using JavaScript.
document.addEventListener('DOMContentLoaded', function () {
    // Initializes company selectors.
    // Assumes this function 'initializeCompanySelectors' is defined in another file (possibly 'companySelect.js')
    // and handles setting up company selection fields (probably using the Select2 library).
    initializeCompanySelectors();
    
    // Initializes currency selectors.
    // Assumes this function 'initializeCurrencySelectors' is defined in another file (possibly 'currencyUtils.js')
    // and sets up functionality related to currency selection and conversion.
    initializeCurrencySelectors();

    // Sets up the form submission event.
    const btnSubmit = document.getElementById('enviar'); // Gets the form submit button by its ID 'enviar'.
    if (btnSubmit) { // Checks if the submit button was found in the DOM.
        // Adds an event listener for the 'click' event on the submit button.
        // When the button is clicked, the 'submitForm' function defined earlier is called.
        btnSubmit.addEventListener('click', submitForm);
    } else {
        // If the submit button is not found in the DOM, displays an error message in the console.
        // This helps diagnose problems if the form can't be submitted because the button doesn't exist or has an incorrect ID.
        console.error("Submit button ('enviar') not found. The form cannot be submitted.");
    }

    // Add listener for changes to the Recovery select
    const recoverySelect = document.getElementById('Recovery');
    if (recoverySelect) {
        // For standard select changes
        recoverySelect.addEventListener('change', handleRecoveryFileVisibility);
        
        // For Select2 initialization
        if (window.jQuery) {
            $(document).ready(function() {
                // For Select2 change events
                $('#Recovery').on('select2:select', handleRecoveryFileVisibility);
                
                // Initial setup with a small delay to ensure Select2 is initialized
                setTimeout(handleRecoveryFileVisibility, 300);
            });
        }
        
        // Execute on load to set the initial state
        handleRecoveryFileVisibility();
    }
    
    // Recovery file validation
    const recoveryFile = document.getElementById('recoveryFile');
    if (recoveryFile) {
        recoveryFile.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                const fileType = file.type;
                if (fileType !== 'application/pdf') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid File Type',
                        text: 'Please upload a PDF file as evidence for recovery.'
                    });
                    this.value = '';
                } else if (file.size > 10 * 1024 * 1024) { // 10MB limit
                    Swal.fire({
                        icon: 'error',
                        title: 'File Too Large',
                        text: 'The file size should not exceed 10MB.'
                    });
                    this.value = '';
                }
            }
        });
    }

    // Initialize Description field updater
    const immediateActions = document.getElementById('InmediateActions');
    const permanentActions = document.getElementById('PermanentActions');
    
    if (immediateActions && permanentActions) {
        immediateActions.addEventListener('input', updateDescription);
        permanentActions.addEventListener('input', updateDescription);
        
        // Initial update in case fields already have values
        updateDescription();
    } else {
        console.error("Description text areas not found. Description updater could not be initialized.");
    }
});

/**
 * Updates the Description field by combining Immediate and Permanent Actions
 * This function combines the values from the two visible text areas into a single hidden Description field
 */
function updateDescription() {
    const description = document.getElementById('Description');
    const immediateActions = document.getElementById('InmediateActions');
    const permanentActions = document.getElementById('PermanentActions');
    
    if (description && immediateActions && permanentActions) {
        description.value = immediateActions.value + '\n' + permanentActions.value;
    } else {
        console.error("One or more description fields not found");
    }
}