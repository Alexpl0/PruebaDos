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
    if (!orderId || isNaN(Number(orderId))) {
        console.error('sendApprovalNotification: Invalid orderId provided:', orderId);
        return Promise.resolve({ success: false, message: 'ID de orden inválido o no proporcionado' });
    }

    const numericOrderId = Number(orderId);
    const endpoint = window.PF_CONFIG.app.mailerURL + 'PFmailNotification.php';
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
        if (!response.ok) {
            return response.json().catch(() => response.text()).then(errorInfo => {
                const errorMessage = typeof errorInfo === 'object' ? errorInfo.message : errorInfo;
                throw new Error(errorMessage || `Error del servidor: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            return { success: true, message: data.message };
        } else {
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
    if (!orderId || isNaN(Number(orderId))) {
        console.error('sendRecoveryNotification: Se proporcionó un orderId inválido.');
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Se requiere un ID de orden válido para enviar la notificación.'
        });
        return { success: false, message: 'Invalid Order ID' };
    }

    // Construimos la URL del nuevo endpoint.
    const endpoint = window.PF_CONFIG.app.mailerURL + 'PFmailRecoveryIndividual.php';

    // Mostramos una alerta de "cargando" para mejorar la experiencia de usuario.
    Swal.fire({
        title: 'Enviando Notificación...',
        text: 'Por favor espera mientras se procesa la solicitud.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // El payload ahora es más simple, solo contiene el orderId.
        const payload = {
            orderId: Number(orderId)
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Leemos la respuesta como JSON, ya que nuestro endpoint siempre devuelve JSON.
        const result = await response.json();

        // Si la respuesta HTTP no fue exitosa (ej. 404, 500), lanzamos un error.
        // El mensaje del error será el que definimos en el backend.
        if (!response.ok) {
            throw new Error(result.message || `El servidor respondió con el estado: ${response.status}`);
        }

        // Si la respuesta fue exitosa (200 OK), mostramos el mensaje correspondiente.
        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: result.message
        });
        return { success: true, message: result.message };

    } catch (error) {
        // Este bloque captura tanto errores de red (fetch fallido) como los errores que lanzamos arriba.
        console.error('Error en sendRecoveryNotification:', error);
        Swal.fire({
            icon: 'error',
            title: 'Solicitud Fallida',
            text: error.message // El mensaje de error será claro e informativo.
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
