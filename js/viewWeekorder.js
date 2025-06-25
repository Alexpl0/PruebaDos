/**
 * IMPORTACIÓN DE MÓDULOS CRÍTICOS
 * 
 * loadAndPopulateSVG: Función para cargar y poblar SVGs con datos de órdenes
 * generatePDF: Función para generar y descargar PDFs de órdenes
 * approval.js: Módulo para manejar aprobaciones, rechazos y notificaciones
 */
import { loadAndPopulateSVG, generatePDF } from './svgOrders.js';
import { 
    approveOrder, 
    rejectOrder, 
    sendEmailNotification, 
    setupApprovalEventListeners 
} from './approval.js';

document.addEventListener('DOMContentLoaded', () => {
    // Configurar manejadores de eventos para todas las interacciones
    setupApprovalEventListeners();

    // Cargar visualizaciones SVG para las órdenes
    const orderCards = document.querySelectorAll('.order-card');
    orderCards.forEach(async (card) => {
        const orderId = card.getAttribute('data-order-id');
        const containerId = `svg-container-${orderId}`;
        try {
            const orderData = await fetchOrderData(orderId);
            await loadAndPopulateSVG(orderData, containerId);
            console.log(`SVG loaded for order ${orderId}`);
        } catch (error) {
            console.error(`Error loading SVG for order ${orderId}:`, error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>Error loading order visualization</p>
                    </div>
                `;
            }
        }
    });

    // Actualizar estadísticas iniciales en el panel flotante
    updateSummary();
});

async function fetchOrderData() {
    try {
        const response = await fetch(`${URLPF}dao/conections/daoPremiumFreight.php`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (!result || !result.data) {
            throw new Error('Invalid data format received');
        }

        return result.data;
    } catch (error) {
        console.error('Error fetching order data:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Obtener datos de las órdenes desde el endpoint correcto
        const ordersData = await fetchOrderData();

        // Cargar visualizaciones SVG para las órdenes
        ordersData.forEach(async (order) => {
            const containerId = `svg-container-${order.id}`;
            try {
                await loadAndPopulateSVG(order, containerId);
                console.log(`SVG loaded for order ${order.id}`);
            } catch (error) {
                console.error(`Error loading SVG for order ${order.id}:`, error);
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = `
                        <div style="text-align: center; color: #ef4444;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p>Error loading order visualization</p>
                        </div>
                    `;
                }
            }
        });

        // Actualizar estadísticas iniciales en el panel flotante
        updateSummary();
    } catch (error) {
        console.error('Error initializing orders:', error);
    }
});

function updateSummary() {
    const pendingCount = document.querySelectorAll('.order-card:not(.processed)').length;
    const processedCount = document.querySelectorAll('.order-card.processed').length;
    document.getElementById('pending-count').textContent = pendingCount;
    document.getElementById('processed-count').textContent = processedCount;
}

/**
 * ================================================================================ 
 * CLASE PRINCIPAL: BulkOrdersViewer 
 * ================================================================================ 
 */
class BulkOrdersViewer {
    constructor(userId, authorizationLevel, urls) {
        this.userId = userId;                     // ID del usuario
        this.authorizationLevel = authorizationLevel; // Nivel de autorización
        this.urls = urls;                         // URLs base
        this.processedOrders = new Set();         // Set para rastrear órdenes ya procesadas
        this.filteredOrders = [];                 // Órdenes filtradas según authorizationLevel
        this.initialize();                        // Iniciar proceso de configuración
    }

    async initialize() {
        console.log('Initializing Bulk Orders Viewer:', this.userId, this.authorizationLevel, this.urls);
        
        // Obtener y filtrar órdenes según authorizationLevel
        await this.fetchAndFilterOrders();
        
        // Cargar visualizaciones SVG para las órdenes filtradas
        await this.loadAllOrderSVGs();
        
        // Configurar manejadores de eventos para todas las interacciones
        setupApprovalEventListeners();
        
        // Actualizar estadísticas iniciales en el panel flotante
        this.updateSummary();
    }

    async fetchAndFilterOrders() {
        try {
            const response = await fetch(URLPF + 'dao/conections/daoPremiumFreight.php', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (!result || !Array.isArray(result.data)) {
                throw new Error('Invalid data format received');
            }

            this.filteredOrders = result.data.filter(
                (order) => order.approval_status + 1 === this.authorizationLevel
            );

            console.log('Filtered Orders:', this.filteredOrders);
        } catch (error) {
            console.error('Error fetching and filtering orders:', error);
        }
    }

    async loadAllOrderSVGs() {
        const promises = this.filteredOrders.map((order) =>
            this.loadOrderSVG(order)
        );
        await Promise.all(promises);
    }

    async loadOrderSVG(orderData) {
        try {
            const containerId = `svg-container-${orderData.id}`;
            await loadAndPopulateSVG(orderData, containerId);
            console.log(`SVG loaded for order ${orderData.id}`);
        } catch (error) {
            console.error(`Error loading SVG for order ${orderData.id}:`, error);
            const container = document.getElementById(`svg-container-${orderData.id}`);
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>Error loading order visualization</p>
                    </div>
                `;
            }
        }
    }

    async handleIndividualAction(event, action) {
        const btn = event.target.closest('.order-action-btn');
        const orderId = btn.getAttribute('data-order-id');

        if (this.processedOrders.has(orderId)) {
            Swal.fire({
                icon: 'info',
                title: 'Already Processed',
                text: `Order #${orderId} has already been ${action}d.`,
            });
            return;
        }

        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Order #${orderId}?`,
            text: `Are you sure you want to ${action} this order?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
            confirmButtonText: `Yes, ${action}!`,
            cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {
            if (action === 'approve') {
                await approveOrder(orderId);
                await sendEmailNotification(orderId, 'approval');
            } else if (action === 'reject') {
                await rejectOrder(orderId);
                await sendEmailNotification(orderId, 'rejected');
            }
            this.processedOrders.add(orderId);
            this.markOrderAsProcessed(orderId, action);
            this.updateSummary();
        }
    }

    async handleDownloadOrder(event) {
        const btn = event.target.closest('.order-action-btn');
        const orderId = btn.getAttribute('data-order-id');
        const orderData = this.filteredOrders.find((o) => o.id == orderId);

        if (!orderData) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Order data not found.',
            });
            return;
        }

        try {
            await generatePDF(orderData, `PF_Order_${orderId}`);
            Swal.fire({
                icon: 'success',
                title: 'PDF Downloaded!',
                text: `Order #${orderId} has been downloaded successfully.`,
                timer: 2000,
                timerProgressBar: true,
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to generate PDF. Please try again.',
            });
        }
    }

    async handleDownloadAll() {
        const result = await Swal.fire({
            title: 'Download All Orders?',
            text: `This will generate PDFs for ${this.filteredOrders.length} orders. This may take a few moments.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#034C8C',
            confirmButtonText: 'Yes, download all!',
            cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {
            try {
                Swal.fire({
                    title: 'Generating PDFs...',
                    text: 'Please wait while we generate all PDFs.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                });

                for (let i = 0; i < this.filteredOrders.length; i++) {
                    const order = this.filteredOrders[i];
                    await generatePDF(order, `PF_Order_${order.id}`);
                    const progress = ((i + 1) / this.filteredOrders.length) * 100;
                    Swal.update({
                        text: `Generated ${i + 1} of ${this.filteredOrders.length} PDFs (${Math.round(progress)}%)`,
                    });
                }

                Swal.fire({
                    icon: 'success',
                    title: 'All PDFs Downloaded!',
                    text: `Successfully generated ${this.filteredOrders.length} PDF files.`,
                    timer: 3000,
                    timerProgressBar: true,
                });
            } catch (error) {
                console.error('Error generating PDFs:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to generate some PDFs. Please try again.',
                });
            }
        }
    }

    /**
     * Maneja las acciones en bloque (aprobar todas o rechazar todas).
     * 
     * @param {string} action - Tipo de acción ('approve' o 'reject').
     */
    async handleBulkAction(action) {
        const pendingOrders = this.filteredOrders.filter(
            (order) => !this.processedOrders.has(order.id.toString())
        );

        if (pendingOrders.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No Pending Orders',
                text: 'All orders have been processed already.',
            });
            return;
        }

        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} All Orders?`,
            text: `This will ${action} ${pendingOrders.length} pending orders. This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
            confirmButtonText: `Yes, ${action} all!`,
            cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {
            try {
                Swal.fire({
                    title: `${action.charAt(0).toUpperCase() + action.slice(1)}ing Orders...`,
                    text: 'Please wait while we process all orders.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                });

                for (let i = 0; i < pendingOrders.length; i++) {
                    const order = pendingOrders[i];
                    try {
                        if (action === 'approve') {
                            await approveOrder(order.id);
                            await sendEmailNotification(order.id, 'approval');
                        } else if (action === 'reject') {
                            await rejectOrder(order.id);
                            await sendEmailNotification(order.id, 'rejected');
                        }
                        this.processedOrders.add(order.id.toString());
                        this.markOrderAsProcessed(order.id, action);
                    } catch (error) {
                        console.error(`Error processing order ${order.id}:`, error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: `Failed to ${action} order #${order.id}. Continuing with the rest.`,
                        });
                    }

                    const progress = ((i + 1) / pendingOrders.length) * 100;
                    Swal.update({
                        text: `Processed ${i + 1} of ${pendingOrders.length} orders (${Math.round(progress)}%)`,
                    });
                }

                Swal.fire({
                    icon: 'success',
                    title: `All Orders ${action.charAt(0).toUpperCase() + action.slice(1)}ed!`,
                    text: `Successfully ${action}ed ${pendingOrders.length} orders.`,
                    timer: 3000,
                    timerProgressBar: true,
                });

                this.updateSummary();
            } catch (error) {
                console.error(`Error processing bulk action (${action}):`, error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `Failed to complete the bulk ${action} action. Please try again.`,
                });
            }
        }
    }

    updateSummary() {
        const pendingCount = this.filteredOrders.length - this.processedOrders.size;
        const processedCount = this.processedOrders.size;
        document.getElementById('pending-count').textContent = pendingCount;
        document.getElementById('processed-count').textContent = processedCount;
    }

    setupEventListeners() {
        // Event listeners para acciones individuales
        document.querySelectorAll('.btn-approve-order').forEach((btn) => {
            btn.addEventListener('click', (e) => this.handleIndividualAction(e, 'approve'));
        });

        document.querySelectorAll('.btn-reject-order').forEach((btn) => {
            btn.addEventListener('click', (e) => this.handleIndividualAction(e, 'reject'));
        });

        document.querySelectorAll('.btn-download-order').forEach((btn) => {
            btn.addEventListener('click', (e) => this.handleDownloadOrder(e));
        });

        // Event listeners para acciones bulk
        document.getElementById('approve-all-btn').addEventListener('click', () =>
            this.handleBulkAction('approve')
        );
        document.getElementById('reject-all-btn').addEventListener('click', () =>
            this.handleBulkAction('reject')
        );
        document.getElementById('download-all-btn').addEventListener('click', () =>
            this.handleDownloadAll()
        );
    }

    /**
     * ACTUALIZACIÓN VISUAL DE ORDEN PROCESADA
     * 
     * CAMBIOS VISUALES APLICADOS:
     * 1. Añade clase 'processed' para estilos CSS
     * 2. Crea y añade indicador de estado visual
     * 3. Programa ocultación automática opcional
     * 
     * PARÁMETROS:
     * @param {number|string} orderId - ID de la orden procesada
     * @param {string} action - Acción realizada ('approve' o 'reject')
     * 
     * FEEDBACK VISUAL:
     * - Cambio de opacidad y escala de la tarjeta
     * - Badge de estado (APPROVED/REJECTED)
     * - Opción de ocultar orden después de delay
     */
    markOrderAsProcessed(orderId, action) {
        const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderCard) {
            // Añadir clase 'processed' para estilos visuales
            orderCard.classList.add('processed');

            // Crear y añadir indicador de estado visual
            const orderHeader = orderCard.querySelector('.order-header');
            const statusIndicator = document.createElement('div');
            statusIndicator.className = `status-indicator status-${action}`;
            statusIndicator.textContent = action === 'approve' ? 'APPROVED' : 'REJECTED';
            orderHeader.appendChild(statusIndicator);

            // Opcional: Ocultar la orden después de un delay
            setTimeout(() => {
                if (confirm(`Hide processed order #${orderId}?`)) {
                    orderCard.classList.add('hidden');
                }
            }, 3000);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Asegúrate de que estas variables se definan correctamente en el backend y se pasen al frontend
    const userId = window.userId || null; // Define estas variables en el HTML o backend
    const authorizationLevel = window.authorizationLevel || null;
    const urls = {
        base: window.URLBASE || '',
        mailer: window.URLM || '',
        pf: window.URLPF || ''
    };

    if (!userId || !authorizationLevel || !urls.base || !urls.mailer || !urls.pf) {
        console.error('Error: Missing required configuration variables.');
        return;
    }

    new BulkOrdersViewer(userId, authorizationLevel, urls);
});