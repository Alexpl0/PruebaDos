/**
 * viewWeekorder.js - Visor de Órdenes Semanales (Enfoque Funcional)
 */

// Importación de módulos críticos
import { loadAndPopulateSVG, generatePDF } from './svgOrders.js';
import { approveOrder, rejectOrder, sendEmailNotification } from './approval.js';

// =================================================================================
// ESTADO Y CONFIGURACIÓN DEL MÓDULO
// =================================================================================

const URLBASE = "https://grammermx.com/Jesus/PruebaDos/";
let allOrders = [];
let filteredOrders = [];
const processedOrders = new Set();

// =================================================================================
// INICIALIZACIÓN DE VARIABLES GLOBALES (CRÍTICO PARA approval.js)
// =================================================================================

/**
 * Este bloque se ejecuta inmediatamente al cargar el script.
 * Su propósito es tomar la configuración del usuario desde `window.APP_CONFIG`
 * (inyectado por PHP) y establecer las variables globales que el módulo `approval.js`
 * espera encontrar. Esto previene errores de "undefined" y race conditions.
 */
(function initializeGlobalScope() {
    if (window.APP_CONFIG) {
        window.userID = window.APP_CONFIG.userId;
        window.authorizationLevel = window.APP_CONFIG.authorizationLevel;
        window.userPlant = window.APP_CONFIG.userPlant;
        console.log('✅ Global scope initialized for approval module:', {
            id: window.userID,
            level: window.authorizationLevel,
            plant: window.userPlant
        });
    } else {
        console.error('❌ CRITICAL: window.APP_CONFIG not found. Approval module will fail.');
    }
})();


// =================================================================================
// INICIALIZACIÓN PRINCIPAL DE LA APLICACIÓN
// =================================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM cargado. Iniciando aplicación de visualización de órdenes...');
    await initializeApp();
});

async function initializeApp() {
    try {
        await fetchAndFilterOrders();
        renderOrderCards();
        setupEventListeners();
        updateSummary();
        console.log('✅ Aplicación inicializada correctamente.');
    } catch (error) {
        console.error('❌ Error fatal durante la inicialización:', error);
        displayErrorState('Could not initialize the application. Please try again later.');
    }
}

// =================================================================================
// LÓGICA DE DATOS (FETCHING Y FILTRADO)
// =================================================================================

async function fetchAndFilterOrders() {
    console.log('📡 Obteniendo y filtrando órdenes...');
    try {
        const response = await fetch(`${URLBASE}dao/conections/daoPremiumFreight.php`);
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);

        const result = await response.json();
        if (!result || !Array.isArray(result.data)) throw new Error('El formato de los datos recibidos es inválido.');

        allOrders = result.data;
        window.allOrders = allOrders; // Aseguramos que la versión global también esté actualizada.

        // Usamos la variable global `window.authorizationLevel` que ya inicializamos.
        filteredOrders = allOrders.filter(
            (order) => parseInt(order.approval_status, 10) + 1 === window.authorizationLevel
        );

        console.log(`📦 Encontradas ${allOrders.length} órdenes, ${filteredOrders.length} filtradas para este usuario.`);
    } catch (error) {
        console.error('❌ Error en fetchAndFilterOrders:', error);
        throw error;
    }
}

// =================================================================================
// RENDERIZADO DE LA INTERFAZ DE USUARIO
// =================================================================================

function renderOrderCards() {
    const grid = document.getElementById('orders-grid');
    if (!grid) return;
    grid.innerHTML = ''; 

    if (filteredOrders.length === 0) {
        displayEmptyState();
        return;
    }

    filteredOrders.forEach(order => {
        const card = createOrderCardElement(order);
        grid.appendChild(card);
        loadOrderSVG(order, `svg-container-${order.id}`);
    });
}

function createOrderCardElement(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.setAttribute('data-order-id', order.id);

    card.innerHTML = `
        <div class="order-header">
            <h2 class="order-title">Order #${order.id}</h2>
            <div class="order-actions">
                <button class="order-action-btn btn-approve-order" data-order-id="${order.id}" title="Approve this order">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="order-action-btn btn-reject-order" data-order-id="${order.id}" title="Reject this order">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button class="order-action-btn btn-download-order" data-order-id="${order.id}" title="Download as PDF">
                    <i class="fas fa-download"></i> PDF
                </button>
            </div>
        </div>
        <div class="order-content">
            <div class="order-svg-container" id="svg-container-${order.id}">
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;
    return card;
}

async function loadOrderSVG(orderData, containerId) {
    try {
        await loadAndPopulateSVG(orderData, containerId);
    } catch (error) {
        console.error(`❌ Error cargando SVG para orden ${orderData.id}:`, error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="svg-error-message"><i class="fas fa-exclamation-triangle"></i><p>Error loading visualization</p></div>`;
        }
    }
}

function updateSummary() {
    const pendingCount = filteredOrders.length - processedOrders.size;
    const processedCount = processedOrders.size;
    document.getElementById('pending-count').textContent = pendingCount;
    document.getElementById('processed-count').textContent = processedCount;
    console.log(`📊 Resumen actualizado: ${pendingCount} pendientes, ${processedCount} procesadas.`);
}

function markOrderAsProcessed(orderId, action) {
    const orderCard = document.querySelector(`.order-card[data-order-id="${orderId}"]`);
    if (!orderCard) return;

    orderCard.classList.add('processed');
    const orderHeader = orderCard.querySelector('.order-header');
    
    const statusIndicator = document.createElement('div');
    statusIndicator.className = `status-indicator status-${action}`;
    statusIndicator.textContent = action === 'approve' ? 'APPROVED' : 'REJECTED';
    orderHeader.appendChild(statusIndicator);
}

function displayEmptyState() {
    const grid = document.getElementById('orders-grid');
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><h2>No pending orders found</h2><p>There are no orders requiring your approval at this moment.</p></div>`;
}

function displayErrorState(message) {
    const grid = document.getElementById('orders-grid');
    grid.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><h2>An Error Occurred</h2><p>${message}</p></div>`;
}

// =================================================================================
// MANEJO DE EVENTOS
// =================================================================================

function setupEventListeners() {
    const grid = document.getElementById('orders-grid');
    grid.addEventListener('click', (event) => {
        const btn = event.target.closest('.order-action-btn');
        if (!btn) return;

        const orderId = btn.dataset.orderId;
        if (btn.classList.contains('btn-approve-order')) {
            handleIndividualAction(orderId, 'approve');
        } else if (btn.classList.contains('btn-reject-order')) {
            handleIndividualAction(orderId, 'reject');
        } else if (btn.classList.contains('btn-download-order')) {
            handleDownloadOrder(orderId);
        }
    });

    document.getElementById('approve-all-btn').addEventListener('click', () => handleBulkAction('approve'));
    document.getElementById('reject-all-btn').addEventListener('click', () => handleBulkAction('reject'));
    document.getElementById('download-all-btn').addEventListener('click', handleDownloadAll);
    
    console.log('✅ Manejadores de eventos configurados.');
}

async function handleIndividualAction(orderId, action) {
    if (processedOrders.has(orderId)) {
        Swal.fire('Already Processed', `Order #${orderId} has already been processed.`, 'info');
        return;
    }
    
    try {
        // En lugar de un diálogo de confirmación aquí, dejamos que `approveOrder` y `rejectOrder` lo manejen.
        const options = { showConfirmation: true, autoClose: true }; // Opciones para controlar el comportamiento del módulo de aprobación
        if (action === 'approve') {
            await approveOrder(orderId, options); 
        } else {
            await rejectOrder(orderId, null, options); // null para que `rejectOrder` pida la razón.
        }
        
        // El envío de correo electrónico debe ir dentro de la lógica de éxito de approval.js si es posible,
        // pero por ahora lo dejamos aquí.
        await sendEmailNotification(orderId, action === 'approve' ? 'approval' : 'rejected');

        processedOrders.add(orderId);
        markOrderAsProcessed(orderId, action);
        updateSummary();
        // El módulo approval.js ya muestra un Swal de éxito, no es necesario mostrar otro aquí.
        // Swal.fire('Success!', `Order #${orderId} has been ${action}d.`, 'success');
    } catch (error) {
        console.error(`❌ Error al ${action} la orden #${orderId}:`, error);
        // El módulo `approval.js` ya muestra un Swal de error. No es necesario mostrar otro.
    }
}

async function handleDownloadOrder(orderId) {
    const orderData = filteredOrders.find((o) => o.id == orderId);
    if (!orderData) {
        Swal.fire('Error', 'Order data not found.', 'error');
        return;
    }

    try {
        Swal.fire({ title: 'Generating PDF...', text: 'Please wait a moment.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        await generatePDF(orderData, `PF_Order_${orderId}`);
        Swal.close();
        Swal.fire('Downloaded!', `PDF for order #${orderId} has been generated.`, 'success');
    } catch (error) {
        console.error('❌ Error al generar PDF:', error);
        Swal.fire('PDF Error', 'Failed to generate the PDF.', 'error');
    }
}

async function handleBulkAction(action) {
    const pendingOrders = filteredOrders.filter(o => !processedOrders.has(o.id.toString()));

    if (pendingOrders.length === 0) {
        Swal.fire('No Pending Orders', 'All orders have already been processed.', 'info');
        return;
    }

    const { isConfirmed } = await Swal.fire({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} All Orders?`,
        text: `This will ${action} ${pendingOrders.length} pending orders.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
        confirmButtonText: `Yes, ${action} all!`,
    });

    if (isConfirmed) {
        Swal.fire({ title: 'Processing Orders...', text: 'Please wait, this may take a moment.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        let bulkReason = null;
        if (action === 'reject') {
            const { value: reason } = await Swal.fire({
                title: 'Bulk Rejection Reason',
                input: 'textarea',
                inputPlaceholder: 'Enter a reason for rejecting all these orders...',
                inputAttributes: { 'aria-label': 'Type your message here' },
                showCancelButton: true,
                confirmButtonText: 'Submit Rejection',
            });
            if (!reason) return; // Si el usuario cancela, no hacemos nada.
            bulkReason = reason;
        }

        for (const order of pendingOrders) {
            try {
                const options = { showConfirmation: false }; // No mostrar confirmación para cada orden.
                if (action === 'approve') {
                    await approveOrder(order.id, options);
                } else {
                    await rejectOrder(order.id, bulkReason, options);
                }
                await sendEmailNotification(order.id, action === 'approve' ? 'approval' : 'rejected');
                processedOrders.add(order.id.toString());
                markOrderAsProcessed(order.id, action);
            } catch (error) {
                console.error(`❌ Error procesando orden #${order.id} en bloque:`, error);
            }
        }
        
        updateSummary();
        Swal.fire('Completed!', `All ${pendingOrders.length} orders have been processed.`, 'success');
    }
}

async function handleDownloadAll() {
    if (filteredOrders.length === 0) { Swal.fire('No Orders', 'There are no orders to download.', 'info'); return; }
    
    const { isConfirmed } = await Swal.fire({ title: 'Download All PDFs?', text: `This will generate PDFs for all ${filteredOrders.length} visible orders.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Yes, download all!' });

    if (isConfirmed) {
        Swal.fire({ title: 'Generating PDFs...', html: 'Starting download process...<br><b></b>', allowOutsideClick: false, didOpen: () => {
            Swal.showLoading();
            const progressText = Swal.getHtmlContainer().querySelector('b');
            let i = 0;
            const processNext = async () => {
                if (i < filteredOrders.length) {
                    const order = filteredOrders[i];
                    progressText.textContent = `Generating ${i + 1} of ${filteredOrders.length}: Order #${order.id}`;
                    try { await generatePDF(order, `PF_Order_${order.id}`); } catch (e) { console.error(e); }
                    i++;
                    setTimeout(processNext, 250); // Pequeña pausa para no bloquear el navegador
                } else {
                    Swal.fire('All Done!', `${filteredOrders.length} PDFs have been downloaded.`, 'success');
                }
            };
            processNext();
        }});
    }
}
