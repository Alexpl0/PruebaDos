<?php
// warehouse.php
// Incluimos el archivo de control de autenticación que verifica la sesión y roles.
require_once 'auth_check.php';

// Verificación específica para warehouse - solo líderes y técnicos
if (!hasRole('lider') && !hasRole('tecnico')) {
    debugLog("Usuario con rol no permitido intentó acceder a warehouse", [
        'user_id' => getUserId(),
        'role' => getUserRole()
    ]);
    redirectToDefaultPage();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warehouse Admin - Control de Palets</title>
    
    <!-- CRÍTICO: Inyectar contexto de la aplicación ANTES de cargar otros scripts -->
    <?php injectAppContext(); ?>
    
    <!-- Dependencias (CSS y librerías JS) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/layout.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/warehouse.css">
    
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <link rel="icon" href="assets/logoGrammer.png" type="image/x-icon">
</head>
<body>

    <div class="app-container">
        <!-- HEADER DINÁMICO -->
        <header class="app-header">
            <div class="header-logo">
                <img src="assets/logoGrammer.png" alt="Logo Grammer">
                <span>Grammer</span>
            </div>
            <nav class="desktop-nav"></nav> <!-- El menú se genera por JS -->
            <div class="user-profile">
                <span>Hola, <?php echo htmlspecialchars(getUserName() ?: 'Usuario'); ?></span>
                <div class="user-details">
                    <small><?php echo htmlspecialchars(getUserRole() . ' | ' . getUserLinea()); ?></small>
                </div>
                <a href="dao/auth/daoLogout.php" class="logout-button">Salir</a>
            </div>
        </header>

        <!-- Contenido Principal -->
        <main class="app-main-content">
            <div class="warehouse-container">
                <!-- Header del Warehouse -->
                <div class="warehouse-header">
                    <div class="header-info">
                        <h1><i class="fas fa-warehouse"></i> Warehouse Admin - Control de Palets</h1>
                        <p>Sistema de detección inteligente de palets mediante IA</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn-primary" onclick="window.warehouseApp.showUploadModal()">
                            <i class="fas fa-upload"></i> Cargar Orden
                        </button>
                        <button class="btn-secondary" onclick="window.warehouseApp.showManualModal()">
                            <i class="fas fa-plus"></i> Agregar Manual
                        </button>
                    </div>
                </div>

                <!-- Layout Principal: 2 columnas -->
                <div class="warehouse-layout">
                    <!-- Columna Izquierda: Órdenes y Conteo -->
                    <div class="left-panel">
                        <!-- Sección de Órdenes de Compra -->
                        <div class="section-card">
                            <div class="section-header">
                                <h2><i class="fas fa-file-invoice"></i> Órdenes de Compra</h2>
                                <span class="badge" id="orderCount">0</span>
                            </div>
                            <div class="orders-container" id="ordersContainer">
                                <div class="empty-state">
                                    <i class="fas fa-inbox"></i>
                                    <p>No hay órdenes cargadas</p>
                                    <small>Agrega una orden para comenzar</small>
                                </div>
                            </div>
                        </div>

                        <!-- Sección de Conteo en Tiempo Real -->
                        <div class="section-card">
                            <div class="section-header">
                                <h2><i class="fas fa-clipboard-list"></i> Conteo en Tiempo Real</h2>
                                <button class="btn-icon" onclick="window.warehouseApp.clearCount()" title="Limpiar conteo">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                            <div class="count-table-container">
                                <table class="count-table" id="countTable">
                                    <thead>
                                        <tr>
                                            <th>Hora</th>
                                            <th>Orden</th>
                                            <th>Palets</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody id="countTableBody">
                                        <tr class="empty-row">
                                            <td colspan="4">
                                                <i class="fas fa-hourglass-start"></i>
                                                <span>Esperando detección...</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Columna Derecha: Cámara -->
                    <div class="right-panel">
                        <div class="section-card camera-section">
                            <div class="section-header">
                                <h2><i class="fas fa-video"></i> Vista de Cámara</h2>
                                <div class="camera-status" id="cameraStatus">
                                    <span class="status-dot offline"></span>
                                    <span>Inactiva</span>
                                </div>
                            </div>
                            
                            <!-- Video Placeholder -->
                            <div class="camera-container" id="cameraContainer">
                                <div class="video-placeholder">
                                    <i class="fas fa-camera"></i>
                                    <p>Cámara lista para activarse</p>
                                    <small>Presiona "Comenzar Detección" para iniciar</small>
                                </div>
                                <!-- Aquí irá el video cuando se cargue -->
                                <video id="cameraVideo" style="display: none;" autoplay muted loop>
                                    <source src="" type="video/mp4">
                                    Tu navegador no soporta el elemento de video.
                                </video>
                                
                                <!-- Overlay de detección -->
                                <div class="detection-overlay" id="detectionOverlay" style="display: none;">
                                    <div class="detection-box">
                                        <span>Palet Detectado</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Controles de la Cámara -->
                            <div class="camera-controls">
                                <button class="btn-start" id="startDetectionBtn" onclick="window.warehouseApp.startDetection()">
                                    <i class="fas fa-play"></i> Comenzar Detección
                                </button>
                                <button class="btn-stop" id="stopDetectionBtn" onclick="window.warehouseApp.stopDetection()" style="display: none;">
                                    <i class="fas fa-stop"></i> Detener
                                </button>
                            </div>

                            <!-- Estadísticas en Tiempo Real -->
                            <div class="camera-stats">
                                <div class="stat-item">
                                    <i class="fas fa-box-open"></i>
                                    <div class="stat-info">
                                        <span class="stat-label">Total Detectados</span>
                                        <span class="stat-value" id="totalDetected">0</span>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="fas fa-clock"></i>
                                    <div class="stat-info">
                                        <span class="stat-label">Última Detección</span>
                                        <span class="stat-value" id="lastDetection">--:--</span>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <i class="fas fa-tachometer-alt"></i>
                                    <div class="stat-info">
                                        <span class="stat-label">Tasa Detección</span>
                                        <span class="stat-value" id="detectionRate">0/min</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer y Navegación Móvil -->
        <footer class="app-footer">
            <p>&copy; <?php echo date('Y'); ?> Grammer Automotive. Todos los derechos reservados.</p>
        </footer>
        <nav class="mobile-nav"></nav>
    </div>

    <!-- Modal: Cargar Archivo de Orden -->
    <div class="modal" id="uploadModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-upload"></i> Cargar Orden de Compra</h3>
                <button class="modal-close" onclick="window.warehouseApp.closeModal('uploadModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="upload-zone" id="uploadZone">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Arrastra un archivo aquí o haz clic para seleccionar</p>
                    <small>Formatos soportados: Excel, CSV, PDF</small>
                    <input type="file" id="fileInput" accept=".xlsx,.xls,.csv,.pdf" style="display: none;">
                </div>
                <div class="file-info" id="fileInfo" style="display: none;">
                    <i class="fas fa-file-alt"></i>
                    <span id="fileName"></span>
                    <button onclick="window.warehouseApp.removeFile()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="window.warehouseApp.closeModal('uploadModal')">
                    Cancelar
                </button>
                <button class="btn-primary" onclick="window.warehouseApp.processUpload()">
                    <i class="fas fa-check"></i> Procesar
                </button>
            </div>
        </div>
    </div>

    <!-- Modal: Agregar Orden Manual -->
    <div class="modal" id="manualModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-plus"></i> Agregar Orden Manual</h3>
                <button class="modal-close" onclick="window.warehouseApp.closeModal('manualModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="manualOrderForm">
                    <div class="form-group">
                        <label for="orderNumber">
                            <i class="fas fa-hashtag"></i> Número de Orden *
                        </label>
                        <input type="text" id="orderNumber" placeholder="Ej: PO-2025-001" required>
                    </div>
                    <div class="form-group">
                        <label for="supplierName">
                            <i class="fas fa-truck"></i> Proveedor/Carrier *
                        </label>
                        <input type="text" id="supplierName" placeholder="Ej: Transportes XYZ" required>
                    </div>
                    <div class="form-group">
                        <label for="expectedPalets">
                            <i class="fas fa-boxes"></i> Cantidad Esperada de Palets *
                        </label>
                        <input type="number" id="expectedPalets" min="1" placeholder="Ej: 10" required>
                    </div>
                    <div class="form-group">
                        <label for="expectedDate">
                            <i class="fas fa-calendar"></i> Fecha Esperada *
                        </label>
                        <input type="date" id="expectedDate" required>
                    </div>
                    <div class="form-group">
                        <label for="orderNotes">
                            <i class="fas fa-sticky-note"></i> Notas (Opcional)
                        </label>
                        <textarea id="orderNotes" rows="3" placeholder="Información adicional sobre la orden..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="window.warehouseApp.closeModal('manualModal')">
                    Cancelar
                </button>
                <button class="btn-primary" onclick="window.warehouseApp.addManualOrder()">
                    <i class="fas fa-save"></i> Guardar Orden
                </button>
            </div>
        </div>
    </div>

    <!-- Scripts de la aplicación -->
    <script type="module" src="js/auth_check.js"></script>
    <script type="module" src="js/header.js"></script>
    <script type="module" src="warehouse/warehouse.js"></script>
    <script type="module" src="js/menu.js"></script>
    <script type="module" src="js/main.js"></script>

</body>
</html>