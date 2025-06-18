// Project: Logger utility for Mi Impresora Web

window.MiImpresoraWeb = window.MiImpresoraWeb || {};

window.MiImpresoraWeb.Logger = class Logger {
    constructor() {
        this.startTime = performance.now();
    }
    
    error(error, context = '', additionalData = {}) {
        const timestamp = new Date().toISOString();
        const executionTime = (performance.now() - this.startTime).toFixed(2);
        
        console.error(`[${timestamp}] [${executionTime}ms] ERROR in ${context}:`, error);
        
        if (Object.keys(additionalData).length > 0) {
            console.error('Additional data:', additionalData);
        }
        
        // También mostrar el stack trace si está disponible
        if (error && error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
    
    warning(message, context = '', data = {}) {
        const timestamp = new Date().toISOString();
        const executionTime = (performance.now() - this.startTime).toFixed(2);
        
        console.warn(`[${timestamp}] [${executionTime}ms] WARNING in ${context}: ${message}`);
        
        if (Object.keys(data).length > 0) {
            console.warn('Data:', data);
        }
    }
    
    info(message, context = '', data = {}) {
        const timestamp = new Date().toISOString();
        const executionTime = (performance.now() - this.startTime).toFixed(2);
        
        console.info(`[${timestamp}] [${executionTime}ms] INFO in ${context}: ${message}`);
        
        if (Object.keys(data).length > 0) {
            console.info('Data:', data);
        }
    }
    
    success(message, context = '', data = {}) {
        const timestamp = new Date().toISOString();
        const executionTime = (performance.now() - this.startTime).toFixed(2);
        
        console.log(`%c[${timestamp}] [${executionTime}ms] SUCCESS in ${context}: ${message}`, 
                   'color: green; font-weight: bold;');
        
        if (Object.keys(data).length > 0) {
            console.log('Data:', data);
        }
    }
};