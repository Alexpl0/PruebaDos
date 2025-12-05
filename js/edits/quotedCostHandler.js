/**
 * quotedCostHandler.js - Quoted Cost and Approval Level Manager
 * Handles currency conversion and required_auth_level calculation
 */

import { calculateEuros, getSelectedCurrency } from './currencyUtils.js';

let currentAuthLevel = 5;
let currentCostInEuros = 0;

export function initializeQuotedCostHandler() {
    console.log('[quotedCostHandler.js] Initializing...');
    
    const quotedCostInput = document.getElementById('QuotedCost');
    
    if (!quotedCostInput) {
        console.warn('[quotedCostHandler.js] QuotedCost input not found');
        return;
    }
    
    quotedCostInput.addEventListener('input', handleQuotedCostChange);
    quotedCostInput.addEventListener('change', handleQuotedCostChange);
    
    console.log('[quotedCostHandler.js] Quoted cost listener attached');
}

async function handleQuotedCostChange() {
    const quotedCostInput = document.getElementById('QuotedCost');
    const cost = parseFloat(quotedCostInput.value);
    
    if (!quotedCostInput.value || isNaN(cost) || cost <= 0) {
        console.log('[quotedCostHandler.js] Invalid cost value');
        return;
    }
    
    console.log('[quotedCostHandler.js] Cost changed to:', cost);
    
    try {
        await calculateEuros(getSelectedCurrency());
        
        const costInEuros = window.euros || 0;
        console.log('[quotedCostHandler.js] Cost in euros:', costInEuros);
        
        const newAuthLevel = calculateRequiredAuthLevel(costInEuros);
        updateAuthLevelDisplay(newAuthLevel);
        
        currentAuthLevel = newAuthLevel;
        currentCostInEuros = costInEuros;
        
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
}

export default {
    initializeQuotedCostHandler,
    getCurrentAuthLevel,
    getCurrentCostInEuros,
    setInitialAuthLevel
};