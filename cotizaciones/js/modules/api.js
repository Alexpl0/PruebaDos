/**
 * Módulo de API - Portal de Cotización Inteligente
 * Manejo de todas las comunicaciones con el backend
 * UPDATED: Correct paths and database schema
 * @author Alejandro Pérez
 */

import Utils from './utils.js';
import Notifications from './notifications.js';

const API = {
    
    /**
     * Configuración base para fetch
     */
    baseConfig: {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'same-origin'
    },

    /**
     * Realiza una petición HTTP genérica
     * @param {string} endpoint 
     * @param {Object} data 
     * @param {Object} config 
     * @returns {Promise}
     */
    async request(endpoint, data = {}, config = {}) {
        // FIXED: Ensure correct path construction
        const url = endpoint.startsWith('http') ? endpoint : `cotizaciones/${endpoint}`;
        
        const requestConfig = {
            ...this.baseConfig,
            ...config,
            body: JSON.stringify(data)
        };

        try {
            console.log(`📡 API Request: ${url}`, data);
            
            const response = await fetch(url, requestConfig);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseData = await response.json();
            
            console.log(`✅ API Response: ${url}`, responseData);
            
            return responseData;
            
        } catch (error) {
            console.error(`❌ API Error: ${url}`, error);
            Utils.handleError(error, `API request to ${url}`);
            throw error;
        }
    },

    /**
     * Manejo de respuestas de API estandarizado
     * @param {Promise} apiPromise 
     * @param {Object} options 
     * @returns {Promise}
     */
    async handleResponse(apiPromise, options = {}) {
        const {
            showLoading = false,
            showSuccessMessage = false,
            successMessage = 'Operación completada exitosamente',
            showErrorMessage = true,
            onSuccess = null,
            onError = null
        } = options;

        if (showLoading) {
            Notifications.loading();
        }

        try {
            const response = await apiPromise;
            
            if (showLoading) {
                Notifications.close();
            }

            if (response.success) {
                if (showSuccessMessage) {
                    Notifications.toastSuccess(successMessage);
                }
                
                if (onSuccess && typeof onSuccess === 'function') {
                    onSuccess(response.data);
                }
                
                return response.data;
            } else {
                throw new Error(response.message || 'Error desconocido');
            }
            
        } catch (error) {
            if (showLoading) {
                Notifications.close();
            }
            
            if (showErrorMessage) {
                Notifications.toastError(error.message || 'Ha ocurrido un error');
            }
            
            if (onError && typeof onError === 'function') {
                onError(error);
            }
            
            throw error;
        }
    },

    // ==================== ENDPOINTS ESPECÍFICOS ====================

    /**
     * Envía una nueva solicitud de cotización (método tradicional)
     * @param {Object} requestData 
     * @returns {Promise}
     */
    async sendShippingRequest(requestData) {
        return this.handleResponse(
            this.request('dao/daoSendRequest.php', requestData),
            {
                showLoading: true,
                showSuccessMessage: true,
                successMessage: 'Solicitud enviada correctamente. Se han notificado los transportistas.',
            }
        );
    },

    /**
     * Envía una nueva solicitud de cotización GRAMMER (con métodos específicos)
     * @param {Object} requestData 
     * @returns {Promise}
     */
    async sendGrammerShippingRequest(requestData) {
        return this.handleResponse(
            this.request('dao/daoSendRequest.php', {
                ...requestData,
                is_grammer_request: true
            }),
            {
                showLoading: true,
                showSuccessMessage: true,
                successMessage: `Solicitud GRAMMER enviada correctamente. Método: ${this.getMethodDisplayName(requestData.shipping_method)}`,
            }
        );
    },

    /**
     * Obtiene la lista de solicitudes
     * @param {Object} filters 
     * @returns {Promise}
     */
    async getShippingRequests(filters = {}) {
        return this.handleResponse(
            this.request('dao/daoGetRequests.php', filters),
            {
                showErrorMessage: false // No mostrar error toast, manejar silenciosamente
            }
        );
    },

    /**
     * Obtiene las cotizaciones de una solicitud específica
     * @param {Object} params - Should include request_id
     * @returns {Promise}
     */
    async getQuotes(params) {
        return this.handleResponse(
            this.request('dao/daoGetQuotes.php', params),
            {
                showErrorMessage: false
            }
        );
    },

    /**
     * Obtiene la lista de transportistas
     * @returns {Promise}
     */
    async getCarriers() {
        return this.handleResponse(
            this.request('dao/daoGetCarriers.php', {}),
            {
                showErrorMessage: false
            }
        );
    },

    /**
     * Actualiza el estado de una solicitud
     * @param {number} requestId 
     * @param {string} status 
     * @returns {Promise}
     */
    async updateRequestStatus(requestId, status) {
        return this.handleResponse(
            this.request('dao/daoUpdateRequestStatus.php', {
                request_id: requestId,
                status: status
            }),
            {
                showLoading: true,
                showSuccessMessage: true,
                successMessage: 'Estado actualizado correctamente'
            }
        );
    },

    /**
     * Selecciona o deselecciona una cotización específica
     * @param {number} quoteId 
     * @param {boolean} select - true to select, false to deselect
     * @returns {Promise}
     */
    async selectQuote(quoteId, select = true) {
        return this.handleResponse(
            this.request('dao/daoSelectQuote.php', { 
                quote_id: quoteId,
                select: select 
            }),
            {
                showLoading: true,
                showSuccessMessage: true,
                successMessage: select ? 'Quote selected successfully' : 'Quote deselected successfully'
            }
        );
    },

    /**
     * Get method display name
     * @param {string} method 
     * @returns {string}
     */
    getMethodDisplayName(method) {
        const methodNames = {
            'fedex': 'Fedex Express',
            'aereo_maritimo': 'Air-Sea',
            'nacional': 'Domestic'
        };
        return methodNames[method] || method;
    },

    // ==================== MÉTODOS DE POLLING ====================

    /**
     * Sistema de polling para actualizar datos automáticamente
     * @param {Function} apiCall 
     * @param {number} interval 
     * @param {Function} callback 
     * @returns {Object} Control del polling
     */
    startPolling(apiCall, interval = 30000, callback = null) {
        let retryCount = 0;
        const maxRetries = 3;
        
        const poll = async () => {
            try {
                const data = await apiCall();
                retryCount = 0; // Reset retry count on success
                
                if (callback && typeof callback === 'function') {
                    callback(data);
                }
            } catch (error) {
                retryCount++;
                console.warn(`Polling error (${retryCount}/${maxRetries}):`, error);
                
                if (retryCount >= maxRetries) {
                    console.error('Max polling retries reached. Stopping polling.');
                    clearInterval(pollingInterval);
                }
            }
        };
        
        // Ejecutar inmediatamente
        poll();
        
        // Configurar intervalo
        const pollingInterval = setInterval(poll, interval);
        
        // Retornar control del polling
        return {
            stop: () => {
                clearInterval(pollingInterval);
                console.log('Polling stopped');
            },
            restart: () => {
                clearInterval(pollingInterval);
                const newPolling = this.startPolling(apiCall, interval, callback);
                return newPolling;
            }
        };
    },

    /**
     * Polling específico para solicitudes
     * @param {Function} callback 
     * @returns {Object}
     */
    startRequestsPolling(callback) {
        return this.startPolling(
            () => this.getShippingRequests(),
            30000,
            callback
        );
    },

    /**
     * Polling específico para cotizaciones de una solicitud
     * @param {number} requestId 
     * @param {Function} callback 
     * @returns {Object}
     */
    startQuotesPolling(requestId, callback) {
        return this.startPolling(
            () => this.getQuotes({ request_id: requestId }),
            30000,
            callback
        );
    },

    // ==================== VALIDACIONES ====================

    /**
     * Valida los datos de una solicitud antes de enviar
     * @param {Object} requestData 
     * @returns {Object}
     */
    validateShippingRequest(requestData) {
        const errors = [];

        // Validar información básica
        if (!requestData.user_name || requestData.user_name.trim() === '') {
            errors.push('El nombre del usuario es obligatorio');
        }

        // Validar método de envío
        if (!requestData.shipping_method) {
            errors.push('Debe seleccionar un método de envío');
        }

        // Validar datos del método
        if (!requestData.method_data) {
            errors.push('Debe completar los datos del método de envío');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};

// Exportar para módulos
export default API;