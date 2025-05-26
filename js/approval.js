/**
 * Módulo de aprobación para el sistema de Premium Freight
 * 
 * Este módulo contiene todas las funcionalidades relacionadas con el proceso
 * de aprobación o rechazo de órdenes de Premium Freight.
 */

import { hideModal } from './modals.js';
import { createCards } from './cards.js';
import { 
    sendApprovalNotification, 
    sendStatusNotification 
} from './mailer.js';

/**
 * Maneja el clic en el botón de aprobar
 * Actualiza el estado de aprobación de la orden seleccionada
 */
export async function handleApprove() {
    // Obtener datos de la orden seleccionada
    const selectedOrderId = sessionStorage.getItem('selectedOrderId');
    const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
    
    try {
        // Mostrar indicador de progreso
        Swal.fire({
            title: 'Procesando...',
            text: 'Actualizando estado de la orden',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            customClass: { container: 'swal-on-top' }
        });

        // Calcular el nuevo nivel de aprobación
        const currentStatus = Number(selectedOrder.approval_status);
        const newStatusId = currentStatus + 1;
        
        // Preparar datos para la API
        const updateData = {
            orderId: selectedOrder.id,
            newStatusId: newStatusId,
            userLevel: window.authorizationLevel,
            userID: window.userID,
            authDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };

        // Determinar el ID de estado textual
        let updatedStatusTextId = 2; // Por defecto: 'revision'
        const requiredLevel = Number(selectedOrder.required_auth_level || 7);
        if (newStatusId >= requiredLevel) {
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
        selectedOrder.approval_status = newStatusId;
        selectedOrder.status_id = updatedStatusTextId;
        
        // Actualizar nombre de estado para reflejos en UI
        if (updatedStatusTextId === 3) selectedOrder.status_name = 'aprobado';
        else if (updatedStatusTextId === 2) selectedOrder.status_name = 'revision';

        // Mostrar mensaje de éxito
        Swal.fire({
            icon: 'success',
            title: 'Orden Aprobada',
            text: `La orden ${selectedOrder.id} ha sido aprobada para el siguiente nivel.`,
            confirmButtonText: 'Aceptar',
            customClass: { container: 'swal-on-top' }
        });
        
        // Cerrar modal y regenerar tarjetas
        hideModal();
        createCards(window.allOrders);

        // Sistema de notificaciones recursivas
        try {
            // Si la orden alcanzó el nivel de aprobación requerido, notificar al creador
            if (updatedStatusTextId === 3) {
                await sendStatusNotification(selectedOrder.id, 'approved');
                console.log('Notificación de aprobación final enviada al creador');
            } else {
                // De lo contrario, notificar al siguiente aprobador
                await sendApprovalNotification(selectedOrder.id);
                console.log('Notificación enviada al siguiente aprobador');
            }
        } catch (error) {
            console.error('Error al enviar correo de notificación:', error);
            // No interrumpimos el flujo si falla la notificación
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
    }
}

/**
 * Maneja el clic en el botón de rechazar
 * Actualiza el estado de la orden a rechazado
 */
export async function handleReject() {
    // Obtener datos de la orden seleccionada
    const selectedOrderId = sessionStorage.getItem('selectedOrderId');
    const selectedOrder = window.allOrders.find(order => order.id === parseInt(selectedOrderId)) || {};
    
    try {
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

        // Enviar notificación de rechazo al creador
        try {
            // Incluir información del rechazador
            const rejectorInfo = {
                id: window.userID,
                name: window.userName,
                level: window.authorizationLevel
            };
            
            await sendStatusNotification(selectedOrder.id, 'rejected', rejectorInfo);
            console.log('Notificación de rechazo enviada al creador');
        } catch (error) {
            console.error('Error al enviar notificación de rechazo:', error);
        }

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

/**
 * Verificación de disponibilidad de la variable URL
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URL === 'undefined') {
    console.warn('URL global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    // Fallback a URL hardcodeada solo como último recurso
    window.URL = window.URL || 'https://grammermx.com/Jesus/PruebaDos/';
}