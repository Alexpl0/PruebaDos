/**
 * WEEKLY PERFORMANCE.JS - ARCHIVO PRINCIPAL
 * 
 * Este es el módulo principal que coordina toda la funcionalidad
 * del dashboard de rendimiento semanal. Importa y orquesta todos
 * los otros módulos especializados.
 * 
 * Estructura modular:
 * - config.js: Configuración y variables globales
 * - dataService.js: Servicios de datos y API
 * - utils.js: Funciones de utilidad
 * - selectors.js: Manejo de selectores
 * - metrics.js: Actualización de métricas y KPIs
 * - charts.js: Visualizaciones y gráficas
 * - summary.js: Generación de resumen e insights
 * - export.js: Funciones de exportación
 * - events.js: Manejo de eventos y coordinación
 */

// ========================================================================
// IMPORTACIONES DE MÓDULOS
// ========================================================================

// Configuración y estado global
import { checkLibraryAvailability } from './utils.js';

// Servicios principales
import { loadAvailablePlants } from './dataService.js';

// UI y selectores
import { initializeSelectors } from './selectors.js';

// Sistema de eventos y coordinación
import { 
    initializeEventSystem, 
    updateAllVisualizations,
    enableEventMonitoring 
} from './events.js';

// Utilidades
import { showErrorMessage, showSuccessMessage } from './utils.js';

// ========================================================================
// ESTADO DE INICIALIZACIÓN
// ========================================================================

let dashboardInitialized = false;
let initializationStartTime = null;

// ========================================================================
// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ========================================================================

/**
 * Inicializa completamente el dashboard de rendimiento semanal
 */
export async function initializeWeeklyPerformance() {
    if (dashboardInitialized) {
        // console.warn('Dashboard already initialized');
        return;
    }

    try {
        initializationStartTime = performance.now();

        // 1. Verificar dependencias
        await verifyDependencies();

        // 2. Configurar monitoreo de eventos (solo en desarrollo)
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
            enableEventMonitoring();
        }

        // 3. Inicializar selectores y UI
        initializeSelectors();

        // 4. Inicializar sistema de eventos
        initializeEventSystem();

        // 5. Configurar gestión de errores globales
        setupGlobalErrorHandling();

        // 6. Cargar datos iniciales
        await updateAllVisualizations();

        // 7. Finalizar inicialización
        completeInitialization();

    } catch (error) {
        handleInitializationError(error);
    }
}

// ========================================================================
// FUNCIONES DE VERIFICACIÓN Y CONFIGURACIÓN
// ========================================================================

/**
 * Verifica que todas las dependencias necesarias estén disponibles
 */
async function verifyDependencies() {
    const { available, missing } = checkLibraryAvailability();

    // Dependencias críticas
    const criticalDependencies = ['moment', 'ApexCharts', 'jQuery'];
    const missingCritical = criticalDependencies.filter(dep => !available[dep]);

    if (missingCritical.length > 0) {
        throw new Error(`Critical dependencies missing: ${missingCritical.join(', ')}`);
    }

    // Dependencias opcionales
    const optionalDependencies = ['XLSX', 'jsPDF', 'Swal'];
    const missingOptional = optionalDependencies.filter(dep => !available[dep]);

    if (missingOptional.length > 0) {
        // console.warn('⚠️ Optional dependencies missing:', missingOptional);
        // console.warn('Some features may be limited (export functionality)');
    }
}

/**
 * Configura el manejo global de errores
 */
function setupGlobalErrorHandling() {
    window.addEventListener('error', function(event) {
        // console.error('💥 Global JavaScript error:', {
        //     message: event.message,
        //     filename: event.filename,
        //     lineno: event.lineno,
        //     colno: event.colno,
        //     error: event.error
        // });

        if (event.message.includes('dashboard') || event.message.includes('chart')) {
            showErrorMessage('A technical error occurred. Please refresh the page.');
        }
    });

    window.addEventListener('unhandledrejection', function(event) {
        // console.error('💥 Unhandled promise rejection:', event.reason);
        event.preventDefault();

        const reason = event.reason?.message || event.reason;
        if (typeof reason === 'string' && reason.includes('fetch')) {
            showErrorMessage('Network error occurred. Please check your connection.');
        }
    });
}

/**
 * Completa la inicialización y muestra estadísticas
 */
function completeInitialization() {
    const initializationTime = performance.now() - initializationStartTime;
    dashboardInitialized = true;

    // Validar elementos de tendencia
    import('./metrics.js').then(metricsModule => {
        metricsModule.validateTrendElements();
    });

    localStorage.setItem('dashboardInitialized', Date.now().toString());

    // Configurar refresh automático cada 30 minutos en producción
    if (window.location.hostname !== 'localhost') {
        setupAutoRefresh();
    }

    if (sessionStorage.getItem('showInitSuccess') === 'true') {
        showSuccessMessage(
            'Dashboard Ready',
            'Weekly Performance Dashboard loaded successfully',
            2000
        );
        sessionStorage.removeItem('showInitSuccess');
    }

    document.dispatchEvent(new CustomEvent('dashboardInitialized', {
        detail: {
            initializationTime: initializationTime,
            timestamp: new Date()
        }
    }));
}

/**
 * Maneja errores durante la inicialización
 */
function handleInitializationError(error) {
    console.error('❌ Dashboard initialization failed:', error);
    
    // Mostrar interfaz de error
    showErrorInterface(error);
    
    // Intentar inicialización básica como fallback
    setTimeout(() => {
        console.log('🔄 Attempting basic initialization fallback...');
        attemptBasicInitialization();
    }, 2000);
}

/**
 * Muestra una interfaz de error cuando falla la inicialización
 */
function showErrorInterface(error) {
    const container = document.querySelector('main.container-fluid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-interface">
            <div class="container text-center py-5">
                <i class="fas fa-exclamation-triangle fa-4x mb-4"></i>
                <h2>Dashboard Initialization Failed</h2>
                <p class="lead">We encountered an error while loading the dashboard.</p>
                <div class="error-details mt-4 p-3 bg-light rounded">
                    <small class="text-muted">Error: ${error.message}</small>
                </div>
                <div class="mt-4">
                    <button class="btn btn-primary me-2" onclick="location.reload()">
                        <i class="fas fa-refresh me-2"></i>Reload Page
                    </button>
                    <button class="btn btn-outline-secondary" onclick="history.back()">
                        <i class="fas fa-arrow-left me-2"></i>Go Back
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Intenta una inicialización básica como fallback
 */
async function attemptBasicInitialization() {
    try {
        // Solo inicializar selectores básicos
        initializeSelectors();

        showSuccessMessage(
            'Basic Mode Active',
            'Dashboard is running in basic mode. Some features may be limited.',
            5000
        );

    } catch (fallbackError) {
        showErrorMessage('Dashboard is currently unavailable. Please contact support.');
    }
}

// ========================================================================
// FUNCIONES DE CONFIGURACIÓN ADICIONAL
// ========================================================================

/**
 * Configura el refresh automático de datos
 */
function setupAutoRefresh() {
    // Refresh cada 30 minutos
    const refreshInterval = 30 * 60 * 1000; // 30 minutos
    
    setInterval(async () => {
        try {
            console.log('🔄 Auto-refreshing dashboard data...');
            await updateAllVisualizations();
            console.log('✅ Auto-refresh completed');
        } catch (error) {
            console.error('❌ Auto-refresh failed:', error);
        }
    }, refreshInterval);
    
    console.log(`⏰ Auto-refresh configured for every ${refreshInterval / 60000} minutes`);
}

/**
 * Configura atajos de teclado específicos del dashboard
 */
function setupDashboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Alt + R: Refresh rápido
        if (event.altKey && event.key === 'r') {
            event.preventDefault();
            updateAllVisualizations();
        }
        
        // Alt + H: Mostrar ayuda
        if (event.altKey && event.key === 'h') {
            event.preventDefault();
            showHelpDialog();
        }
    });
}

/**
 * Muestra diálogo de ayuda
 */
function showHelpDialog() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Dashboard Help',
            html: `
                <div class="text-start">
                    <h6>Navigation:</h6>
                    <ul>
                        <li><kbd>Ctrl + ←/→</kbd> - Navigate weeks</li>
                        <li><kbd>Ctrl + R</kbd> - Refresh data</li>
                        <li><kbd>Alt + R</kbd> - Quick refresh</li>
                    </ul>
                    
                    <h6 class="mt-3">Export:</h6>
                    <ul>
                        <li><kbd>Ctrl + E</kbd> - Export to Excel</li>
                        <li><kbd>Ctrl + Shift + P</kbd> - Export to PDF</li>
                        <li><kbd>Ctrl + P</kbd> - Print</li>
                    </ul>
                    
                    <h6 class="mt-3">Help:</h6>
                    <ul>
                        <li><kbd>Alt + H</kbd> - Show this help</li>
                    </ul>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Close'
        });
    }
}

// ========================================================================
// FUNCIONES DE UTILIDAD Y DEBUGGING
// ========================================================================

/**
 * Obtiene información de diagnóstico del dashboard
 */
export function getDashboardDiagnostics() {
    const initTime = localStorage.getItem('dashboardInitialized');
    const lastUpdate = localStorage.getItem('lastDashboardUpdate');
    
    return {
        initialized: dashboardInitialized,
        initializationTime: initTime ? new Date(parseInt(initTime)) : null,
        lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)) : null,
        libraries: checkLibraryAvailability(),
        performance: {
            initialization: initializationStartTime ? performance.now() - initializationStartTime : null,
            memory: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null
        },
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date()
    };
}

/**
 * Reinicia completamente el dashboard
 */
export async function reinitializeDashboard() {
    try {
        dashboardInitialized = false;

        localStorage.removeItem('dashboardInitialized');
        localStorage.removeItem('lastDashboardUpdate');

        await initializeWeeklyPerformance();

        showSuccessMessage('Dashboard Reinitialized', 'Dashboard has been successfully reloaded');

    } catch (error) {
        showErrorMessage('Failed to reinitialize dashboard: ' + error.message);
    }
}

/**
 * Habilita modo debug
 */
function enableDebugMode() {
    window.dashboardDebug = {
        getDiagnostics: getDashboardDiagnostics,
        reinitialize: reinitializeDashboard,
        forceRefresh: updateAllVisualizations,
        state: {
            initialized: dashboardInitialized,
            modules: [
                'config', 'dataService', 'utils', 'selectors', 
                'metrics', 'charts', 'summary', 'export', 'events'
            ]
        }
    };
}

// ========================================================================
// PUNTO DE ENTRADA PRINCIPAL
// ========================================================================

/**
 * Punto de entrada cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await new Promise(resolve => setTimeout(resolve, 100));

        if (window.dashboardInitializing) {
            // console.warn('Dashboard initialization already in progress');
            return;
        }

        window.dashboardInitializing = true;

        await initializeWeeklyPerformance();

        if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
            enableDebugMode();
        }

    } catch (error) {
        // console.error('❌ Failed to start dashboard:', error);
    } finally {
        window.dashboardInitializing = false;
    }
});




console.log('📦 Weekly Performance Dashboard module loaded successfully');