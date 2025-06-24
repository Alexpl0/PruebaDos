<?php
/**
 * viewWeekOrder.php - Weekly Orders Viewer
 * Solo usuarios autenticados pueden acceder (igual que view_order.php)
 */

require_once 'dao/users/auth_check.php';

// Get user session data from auth_check
$userId = $user_id;
$userName = $user_name;
$userEmail = $_SESSION['user']['email'] ?? '';
$userRole = $_SESSION['user']['role'] ?? '';
$userPlant = $user_plant;
$authorizationLevel = $auth_level;

// Define base URLs
$URLBASE = "https://grammermx.com/Jesus/PruebaDos/";
$URLM = "https://grammermx.com/Mailer/PFMailer/";
$URLPF = "https://grammermx.com/PremiumFreight/";

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Freight Weekly<?php echo $orderId; ?> - Grammer PF</title>
    
    <!-- Favicon -->
    <link rel="icon" href="assets/logo/logo.png" type="image/x-icon">
    
    <!-- SEO and Meta -->
    <meta name="description" content="Premium Freight Order Management System - Grammer AG">
    <meta name="author" content="Grammer AG">
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
    
    <!-- External CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/viewWeekorder.css">
    
    <!-- External JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.2/d3.min.js"></script> <!-- Para manipulación avanzada de SVGs -->
    <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script> <!-- Para utilidades JS -->
    <script>
        window.PF_WEEK_CONFIG = {
            userId: <?php echo $userId; ?>,
            userName: '<?php echo addslashes($userName); ?>',
            userEmail: '<?php echo addslashes($userEmail); ?>',
            userRole: '<?php echo addslashes($userRole); ?>',
            userPlant: '<?php echo addslashes($userPlant); ?>',
            authorizationLevel: <?php echo $authorizationLevel; ?>,
            urls: {
                base: '<?php echo $URLBASE; ?>',
                mailer: '<?php echo $URLM; ?>',
                pf: '<?php echo $URLPF; ?>'
            }
        };
    </script>
</head>
<body>
    <div class="bulk-container">
        <!-- ===== HEADER PRINCIPAL CON INFORMACIÓN Y ACCIONES ===== -->
        <header class="bulk-header">
            <div class="bulk-header-content">
                <div class="header-left">
                    <!-- Logo y nombre de la compañía -->
                    <div class="company-logo">
                        <i class="fas fa-truck-fast"></i>
                        <span class="company-name">Grammer AG</span>
                    </div>
                    <!-- Información de las órdenes -->
                    <div class="orders-info">
                        <h1 class="orders-title-main">Premium Freight Orders</h1>
                        <p class="orders-subtitle"><?php echo count($ordersData); ?> orders pending approval by <?php echo htmlspecialchars($userData['name']); ?></p>
                    </div>
                </div>
                <div class="header-right">
                    <!-- Panel de acciones bulk -->
                    <div class="bulk-actions-header">
                        <button id="approve-all-btn" class="bulk-action-btn btn-approve-all">
                            <i class="fas fa-check-double"></i>
                            Approve All
                        </button>
                        <button id="reject-all-btn" class="bulk-action-btn btn-reject-all">
                            <i class="fas fa-times-circle"></i>
                            Reject All
                        </button>
                        <button id="download-all-btn" class="bulk-action-btn btn-download-all">
                            <i class="fas fa-download"></i>
                            Download All
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- ===== GRID PRINCIPAL DE ÓRDENES ===== -->
        <main class="orders-grid" id="orders-grid">
            <?php foreach ($ordersData as $order): ?>
            <!-- Tarjeta individual para cada orden -->
            <div class="order-card" data-order-id="<?php echo $order['id']; ?>">
                <div class="order-header">
                    <h2 class="order-title">Order #<?php echo $order['id']; ?></h2>
                    <div class="order-actions">
                        <!-- Botón de aprobación con token único -->
                        <button class="order-action-btn btn-approve-order" 
                                data-order-id="<?php echo $order['id']; ?>"
                                data-token="<?php echo $tokensData[$order['id']]['approve']; ?>">
                            <i class="fas fa-check"></i>
                            Approve
                        </button>
                        <!-- Botón de rechazo con token único -->
                        <button class="order-action-btn btn-reject-order"
                                data-order-id="<?php echo $order['id']; ?>"
                                data-token="<?php echo $tokensData[$order['id']]['reject']; ?>">
                            <i class="fas fa-times"></i>
                            Reject
                        </button>
                        <!-- Botón de descarga PDF -->
                        <button class="order-action-btn btn-download-order"
                                data-order-id="<?php echo $order['id']; ?>">
                            <i class="fas fa-download"></i>
                            PDF
                        </button>
                    </div>
                </div>
                <div class="order-content">
                    <!-- Contenedor para SVG que será populado por JavaScript -->
                    <div class="order-svg-container" id="svg-container-<?php echo $order['id']; ?>">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </main>

        <!-- ===== PANEL FLOTANTE DE PROGRESO ===== -->
        <div class="floating-summary" id="floating-summary">
            <div class="summary-title">Progress Summary</div>
            <div class="summary-stats">
                <span>Pending: <span id="pending-count"><?php echo count($ordersData); ?></span></span>
                <span>Processed: <span id="processed-count">0</span></span>
            </div>
        </div>
    </div>

    <!-- ===== LÓGICA PRINCIPAL DE LA APLICACIÓN ===== -->
    <script type="module">
        /**
         * IMPORTACIÓN DE MÓDULOS CRÍTICOS
         * 
         * loadAndPopulateSVG: Función para cargar y poblar SVGs con datos de órdenes
         * generatePDF: Función para generar y descargar PDFs de órdenes
         */
        import { loadAndPopulateSVG, generatePDF } from '<?php echo URLPF; ?>js/svgOrders.js';

        /**
         * ================================================================================
         * CLASE PRINCIPAL: BulkOrdersViewer
         * ================================================================================
         * 
         * Esta clase maneja toda la funcionalidad del visualizador de órdenes bulk:
         * 
         * RESPONSABILIDADES PRINCIPALES:
         * 1. Inicialización y configuración de la aplicación
         * 2. Carga de SVGs para todas las órdenes
         * 3. Manejo de eventos de usuario (clicks, acciones)
         * 4. Procesamiento de acciones individuales y bulk
         * 5. Actualización de UI en tiempo real
         * 6. Comunicación con backend via AJAX
         * 7. Generación de PDFs
         * 8. Manejo de estados y errores
         */
        class BulkOrdersViewer {
            /**
             * CONSTRUCTOR DE LA CLASE
             * 
             * Inicializa la instancia con configuración global y estado inicial:
             * - Obtiene configuración de window.PF_BULK_CONFIG
             * - Inicializa Set para rastrear órdenes procesadas
             * - Lanza proceso de inicialización asíncrono
             */
            constructor() {
                this.config = window.PF_BULK_CONFIG;           // Configuración global de PHP
                this.processedOrders = new Set();             // Set para rastrear órdenes ya procesadas
                this.initialize();                             // Iniciar proceso de configuración
            }

            /**
             * MÉTODO DE INICIALIZACIÓN PRINCIPAL
             * 
             * Coordina la inicialización completa de la aplicación:
             * 
             * SECUENCIA DE INICIALIZACIÓN:
             * 1. Log de información de configuración para debugging
             * 2. Carga asíncrona de todos los SVGs de órdenes
             * 3. Configuración de event listeners para interacciones
             * 4. Actualización inicial del resumen de progreso
             * 
             * Este método es async porque la carga de SVGs requiere operaciones asíncronas
             */
            async initialize() {
                console.log('Initializing Bulk Orders Viewer:', this.config);
                
                // Cargar visualizaciones SVG para todas las órdenes
                await this.loadAllOrderSVGs();
                
                // Configurar manejadores de eventos para todas las interacciones
                this.setupEventListeners();
                
                // Actualizar estadísticas iniciales en panel flotante
                this.updateSummary();
            }

            /**
             * CARGA MASIVA DE SVGs PARA TODAS LAS ÓRDENES
             * 
             * ESTRATEGIA DE CARGA:
             * - Crea array de promesas para carga paralela
             * - Cada orden se carga de manera independiente
             * - Promise.all espera a que todas las cargas terminen
             * - Manejo individual de errores por orden
             * 
             * BENEFICIOS:
             * - Carga paralela mejora performance significativamente
             * - Una orden que falle no afecta a las demás
             * - Usuario ve progreso visual mientras cargan
             */
            async loadAllOrderSVGs() {
                const promises = this.config.orders.map(order => this.loadOrderSVG(order));
                await Promise.all(promises);
            }

            /**
             * CARGA INDIVIDUAL DE SVG PARA UNA ORDEN ESPECÍFICA
             * 
             * PROCESO DE CARGA:
             * 1. Genera containerId único basado en ID de orden
             * 2. Llama a loadAndPopulateSVG del módulo svgOrders.js
             * 3. La función pobla el SVG con datos específicos de la orden
             * 4. Maneja errores mostrando mensaje de error en contenedor
             * 
             * PARÁMETROS:
             * @param {Object} orderData - Datos completos de la orden desde PHP
             * 
             * MANEJO DE ERRORES:
             * - Captura cualquier error durante la carga
             * - Muestra mensaje de error visual en lugar del SVG
             * - Permite que otras órdenes continúen cargando
             */
            async loadOrderSVG(orderData) {
                try {
                    const containerId = `svg-container-${orderData.id}`;
                    
                    // Usar la misma función que view_order.php para consistencia
                    await loadAndPopulateSVG(orderData, containerId);
                    
                    console.log(`SVG loaded for order ${orderData.id}`);
                } catch (error) {
                    console.error(`Error loading SVG for order ${orderData.id}:`, error);
                    
                    // Mostrar mensaje de error en lugar del SVG
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

            /**
             * CONFIGURACIÓN DE EVENT LISTENERS
             * 
             * Configura todos los manejadores de eventos para:
             * 
             * ACCIONES INDIVIDUALES POR ORDEN:
             * - Botones de aprobación (.btn-approve-order)
             * - Botones de rechazo (.btn-reject-order)
             * - Botones de descarga (.btn-download-order)
             * 
             * ACCIONES BULK (TODAS LAS ÓRDENES):
             * - Aprobar todas (#approve-all-btn)
             * - Rechazar todas (#reject-all-btn)
             * - Descargar todas (#download-all-btn)
             * 
             * PATRÓN DE EVENT DELEGATION:
             * - Usa querySelectorAll para encontrar todos los elementos
             * - Cada listener maneja múltiples elementos del mismo tipo
             * - Delegación eficiente para elementos dinámicos
             */
            setupEventListeners() {
                // ===== EVENT LISTENERS PARA ACCIONES INDIVIDUALES =====
                
                /**
                 * BOTONES DE APROBACIÓN INDIVIDUAL
                 * Cada botón maneja la aprobación de una orden específica
                 */
                document.querySelectorAll('.btn-approve-order').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handleIndividualAction(e, 'approve'));
                });

                /**
                 * BOTONES DE RECHAZO INDIVIDUAL
                 * Cada botón maneja el rechazo de una orden específica
                 */
                document.querySelectorAll('.btn-reject-order').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handleIndividualAction(e, 'reject'));
                });

                /**
                 * BOTONES DE DESCARGA INDIVIDUAL
                 * Cada botón genera y descarga PDF de una orden específica
                 */
                document.querySelectorAll('.btn-download-order').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handleDownloadOrder(e));
                });

                // ===== EVENT LISTENERS PARA ACCIONES BULK =====
                
                /**
                 * BOTÓN APROBAR TODAS
                 * Procesa aprobación de todas las órdenes pendientes
                 */
                document.getElementById('approve-all-btn').addEventListener('click', () => this.handleBulkAction('approve'));
                
                /**
                 * BOTÓN RECHAZAR TODAS
                 * Procesa rechazo de todas las órdenes pendientes
                 */
                document.getElementById('reject-all-btn').addEventListener('click', () => this.handleBulkAction('reject'));
                
                /**
                 * BOTÓN DESCARGAR TODAS
                 * Genera PDFs para todas las órdenes
                 */
                document.getElementById('download-all-btn').addEventListener('click', () => this.handleDownloadAll());
            }

            /**
             * MANEJADOR DE ACCIONES INDIVIDUALES (APROBAR/RECHAZAR)
             * 
             * FLUJO DE PROCESAMIENTO:
             * 1. Extrae información del botón clickeado (order ID, token)
             * 2. Verifica si la orden ya fue procesada
             * 3. Muestra confirmación con SweetAlert2
             * 4. Si se confirma, procesa la acción
             * 
             * PARÁMETROS:
             * @param {Event} event - Evento de click del botón
             * @param {string} action - Tipo de acción ('approve' o 'reject')
             * 
             * VALIDACIONES:
             * - Verifica que la orden no haya sido procesada previamente
             * - Requiere confirmación explícita del usuario
             * - Usa tokens únicos para seguridad
             */
            async handleIndividualAction(event, action) {
                // Obtener información del botón clickeado
                const btn = event.target.closest('.order-action-btn');
                const orderId = btn.getAttribute('data-order-id');
                const token = btn.getAttribute('data-token');

                // Verificar si la orden ya fue procesada
                if (this.processedOrders.has(orderId)) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Already Processed',
                        text: `Order #${orderId} has already been ${action}d.`
                    });
                    return;
                }

                // Mostrar confirmación antes de procesar
                const result = await Swal.fire({
                    title: `${action.charAt(0).toUpperCase() + action.slice(1)} Order #${orderId}?`,
                    text: `Are you sure you want to ${action} this order?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
                    confirmButtonText: `Yes, ${action}!`,
                    cancelButtonText: 'Cancel'
                });

                // Procesar acción si fue confirmada
                if (result.isConfirmed) {
                    await this.processAction(token, action, orderId);
                }
            }

            /**
             * MANEJADOR DE ACCIONES BULK (TODAS LAS ÓRDENES)
             * 
             * LÓGICA DE PROCESAMIENTO BULK:
             * 1. Filtra órdenes que aún no han sido procesadas
             * 2. Verifica que haya órdenes pendientes
             * 3. Muestra confirmación con advertencia
             * 4. Procesa cada orden individualmente en secuencia
             * 
             * PARÁMETROS:
             * @param {string} action - Tipo de acción ('approve' o 'reject')
             * 
             * CONSIDERACIONES:
             * - Solo procesa órdenes que no han sido procesadas
             * - Requiere confirmación explícita por el impacto masivo
             * - Procesa en secuencia para evitar sobrecarga del servidor
             * - Cada orden usa su token individual para seguridad
             */
            async handleBulkAction(action) {
                // Filtrar solo órdenes que no han sido procesadas
                const pendingOrders = this.config.orders.filter(order => !this.processedOrders.has(order.id.toString()));
                
                // Verificar si hay órdenes pendientes
                if (pendingOrders.length === 0) {
                    Swal.fire({
                        icon: 'info',
                        title: 'No Pending Orders',
                        text: 'All orders have been processed already.'
                    });
                    return;
                }

                // Mostrar confirmación con advertencia de impacto masivo
                const result = await Swal.fire({
                    title: `${action.charAt(0).toUpperCase() + action.slice(1)} All Orders?`,
                    text: `This will ${action} ${pendingOrders.length} pending orders. This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
                    confirmButtonText: `Yes, ${action} all!`,
                    cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                    // Procesar cada orden individualmente con su token único
                    for (const order of pendingOrders) {
                        const token = this.config.tokens[order.id][action];
                        await this.processAction(token, action, order.id);
                    }
                }
            }

            /**
             * PROCESAMIENTO CORE DE ACCIONES (BACKEND COMMUNICATION)
             * 
             * FLUJO DE COMUNICACIÓN CON BACKEND:
             * 1. Construye URL con parámetros de acción y token
             * 2. Muestra indicador de carga con SweetAlert2
             * 3. Ejecuta llamada AJAX al endpoint de procesamiento
             * 4. Verifica respuesta y actualiza UI según resultado
             * 5. Maneja errores y muestra feedback apropiado
             * 
             * PARÁMETROS:
             * @param {string} token - Token único para la acción específica
             * @param {string} action - Tipo de acción ('approve' o 'reject')
             * @param {number|string} orderId - ID de la orden a procesar
             * 
             * SEGURIDAD:
             * - Cada llamada usa token único y temporal
             * - Validación server-side de permisos
             * - Timeouts para prevenir requests colgados
             * 
             * FEEDBACK VISUAL:
             * - Loading spinner durante procesamiento
             * - Mensajes de éxito/error claros
             * - Actualización inmediata de UI
             */
            async processAction(token, action, orderId) {
                try {
                    // Construir URL del endpoint con parámetros
                    const url = `${this.config.urls.singleAction}?action=${action}&token=${token}`;
                    
                    // Mostrar indicador de carga
                    Swal.fire({
                        title: 'Processing...',
                        text: `${action.charAt(0).toUpperCase() + action.slice(1)}ing order #${orderId}`,
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    // Ejecutar llamada AJAX
                    const response = await fetch(url, { method: 'GET' });
                    
                    if (response.ok) {
                        // ÉXITO: Actualizar estado local y UI
                        this.processedOrders.add(orderId.toString());
                        this.markOrderAsProcessed(orderId, action);
                        this.updateSummary();
                        
                        // Mostrar mensaje de éxito
                        Swal.fire({
                            icon: 'success',
                            title: 'Success!',
                            text: `Order #${orderId} has been ${action}d successfully.`,
                            timer: 2000,
                            timerProgressBar: true
                        });
                    } else {
                        // ERROR HTTP: Lanzar excepción con detalles
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                } catch (error) {
                    // MANEJO DE ERRORES: Log y feedback al usuario
                    console.error('Error processing action:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: `Failed to ${action} order #${orderId}. Please try again.`
                    });
                }
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
                    // Aplicar clase CSS para cambios visuales
                    orderCard.classList.add('processed');
                    
                    // Crear y añadir indicador de estado
                    const orderHeader = orderCard.querySelector('.order-header');
                    const statusIndicator = document.createElement('div');
                    statusIndicator.className = `status-indicator status-${action}d`;
                    statusIndicator.textContent = action === 'approve' ? 'APPROVED' : 'REJECTED';
                    orderHeader.appendChild(statusIndicator);
                    
                    // Opción de ocultar orden después de delay
                    setTimeout(() => {
                        if (confirm(`Hide processed order #${orderId}?`)) {
                            orderCard.classList.add('hidden');
                        }
                    }, 3000);
                }
            }

            /**
             * MANEJADOR DE DESCARGA DE PDF
             * 
             * FLUJO DE DESCARGA:
             * 1. Extrae ID de orden del botón clickeado
             * 2. Busca datos completos de la orden en configuración
             * 3. Llama a generatePDF del módulo svgOrders.js
             * 4. Muestra feedback de éxito o error
             * 
             * PARÁMETROS:
             * @param {Event} event - Evento de click del botón
             * 
             * VALIDACIONES:
             * - Verifica que los datos de la orden existan
             * - Muestra mensaje de error si faltan datos
             */
            async handleDownloadOrder(event) {
                const btn = event.target.closest('.order-action-btn');
                const orderId = btn.getAttribute('data-order-id');
                const orderData = this.config.orders.find(o => o.id == orderId);
                
                // Validar que los datos de la orden estén disponibles
                if (!orderData) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Order data not found.'
                    });
                    return;
                }

                try {
                    // Llamar a la función de generación de PDF
                    await generatePDF(orderData, `PF_Order_${orderId}`);
                    
                    // Mostrar mensaje de éxito con temporizador
                    Swal.fire({
                        icon: 'success',
                        title: 'PDF Downloaded!',
                        text: `Order #${orderId} has been downloaded successfully.`,
                        timer: 2000,
                        timerProgressBar: true
                    });
                } catch (error) {
                    // Manejo de errores específico para generación de PDF
                    console.error('Error generating PDF:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to generate PDF. Please try again.'
                    });
                }
            }

            /**
             * MANEJADOR DE DESCARGA DE TODOS LOS PDFs
             * 
             * FLUJO DE DESCARGA MASIVO:
             * 1. Muestra confirmación antes de iniciar descarga masiva
             * 2. Muestra indicador de progreso durante la generación
             * 3. Genera y descarga cada PDF de orden en secuencia
             * 4. Maneja errores y muestra feedback al usuario
             * 
             * CONSIDERACIONES:
             * - Descarga en secuencia para evitar sobrecarga del servidor
             * - Actualiza el progreso en tiempo real
             * - Muestra mensaje final de éxito o error
             */
            async handleDownloadAll() {
                // Confirmar acción con el usuario
                const result = await Swal.fire({
                    title: 'Download All Orders?',
                    text: `This will generate PDFs for ${this.config.orders.length} orders. This may take a few moments.`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#034C8C',
                    confirmButtonText: 'Yes, download all!',
                    cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                    try {
                        // Mostrar indicador de generación de PDFs
                        Swal.fire({
                            title: 'Generating PDFs...',
                            text: 'Please wait while we generate all PDFs.',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        });

                        // Generar PDF para cada orden en secuencia
                        for (let i = 0; i < this.config.orders.length; i++) {
                            const order = this.config.orders[i];
                            await generatePDF(order, `PF_Order_${order.id}`);
                            
                            // Actualizar progreso en el diálogo
                            const progress = ((i + 1) / this.config.orders.length) * 100;
                            Swal.update({
                                text: `Generated ${i + 1} of ${this.config.orders.length} PDFs (${Math.round(progress)}%)`
                            });
                        }

                        // Mostrar mensaje de éxito al finalizar
                        Swal.fire({
                            icon: 'success',
                            title: 'All PDFs Downloaded!',
                            text: `Successfully generated ${this.config.orders.length} PDF files.`,
                            timer: 3000,
                            timerProgressBar: true
                        });
                    } catch (error) {
                        // Manejo de errores durante la generación masiva de PDFs
                        console.error('Error generating PDFs:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to generate some PDFs. Please try again.'
                        });
                    }
                }
            }

            /**
             * ACTUALIZACIÓN DEL RESUMEN EN EL PANEL FLOTANTE
             * 
             * Este método actualiza los contadores de órdenes pendientes y procesadas
             * en el panel flotante de resumen:
             * 
             * - pendingCount: Total de órdenes menos las procesadas
             * - processedCount: Total de órdenes procesadas
             * 
             * Se llama automáticamente después de cada acción para reflejar el estado actual
             */
            updateSummary() {
                const pendingCount = this.config.orders.length - this.processedOrders.size;
                const processedCount = this.processedOrders.size;
                
                document.getElementById('pending-count').textContent = pendingCount;
                document.getElementById('processed-count').textContent = processedCount;
            }
        }

        // Inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new BulkOrdersViewer());
        } else {
            new BulkOrdersViewer();
        }
    </script>
</body>
</html>