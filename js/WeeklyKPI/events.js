/**
 * EVENTS.JS - MANEJO DE EVENTOS Y COORDINACIÓN
 * Este módulo coordina la comunicación entre todos los otros módulos
 * mediante eventos personalizados y manejo centralizado de eventos.
 */

import { loadWeeklyData } from './dataService.js';
import { updateAllMetricCards, updateTrends } from './metrics.js';
import { renderAllCharts } from './charts.js';
import { generateWeeklySummary, generateInsights } from './summary.js';
import { initializeExportButtons } from './export.js';
import { addEventListenerSafe, debounce, showErrorMessage } from './utils.js';

// ========================================================================
// INICIALIZACIÓN DEL SISTEMA DE EVENTOS
// ========================================================================

/**
 * Inicializa todos los event listeners del dashboard
 */
export function initializeEventSystem() {
    setupGlobalEventListeners();
    setupCustomEventListeners();
    setupKeyboardShortcuts();
    
    console.log('Event system initialized successfully');
}

/**
 * Configura los event listeners globales
 */
function setupGlobalEventListeners() {
    // Event listener para el botón de refresh
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        addEventListenerSafe(refreshBtn, 'click', handleDataRefresh);
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Refresh Data';
    }

    // Event listeners para redimensionamiento de ventana
    addEventListenerSafe(window, 'resize', debounce(handleWindowResize, 250));
    
    // Event listeners para visibilidad de página
    addEventListenerSafe(document, 'visibilitychange', handleVisibilityChange);
}

/**
 * Configura los event listeners para eventos personalizados
 */
function setupCustomEventListeners() {
    // Escuchar cambios en la semana seleccionada
    addEventListenerSafe(document, 'weekChanged', handleWeekChange);
    
    // Escuchar cambios en la planta seleccionada
    addEventListenerSafe(document, 'plantChanged', handlePlantChange);
    
    // Escuchar solicitudes de refresh de datos
    addEventListenerSafe(document, 'dataRefreshRequested', handleDataRefreshRequest);
    
    // Escuchar cambios en los datos
    addEventListenerSafe(document, 'dataLoaded', handleDataLoaded);
    
    // Escuchar errores de datos
    addEventListenerSafe(document, 'dataError', handleDataError);
}

/**
 * Configura los atajos de teclado
 */
function setupKeyboardShortcuts() {
    addEventListenerSafe(document, 'keydown', handleGlobalKeyDown);
}

// ========================================================================
// MANEJADORES DE EVENTOS PRINCIPALES
// ========================================================================

/**
 * Maneja el refresh manual de datos
 */
async function handleDataRefresh() {
    try {
        console.log('Manual data refresh triggered');
        await updateAllVisualizations();
        
        // Emitir evento de refresh completado
        dispatchCustomEvent('dataRefreshCompleted', {
            timestamp: new Date(),
            source: 'manual'
        });
        
    } catch (error) {
        console.error('Error during manual refresh:', error);
        showErrorMessage('Failed to refresh data: ' + error.message);
    }
}

/**
 * Maneja cambios en la semana seleccionada
 */
async function handleWeekChange(event) {
    console.log('Week changed:', event.detail);
    
    try {
        // Actualizar todas las visualizaciones con la nueva semana
        await updateAllVisualizations();
        
        // Emitir evento de actualización completada
        dispatchCustomEvent('weekChangeCompleted', {
            week: event.detail.week,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Error handling week change:', error);
        showErrorMessage('Error updating data for selected week');
    }
}

/**
 * Maneja cambios en la planta seleccionada
 */
async function handlePlantChange(event) {
    console.log('Plant changed:', event.detail);
    
    try {
        // Actualizar todas las visualizaciones con la nueva planta
        await updateAllVisualizations();
        
        // Emitir evento de actualización completada
        dispatchCustomEvent('plantChangeCompleted', {
            plant: event.detail.plant,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Error handling plant change:', error);
        showErrorMessage('Error updating data for selected plant');
    }
}

/**
 * Maneja solicitudes de refresh de datos
 */
async function handleDataRefreshRequest(event) {
    console.log('Data refresh requested:', event.detail);
    
    const source = event.detail.source || 'unknown';
    
    try {
        await updateAllVisualizations();
        
        dispatchCustomEvent('dataRefreshCompleted', {
            timestamp: new Date(),
            source: source
        });
        
    } catch (error) {
        console.error('Error handling refresh request:', error);
        dispatchCustomEvent('dataError', {
            error: error.message,
            source: source,
            timestamp: new Date()
        });
    }
}

/**
 * Maneja la carga exitosa de datos
 */
function handleDataLoaded(event) {
    console.log('Data loaded successfully:', event.detail);
    
    // Los datos ya fueron actualizados, solo necesitamos configurar los botones de exportación
    setTimeout(() => {
        initializeExportButtons();
    }, 500);
}

/**
 * Maneja errores en la carga de datos
 */
function handleDataError(event) {
    console.error('Data error occurred:', event.detail);
    
    const error = event.detail.error || 'Unknown error';
    const source = event.detail.source || 'unknown';
    
    showErrorMessage(`Data error from ${source}: ${error}`);
}

/**
 * Maneja el redimensionamiento de ventana
 */
function handleWindowResize() {
    console.log('Window resized, adjusting charts');
    
    // Importar dinámicamente para evitar dependencias circulares
    import('./charts.js').then(chartsModule => {
        chartsModule.resizeAllCharts();
    });
}

/**
 * Maneja cambios en la visibilidad de la página
 */
function handleVisibilityChange() {
    if (!document.hidden) {
        console.log('Page became visible, checking for data updates');
        
        // Solo refrescar si la página ha estado oculta por más de 5 minutos
        const lastUpdate = localStorage.getItem('lastDashboardUpdate');
        const now = Date.now();
        
        if (!lastUpdate || (now - parseInt(lastUpdate)) > 300000) { // 5 minutos
            dispatchCustomEvent('dataRefreshRequested', {
                source: 'visibility',
                timestamp: new Date()
            });
        }
    }
}

/**
 * Maneja atajos de teclado globales
 */
function handleGlobalKeyDown(event) {
    // Solo procesar si no estamos en un input
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
            case 'e':
                event.preventDefault();
                triggerExcelExport();
                break;
            case 'p':
                if (event.shiftKey) {
                    event.preventDefault();
                    triggerPDFExport();
                } else {
                    // Dejar que el print normal funcione
                }
                break;
            case 's':
                event.preventDefault();
                // Prevenir save y mostrar opciones de exportación
                showExportOptions();
                break;
        }
    }
}

// ========================================================================
// FUNCIÓN PRINCIPAL DE ACTUALIZACIÓN
// ========================================================================

/**
 * Actualiza todas las visualizaciones del dashboard
 */
export async function updateAllVisualizations() {
    try {
        console.log('Starting complete dashboard update...');
        
        // Emitir evento de inicio de actualización
        dispatchCustomEvent('updateStarted', { timestamp: new Date() });
        
        // 1. Cargar datos
        const weeklyData = await loadWeeklyData();
        
        // 2. Actualizar métricas
        updateAllMetricCards();
        
        // 3. Generar resumen
        generateWeeklySummary();
        
        // 4. Renderizar gráficas
        renderAllCharts();
        
        // 5. Generar insights
        generateInsights();
        
        // 6. Configurar botones de exportación (con delay para que las gráficas se rendericen)
        setTimeout(() => {
            initializeExportButtons();
        }, 500);
        
        // 7. Actualizar timestamp de última actualización
        localStorage.setItem('lastDashboardUpdate', Date.now().toString());
        
        // Emitir evento de finalización
        dispatchCustomEvent('dataLoaded', { 
            data: weeklyData,
            timestamp: new Date() 
        });
        
        console.log('Dashboard update completed successfully');
        
    } catch (error) {
        console.error('Error updating visualizations:', error);
        
        // Emitir evento de error
        dispatchCustomEvent('dataError', {
            error: error.message,
            source: 'updateAllVisualizations',
            timestamp: new Date()
        });
        
        throw error;
    }
}

// ========================================================================
// FUNCIONES DE UTILIDAD PARA EVENTOS
// ========================================================================

/**
 * Emite un evento personalizado
 */
function dispatchCustomEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
}

/**
 * Trigger para exportación a Excel via teclado
 */
function triggerExcelExport() {
    import('./export.js').then(exportModule => {
        exportModule.exportToExcel();
    });
}

/**
 * Trigger para exportación a PDF via teclado
 */
function triggerPDFExport() {
    import('./export.js').then(exportModule => {
        exportModule.exportToPDF();
    });
}

/**
 * Muestra opciones de exportación
 */
function showExportOptions() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Export Options',
            html: `
                <div class="text-start">
                    <p><strong>Keyboard Shortcuts:</strong></p>
                    <ul>
                        <li><kbd>Ctrl + E</kbd> - Export to Excel</li>
                        <li><kbd>Ctrl + Shift + P</kbd> - Export to PDF</li>
                        <li><kbd>Ctrl + P</kbd> - Print Report</li>
                    </ul>
                    <p class="mt-3">Or use the export buttons in the report header.</p>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Got it'
        });
    }
}

// ========================================================================
// FUNCIONES DE MONITOREO Y DEBUGGING
// ========================================================================

/**
 * Configura el monitoreo de eventos para debugging
 */
export function enableEventMonitoring() {
    const eventsToMonitor = [
        'weekChanged', 'plantChanged', 'dataRefreshRequested',
        'dataLoaded', 'dataError', 'updateStarted',
        'weekChangeCompleted', 'plantChangeCompleted', 'dataRefreshCompleted'
    ];

    eventsToMonitor.forEach(eventName => {
        addEventListenerSafe(document, eventName, (event) => {
            console.log(`[EVENT MONITOR] ${eventName}:`, event.detail);
        });
    });

    console.log('Event monitoring enabled for:', eventsToMonitor);
}

/**
 * Obtiene estadísticas de eventos
 */
export function getEventStats() {
    const lastUpdate = localStorage.getItem('lastDashboardUpdate');
    
    return {
        lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)) : null,
        isVisible: !document.hidden,
        hasData: localStorage.getItem('weeklyData') !== null,
        eventListeners: {
            global: getEventListenerCount('global'),
            custom: getEventListenerCount('custom')
        }
    };
}

/**
 * Obtiene el conteo de event listeners (función auxiliar)
 */
function getEventListenerCount(type) {
    // Esta es una función simplificada ya que no podemos acceder directamente
    // al registro interno de event listeners del navegador
    return 'monitoring_enabled';
}

// ========================================================================
// FUNCIONES DE LIMPIEZA
// ========================================================================

/**
 * Limpia todos los event listeners
 */
export function cleanupEventListeners() {
    // Esta función se puede expandir para limpiar listeners específicos
    // cuando sea necesario (ej: antes de destruir el dashboard)
    console.log('Event listeners cleanup initiated');
    
    // Limpiar timers si existen
    const timers = window.dashboardTimers || [];
    timers.forEach(timer => clearTimeout(timer));
    window.dashboardTimers = [];
    
    console.log('Event cleanup completed');
}

/**
 * Reinicia el sistema de eventos
 */
export function reinitializeEventSystem() {
    cleanupEventListeners();
    setTimeout(() => {
        initializeEventSystem();
    }, 100);
}