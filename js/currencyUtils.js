/**
 * currencyUtils.js
 * Currency management utilities for Special Freight Authorization form
 * Handles currency selection, conversion, and calculation of costs in Euros
 */

//==========================================================================================
// Global variables for currency and cost management
let euros = 0;                  // Stores the calculated cost in Euros, updated by calculateEuros
let selectedCurrency = "MXN";   // Default selected currency

/**
 * Gets the currently selected currency
 * @returns {string} The current currency code (MXN, USD, EUR)
 */
function getSelectedCurrency() {
    return selectedCurrency;
}

//==========================================================================================
/**
 * Initializes currency selectors and sets up event listeners
 * Configures buttons, active states, and automatic Euro calculation
 */
function initializeCurrencySelectors() {
    // Get currency buttons from the DOM
    const btnMXN = document.getElementById('MXN');
    const btnUSD = document.getElementById('USD');
    const btnEUR = document.getElementById('EUR');
    const currencyButtons = document.querySelectorAll('#Divisa button');
    
    // Function to update active button state
    function updateActiveButtonState(newCurrency) {
        currencyButtons.forEach(btn => {
            if (btn.id === newCurrency || btn.textContent === newCurrency) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    // Configure MXN button
    if (btnMXN) {
        btnMXN.addEventListener('click', function () {
            calculateEuros('MXN');
            selectedCurrency = "MXN";
            updateActiveButtonState('MXN');
            console.log("MXN currency selected");
        });
    } else {
        console.warn("MXN currency button not found");
    }

    // Configure USD button
    if (btnUSD) {
        btnUSD.addEventListener('click', function () {
            calculateEuros('USD');
            selectedCurrency = "USD";
            updateActiveButtonState('USD');
            console.log("USD currency selected");
        });
    } else {
        console.warn("USD currency button not found");
    }
    
    // Configure EUR button if present
    if (btnEUR) {
        btnEUR.addEventListener('click', function () {
            calculateEuros('EUR');
            selectedCurrency = "EUR";
            updateActiveButtonState('EUR');
            console.log("EUR currency selected");
        });
    }

    // Add listener to QuotedCost input for automatic Euro calculation
    const quotedCostInput = document.getElementById('QuotedCost');
    if (quotedCostInput) {
        quotedCostInput.addEventListener('input', function() {
            calculateEuros(selectedCurrency);
        });
    }
    
    // Set initial active state based on default currency
    updateActiveButtonState(selectedCurrency);
}

//==========================================================================================
/**
 * Asynchronously fetches exchange rates from Frankfurter API
 * Converts from base currency to EUR
 * 
 * @param {string} baseCurrency - Base currency code (MXN, USD, etc.)
 * @returns {number|null} Exchange rate or null if request fails
 */
async function getExchangeRate(baseCurrency) {
    // If the base currency is already EUR, return 1 (no conversion needed)
    if (baseCurrency === 'EUR') return 1;
    
    const url = `https://api.frankfurter.app/latest?from=${baseCurrency}&to=EUR`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Exchange rate data obtained:", data);

        if (data?.rates?.EUR && typeof data.rates.EUR === 'number') {
            return data.rates.EUR;
        } else {
            console.error('Unexpected API response format:', data);
            return null;
        }
    } catch (error) {
        console.error('Error getting exchange rate:', error);
        
        // Fallback to hardcoded rates if API fails
        const fallbackRates = {
            'MXN': 0.054,  // 1 MXN ≈ 0.054 EUR as of May 2023
            'USD': 0.92    // 1 USD ≈ 0.92 EUR as of May 2023
        };
        
        if (fallbackRates[baseCurrency]) {
            console.warn(`Using fallback exchange rate for ${baseCurrency}: ${fallbackRates[baseCurrency]}`);
            return fallbackRates[baseCurrency];
        }
        
        return null;
    }
}

//==========================================================================================
/**
 * Calculates and displays cost in Euros based on the quoted cost and selected currency
 * Updates the global 'euros' variable with the calculated value
 * 
 * @param {string} currency - Selected currency code (MXN, USD, EUR)
 */
async function calculateEuros(currency) {
    const quotedCostInput = document.getElementById('QuotedCost');
    const costEurosElement = document.getElementById('CostoEuros');

    if (!quotedCostInput || !costEurosElement) {
        console.error("Required elements not found for Euro calculation");
        return;
    }

    const value = parseFloat(quotedCostInput.value);

    if (!quotedCostInput.value || isNaN(value) || value <= 0) {
        costEurosElement.value = "Enter a valid cost";
        console.log("Invalid cost value:", quotedCostInput.value);
        euros = 0;
        return;
    }

    // If currency is already EUR, no conversion needed
    if (currency === 'EUR') {
        euros = value;
        costEurosElement.value = formatCurrency(euros, 'EUR');
        console.log("Cost is already in Euros:", euros);
        return;
    }

    try {
        // Show loading indicator while fetching exchange rate
        costEurosElement.value = "Loading...";
        
        const exchangeRate = await getExchangeRate(currency);
        
        if (exchangeRate === null) {
            costEurosElement.value = "Exchange rate unavailable";
            console.error("Failed to retrieve exchange rate");
            euros = 0;
            return;
        }

        // Calculate and display cost in Euros
        euros = value * exchangeRate;
        costEurosElement.value = formatCurrency(euros, 'EUR');
        
        console.log(`Converted ${formatCurrency(value, currency)} to ${formatCurrency(euros, 'EUR')}`);
        console.log(`Exchange rate: 1 ${currency} = ${exchangeRate} EUR`);
        
    } catch (error) {
        console.error("Error during Euro calculation:", error);
        costEurosElement.value = "Calculation error";
        euros = 0;
    }
}

//==========================================================================================
/**
 * Formats a number as a currency string
 * 
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - Currency code (MXN, USD, EUR)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currencyCode) {
    return amount.toLocaleString('en-US', { 
        style: 'currency', 
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

//==========================================================================================
/**
 * Updates the selected currency and active button state
 * 
 * @param {string} currency - Currency code to set as active
 */
function updateCurrency(currency) {
    if (!['MXN', 'USD', 'EUR'].includes(currency)) {
        console.warn(`Invalid currency: ${currency}`);
        return;
    }
    
    selectedCurrency = currency;
    calculateEuros(currency);
    
    // Update active button state
    const currencyButtons = document.querySelectorAll('#Divisa button');
    currencyButtons.forEach(btn => {
        if (btn.id === currency || btn.textContent === currency) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    console.log(`Currency updated to ${currency}`);
}