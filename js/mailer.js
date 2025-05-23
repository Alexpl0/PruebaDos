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
    return new Promise((resolve, reject) => {
        fetch(URLM + 'mailer/PFmailNotification.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
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
                reject(new Error(data.message || 'Error al enviar la notificación'));
            }
        })
        .catch(error => {
            console.error('Error en sendApprovalNotification:', error);
            reject(error);
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
        fetch(URLM + 'mailer/PFmailStatus.php', {
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
        fetch(URLM + 'mailer/PFmailRecoveryNotification.php', {
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
    window.URLM = 'https://grammermx.com/Mailer/PHPMailer/';
}

// Exportamos las funciones para usarlas en otros módulos
export { 
    sendApprovalNotification, 
    sendNotification,
    sendStatusNotification,
    sendRecoveryCheckNotification 
};
