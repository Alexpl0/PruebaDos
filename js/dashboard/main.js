/**
 * ARCHIVO PRINCIPAL DEL DASHBOARD (main.js)
 * * Este es el punto de entrada de la aplicación. Coordina la inicialización,
 * la carga de datos y la actualización de todos los componentes visuales.
 */

// ========================================================================
// 1. IMPORTACIONES DE MÓDULOS
// ========================================================================

// Módulos de gestión de datos
import { loadDashboardData, getFilteredData, applyFilters } from './dataDashboard.js';

// Módulos de configuración global
import { charts, maps } from './configDashboard.js';

// Módulos de la interfaz de usuario (Filtros, Exportaciones, KPIs)
import { initializeDateRangePicker, initializeFilters, getFilterValues } from './ui/filters.js';
import { updateKPIs, updateDetailedKPIsTable } from './ui/kpi.js'; // 👈 AÑADIDA updateDetailedKPIsTable
import { initializeExportButtons } from './ui/exporters.js';

// Módulos de renderizado de cada una de las gráficas
import { renderAreaDistributionChart } from './charts/areaDistribution.js';
import { renderApprovalTimeChart } from './charts/approval.js';
import { renderCausesChart } from './charts/causes.js';
import { renderCostCategoriesChart, renderPaidByChart } from './charts/cost.js';
import { renderForecastChart } from './charts/forecast.js';
import { renderOriginDestinyMap, clearRouteHighlight } from './charts/map.js';
import { renderPlantComparison } from './charts/plantComparison.js';
import { renderProductsChart } from './charts/products.js';
import { renderRecoveryFilesChart } from './charts/recovery.js';
import { renderTimeSeriesChart, renderCorrelationChart } from './charts/timeSeries.js';
import { renderTopUserPlantOrdersChart } from './charts/topUserPlantOrders.js';
import { renderTransportChart } from './charts/transport.js';
import { renderWordCloud } from './charts/wordCloud.js';


// ========================================================================
// 2. FUNCIÓN DE ACTUALIZACIÓN CENTRAL
// ========================================================================

/**
 * Actualiza todas las visualizaciones del dashboard.
 * Esta función se llama cada vez que los datos o los filtros cambian.
 */
export function updateAllVisualizations() {
    // Primero, actualiza los KPIs que son más rápidos
    updateKPIs();
    updateDetailedKPIsTable(); // 👈 AÑADIDA LLAMADA A LA TABLA DETALLADA

    // Luego, renderiza o actualiza todas las gráficas
    renderAreaDistributionChart();
    renderPaidByChart();
    renderCausesChart();
    renderCostCategoriesChart();
    renderApprovalTimeChart();
    renderTransportChart();
    renderRecoveryFilesChart();
    renderProductsChart();
    renderOriginDestinyMap();
    renderTimeSeriesChart();
    renderCorrelationChart();
    renderForecastChart();
    renderPlantComparison();
    renderTopUserPlantOrdersChart();
    renderWordCloud(); // Asegúrate de tener un div con id="wordCloudChart" en tu HTML
}


// ========================================================================
// 3. FUNCIÓN DE INICIALIZACIÓN DEL DASHBOARD
// ========================================================================

/**
 * Desencadena el proceso completo de actualización tras un cambio en los filtros.
 */
function triggerFilterUpdate() {
    const filterValues = getFilterValues();
    applyFilters(filterValues);
    clearRouteHighlight(); // Limpia el resaltado del mapa al aplicar filtros
    updateAllVisualizations();
}

/**
 * Inicializa el dashboard completo de forma asíncrona.
 */
async function initializeDashboard() {
    try {
        console.log("Initializing dashboard...");

        // 1. Inicializa los componentes de la UI que no dependen de datos
        initializeDateRangePicker();
        initializeExportButtons();

        // 2. Carga los datos iniciales desde la API
        const data = await loadDashboardData();
        console.log(`Data loaded: ${data.length} records.`);

        // 3. Inicializa los filtros con las opciones derivadas de los datos
        initializeFilters(data);

        // 4. Configura los listeners de eventos para los filtros
        document.getElementById('plantaFilter').addEventListener('change', triggerFilterUpdate);
        document.getElementById('statusFilter').addEventListener('change', triggerFilterUpdate);
        $('#dateRange').on('apply.daterangepicker', triggerFilterUpdate);

        // 5. Realiza la primera actualización de todas las visualizaciones
        triggerFilterUpdate();

        // 6. Configura el botón de refrescar datos
        document.getElementById('refreshData')?.addEventListener('click', async () => {
            console.log("Refreshing data...");
            await loadDashboardData();
            triggerFilterUpdate();
            console.log("Data refreshed.");
        });

        console.log("Dashboard initialized successfully.");

    } catch (error) {
        // Manejo de errores durante la inicialización
        console.error("Fatal error during dashboard initialization:", error);
        // Aquí podrías mostrar un mensaje de error al usuario en la UI
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
            mainContainer.innerHTML = `<div class="alert alert-danger text-center">
                <h3>Error Initializing Dashboard</h3>
                <p>Could not load required data. Please try refreshing the page or contact support.</p>
                <pre>${error.message}</pre>
            </div>`;
        }
    }
}


// ========================================================================
// 4. PUNTO DE ENTRADA DE LA APLICACIÓN
// ========================================================================

// Espera a que el DOM esté completamente cargado para iniciar el dashboard.
document.addEventListener('DOMContentLoaded', initializeDashboard);