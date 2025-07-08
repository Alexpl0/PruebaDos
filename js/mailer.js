/**
 * Módulo de notificaciones por correo electrónico para el sistema Premium Freight
 * * Este módulo contiene funciones para enviar distintos tipos de notificaciones
 * por correo electrónico a los usuarios del sistema, como notificaciones de aprobación,
 * cambios de estado, etc. Lee la configuración desde `window.PF_CONFIG`.
 */

/**
 * Envía una notificación por correo electrónico al siguiente aprobador en línea.
 * @param {number} orderId - El ID de la orden de Premium Freight.
 * @returns {Promise<object>} - Promesa que se resuelve a un objeto { success: boolean, message: string }.
 */
function sendApprovalNotification(orderId) {
    // Validar que tenemos un orderId válido
    if (!orderId || isNaN(Number(orderId))) {
        console.error('sendApprovalNotification: Invalid orderId provided:', orderId);
        return Promise.resolve({ success: false, message: 'ID de orden inválido o no proporcionado' });
    }

    const numericOrderId = Number(orderId);
    console.log(`Enviando notificación para orden #${numericOrderId}`);

    // Obtener la URL del mailer desde la configuración global
    const endpoint = window.PF_CONFIG.app.mailerURL + 'PFmailNotification.php';
    console.log(`Haciendo petición a: ${endpoint}`);
    
    const payload = { 
        orderId: numericOrderId,
        timestamp: new Date().toISOString()
    };
    
    return fetch(endpoint, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        console.log(`Respuesta recibida: ${response.status} ${response.statusText}`);
        if (!response.ok) {
            // Si la respuesta no es OK, intenta leer el texto para obtener más detalles.
            return response.json().catch(() => response.text()).then(errorInfo => {
                const errorMessage = typeof errorInfo === 'object' ? errorInfo.message : errorInfo;
                throw new Error(errorMessage || `Error del servidor: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Respuesta procesada:', data);
        if (data.success) {
            console.log('Notificación enviada correctamente');
            return { success: true, message: data.message };
        } else {
            console.warn('El servidor respondió con un fallo:', data.message);
            return { success: false, message: data.message || 'Error al enviar la notificación' };
        }
    })
    .catch(error => {
        console.error('Error en sendApprovalNotification:', error);
        return { success: false, message: `Error de red o de servidor: ${error.message}` };
    });
}

/**
 * Envía una notificación de estado final (aprobado o rechazado) al creador de la orden.
 * @param {number} orderId - El ID de la orden de Premium Freight.
 * @param {string} status - El estado de la orden ('approved' o 'rejected').
 * @param {Object} [rejectorInfo=null] - Información opcional sobre quién rechazó la orden.
 * @returns {Promise<object>} - Promesa que se resuelve al resultado de la operación.
 */
function sendStatusNotification(orderId, status, rejectorInfo = null) {
    const endpoint = window.PF_CONFIG.app.mailerURL + 'PFmailStatus.php';
    
    return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            orderId: orderId,
            status: status,
            rejectorInfo: rejectorInfo
        })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error(data.message || 'Error desconocido al enviar notificación de estado.');
        }
        return data;
    })
    .catch(error => {
        console.error('Error en sendStatusNotification:', error);
        return { success: false, message: error.message };
    });
}

/**
 * Envía una notificación por correo para solicitar el archivo de evidencia de recovery.
 * @param {number} orderId - El ID de la orden de Premium Freight.
 * @returns {Promise<object>} - Promesa que se resuelve al resultado de la operación.
 */
async function sendRecoveryNotification(orderId) {
    if (!orderId) {
        console.error('sendRecoveryNotification: Invalid orderId provided.');
        return { success: false, message: 'Invalid Order ID' };
    }

    const endpoint = window.PF_CONFIG.app.mailerURL + 'PFmailRecoveryNotification.php';

    Swal.fire({
        title: 'Sending Request...',
        text: 'Please wait while the email notification is being sent.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ orderId: orderId })
        });

        // Intenta leer la respuesta como JSON, sin importar el código de estado.
        // Esto funciona porque el PHP ahora siempre devuelve JSON.
        const result = await response.json();

        if (!response.ok) {
            // Si la respuesta no es OK, lanza un error con el mensaje del JSON del servidor.
            throw new Error(result.message || `Server responded with status: ${response.status}`);
        }

        // A este punto, la respuesta fue OK (2xx). Verificamos el flag 'success'.
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Email Sent!',
                text: result.message || 'The notification has been sent successfully.'
            });
            return { success: true, message: result.message };
        } else {
            // Esto maneja casos donde el servidor respondió con 200 OK pero { success: false }
            throw new Error(result.message || 'The server reported a failure.');
        }
    } catch (error) {
        // Este bloque catch ahora maneja errores de red, de parseo de JSON, y los errores que lanzamos arriba.
        console.error('Error in sendRecoveryNotification:', error);
        Swal.fire({
            icon: 'error',
            title: 'Request Failed',
            text: error.message // El mensaje de error ahora será limpio e informativo.
        });
        return { success: false, message: error.message };
    }
}


// Exportamos las funciones para usarlas en otros módulos
export { 
    sendApprovalNotification,
    sendStatusNotification,
    sendRecoveryNotification
};
