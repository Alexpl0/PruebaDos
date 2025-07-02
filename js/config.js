/**
 * Módulo de Configuración Global (config.js)
 *
 * Este módulo lee el objeto `APP_CONTEXT` inyectado por PHP y lo expone
 * de una manera limpia y segura para el resto de la aplicación JavaScript.
 * También define constantes y variables globales para compatibilidad.
 */

// Se crea un objeto global para la configuración de la aplicación.
window.PF_CONFIG = {
    // Lee el contexto del objeto global inyectado por PHP.
    // Si no existe, proporciona un objeto por defecto para usuarios no autenticados o páginas sin contexto.
    user: window.APP_CONTEXT?.user || {
        id: null,
        name: 'Guest',
        email: null,
        role: 'Visitor',
        plant: null,
        authorizationLevel: 0
    },
    
    // Lee la configuración de la app (URLs)
    app: window.APP_CONTEXT?.app || {
        baseURL: '/',
        mailerURL: '/'
    },

    // Aquí se pueden añadir más configuraciones globales en el futuro.
    version: '1.0.0'
};

// ==================================================================================
// Soporte de Legado (Legacy Support)
// Para compatibilidad con módulos más antiguos que puedan usar variables globales.
// RECOMENDACIÓN: A largo plazo, migrar los scripts antiguos para que lean directamente
// de `window.PF_CONFIG` en lugar de estas variables sueltas.
// ==================================================================================
window.PF_URL = window.PF_CONFIG.app.baseURL;
window.URLM = window.PF_CONFIG.app.mailerURL;
window.authorizationLevel = window.PF_CONFIG.user.authorizationLevel;
window.userName = window.PF_CONFIG.user.name;
window.userID = window.PF_CONFIG.user.id;
window.userPlant = window.PF_CONFIG.user.plant;

// Variables que podrías necesitar en otros módulos
window.allOrders = [];
window.originalOrders = [];

// Mensaje en consola para confirmar que la configuración se ha cargado correctamente.
console.log('PF_CONFIG initialized:', window.PF_CONFIG);
