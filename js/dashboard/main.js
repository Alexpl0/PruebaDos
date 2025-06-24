/**
 * ARCHIVO PRINCIPAL DEL DASHBOARD
 * 
 * Este es el punto de entrada principal de la aplicación de dashboard.
 * Coordina la inicialización, carga de datos, y actualización de todos los componentes.
 * Actúa como "director de orquesta" que conecta los distintos módulos y establece
 * el flujo general de la aplicación.
 */

// IMPORTACIONES DE MÓDULOS

// Importación de funciones relacionadas con la gestión de datos:
// - loadDashboardData: Carga los datos desde la API
// - getFilteredData: Proporciona acceso a los datos filtrados según criterios actuales
import { loadDashboardData, getFilteredData } from './dataDashboard.js';

// Importación de objetos de configuración global:
// - charts: Registro centralizado de todas las instancias de gráficos
// - maps: Registro centralizado de todos los mapas interactivos
import { charts, maps } from './configDashboard.js';

// Importación de funciones relacionadas con la interfaz de usuario y filtros:
// - initializeDateRangePicker: Configura el selector de rango de fechas
// - initializeFilters: Configura los filtros desplegables (planta, estado, etc.)
// - triggerFilterUpdate: Función para desencadenar la actualización tras cambios en filtros
import { initializeDateRangePicker, initializeFilters, triggerFilterUpdate } from './ui/filters.js';

// Importación de funciones para actualizar indicadores clave de rendimiento (KPIs)
import { updateKPIs } from './ui/kpi.js';

// Importación de funciones para gestionar la exportación de datos (CSV, PDF, etc.)
import { initializeExportButtons } from './ui/exporters.js';

// Import the clearRouteHighlight function
import { clearRouteHighlight } from './charts/map.js';

// Importaciones de TODOS los módulos de visualización específicos:
// Cada módulo se encarga de renderizar un tipo específico de gráfico o visualización
import { renderAreaDistributionChart } from './charts/areaDistribution.js';  // Distribución por áreas
import { renderApprovalTimeChart } from './charts/approval.js';              // Tiempos de aprobación
import { renderCausesChart } from './charts/causes.js';                      // Causas de envíos premium
import { renderCostCategoriesChart, renderPaidByChart } from './charts/cost.js'; // Análisis de costos
import { renderForecastChart } from './charts/forecast.js';                  // Pronósticos futuros
import { renderOriginDestinyMap } from './charts/map.js';                    // Mapa de origen-destino
import { renderProductsChart } from './charts/products.js';                  // Análisis de productos
import { renderRecoveryFilesChart } from './charts/recovery.js';             // Archivos de recuperación
import { renderTimeSeriesChart, renderCorrelationChart } from './charts/timeSeries.js'; // Series temporales
import { renderTransportChart } from './charts/transport.js';                // Tipos de transporte
import { renderTopUserPlantOrdersChart } from './charts/topUserPlantOrders.js'; // Top usuario/planta
import { renderPlantComparison } from './charts/plantComparison.js';         // Comparativa entre plantas

/**
 * Actualiza todas las visualizaciones del dashboard
 * 
 * Esta función coordina la actualización de todos los elementos visuales
 * (KPIs, gráficos, mapas) cuando cambian los filtros o se cargan nuevos datos.
 * 
 * El proceso sigue un orden específico para optimizar el rendimiento:
 * 1. Primero actualiza los KPIs (elementos más simples y rápidos)
 * 2. Luego actualiza los gráficos y visualizaciones más complejas
 */
export function updateAllVisualizations() {
    // PASO 1: ACTUALIZACIÓN DE KPIS
    // Los KPIs son indicadores numéricos simples que se actualizan rápidamente
    // y proporcionan un resumen inmediato del estado de los datos
    updateKPIs();
    
    // PASO 2: ACTUALIZACIÓN DE TODOS LOS GRÁFICOS
    // Cada una de estas funciones se encarga de actualizar un gráfico específico
    // utilizando los datos filtrados actuales (obtenidos mediante getFilteredData())
    
    // Gráfico de distribución por áreas (generalmente un gráfico circular)
    renderAreaDistributionChart();
    
    // Gráfico de análisis de pagador (quién pagó los envíos premium)
    renderPaidByChart();
    
    // Gráfico de causas de envíos premium (porqué se necesitaron)
    renderCausesChart();
    
    // Gráfico de categorías de costo (en qué se gastan los recursos)
    renderCostCategoriesChart();
    
    // Gráfico de tiempos de aprobación (cuánto tardan los envíos en ser aprobados)
    renderApprovalTimeChart();
    
    // Gráfico de tipos de transporte utilizados (aéreo, terrestre, etc.)
    renderTransportChart();
    
    // Gráfico de estado de archivos de recuperación
    renderRecoveryFilesChart();
    
    // Gráfico de distribución de productos
    renderProductsChart();
    
    // Mapa interactivo mostrando orígenes y destinos de envíos
    renderOriginDestinyMap();
    
    // Gráfico de series temporales (evolución de envíos y costos a lo largo del tiempo)
    renderTimeSeriesChart();
    
    // Gráfico de correlación (relaciones entre variables como peso vs. costo)
    renderCorrelationChart();
    
    // Gráfico de pronóstico (predicciones futuras basadas en datos históricos)
    renderForecastChart();
    
    // Gráfico comparativo entre diferentes plantas
    renderPlantComparison();
    
    // Gráfico de usuario/planta (quiénes son los principales usuarios por planta)
    renderTopUserPlantOrdersChart();
}

/**
 * Inicializa el dashboard completo
 * 
 * Esta función asíncrona se ejecuta cuando la página carga por primera vez
 * y coordina todo el proceso de inicialización del dashboard:
 * 1. Configura componentes de UI (filtros, botones, etc.)
 * 2. Carga los datos iniciales desde la API
 * 3. Inicializa filtros con las opciones derivadas de los datos
 * 4. Aplica filtros iniciales y genera visualizaciones
 * 5. Configura manejadores de eventos para interacciones posteriores
 * 
 * Al ser asíncrona, utiliza try/catch para manejar errores que puedan ocurrir
 * durante la inicialización, especialmente en la carga de datos.
 */
async function initializeDashboard() {
    try {
        // PASO 1: INICIALIZACIÓN DE COMPONENTES DE UI
        // Configura el selector de rango de fechas con opciones predeterminadas
        initializeDateRangePicker();
        
        // Configura los botones de exportación (CSV, PDF, imprimir)
        initializeExportButtons();
        
        // PASO 2: CARGA DE DATOS INICIALES
        // await espera a que la carga de datos se complete antes de continuar
        // Esto garantiza que tengamos datos antes de inicializar filtros y visualizaciones
        const data = await loadDashboardData();
        
        // PASO 3: INICIALIZACIÓN DE FILTROS
        // Configura los filtros desplegables con opciones basadas en los datos cargados
        // (por ejemplo, lista de plantas disponibles, estados posibles, etc.)
        initializeFilters(data);
        
        // PASO 4: APLICACIÓN DE FILTROS INICIALES Y ACTUALIZACIÓN
        // Aplica los filtros predeterminados y actualiza todas las visualizaciones
        triggerFilterUpdate();
        
        // PASO 5: CONFIGURACIÓN DE EVENTOS
        // El operador "?." (optional chaining) verifica si el elemento existe antes de añadir el evento
        // Esto evita errores si el botón no está presente en el DOM
        document.getElementById('refreshData')?.addEventListener('click', async function() {
            // Cuando se hace clic en "Actualizar datos", recargamos desde la API
            await loadDashboardData();
            // Y luego actualizamos todo el dashboard con los nuevos datos
            triggerFilterUpdate();
        });
        
        // Registra éxito en consola (útil para depuración)
        console.log("Dashboard initialized successfully");
    } catch (error) {
        // MANEJO DE ERRORES
        // Si ocurre cualquier error durante la inicialización, lo registramos en consola
        // Esto ayuda a diagnosticar problemas durante el desarrollo o en producción
        console.error("Error initializing dashboard:", error);
        // Aquí se podría añadir código para mostrar un mensaje de error al usuario
        // o intentar una inicialización parcial en caso de fallo
    }
}

// PUNTO DE ENTRADA PRINCIPAL
// Este evento escucha cuando el DOM ha sido completamente cargado
// y entonces inicia el proceso de inicialización del dashboard
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Find where filters are applied and add:
function applyFilters() {
    // Existing filter code...
    
    // Clear any route highlights when filters change
    clearRouteHighlight();
    
    // Rest of existing filter application code...
}