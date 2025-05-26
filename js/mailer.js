/**
 * Módulo de notificaciones por correo electrónico para el sistema Premium Freight
 * 
 * Este módulo contiene funciones para enviar distintos tipos de notificaciones
 * por correo electrónico a los usuarios del sistema, como notificaciones de aprobación,
 * cambios de estado, etc.
 */

/**
 * Envía una notificación por correo electrónico al siguiente aprobador en línea
 * @param {number} orderId - El ID de la orden de Premium Freight
 * @returns {Promise} - Promesa que se resuelve al resultado de la operación de envío del correo
 */
function sendApprovalNotification(orderId) {
    // Validar que tenemos un orderId válido
    if (!orderId || isNaN(Number(orderId))) {
        console.error('sendApprovalNotification: Invalid orderId provided:', orderId);
        return Promise.reject(new Error('ID de orden inválido o no proporcionado'));
    }

    // Convertir a número para asegurar formato correcto
    const numericOrderId = Number(orderId);
    console.log(`Enviando notificación para orden #${numericOrderId}`);

    return new Promise((resolve, reject) => {
        // Endpoint de la API con diagnóstico adicional
        const endpoint = URLM + 'PFmailNotification.php';
        console.log(`Haciendo petición a: ${endpoint}`);
        
        // Payload para el servidor
        const payload = { 
            orderId: numericOrderId,
            timestamp: new Date().toISOString(),
            client: navigator.userAgent
        };
        console.log('Enviando payload:', payload);
        
        fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            // Registrar información de la respuesta para diagnóstico
            console.log(`Respuesta recibida: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                // Intentar obtener detalles del error desde la respuesta
                return response.text().then(text => {
                    console.error('Detalles del error:', text);
                    try {
                        // Intentar parsear como JSON por si el servidor devuelve mensaje estructurado
                        const errorData = JSON.parse(text);
                        if (errorData && errorData.message) {
                            throw new Error(errorData.message);
                        }
                    } catch (e) {
                        // Si no es JSON, usar el texto completo
                    }
                    throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Respuesta procesada:', data);
            if (data.success) {
                console.log('Notificación enviada correctamente');
                resolve(data);
            } else {
                console.warn('El servidor respondió con error:', data.message);
                reject(new Error(data.message || 'Error al enviar la notificación'));
            }
        })
        .catch(error => {
            console.error('Error en sendApprovalNotification:', error);
            // Añadir más contexto al error para facilitar depuración
            const enhancedError = new Error(`Error enviando notificación para orden #${orderId}: ${error.message}`);
            enhancedError.originalError = error;
            reject(enhancedError);
        });
    });
}

/**
 * Envía una notificación al siguiente nivel de aprobación
 * @param {number} idOrder - El ID de la orden de Premium Freight
 * @param {number} newStatusId - El ID del estado actual de la orden
 * @returns {Promise} - Promesa que se resuelve al resultado de la operación de envío
 */
function sendNotification(idOrder, newStatusId) {
    // Calculamos el siguiente nivel de aprobación
    const nextStatusId = newStatusId + 1;
    
    // Preparamos los datos para la API
    const data = {
        orderId: idOrder,
        statusId: nextStatusId
    };

    // Retornamos una promesa para manejar la respuesta de forma asíncrona
    return new Promise((resolve, reject) => {
        fetch(URLM + 'dao/conections/daoSendNotification.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(result => {
            if (result.success) {
                resolve(result);
            } else {
                reject(new Error(result.message || 'Error al enviar la notificación'));
            }
        })
        .catch(error => {
            console.error('Error al enviar la notificación:', error);
            reject(error);
        });
    });
}

/**
 * Envía una notificación de estado final (aprobado o rechazado) al creador de la orden
 * @param {number} orderId - El ID de la orden de Premium Freight
 * @param {string} status - El estado de la orden ('approved' o 'rejected')
 * @param {Object} [rejectorInfo=null] - Información opcional sobre quién rechazó la orden
 * @returns {Promise} - Promesa que se resuelve al resultado de la operación de envío
 */
function sendStatusNotification(orderId, status, rejectorInfo = null) {
    return new Promise((resolve, reject) => {
        fetch(URLM + 'PFmailStatus.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                orderId: orderId,
                status: status,
                rejectorInfo: rejectorInfo
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('La respuesta de la red no fue satisfactoria');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                resolve(data);
            } else {
                reject(new Error(data.message || 'Error al enviar la notificación de estado'));
            }
        })
        .catch(error => {
            console.error('Error en sendStatusNotification:', error);
            reject(error);
        });
    });
}

/**
 * Envía una notificación de revisión de recuperación a un usuario o para una orden específica
 * @param {number} [userId=null] - El ID del usuario (opcional)
 * @param {number} [orderId=null] - El ID de la orden (opcional)
 * @returns {Promise} - Promesa que se resuelve al resultado de la operación de envío
 */
function sendRecoveryCheckNotification(userId = null, orderId = null) {
    const requestData = {};
    
    if (userId) requestData.userId = userId;
    if (orderId) requestData.orderId = orderId;
    
    return new Promise((resolve, reject) => {
        fetch(URLM + 'PFmailRecoveryNotification.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('La respuesta de la red no fue satisfactoria');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                resolve(data);
            } else {
                reject(new Error(data.message || 'Error al enviar la notificación de revisión de recuperación'));
            }
        })
        .catch(error => {
            console.error('Error en sendRecoveryCheckNotification:', error);
            reject(error);
        });
    });
}

/**
 * Verificación de disponibilidad de la variable URLM
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URLM === 'undefined') {
    console.warn('URL global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    // Fallback a URLM hardcodeada solo como último recurso
    window.URLM = 'https://grammermx.com/Mailer/PFMailer/';
}

// Exportamos las funciones para usarlas en otros módulos
export { 
    sendApprovalNotification, 
    sendNotification,
    sendStatusNotification,
    sendRecoveryCheckNotification 
};
