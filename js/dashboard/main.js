// Archivo principal del dashboard

// Importar módulos de datos y configuración
import { loadDashboardData, getFilteredData } from './dataDashboard.js';
import { charts, maps } from './configDashboard.js';

// Importar módulos de UI
import { initializeDateRangePicker, initializeFilters, triggerFilterUpdate } from './ui/filters.js';
import { updateKPIs } from './ui/kpi.js';
import { initializeExportButtons } from './ui/exporters.js';

// Importar módulos de gráficos
import { renderAreaDistributionChart } from './charts/areaDistribution.js';
import { renderApprovalTimeChart } from './charts/approval.js';
import { renderCausesChart } from './charts/causes.js';
import { renderCostCategoriesChart } from './charts/cost.js';
import { renderPaidByChart } from './charts/cost.js';
import { renderForecastChart } from './charts/forecast.js';
import { renderOriginDestinyMap } from './charts/map.js';
import { renderProductsChart } from './charts/products.js';
import { renderRecoveryFilesChart } from './charts/recovery.js';
import { renderCorrelationChart } from './charts/timeSeries.js';
import { renderTransportChart } from './charts/transport.js';
import { renderWordCloud } from './charts/wordCloud.js';
import { renderPlantComparison } from './charts/plantComparison.js';

/**
 * Actualiza todas las visualizaciones
 */
export function updateAllVisualizations() {
    // Actualizar KPIs
    updateKPIs();
    
    // Actualizar gráficos
    renderAreaDistributionChart();
    renderPaidByChart();
    renderCausesChart();
    renderCostCategoriesChart();
    renderApprovalTimeChart();
    renderTransportChart();
    renderRecoveryFilesChart();
    renderProductsChart();
    renderOriginDestinyMap();
    renderTimeSeriesChart(); // <-- Comenta esta línea
    renderCorrelationChart();
    renderForecastChart();
    renderWordCloud();
    renderPlantComparison();
}

/**
 * Inicializa el dashboard
 */
async function initializeDashboard() {
    try {
        // Inicializar componentes de UI
        initializeDateRangePicker();
        initializeExportButtons();
        
        // Cargar datos iniciales
        const data = await loadDashboardData();
        
        // Inicializar filtros con los datos cargados
        initializeFilters(data);
        
        // Aplicar filtros iniciales y actualizar visualizaciones
        triggerFilterUpdate();
        
        // Configurar evento de actualización de datos
        document.getElementById('refreshData')?.addEventListener('click', async function() {
            await loadDashboardData();
            triggerFilterUpdate();
        });
        
        console.log("Dashboard initialized successfully");
    } catch (error) {
        console.error("Error initializing dashboard:", error);
    }
}

// Inicializar el dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeDashboard);