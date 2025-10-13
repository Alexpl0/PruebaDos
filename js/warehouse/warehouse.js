/**
 * Warehouse Admin - Control de Palets con IA
 * Sistema de detección y seguimiento de palets
 */

// ==================================================================================
// CLASE PRINCIPAL DE WAREHOUSE
// ==================================================================================

class WarehouseApp {
    constructor() {
        this.orders = [];
        this.detections = [];
        this.isDetecting = false;
        this.detectionInterval = null;
        this.selectedFile = null;
        this.detectionCount = 0;
        this.startTime = null;
        
        this.init();
    }

    init() {
        console.log('🏭 Warehouse Admin inicializado');
        this.setupEventListeners();
        this.loadMockData();
        this.updateUI();
    }

    setupEventListeners() {
        // Upload zone drag & drop
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');

        if (uploadZone) {
            uploadZone.addEventListener('click', () => fileInput.click());
            
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('dragover');
            });

            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('dragover');
            });

            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file) this.handleFileSelect(file);
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.handleFileSelect(file);
            });
        }

        // Fecha por defecto en el formulario
        const expectedDateInput = document.getElementById('expectedDate');
        if (expectedDateInput) {
            const today = new Date().toISOString().split('T')[0];
            expectedDateInput.value = today;
        }
    }

    loadMockData() {
        // Cargar algunas órdenes de ejemplo
        const mockOrders = [
            {
                id: 'PO-2025-001',
                supplier: 'Transportes del Norte',
                expectedPalets: 10,
                receivedPalets: 0,
                expectedDate: '2025-10-12',
                status: 'pending',
                notes: 'Primera orden de prueba'
            },
            {
                id: 'PO-2025-002',
                supplier: 'Logística Express',
                expectedPalets: 15,
                receivedPalets: 0,
                expectedDate: '2025-10-12',
                status: 'pending',
                notes: 'Urgente - Cliente prioritario'
            }
        ];

        // Descomentar para cargar datos de ejemplo
        // this.orders = mockOrders;
        // this.updateOrdersDisplay();
    }

    // ==================================================================================
    // GESTIÓN DE MODALES
    // ==================================================================================

    showUploadModal() {
        const modal = document.getElementById('uploadModal');
        if (modal) {
            modal.classList.add('show');
            this.selectedFile = null;
            document.getElementById('fileInfo').style.display = 'none';
            document.getElementById('uploadZone').style.display = 'flex';
        }
    }

    showManualModal() {
        const modal = document.getElementById('manualModal');
        if (modal) {
            modal.classList.add('show');
            // Limpiar formulario
            document.getElementById('manualOrderForm').reset();
            // Establecer fecha por defecto
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('expectedDate').value = today;
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // ==================================================================================
    // GESTIÓN DE ARCHIVOS
    // ==================================================================================

    handleFileSelect(file) {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'application/pdf'
        ];

        if (!validTypes.includes(file.type)) {
            Swal.fire({
                icon: 'error',
                title: 'Formato no válido',
                text: 'Por favor selecciona un archivo Excel, CSV o PDF',
                confirmButtonColor: '#034C8C'
            });
            return;
        }

        this.selectedFile = file;
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('fileInfo').style.display = 'flex';
        document.getElementById('fileName').textContent = file.name;
    }

    removeFile() {
        this.selectedFile = null;
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('uploadZone').style.display = 'flex';
        document.getElementById('fileInput').value = '';
    }

    processUpload() {
        if (!this.selectedFile) {
            Swal.fire({
                icon: 'warning',
                title: 'No hay archivo',
                text: 'Por favor selecciona un archivo primero',
                confirmButtonColor: '#034C8C'
            });
            return;
        }

        // Simulación de procesamiento
        Swal.fire({
            title: 'Procesando archivo...',
            html: 'Extrayendo información de órdenes',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        setTimeout(() => {
            // Simular extracción de datos
            const mockExtractedOrders = this.generateMockOrdersFromFile();
            
            mockExtractedOrders.forEach(order => this.orders.push(order));
            
            Swal.fire({
                icon: 'success',
                title: '¡Archivo procesado!',
                html: `Se agregaron <strong>${mockExtractedOrders.length}</strong> órdenes de compra`,
                confirmButtonColor: '#034C8C'
            });

            this.closeModal('uploadModal');
            this.updateOrdersDisplay();
            this.removeFile();
        }, 2000);
    }

    generateMockOrdersFromFile() {
        const count = Math.floor(Math.random() * 3) + 2; // 2-4 órdenes
        const orders = [];
        
        for (let i = 0; i < count; i++) {
            const orderNum = Math.floor(Math.random() * 9000) + 1000;
            orders.push({
                id: `PO-2025-${orderNum}`,
                supplier: this.getRandomSupplier(),
                expectedPalets: Math.floor(Math.random() * 20) + 5,
                receivedPalets: 0,
                expectedDate: new Date().toISOString().split('T')[0],
                status: 'pending',
                notes: 'Importado desde archivo'
            });
        }
        
        return orders;
    }

    // ==================================================================================
    // GESTIÓN DE ÓRDENES MANUALES
    // ==================================================================================

    addManualOrder() {
        const orderNumber = document.getElementById('orderNumber').value.trim();
        const supplierName = document.getElementById('supplierName').value.trim();
        const expectedPalets = parseInt(document.getElementById('expectedPalets').value);
        const expectedDate = document.getElementById('expectedDate').value;
        const orderNotes = document.getElementById('orderNotes').value.trim();

        // Validaciones
        if (!orderNumber || !supplierName || !expectedPalets || !expectedDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor completa todos los campos obligatorios',
                confirmButtonColor: '#034C8C'
            });
            return;
        }

        // Verificar si la orden ya existe
        if (this.orders.find(o => o.id === orderNumber)) {
            Swal.fire({
                icon: 'error',
                title: 'Orden duplicada',
                text: 'Ya existe una orden con este número',
                confirmButtonColor: '#034C8C'
            });
            return;
        }

        const newOrder = {
            id: orderNumber,
            supplier: supplierName,
            expectedPalets: expectedPalets,
            receivedPalets: 0,
            expectedDate: expectedDate,
            status: 'pending',
            notes: orderNotes || 'Sin notas'
        };

        this.orders.push(newOrder);
        
        Swal.fire({
            icon: 'success',
            title: '¡Orden agregada!',
            text: `Orden ${orderNumber} registrada exitosamente`,
            confirmButtonColor: '#034C8C',
            timer: 2000,
            showConfirmButton: false
        });

        this.closeModal('manualModal');
        this.updateOrdersDisplay();
    }

    // ==================================================================================
    // DETECCIÓN DE PALETS
    // ==================================================================================

    startDetection() {
        if (this.orders.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No hay órdenes',
                text: 'Por favor agrega al menos una orden de compra antes de iniciar la detección',
                confirmButtonColor: '#034C8C'
            });
            return;
        }

        this.isDetecting = true;
        this.startTime = Date.now();
        
        // Cambiar UI
        document.getElementById('startDetectionBtn').style.display = 'none';
        document.getElementById('stopDetectionBtn').style.display = 'inline-flex';
        
        const cameraStatus = document.getElementById('cameraStatus');
        cameraStatus.innerHTML = '<span class="status-dot active"></span><span>Activa - Detectando</span>';
        
        // Ocultar placeholder y mostrar video (si existe)
        const placeholder = document.querySelector('.video-placeholder');
        const video = document.getElementById('cameraVideo');
        
        if (placeholder) placeholder.style.display = 'none';
        if (video && video.querySelector('source').src) {
            video.style.display = 'block';
            video.play();
        }

        // Iniciar detección simulada
        this.simulateDetection();

        Swal.fire({
            icon: 'info',
            title: 'Detección iniciada',
            text: 'Sistema de IA activado',
            confirmButtonColor: '#034C8C',
            timer: 1500,
            showConfirmButton: false
        });
    }

    stopDetection() {
        this.isDetecting = false;
        
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }

        // Cambiar UI
        document.getElementById('startDetectionBtn').style.display = 'inline-flex';
        document.getElementById('stopDetectionBtn').style.display = 'none';
        
        const cameraStatus = document.getElementById('cameraStatus');
        cameraStatus.innerHTML = '<span class="status-dot offline"></span><span>Inactiva</span>';

        // Mostrar placeholder y ocultar video
        const placeholder = document.querySelector('.video-placeholder');
        const video = document.getElementById('cameraVideo');
        
        if (video) {
            video.pause();
            video.style.display = 'none';
        }
        if (placeholder) placeholder.style.display = 'flex';

        // Ocultar overlay de detección
        document.getElementById('detectionOverlay').style.display = 'none';

        Swal.fire({
            icon: 'info',
            title: 'Detección detenida',
            text: 'Sistema pausado',
            confirmButtonColor: '#034C8C',
            timer: 1500,
            showConfirmButton: false
        });
    }

    simulateDetection() {
        // Simular detección aleatoria cada 3-8 segundos
        const detectPalet = () => {
            if (!this.isDetecting) return;

            const randomDelay = Math.floor(Math.random() * 5000) + 3000;
            
            setTimeout(() => {
                if (this.isDetecting) {
                    this.addDetection();
                    detectPalet();
                }
            }, randomDelay);
        };

        detectPalet();
        this.updateDetectionRate();
    }

    addDetection() {
        // Seleccionar una orden pendiente aleatoria
        const pendingOrders = this.orders.filter(o => o.status === 'pending' || o.receivedPalets < o.expectedPalets);
        
        if (pendingOrders.length === 0) {
            Swal.fire({
                icon: 'success',
                title: '¡Todas las órdenes completas!',
                text: 'Se han recibido todos los palets esperados',
                confirmButtonColor: '#034C8C'
            });
            this.stopDetection();
            return;
        }

        const randomOrder = pendingOrders[Math.floor(Math.random() * pendingOrders.length)];
        randomOrder.receivedPalets++;

        // Actualizar estado de la orden
        if (randomOrder.receivedPalets >= randomOrder.expectedPalets) {
            randomOrder.status = 'complete';
        }

        const detection = {
            time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            orderId: randomOrder.id,
            currentCount: randomOrder.receivedPalets,
            expectedCount: randomOrder.expectedPalets,
            status: randomOrder.receivedPalets >= randomOrder.expectedPalets ? 'complete' : 'in-progress'
        };

        this.detections.unshift(detection);
        this.detectionCount++;

        // Mostrar animación de detección
        this.showDetectionAnimation();

        // Actualizar UI
        this.updateCountTable();
        this.updateOrdersDisplay();
        this.updateStats();
    }

    showDetectionAnimation() {
        const overlay = document.getElementById('detectionOverlay');
        overlay.style.display = 'flex';

        setTimeout(() => {
            overlay.style.display = 'none';
        }, 1500);

        // Efecto de sonido (opcional)
        // new Audio('assets/beep.mp3').play();
    }

    // ==================================================================================
    // ACTUALIZACIÓN DE UI
    // ==================================================================================

    updateOrdersDisplay() {
        const container = document.getElementById('ordersContainer');
        const orderCount = document.getElementById('orderCount');
        
        orderCount.textContent = this.orders.length;

        if (this.orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No hay órdenes cargadas</p>
                    <small>Agrega una orden para comenzar</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.orders.map(order => {
            const percentage = (order.receivedPalets / order.expectedPalets) * 100;
            const statusClass = order.status === 'complete' ? 'complete' : 'pending';
            const statusIcon = order.status === 'complete' ? 'fa-check-circle' : 'fa-clock';
            
            return `
                <div class="order-card ${statusClass}">
                    <div class="order-header">
                        <div class="order-id">
                            <i class="fas fa-file-invoice"></i>
                            <strong>${order.id}</strong>
                        </div>
                        <div class="order-status">
                            <i class="fas ${statusIcon}"></i>
                        </div>
                    </div>
                    <div class="order-body">
                        <div class="order-info">
                            <i class="fas fa-truck"></i>
                            <span>${order.supplier}</span>
                        </div>
                        <div class="order-info">
                            <i class="fas fa-calendar"></i>
                            <span>${new Date(order.expectedDate).toLocaleDateString('es-MX')}</span>
                        </div>
                        <div class="order-count">
                            <span class="received">${order.receivedPalets}</span>
                            <span class="separator">/</span>
                            <span class="expected">${order.expectedPalets}</span>
                            <span class="label">palets</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                    ${order.notes ? `<div class="order-notes"><i class="fas fa-sticky-note"></i> ${order.notes}</div>` : ''}
                    <button class="btn-delete" onclick="window.warehouseApp.deleteOrder('${order.id}')" title="Eliminar orden">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    updateCountTable() {
        const tbody = document.getElementById('countTableBody');
        
        if (this.detections.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="4">
                        <i class="fas fa-hourglass-start"></i>
                        <span>Esperando detección...</span>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.detections.slice(0, 10).map(detection => {
            const statusIcon = detection.status === 'complete' 
                ? '<i class="fas fa-check-circle status-complete"></i>' 
                : '<i class="fas fa-clock status-progress"></i>';
            
            return `
                <tr>
                    <td>${detection.time}</td>
                    <td><strong>${detection.orderId}</strong></td>
                    <td>${detection.currentCount}/${detection.expectedCount}</td>
                    <td>${statusIcon}</td>
                </tr>
            `;
        }).join('');
    }

    updateStats() {
        document.getElementById('totalDetected').textContent = this.detectionCount;
        
        if (this.detections.length > 0) {
            document.getElementById('lastDetection').textContent = this.detections[0].time;
        }
    }

    updateDetectionRate() {
        if (!this.isDetecting || !this.startTime) return;

        setInterval(() => {
            if (!this.isDetecting) return;

            const elapsedMinutes = (Date.now() - this.startTime) / 60000;
            const rate = elapsedMinutes > 0 ? (this.detectionCount / elapsedMinutes).toFixed(1) : 0;
            
            document.getElementById('detectionRate').textContent = `${rate}/min`;
        }, 5000);
    }

    updateUI() {
        this.updateOrdersDisplay();
        this.updateCountTable();
        this.updateStats();
    }

    // ==================================================================================
    // UTILIDADES
    // ==================================================================================

    deleteOrder(orderId) {
        Swal.fire({
            title: '¿Eliminar orden?',
            text: `Se eliminará la orden ${orderId}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E41A23',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.orders = this.orders.filter(o => o.id !== orderId);
                this.updateOrdersDisplay();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Orden eliminada',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    }

    clearCount() {
        if (this.detections.length === 0) return;

        Swal.fire({
            title: '¿Limpiar conteo?',
            text: 'Se eliminará el historial de detecciones',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E41A23',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Sí, limpiar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.detections = [];
                this.detectionCount = 0;
                this.updateCountTable();
                this.updateStats();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Conteo limpiado',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    }

    getRandomSupplier() {
        const suppliers = [
            'Transportes del Norte',
            'Logística Express',
            'Envíos Rápidos SA',
            'Carga Segura',
            'TransMexico Logistics',
            'Fletes Industriales'
        ];
        return suppliers[Math.floor(Math.random() * suppliers.length)];
    }
}

// ==================================================================================
// INICIALIZACIÓN
// ==================================================================================

document.addEventListener('DOMContentLoaded', () => {
    window.warehouseApp = new WarehouseApp();
    console.log('✅ Warehouse App ready');
});