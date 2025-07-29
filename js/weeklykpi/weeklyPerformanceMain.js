// weeklyPerformanceMain.js
import { config } from './config/weeklyConfig.js';
import { dataService } from './services/dataService.js';
import { chartService } from './services/chartService.js';
import { exportService } from './services/exportService.js';
import { uiService } from './services/uiService.js';
import { utilityService } from './utils/utilities.js';

/**
 * Main Weekly Performance Dashboard Controller
 */
class WeeklyPerformanceDashboard {
    constructor() {
        this.isInitialized = false;
        this.isLoading = false;
        this.initializationAttempts = 0;
        this.maxInitializationAttempts = 3;
    }

    /**
     * Initialize the dashboard
     */
    async initialize() {
        // Prevenir múltiples inicializaciones simultáneas
        if (this.isLoading) {
            console.log('Dashboard initialization already in progress...');
            return;
        }

        this.isLoading = true;
        this.initializationAttempts++;

        try {
            console.log(`Starting dashboard initialization (attempt ${this.initializationAttempts})...`);

            // Mostrar SweetAlert de carga
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Cargando Dashboard',
                    html: `
                        <div class="text-center">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p>Inicializando servicios y cargando datos...</p>
                            <small class="text-muted">Esto puede tomar unos segundos</small>
                        </div>
                    `,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    didOpen: () => Swal.showLoading()
                });
            }

            // Validar dependencias críticas
            await this.validateDependencies();

            // Inicializar servicios en orden
            console.log('Initializing data service...');
            await dataService.initialize();

            console.log('Initializing chart service...');
            chartService.initialize();

            console.log('Initializing export service...');
            exportService.initialize();

            console.log('Initializing UI service...');
            uiService.initialize();
            
            // Inicializar UI y listeners
            console.log('Setting up UI components...');
            this.initializeSelectors();
            this.initializeEventListeners();
            
            // Cargar datos iniciales automáticamente
            console.log('Loading initial data...');
            await this.updateAllVisualizations();

            this.isInitialized = true;
            this.isLoading = false;
            
            console.log('Weekly Performance Dashboard initialized successfully');

            // Cerrar SweetAlert de carga y mostrar éxito
            if (typeof Swal !== 'undefined') {
                Swal.close();
                
                // Mostrar notificación de éxito brevemente
                Swal.fire({
                    icon: 'success',
                    title: 'Dashboard Cargado',
                    text: 'El dashboard se ha inicializado correctamente',
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }

        } catch (error) {
            this.isLoading = false;
            console.error('Error initializing Weekly Performance Dashboard:', error);
            
            if (typeof Swal !== 'undefined') {
                Swal.close();
            }

            // Intentar reinicialización si no se ha excedido el límite
            if (this.initializationAttempts < this.maxInitializationAttempts) {
                console.log(`Attempting to retry initialization in 3 seconds... (${this.initializationAttempts}/${this.maxInitializationAttempts})`);
                
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Error de Inicialización',
                        text: `Reintentando inicialización (${this.initializationAttempts}/${this.maxInitializationAttempts})...`,
                        timer: 2500,
                        showConfirmButton: false
                    });
                }

                setTimeout(() => {
                    this.initialize();
                }, 3000);
            } else {
                // Mostrar error final si se agotaron los intentos
                const errorMessage = this.getErrorMessage(error);
                uiService.showErrorMessage(`Failed to initialize dashboard after ${this.maxInitializationAttempts} attempts: ${errorMessage}`);
                
                // Mostrar interfaz básica de error
                this.showErrorInterface(error);
            }
        }
    }

    /**
     * Valida dependencias críticas antes de la inicialización
     */
    async validateDependencies() {
        const dependencies = [
            { name: 'moment', check: () => typeof moment !== 'undefined' },
            { name: 'ApexCharts', check: () => typeof ApexCharts !== 'undefined' },
            { name: 'jQuery', check: () => typeof $ !== 'undefined' },
            { name: 'Bootstrap', check: () => typeof bootstrap !== 'undefined' }
        ];

        const missing = dependencies.filter(dep => !dep.check());
        
        if (missing.length > 0) {
            throw new Error(`Missing required dependencies: ${missing.map(d => d.name).join(', ')}`);
        }

        // Verificar que los elementos DOM críticos existan
        const criticalElements = ['weekNumber', 'weekDates', 'plantSelect', 'refreshData'];
        const missingElements = criticalElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.warn(`Missing DOM elements: ${missingElements.join(', ')}`);
        }
    }

    /**
     * Obtiene mensaje de error user-friendly
     */
    getErrorMessage(error) {
        if (error.message.includes('fetch')) {
            return 'Error de conectividad. Verifique su conexión a internet.';
        } else if (error.message.includes('dependencies')) {
            return 'Faltan bibliotecas requeridas. Recargue la página.';
        } else if (error.message.includes('DOM')) {
            return 'Error en la estructura de la página. Recargue la página.';
        } else {
            return error.message || 'Error desconocido';
        }
    }

    /**
     * Muestra interfaz de error cuando falla la inicialización
     */
    showErrorInterface(error) {
        const container = document.querySelector('main.container-fluid');
        if (container) {
            container.innerHTML = `
                <div class="row justify-content-center mt-5">
                    <div class="col-md-8">
                        <div class="card border-danger">
                            <div class="card-header bg-danger text-white">
                                <h5 class="mb-0">
                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                    Error de Inicialización del Dashboard
                                </h5>
                            </div>
                            <div class="card-body">
                                <p class="card-text">
                                    El dashboard no pudo inicializarse correctamente después de varios intentos.
                                </p>
                                <div class="alert alert-light">
                                    <strong>Error técnico:</strong> ${error.message}
                                </div>
                                <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                                    <button type="button" class="btn btn-primary" onclick="location.reload()">
                                        <i class="fas fa-sync-alt me-2"></i>Recargar Página
                                    </button>
                                    <button type="button" class="btn btn-secondary" onclick="this.retryInitialization()">
                                        <i class="fas fa-redo me-2"></i>Reintentar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Reintenta la inicialización manualmente
     */
    retryInitialization() {
        this.initializationAttempts = 0;
        this.isInitialized = false;
        this.isLoading = false;
        
        // Restaurar contenido original
        location.reload();
    }

    /**
     * Initialize selectors
     */
    initializeSelectors() {
        try {
            uiService.initializeSelectors();
        } catch (error) {
            console.error('Error initializing selectors:', error);
        }
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        try {
            // Refresh button
            const refreshBtn = document.getElementById('refreshData');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    if (!this.isLoading) {
                        this.updateAllVisualizations();
                    }
                });
            }

            // Plant selector
            const plantSelect = document.getElementById('plantSelect');
            if (plantSelect) {
                plantSelect.addEventListener('change', () => {
                    if (!this.isLoading) {
                        this.updateAllVisualizations();
                    }
                });
            }

            // Week navigation
            const prevWeekBtn = document.getElementById('prevWeek');
            const nextWeekBtn = document.getElementById('nextWeek');

            if (prevWeekBtn) {
                prevWeekBtn.addEventListener('click', () => {
                    if (!this.isLoading) {
                        dataService.navigateToPreviousWeek();
                        uiService.updateWeekDisplay();
                        this.updateAllVisualizations();
                    }
                });
            }

            if (nextWeekBtn) {
                nextWeekBtn.addEventListener('click', () => {
                    if (!this.isLoading) {
                        dataService.navigateToNextWeek();
                        uiService.updateWeekDisplay();
                        this.updateAllVisualizations();
                    }
                });
            }

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key) {
                        case 'r':
                            e.preventDefault();
                            if (!this.isLoading) {
                                this.updateAllVisualizations();
                            }
                            break;
                        case 'ArrowLeft':
                            e.preventDefault();
                            if (!this.isLoading) {
                                dataService.navigateToPreviousWeek();
                                uiService.updateWeekDisplay();
                                this.updateAllVisualizations();
                            }
                            break;
                        case 'ArrowRight':
                            e.preventDefault();
                            if (!this.isLoading) {
                                dataService.navigateToNextWeek();
                                uiService.updateWeekDisplay();
                                this.updateAllVisualizations();
                            }
                            break;
                    }
                }
            });

        } catch (error) {
            console.error('Error initializing event listeners:', error);
        }
    }

    /**
     * Update all visualizations
     */
    async updateAllVisualizations() {
        if (this.isLoading) {
            console.log('Update already in progress, skipping...');
            return;
        }

        this.isLoading = true;

        try {
            console.log('Starting visualization update...');
            uiService.showLoading(true);
            
            // Deshabilitar controles durante la carga
            this.toggleControls(false);
            
            await dataService.loadWeeklyData();
            const weeklyData = dataService.getWeeklyData();
            
            if (weeklyData) {
                console.log('Updating UI components...');
                uiService.updateMetricCards(weeklyData);
                uiService.generateWeeklySummary(weeklyData);
                
                console.log('Rendering charts...');
                chartService.renderAll(weeklyData);
                
                console.log('Generating insights...');
                uiService.generateInsights(weeklyData);
                
                console.log('Visualization update completed successfully');
            } else {
                console.warn('No weekly data received');
                uiService.showErrorMessage('No se pudieron cargar los datos de la semana');
            }

        } catch (error) {
            console.error('Error updating visualizations:', error);
            uiService.showErrorMessage('Error updating dashboard: ' + error.message);
        } finally {
            this.isLoading = false;
            uiService.showLoading(false);
            this.toggleControls(true);
        }
    }

    /**
     * Habilita/deshabilita controles
     */
    toggleControls(enabled) {
        const controls = [
            'refreshData', 'plantSelect', 'prevWeek', 'nextWeek',
            'exportExcel', 'exportPDF', 'printReport'
        ];

        controls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = !enabled;
                if (enabled) {
                    element.classList.remove('disabled');
                } else {
                    element.classList.add('disabled');
                }
            }
        });
    }

    /**
     * Obtiene el estado actual del dashboard
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            initializationAttempts: this.initializationAttempts,
            currentWeek: dataService.getCurrentWeek(),
            selectedPlant: dataService.getSelectedPlant(),
            hasData: !!dataService.getWeeklyData()
        };
    }

    /**
     * Limpia recursos y reinicia el dashboard
     */
    reset() {
        try {
            chartService.destroyAll();
            this.isInitialized = false;
            this.isLoading = false;
            this.initializationAttempts = 0;
            console.log('Dashboard reset completed');
        } catch (error) {
            console.error('Error during dashboard reset:', error);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Weekly Performance Dashboard...');
    
    // Verificar que las dependencias estén disponibles
    if (typeof moment === 'undefined') {
        console.error('Moment.js is not loaded');
        return;
    }

    if (typeof ApexCharts === 'undefined') {
        console.error('ApexCharts is not loaded');
        return;
    }

    // Crear instancia global del dashboard
    window.weeklyDashboard = new WeeklyPerformanceDashboard();
    
    // Pequeño delay para asegurar que todo esté cargado
    setTimeout(() => {
        window.weeklyDashboard.initialize();
    }, 100);
});

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    if (window.weeklyDashboard && !window.weeklyDashboard.isInitialized) {
        console.log('Error during initialization, this might affect dashboard functionality');
    }
});

// Manejar errores de promesas no capturadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

export default WeeklyPerformanceDashboard;