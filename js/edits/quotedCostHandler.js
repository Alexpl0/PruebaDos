/**
 * quotedCostHandler.js - Quoted Cost and Approval Level Manager
 * Handles currency conversion and required_auth_level calculation
 * Includes currency functions from currencyUtils.js (ES6 version)
 */

let currentAuthLevel = 5;
let currentCostInEuros = 0;
let selectedCurrency = 'MXN';

async function getExchangeRate(baseCurrency) {
    if (baseCurrency === 'EUR') return 1;
    
    const url = `https://api.frankfurter.app/latest?from=${baseCurrency}&to=EUR`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[quotedCostHandler.js] Exchange rate data:', data);

        if (data?.rates?.EUR && typeof data.rates.EUR === 'number') {
            return data.rates.EUR;
        } else {
            console.error('[quotedCostHandler.js] Unexpected API response format:', data);
            return null;
        }
    } catch (error) {
        console.error('[quotedCostHandler.js] Error getting exchange rate:', error);
        
        const fallbackRates = {
            'MXN': 0.054,
            'USD': 0.92
        };
        
        if (fallbackRates[baseCurrency]) {
            console.warn(`[quotedCostHandler.js] Using fallback exchange rate for ${baseCurrency}: ${fallbackRates[baseCurrency]}`);
            return fallbackRates[baseCurrency];
        }
        
        return null;
    }
}

function formatCurrency(amount, currencyCode) {
    return amount.toLocaleString('en-US', { 
        style: 'currency', 
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function calculateEurosValue(currency) {
    const quotedCostInput = document.getElementById('QuotedCost');
    const costEurosElement = document.getElementById('CostoEuros');

    if (!quotedCostInput || !costEurosElement) {
        console.error('[quotedCostHandler.js] Required elements not found for Euro calculation');
        return 0;
    }

    const value = parseFloat(quotedCostInput.value);

    if (!quotedCostInput.value || isNaN(value) || value <= 0) {
        costEurosElement.value = 'Enter a valid cost';
        console.log('[quotedCostHandler.js] Invalid cost value:', quotedCostInput.value);
        return 0;
    }

    if (currency === 'EUR') {
        currentCostInEuros = value;
        costEurosElement.value = formatCurrency(value, 'EUR');
        console.log('[quotedCostHandler.js] Cost is already in Euros:', value);
        return value;
    }

    try {
        costEurosElement.value = 'Loading...';
        
        const exchangeRate = await getExchangeRate(currency);
        
        if (exchangeRate === null) {
            costEurosElement.value = 'Exchange rate unavailable';
            console.error('[quotedCostHandler.js] Failed to retrieve exchange rate');
            return 0;
        }

        currentCostInEuros = value * exchangeRate;
        costEurosElement.value = formatCurrency(currentCostInEuros, 'EUR');
        
        console.log(`[quotedCostHandler.js] Converted ${formatCurrency(value, currency)} to ${formatCurrency(currentCostInEuros, 'EUR')}`);
        console.log(`[quotedCostHandler.js] Exchange rate: 1 ${currency} = ${exchangeRate} EUR`);
        
        return currentCostInEuros;
        
    } catch (error) {
        console.error('[quotedCostHandler.js] Error during Euro calculation:', error);
        costEurosElement.value = 'Calculation error';
        return 0;
    }
}

export function initializeQuotedCostHandler() {
    console.log('[quotedCostHandler.js] Initializing...');
    
    const quotedCostInput = document.getElementById('QuotedCost');
    const currencyButtons = document.querySelectorAll('#Divisa button');
    
    if (!quotedCostInput) {
        console.warn('[quotedCostHandler.js] QuotedCost input not found');
        return;
    }
    
    quotedCostInput.addEventListener('input', handleQuotedCostChange);
    quotedCostInput.addEventListener('change', handleQuotedCostChange);
    
    currencyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const currency = btn.id || btn.textContent.trim();
            if (['MXN', 'USD', 'EUR'].includes(currency)) {
                selectedCurrency = currency;
                handleQuotedCostChange();
            }
        });
    });
    
    console.log('[quotedCostHandler.js] Quoted cost listener attached');
}

async function handleQuotedCostChange() {
    const quotedCostInput = document.getElementById('QuotedCost');
    const cost = parseFloat(quotedCostInput.value);
    
    if (!quotedCostInput.value || isNaN(cost) || cost <= 0) {
        console.log('[quotedCostHandler.js] Invalid cost value');
        return;
    }
    
    console.log('[quotedCostHandler.js] Cost changed to:', cost, 'Currency:', selectedCurrency);
    
    try {
        const eurosValue = await calculateEurosValue(selectedCurrency);
        
        console.log('[quotedCostHandler.js] Cost in euros:', eurosValue);
        
        const newAuthLevel = calculateRequiredAuthLevel(eurosValue);
        updateAuthLevelDisplay(newAuthLevel);
        
        currentAuthLevel = newAuthLevel;
        currentCostInEuros = eurosValue;
        
    } catch (error) {
        console.error('[quotedCostHandler.js] Error handling cost change:', error);
    }
}

function calculateRequiredAuthLevel(costInEuros) {
    if (costInEuros <= 1500) return 5;
    if (costInEuros <= 5000) return 6;
    if (costInEuros <= 10000) return 7;
    return 8;
}

function updateAuthLevelDisplay(authLevel) {
    let displayElement = document.getElementById('requiredAuthLevelDisplay');
    
    if (!displayElement) {
        displayElement = createAuthLevelDisplay();
    }
    
    if (!displayElement) {
        console.warn('[quotedCostHandler.js] Could not create auth level display');
        return;
    }
    
    const levelDescriptions = {
        5: 'Level 5 (€0 - €1,500)',
        6: 'Level 6 (€1,501 - €5,000)',
        7: 'Level 7 (€5,001 - €10,000)',
        8: 'Level 8 (€10,001+)'
    };
    
    displayElement.innerHTML = `
        <strong>Required Approval Level:</strong> ${levelDescriptions[authLevel] || 'Unknown'}
    `;
    
    displayElement.style.color = '#034C8C';
    displayElement.style.fontWeight = 'bold';
    displayElement.style.marginTop = '8px';
    
    console.log('[quotedCostHandler.js] Auth level updated to:', authLevel);
}

function createAuthLevelDisplay() {
    const container = document.getElementById('DivCosto');
    
    if (!container) {
        console.warn('[quotedCostHandler.js] DivCosto container not found');
        return null;
    }
    
    const display = document.createElement('div');
    display.id = 'requiredAuthLevelDisplay';
    display.style.marginTop = '8px';
    display.style.padding = '10px';
    display.style.backgroundColor = '#f8f9fa';
    display.style.borderRadius = '4px';
    display.style.borderLeft = '3px solid #034C8C';
    
    container.appendChild(display);
    
    console.log('[quotedCostHandler.js] Auth level display created');
    
    return display;
}

export function getCurrentAuthLevel() {
    return currentAuthLevel;
}

export function getCurrentCostInEuros() {
    return currentCostInEuros;
}

export function setInitialAuthLevel(orderData) {
    if (!orderData || !orderData.required_auth_level) {
        console.warn('[quotedCostHandler.js] No required_auth_level in order data');
        currentAuthLevel = 5;
        return;
    }
    
    currentAuthLevel = parseInt(orderData.required_auth_level);
    console.log('[quotedCostHandler.js] Initial auth level set to:', currentAuthLevel);
    
    updateAuthLevelDisplay(currentAuthLevel);
}

export default {
    initializeQuotedCostHandler,
    getCurrentAuthLevel,
    getCurrentCostInEuros,
    setInitialAuthLevel
};