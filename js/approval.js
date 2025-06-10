/**
 * Módulo de aprobación para el sistema de Premium Freight
 */

import { hideModal } from './modals.js';
import { createCards } from './cards.js';

// Define the URL variable for this module
const URL = window.URL_BASE || window.BASE_URL || 'https://grammermx.com/Jesus/PruebaDos/';

/**
 * Variable para controlar el estado de procesamiento
 */
let isProcessing = false;

/**
 * Maneja el clic en el botón de aprobar
 */
export async function handleApprove() {
    // Prevenir múltiples clics
    if (isProcessing) {
        console.log('Ya se está procesando una aprobación, por favor espere');
        return;
    }
    
    isProcessing = true;
    
    // Obtener datos de la orden seleccionada
    const selectedOrderId = sessionStorage.getItem('selectedOrderId');
    const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
    
    try {
        // Validaciones previas del lado del cliente
        if (!validateOrderForApproval(selectedOrder)) {
            return;
        }

        // Mostrar indicador de progreso
        Swal.fire({
            title: 'Procesando...',
            text: 'Actualizando estado de la orden',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            customClass: { container: 'swal-on-top' }
        });

        // NUEVO: Usar el authorization_level del usuario actual como nuevo act_approv
        const newApprovalLevel = Number(window.authorizationLevel);
        const requiredLevel = Number(selectedOrder.required_auth_level || 7);
        
        // Preparar datos para la API
        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: newApprovalLevel, // Usar authorization_level, no act_approv + 1
            userLevel: window.authorizationLevel,
            userID: window.userID,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        // Determinar si estará completamente aprobada después de esta aprobación
        const willBeFullyApproved = (newApprovalLevel >= requiredLevel);
        
        // Determinar el ID de estado textual
        let updatedStatusTextId = 2; // Por defecto: 'revision'
        if (willBeFullyApproved) {
            updatedStatusTextId = 3; // 'aprobado'
        }

        // Preparar datos para actualizar texto de estado
        const updateStatusText = {
            orderId: selectedOrder.id,
            statusid: updatedStatusTextId
        };

        // Actualizar nivel de aprobación en la base de datos
        const responseApproval = await fetch(URL + 'dao/conections/daoStatusUpdate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        // Procesar respuesta de actualización de aprobación
        const resultApproval = await responseApproval.json();
        if (!resultApproval.success) {
            throw new Error(resultApproval.message || 'Error al actualizar nivel de aprobación.');
        }

        // Actualizar texto de estado en la base de datos
        const responseStatusText = await fetch(URL + 'dao/conections/daoStatusText.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateStatusText)
        });
        
        // Procesar respuesta de actualización de texto de estado
        const resultStatusText = await responseStatusText.json();
        if (!resultStatusText.success) {
            console.error('Error al actualizar texto de estado:', resultStatusText.message);
        }

        // Actualizar datos locales
        selectedOrder.approval_status = newApprovalLevel;
        selectedOrder.status_id = updatedStatusTextId;
        
        // Actualizar nombre de estado para reflejos en UI
        if (updatedStatusTextId === 3) selectedOrder.status_name = 'aprobado';
        else if (updatedStatusTextId === 2) selectedOrder.status_name = 'revision';

        // CORREGIDO: Enviar notificación según el estado final
        if (willBeFullyApproved) {
            // Orden completamente aprobada - notificar SOLO al creador
            console.log(`[APPROVAL DEBUG] Orden completamente aprobada. Enviando notificación final al creador`);
            await sendEmailNotification(selectedOrder.id, 'approved');
        } else {
            // Orden necesita más aprobaciones - enviar correo al SIGUIENTE aprobador (NO al actual)
            console.log(`[APPROVAL DEBUG] Orden requiere más aprobaciones. Nivel actual: ${newApprovalLevel}, Requerido: ${requiredLevel}`);
            await sendEmailNotification(selectedOrder.id, 'approval');
        }

        // Mostrar mensaje de éxito con información adicional
        const statusMessage = willBeFullyApproved ? 
            'La orden ha sido completamente aprobada.' : 
            'La orden ha sido aprobada para el siguiente nivel.';
            
        Swal.fire({
            icon: 'success',
            title: 'Orden Aprobada',
            text: `La orden ${selectedOrder.id} ha sido procesada correctamente. ${statusMessage}`,
            confirmButtonText: 'Aceptar',
            customClass: { container: 'swal-on-top' }
        });
        
        // Cerrar modal y regenerar tarjetas
        hideModal();

        // NUEVO: Verificar si estamos en viewOrder.js y actualizar específicamente
        if (window.location.pathname.includes('viewOrder.php') || 
            document.getElementById('svgContent')) {
            // Estamos en viewOrder.js, no llamar createCards sino dejar que viewOrder maneje la UI
            console.log('[APPROVAL DEBUG] Detectado viewOrder.js, omitiendo createCards');
        } else {
            // Estamos en orders.php, llamar createCards normalmente
            createCards(window.allOrders);
        }
    } catch (error) {
        // Manejar errores durante el proceso de aprobación
        console.error('Error al aprobar la orden:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar la orden: ' + error.message,
            confirmButtonText: 'Aceptar',
            customClass: { container: 'swal-on-top' }
        });
    } finally {
        // Siempre restablecer la bandera de procesamiento
        isProcessing = false;
    }
}

/**
 * Envía notificación por correo según el tipo de acción
 */
async function sendEmailNotification(orderId, notificationType) {
    console.log(`[EMAIL DEBUG] Iniciando envío de correo - Orden: ${orderId}, Tipo: ${notificationType}`);
    
    try {
        let endpoint = '';
        const emailData = { orderId: orderId };

        // Determinar el endpoint según el tipo de notificación
        switch (notificationType) {
            case 'approval':
                // Enviar correo al siguiente aprobador
                endpoint = 'https://grammermx.com/Mailer/PFMailer/PFmailNotification.php';
                console.log(`[EMAIL DEBUG] Configurando envío al siguiente aprobador`);
                break;
            case 'approved':
                // Enviar correo de estado final (aprobado) al creador
                endpoint = 'https://grammermx.com/Mailer/PFMailer/PFmailStatus.php';
                emailData.status = 'approved';
                console.log(`[EMAIL DEBUG] Configurando envío de estado final (aprobado) al creador`);
                break;
            case 'rejected':
                // Enviar correo de estado final (rechazado) al creador
                endpoint = 'https://grammermx.com/Mailer/PFMailer/PFmailStatus.php';
                emailData.status = 'rejected';
                console.log(`[EMAIL DEBUG] Configurando envío de estado final (rechazado) al creador`);
                break;
            default:
                console.warn(`[EMAIL DEBUG] Tipo de notificación no reconocido: ${notificationType}`);
                return;
        }

        console.log(`[EMAIL DEBUG] Endpoint seleccionado: ${endpoint}`);
        console.log(`[EMAIL DEBUG] Datos del correo:`, emailData);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailData)
        });

        console.log(`[EMAIL DEBUG] Respuesta HTTP recibida - Status: ${response.status}, OK: ${response.ok}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Obtener el texto de la respuesta primero para diagnosticar
        const responseText = await response.text();
        console.log(`[EMAIL DEBUG] Respuesta del servidor (texto):`, responseText);

        // Intentar parsear como JSON
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`[EMAIL DEBUG] Error parseando JSON:`, parseError);
            console.error(`[EMAIL DEBUG] Respuesta recibida:`, responseText);
            throw new Error(`Respuesta del servidor no es JSON válido: ${responseText.substring(0, 200)}...`);
        }

        console.log(`[EMAIL DEBUG] Resultado del servidor (parseado):`, result);

        if (!result.success) {
            console.warn(`[EMAIL DEBUG] Error reportado por el servidor: ${result.message}`);
        } else {
            console.log(`[EMAIL DEBUG] ✅ Correo enviado exitosamente - Orden: ${orderId}, Tipo: ${notificationType}`);
        }
    } catch (error) {
        console.error(`[EMAIL DEBUG] ❌ Error al enviar correo - Orden: ${orderId}, Tipo: ${notificationType}:`, error);
        console.error(`[EMAIL DEBUG] Detalles del error:`, {
            message: error.message,
            stack: error.stack
        });
    }
}

/**
 * Valida si una orden puede ser aprobada por el usuario actual
 */
function validateOrderForApproval(order) {
    // Verificar planta: permitir si userPlant es null/undefined O si coincide exactamente con creator_plant
    console.log('User Plant:', window.userPlant);
    
    if (window.userPlant !== null && window.userPlant !== undefined && 
        order.creator_plant !== window.userPlant) {
        Swal.fire({
            icon: 'warning',
            title: 'Sin permisos',
            text: 'No tienes permisos para aprobar órdenes de otras plantas.',
            customClass: { container: 'swal-on-top' }
        });
        return false;
    }
    
    // Verificar nivel de autorización: debe ser exactamente (act_approv + 1)
    const currentApprovalLevel = Number(order.approval_status);
    const nextRequiredLevel = currentApprovalLevel + 1;
    
    if (Number(window.authorizationLevel) !== nextRequiredLevel) {
        Swal.fire({
            icon: 'warning',
            title: 'Nivel de autorización incorrecto',
            text: `Tu nivel de autorización (${window.authorizationLevel}) no corresponde al requerido para esta orden (${nextRequiredLevel}).`,
            customClass: { container: 'swal-on-top' }
        });
        return false;
    }
    
    // Verificar que no esté completamente aprobada (act_approv >= required_auth_level)
    const requiredLevel = Number(order.required_auth_level || 7);
    if (currentApprovalLevel >= requiredLevel) {
        Swal.fire({
            icon: 'warning',
            title: 'Orden ya aprobada',
            text: 'Esta orden ya está completamente aprobada.',
            customClass: { container: 'swal-on-top' }
        });
        return false;
    }
    
    // Verificar que no esté rechazada (act_approv = 99)
    if (currentApprovalLevel === 99) {
        Swal.fire({
            icon: 'warning',
            title: 'Orden rechazada',
            text: 'Esta orden fue rechazada previamente.',
            customClass: { container: 'swal-on-top' }
        });
        return false;
    }
    
    return true;
}

/**
 * Maneja el clic en el botón de rechazar
 */
export async function handleReject() {
    // Obtener datos de la orden seleccionada
    const selectedOrderId = sessionStorage.getItem('selectedOrderId');
    const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
    
    try {
        // Validaciones previas del lado del cliente
        if (!validateOrderForApproval(selectedOrder)) {
            return;
        }

        // Solicitar confirmación antes de rechazar
        const confirmation = await Swal.fire({
            title: '¿Está seguro?',
            text: `¿Realmente desea rechazar la orden ${selectedOrderId}? Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, rechazar',
            cancelButtonText: 'Cancelar',
            customClass: { container: 'swal-on-top' }
        });

        // Si el usuario cancela, detener el proceso
        if (!confirmation.isConfirmed) {
            return;
        }

        // Mostrar indicador de progreso
        Swal.fire({
            title: 'Procesando...',
            text: 'Rechazando orden',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            customClass: { container: 'swal-on-top' }
        });

        // Configurar estado de rechazo (99)
        const newStatusId = 99;
        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: newStatusId,
            userLevel: window.authorizationLevel,
            userID: window.userID,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        // Configurar texto de estado a 'rechazado'
        const updatedStatusTextId = 4;
        const updateStatusText = {
            orderId: selectedOrder.id,
            statusid: updatedStatusTextId
        };

        // Actualizar nivel de aprobación en la base de datos
        const responseApproval = await fetch(URL + 'dao/conections/daoStatusUpdate.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        // Procesar respuesta de actualización de aprobación
        const resultApproval = await responseApproval.json();
        if (!resultApproval.success) {
            throw new Error(resultApproval.message || 'Error al actualizar estado a rechazado.');
        }

        // Actualizar texto de estado en la base de datos
        const responseStatusText = await fetch(URL + 'dao/conections/daoStatusText.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateStatusText)
        });
        
        // Procesar respuesta de actualización de texto de estado
        const resultStatusText = await responseStatusText.json();
        if (!resultStatusText.success) {
            console.error('Error al actualizar texto de estado a rechazado:', resultStatusText.message);
        }

        // Actualizar datos locales
        selectedOrder.approval_status = newStatusId;
        selectedOrder.status_id = updatedStatusTextId;
        selectedOrder.status_name = 'rechazado';

        // Enviar notificación de rechazo al creador
        console.log(`[REJECT DEBUG] Orden rechazada. Enviando notificación al creador`);
        await sendEmailNotification(selectedOrder.id, 'rejected');

        // Mostrar confirmación
        Swal.fire({
            icon: 'error',
            title: 'Orden Rechazada',
            text: `La orden ${selectedOrderId} ha sido rechazada correctamente.`,
            confirmButtonText: 'Aceptar',
            customClass: { container: 'swal-on-top' }
        });
        
        // Cerrar modal y regenerar tarjetas
        hideModal();
        createCards(window.allOrders);

    } catch (error) {
        // Manejar errores durante el proceso de rechazo
        console.error('Error al rechazar la orden:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo rechazar la orden: ' + error.message,
            confirmButtonText: 'Aceptar',
            customClass: { container: 'swal-on-top' }
        });
    }
}

/**
 * Configura los event listeners para los botones de aprobación/rechazo
 */
export function setupApprovalEventListeners() {
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');

    // Verificar y configurar botón de aprobar
    if (!approveBtn) {
        console.error('Botón de aprobación no encontrado en el DOM');
    } else {
        approveBtn.onclick = handleApprove;
    }
    
    // Verificar y configurar botón de rechazar
    if (!rejectBtn) {
        console.error('Botón de rechazo no encontrado en el DOM');
    } else {
        rejectBtn.onclick = handleReject;
    }
}