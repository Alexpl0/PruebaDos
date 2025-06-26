/**
 * viewWeekorder.js - Visor de Órdenes Semanales (Enfoque Funcional)
 *
 * Este script maneja la visualización y gestión de múltiples órdenes de flete premium.
 * Se ha refactorizado para eliminar el uso de clases y adoptar un enfoque puramente funcional,
 * facilitando la lectura y el mantenimiento.
 *
 * Funcionalidades clave:
 * - Carga y filtra órdenes según el nivel de autorización del usuario.
 * - Renderiza una tarjeta para cada orden pendiente.
 * - Carga dinámicamente una visualización SVG para cada orden.
 * - Permite acciones individuales (aprobar, rechazar, descargar PDF).
 * - Permite acciones en bloque (aprobar todas, rechazar todas, descargar todas).
 * - Mantiene un resumen del progreso en un panel flotante.
 * - Utiliza SweetAlert2 para notificaciones y confirmaciones interactivas.
 */

// Importación de módulos críticos
import { loadAndPopulateSVG, generatePDF } from './svgOrders.js';
import { approveOrder, rejectOrder, sendEmailNotification } from './approval.js';

// =================================================================================
// ESTADO Y CONFIGURACIÓN DEL MÓDULO
// =================================================================================

// URLs base (podrían obtenerse de APP_CONFIG si se quisiera)
const URLBASE = "https://grammermx.com/Jesus/PruebaDos/";

// Variables para gestionar el estado de la aplicación
let allOrders = []; // Todas las órdenes obtenidas del fetch
let filteredOrders = []; // Órdenes filtradas que se muestran al usuario
const processedOrders = new Set(); // IDs de órdenes ya procesadas (aprobadas/rechazadas)

// Configuración del usuario obtenida desde el objeto global `window.APP_CONFIG`
const userId = window.APP_CONFIG.userId;
const authorizationLevel = window.APP_CONFIG.authorizationLevel;


// =================================================================================
// INICIALIZACIÓN PRINCIPAL
// =================================================================================

/**
 * Se ejecuta cuando el DOM está completamente cargado.
 * Es el punto de entrada de la aplicación.
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM cargado. Iniciando aplicación de visualización de órdenes...');
    await initializeApp();
});

/**
 * Función principal que orquesta la inicialización de la página.
 */
async function initializeApp() {
    try {
        console.log(`👤 Usuario: ${userId}, Nivel: ${authorizationLevel}`);

        // 1. Obtener y filtrar las órdenes desde el servidor.
        await fetchAndFilterOrders();
        
        // 2. Renderizar las tarjetas de las órdenes en la UI.
        renderOrderCards();

        // 3. Configurar todos los manejadores de eventos para los botones.
        setupEventListeners();
        
        // 4. Actualizar el resumen inicial (órdenes pendientes/procesadas).
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

/**
 * Obtiene todas las órdenes del endpoint y las filtra según el nivel
 * de autorización del usuario.
 */
async function fetchAndFilterOrders() {
    console.log('📡 Obteniendo y filtrando órdenes...');
    try {
        const response = await fetch(`${URLBASE}dao/conections/daoPremiumFreight.php`);

        if (!response.ok) {
            throw new Error(`Error de red: ${response.status} - ${response.statusText}`);
        }

        const result = await response.json();
        if (!result || !Array.isArray(result.data)) {
            throw new Error('El formato de los datos recibidos es inválido.');
        }

        allOrders = result.data;
        
        // Filtrar órdenes: el estado de aprobación debe ser uno menos que el nivel del usuario.
        filteredOrders = allOrders.filter(
            (order) => parseInt(order.approval_status, 10) + 1 === authorizationLevel
        );

        console.log(`📦 Encontradas ${allOrders.length} órdenes en total, ${filteredOrders.length} filtradas para este usuario.`);

    } catch (error) {
        console.error('❌ Error en fetchAndFilterOrders:', error);
        // Propagar el error para que la función llamadora lo maneje.
        throw error;
    }
}


// =================================================================================
// RENDERIZADO DE LA INTERFAZ DE USUARIO
// =================================================================================

/**
 * Renderiza las tarjetas para cada orden filtrada en el grid.
 */
function renderOrderCards() {
    const grid = document.getElementById('orders-grid');
    if (!grid) return;

    // Limpiar el contenedor (eliminar el spinner de carga inicial).
    grid.innerHTML = ''; 

    if (filteredOrders.length === 0) {
        displayEmptyState();
        return;
    }

    filteredOrders.forEach(order => {
        const card = createOrderCardElement(order);
        grid.appendChild(card);
        // Cargar el contenido SVG para esta tarjeta específica.
        loadOrderSVG(order, `svg-container-${order.id}`);
    });
}

/**
 * Crea el elemento HTML para una sola tarjeta de orden.
 * @param {object} order - Los datos de la orden.
 * @returns {HTMLElement} El elemento div de la tarjeta.
 */
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

/**
 * Carga y muestra el contenido SVG para una orden específica.
 * @param {object} orderData - Los datos de la orden.
 * @param {string} containerId - El ID del contenedor donde se renderizará el SVG.
 */
async function loadOrderSVG(orderData, containerId) {
    try {
        await loadAndPopulateSVG(orderData, containerId);
    } catch (error) {
        console.error(`❌ Error cargando SVG para orden ${orderData.id}:`, error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="svg-error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading visualization</p>
                </div>
            `;
        }
    }
}

/**
 * Actualiza el contador de órdenes pendientes y procesadas.
 */
function updateSummary() {
    const pendingCount = filteredOrders.length - processedOrders.size;
    const processedCount = processedOrders.size;
    document.getElementById('pending-count').textContent = pendingCount;
    document.getElementById('processed-count').textContent = processedCount;
    console.log(`📊 Resumen actualizado: ${pendingCount} pendientes, ${processedCount} procesadas.`);
}

/**
 * Marca una tarjeta como procesada, añadiendo estilos y un indicador de estado.
 * @param {string} orderId - El ID de la orden procesada.
 * @param {string} action - La acción realizada ('approve' o 'reject').
 */
function markOrderAsProcessed(orderId, action) {
    const orderCard = document.querySelector(`.order-card[data-order-id="${orderId}"]`);
    if (!orderCard) return;

    orderCard.classList.add('processed');
    const orderHeader = orderCard.querySelector('.order-header');
    
    // Crear y añadir el indicador de estado (badge).
    const statusIndicator = document.createElement('div');
    statusIndicator.className = `status-indicator status-${action}`;
    statusIndicator.textContent = action === 'approve' ? 'APPROVED' : 'REJECTED';
    orderHeader.appendChild(statusIndicator);
    
    // Opcional: Ocultar la tarjeta después de un tiempo.
    // setTimeout(() => orderCard.classList.add('hidden'), 3000);
}

/**
 * Muestra un mensaje cuando no hay órdenes para mostrar.
 */
function displayEmptyState() {
    const grid = document.getElementById('orders-grid');
    grid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-box-open"></i>
            <h2>No pending orders found</h2>
            <p>There are no orders requiring your approval at this moment.</p>
        </div>
    `;
}

/**
 * Muestra un mensaje de error general en el área de contenido.
 * @param {string} message - El mensaje de error a mostrar.
 */
function displayErrorState(message) {
    const grid = document.getElementById('orders-grid');
    grid.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>An Error Occurred</h2>
            <p>${message}</p>
        </div>
    `;
}


// =================================================================================
// MANEJO DE EVENTOS
// =================================================================================

/**
 * Configura todos los manejadores de eventos de la página.
 */
function setupEventListeners() {
    const grid = document.getElementById('orders-grid');

    // Delegación de eventos para acciones individuales en las tarjetas.
    grid.addEventListener('click', (event) => {
        const approveBtn = event.target.closest('.btn-approve-order');
        const rejectBtn = event.target.closest('.btn-reject-order');
        const downloadBtn = event.target.closest('.btn-download-order');
        
        if (approveBtn) {
            handleIndividualAction(approveBtn.dataset.orderId, 'approve');
        } else if (rejectBtn) {
            handleIndividualAction(rejectBtn.dataset.orderId, 'reject');
        } else if (downloadBtn) {
            handleDownloadOrder(downloadBtn.dataset.orderId);
        }
    });

    // Event listeners para acciones en bloque.
    document.getElementById('approve-all-btn').addEventListener('click', () => handleBulkAction('approve'));
    document.getElementById('reject-all-btn').addEventListener('click', () => handleBulkAction('reject'));
    document.getElementById('download-all-btn').addEventListener('click', handleDownloadAll);
    
    console.log('✅ Manejadores de eventos configurados.');
}

/**
 * Maneja una acción individual (aprobar/rechazar) sobre una orden.
 * @param {string} orderId - El ID de la orden.
 * @param {string} action - La acción a realizar ('approve' o 'reject').
 */
async function handleIndividualAction(orderId, action) {
    if (processedOrders.has(orderId)) {
        Swal.fire('Already Processed', `Order #${orderId} has already been processed.`, 'info');
        return;
    }
    
    const { isConfirmed } = await Swal.fire({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Order #${orderId}?`,
        text: `Are you sure you want to ${action} this order?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
        confirmButtonText: `Yes, ${action} it!`,
    });

    if (isConfirmed) {
        try {
            if (action === 'approve') {
                await approveOrder(orderId);
                await sendEmailNotification(orderId, 'approval');
            } else {
                await rejectOrder(orderId);
                await sendEmailNotification(orderId, 'rejected');
            }
            processedOrders.add(orderId);
            markOrderAsProcessed(orderId, action);
            updateSummary();
            Swal.fire('Success!', `Order #${orderId} has been ${action}d.`, 'success');
        } catch (error) {
            console.error(`❌ Error al ${action} la orden #${orderId}:`, error);
            Swal.fire('Error', `Failed to ${action} order #${orderId}.`, 'error');
        }
    }
}

/**
 * Maneja la descarga de un PDF para una sola orden.
 * @param {string} orderId - El ID de la orden a descargar.
 */
async function handleDownloadOrder(orderId) {
    const orderData = filteredOrders.find((o) => o.id == orderId);
    if (!orderData) {
        Swal.fire('Error', 'Order data not found.', 'error');
        return;
    }

    try {
        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait a moment.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });
        await generatePDF(orderData, `PF_Order_${orderId}`);
        Swal.close();
        Swal.fire('Downloaded!', `PDF for order #${orderId} has been generated.`, 'success');
    } catch (error) {
        console.error('❌ Error al generar PDF:', error);
        Swal.fire('PDF Error', 'Failed to generate the PDF.', 'error');
    }
}

/**
 * Maneja una acción en bloque (aprobar/rechazar todas).
 * @param {string} action - La acción a realizar ('approve' o 'reject').
 */
async function handleBulkAction(action) {
    const pendingOrders = filteredOrders.filter(o => !processedOrders.has(o.id.toString()));

    if (pendingOrders.length === 0) {
        Swal.fire('No Pending Orders', 'All orders have already been processed.', 'info');
        return;
    }

    const { isConfirmed } = await Swal.fire({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} All Orders?`,
        text: `This will ${action} ${pendingOrders.length} pending orders. This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
        confirmButtonText: `Yes, ${action} all!`,
    });

    if (isConfirmed) {
        Swal.fire({
            title: 'Processing Orders...',
            text: 'Please wait, this may take a moment.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        for (const order of pendingOrders) {
            try {
                if (action === 'approve') {
                    await approveOrder(order.id);
                    await sendEmailNotification(order.id, 'approval');
                } else {
                    await rejectOrder(order.id);
                    await sendEmailNotification(order.id, 'rejected');
                }
                processedOrders.add(order.id.toString());
                markOrderAsProcessed(order.id, action);
            } catch (error) {
                console.error(`❌ Error procesando orden #${order.id} en bloque:`, error);
                // Opcional: registrar el fallo y continuar.
            }
        }
        
        updateSummary();
        Swal.fire('Completed!', `All ${pendingOrders.length} orders have been processed.`, 'success');
    }
}

/**
 * Maneja la descarga de todos los PDFs para las órdenes filtradas.
 */
async function handleDownloadAll() {
    if (filteredOrders.length === 0) {
        Swal.fire('No Orders', 'There are no orders to download.', 'info');
        return;
    }
    
    const { isConfirmed } = await Swal.fire({
        title: 'Download All PDFs?',
        text: `This will generate PDFs for all ${filteredOrders.length} visible orders.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, download all!',
    });

    if (isConfirmed) {
        Swal.fire({
            title: 'Generating PDFs...',
            html: 'Starting download process...<br><b></b>',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
                const progressText = Swal.getHtmlContainer().querySelector('b');
                
                let i = 0;
                const interval = setInterval(async () => {
                    if (i < filteredOrders.length) {
                        const order = filteredOrders[i];
                        progressText.textContent = `Generating ${i + 1} of ${filteredOrders.length}: Order #${order.id}`;
                        try {
                            await generatePDF(order, `PF_Order_${order.id}`);
                        } catch (error) {
                            console.error(`❌ Error descargando PDF para orden #${order.id}:`, error);
                        }
                        i++;
                    } else {
                        clearInterval(interval);
                        Swal.fire('All Done!', `${filteredOrders.length} PDFs have been downloaded.`, 'success');
                    }
                }, 500); // Un pequeño delay entre descargas para no sobrecargar.
            },
        });
    }
}
