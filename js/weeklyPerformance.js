/**
 * WEEKLY PERFORMANCE DASHBOARD - MAIN JAVASCRIPT
 * Este módulo maneja toda la funcionalidad de la página de rendimiento semanal,
 * incluyendo la carga de datos, visualizaciones, filtros y exportaciones.
 */

// ========================================================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ========================================================================

// URLs de los endpoints
let WEEKLY_KPIS_URL;
let PLANTS_URL;
if (typeof URLPF !== 'undefined') {
    WEEKLY_KPIS_URL = URLPF + 'dao/conections/daoWeeklyKPIs.php';
    PLANTS_URL = URLPF + 'dao/conections/daoPlants.php';
} else {
    console.warn('URL global variable is not defined. Using fallback URL for Weekly KPIs.');
    WEEKLY_KPIS_URL = 'https://grammermx.com/Logistica/PremiumFreight/dao/conections/daoWeeklyKPIs.php';
    PLANTS_URL = 'https://grammermx.com/Logistica/PremiumFreight/dao/conections/daoPlants.php';
}

// Almacenamiento de datos y gráficas
let weeklyData = {};
let charts = {};
let availablePlants = [];
let currentWeek = {
    start: moment().startOf('isoWeek'),
    end: moment().endOf('isoWeek'),
    weekNumber: moment().isoWeek(),
    year: moment().year()
};
let selectedPlant = '';

// Paleta de colores usando variables del sistema existente
const colorPalette = {
    primary: '#034C8C',
    primaryLight: '#4A90D9', 
    primaryDark: '#002856',
    accent: '#00A3E0',
    success: '#218621',
    warning: '#F59E0B',
    danger: '#E41A23',
    info: '#3B82F6',
    gradients: {
        primary: 'linear-gradient(135deg, #034C8C 0%, #002856 100%)',
        success: 'linear-gradient(135deg, #218621 0%, #16a34a 100%)',
        warning: 'linear-gradient(135deg, #F59E0B 0%, #f59e0b 100%)',
        info: 'linear-gradient(135deg, #3B82F6 0%, #00A3E0 100%)',
        danger: 'linear-gradient(135deg, #E41A23 0%, #dc2626 100%)'
    }
};

// ========================================================================
// 2. SELECTOR DE SEMANAS Y PLANTAS
// ========================================================================

/**
 * Inicializa el selector de semanas y plantas
 */
function initializeSelectors() {
    updateWeekDisplay();
    initializePlantSelector();
    
    // Event listeners for week navigation
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentWeek.start.subtract(1, 'week');
            currentWeek.end.subtract(1, 'week');
            currentWeek.weekNumber = currentWeek.start.isoWeek();
            currentWeek.year = currentWeek.start.year();
            updateWeekDisplay();
            updateAllVisualizations();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const nextWeekStart = moment(currentWeek.start).add(1, 'week');
            const today = moment();

            // Do not allow navigation to future weeks
            if (nextWeekStart.isAfter(today, 'week')) {
                showErrorMessage('Cannot navigate to future weeks');
                return;
            }
            
            currentWeek.start.add(1, 'week');
            currentWeek.end.add(1, 'week');
            currentWeek.weekNumber = currentWeek.start.isoWeek();
            currentWeek.year = currentWeek.start.year();
            updateWeekDisplay();
            updateAllVisualizations();
        });
    }

    // Event listener para el selector de planta
    const plantSelector = document.getElementById('plantSelector');
    if (plantSelector) {
        plantSelector.addEventListener('change', (e) => {
            selectedPlant = e.target.value;
            console.log('Plant selected:', selectedPlant);
            updateAllVisualizations();
        });
    }
}

/**
 * Actualiza la visualización del selector de semanas
 */
function updateWeekDisplay() {
    const weekDisplay = document.getElementById('weekDisplay');
    const weekNumber = document.getElementById('weekNumber');
    const weekDates = document.getElementById('weekDates');
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');
    
    // Información de la semana
    const weekInfo = `Week ${currentWeek.weekNumber} of ${currentWeek.year}`;
    const weekDateRange = `${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD')}`;
    
    // Actualizar elementos individuales si existen
    if (weekNumber) {
        weekNumber.textContent = weekInfo;
    }
    
    if (weekDates) {
        weekDates.textContent = weekDateRange;
    }
    
    // Fallback: actualizar contenedor completo si los elementos individuales no existen
    if (!weekNumber && !weekDates && weekDisplay) {
        weekDisplay.innerHTML = `
            <div class="week-info fw-bold">${weekInfo}</div>
            <div class="week-dates">${weekDateRange}</div>
        `;
    }
    
    // Deshabilitar navegación futura
    const today = moment();
    const nextWeekStart = moment(currentWeek.start).add(1, 'week');
    if (nextBtn) {
        nextBtn.disabled = nextWeekStart.isAfter(today, 'week');
    }
    
    // Opcional: limitar cuánto atrás se puede ir (ej: máximo 1 año)
    const oneYearAgo = moment().subtract(1, 'year');
    if (prevBtn) {
        prevBtn.disabled = currentWeek.start.isBefore(oneYearAgo, 'week');
    }
}

/**
 * Inicializa el selector de plantas - ACTUALIZADO para usar tabla User
 */
async function initializePlantSelector() {
    try {
        console.log('Loading plants from endpoint:', PLANTS_URL);
        const plantsData = await loadAvailablePlants();
        const plantSelector = document.getElementById('plantSelector');
        
        if (!plantSelector) {
            console.error('Plant selector element not found');
            return;
        }
        
        // Limpiar opciones existentes excepto "All Plants"
        plantSelector.innerHTML = '<option value="">All Plants</option>';
        
        console.log('Plants loaded:', plantsData);
        
        // Añadir plantas disponibles
        if (plantsData && plantsData.length > 0) {
            plantsData.forEach(plant => {
                const option = document.createElement('option');
                option.value = plant;
                option.textContent = plant;
                plantSelector.appendChild(option);
            });
            console.log('Plant selector populated with', plantsData.length, 'plants');
        } else {
            console.warn('No plants found or plants data is empty');
        }
        
    } catch (error) {
        console.error('Error loading plants:', error);
    }
}

/**
 * Carga las plantas disponibles desde la tabla User - MEJORADO CON DEBUG
 */
async function loadAvailablePlants() {
    try {
        console.log('Fetching plants from:', PLANTS_URL);
        
        const response = await fetch(PLANTS_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Plants API response:', result);
        
        if (result.status === 'success' && result.data) {
            // Los datos ya vienen como array de strings de plantas
            const plants = result.data.filter(plant => plant && plant.trim() !== '');
            console.log('Filtered plants:', plants);
            
            availablePlants = plants;
            return plants;
        } else {
            console.error('Plants API returned error or no data:', result);
            return [];
        }
        
    } catch (error) {
        console.error('Error loading plants:', error);
        // Fallback: intentar cargar desde daoPremiumFreight.php
        return await loadPlantsFromPremiumFreight();
    }
}

/**
 * Función fallback para cargar plantas desde daoPremiumFreight.php
 */
async function loadPlantsFromPremiumFreight() {
    try {
        console.log('Trying fallback endpoint for plants...');
        const fallbackUrl = PLANTS_URL.replace('daoPlants.php', 'daoPremiumFreight.php');
        
        const response = await fetch(fallbackUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success' && result.data) {
            // Extraer plantas únicas de la columna creator_plant
            const plants = [...new Set(
                result.data
                    .map(item => item.creator_plant)
                    .filter(plant => plant && plant.trim() !== '')
            )].sort();
            
            console.log('Plants loaded from fallback:', plants);
            availablePlants = plants;
            return plants;
        }
        
        return [];
    } catch (error) {
        console.error('Error loading plants from fallback:', error);
        return [];
    }
}

/**
 * Obtiene el rango de fechas actual en formato para la API
 */
function getCurrentDateRange() {
    return {
        start: currentWeek.start.format('YYYY-MM-DD'),
        end: currentWeek.end.format('YYYY-MM-DD')
    };
}

// ========================================================================
// 3. FUNCIONES DE CARGA DE DATOS
// ========================================================================

/**
 * Carga los datos semanales desde el endpoint
 */
async function loadWeeklyData() {
    try {
        showLoading(true);
        
        const dateRange = getCurrentDateRange();
        let url = `${WEEKLY_KPIS_URL}?start_date=${dateRange.start}&end_date=${dateRange.end}`;
        
        // Añadir filtro de planta si está seleccionado
        if (selectedPlant && selectedPlant.trim() !== '') {
            url += `&plant=${encodeURIComponent(selectedPlant)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success') {
            weeklyData = result.data;
            console.log('Weekly data loaded:', weeklyData);
            showLoading(false);
            return weeklyData;
        } else {
            throw new Error(result.message || 'Failed to load weekly data');
        }

    } catch (error) {
        console.error('Error loading weekly data:', error);
        showLoading(false);
        showErrorMessage(`Error loading data: ${error.message}`);
        throw error;
    }
}

/**
 * Muestra/oculta el overlay de carga
 */
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Muestra mensajes de error
 */
function showErrorMessage(message) {
    console.error('ERROR:', message);
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
            confirmButtonText: 'Ok'
        });
    } else {
        alert(message);
    }
}

// ========================================================================
// 3. ACTUALIZACIÓN DE MÉTRICAS PRINCIPALES
// ========================================================================

/**
 * Actualiza las tarjetas de métricas principales
 */
function updateMetricCards() {
    if (!weeklyData || Object.keys(weeklyData).length === 0) return;

    // Total Requests - usando el ID correcto del HTML
    const totalRequestsEl = document.getElementById('totalRequests');
    if (totalRequestsEl) {
        totalRequestsEl.textContent = formatNumber(weeklyData.total_generated || 0);
    }
    
    // Approval Rate
    const approvalRateEl = document.getElementById('approvalRate');
    if (approvalRateEl) {
        approvalRateEl.textContent = `${weeklyData.approval_rate || 0}%`;
    }
    
    // Total Cost
    const totalCostEl = document.getElementById('totalCost');
    if (totalCostEl) {
        totalCostEl.textContent = `€${formatNumber(weeklyData.total_cost || 0, 2)}`;
    }
    
    // Average Time - usando el ID correcto del HTML
    const avgTimeEl = document.getElementById('avgTime');
    if (avgTimeEl) {
        avgTimeEl.textContent = weeklyData.average_approval_time || 'N/A';
    }

    // TODO: Implementar cálculo de trends comparando con período anterior
    updateTrends();
}

/**
 * Calcula la diferencia porcentual entre dos valores.
 * @param {number} current - El valor actual.
 * @param {number} previous - El valor anterior.
 * @returns {number|null} - El cambio porcentual o null si no se puede calcular.
 */
function calculatePercentageChange(current, previous) {
    if (previous === 0 || previous === null) {
        // Si el valor anterior era 0, cualquier aumento es "infinito".
        // Mostramos 100% si el valor actual es positivo, o 0% si no.
        return (current > 0) ? 100 : 0; 
    }
    if (current === null) return null;
    return ((current - previous) / previous) * 100;
}

/**
 * Actualiza un elemento DOM de tendencia.
 * @param {string} elementId - ID del elemento a actualizar.
 * @param {number|null} change - El cambio porcentual o de puntos.
 * @param {boolean} higherIsBetter - Si un valor más alto es mejor (para la flecha y color).
 * @param {string} unit - La unidad a mostrar después del número (e.g., '%', 'p.p.').
 */
function updateTrendElement(elementId, change, higherIsBetter, unit = '%') {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (change === null || isNaN(change)) {
        element.innerHTML = `<i class="fas fa-minus"></i> N/A`;
        element.className = 'metric-trend';
        return;
    }

    // Determina si la tendencia es positiva o negativa para el color
    const isPositive = higherIsBetter ? change >= 0 : change < 0;
    const isNegative = higherIsBetter ? change < 0 : change > 0;
    
    // Determina el ícono de la flecha
    let iconClass = 'fa-minus';
    if (change > 0.1) iconClass = 'fa-arrow-up';
    if (change < -0.1) iconClass = 'fa-arrow-down';

    element.innerHTML = `<i class="fas ${iconClass}"></i> ${change.toFixed(1)}${unit}`;
    
    // Asigna la clase correcta para el color
    element.className = 'metric-trend'; // Limpia clases anteriores
    if (isPositive) {
        element.classList.add('positive');
    } else if (isNegative) {
        element.classList.add('negative');
    } else {
        element.classList.add('neutral');
    }
}

/**
 * Actualiza los indicadores de tendencia con datos reales.
 * @param {object} currentData - Datos de la semana actual.
 * @param {object} previousData - Datos de la semana anterior.
 */
function updateTrends(currentData, previousData) {
    if (!currentData) {
        currentData = weeklyData;
    }
    
    if (!previousData) {
        // Si no hay datos de la semana anterior, ocultar tendencias
        document.querySelectorAll('.metric-trend').forEach(el => {
            if (el.id.includes('Trend')) {
                el.style.display = 'none';
            }
        });
        return;
    }

    // Asegurarse de que los elementos de tendencia estén visibles
    document.querySelectorAll('.metric-trend').forEach(el => {
        if (el.id.includes('Trend')) {
            el.style.display = 'inline-flex';
        }
    });

    // 1. Tendencia de Solicitudes Totales
    const requestsChange = calculatePercentageChange(currentData.total_generated, previousData.total_generated);
    // Un aumento en solicitudes no es ni bueno ni malo, lo dejamos neutral (verde)
    updateTrendElement('requestsTrend', requestsChange, true);

    // 2. Tendencia de Tasa de Aprobación
    const approvalRateChange = currentData.approval_rate - previousData.approval_rate; // Diferencia simple de puntos porcentuales
    updateTrendElement('approvalTrend', approvalRateChange, true, 'p.p.');

    // 3. Tendencia de Costo Total
    const costChange = calculatePercentageChange(currentData.total_cost, previousData.total_cost);
    // Un aumento en el costo es NEGATIVO
    updateTrendElement('costTrend', costChange, false);

    // 4. Tendencia de Tiempo Promedio de Aprobación
    const timeChange = calculatePercentageChange(currentData.average_approval_time_seconds, previousData.average_approval_time_seconds);
    // Una disminución en el tiempo es POSITIVA
    updateTrendElement('timeTrend', timeChange, false);
}

// ========================================================================
// 4. GENERACIÓN DE TABLA DE RESUMEN
// ========================================================================

/**
 * Genera la tabla de resumen semanal con botones de exportación
 */
function generateWeeklySummary() {
    const container = document.getElementById('weeklySummaryContainer');
    if (!container || !weeklyData) return;

    const weekInfo = `Week ${currentWeek.weekNumber} of ${currentWeek.year}`;
    const weekRange = `${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD, YYYY')}`;
    const plantInfo = selectedPlant ? ` - ${selectedPlant}` : '';
    
    const html = `
        <div class="weekly-summary-container">
            <div class="kpis-header">
                <div class="kpis-header-content">
                    <h3 class="kpis-title">
                        <i class="fas fa-chart-line me-2"></i>
                        Weekly Performance Report
                    </h3>
                    <span class="kpis-subtitle">Premium Freight System | ${weekInfo} (${weekRange})${plantInfo}</span>
                </div>
                <div class="kpis-header-actions">
                    <div class="kpis-export-buttons">
                        <button id="exportExcel" class="btn" disabled>
                            <i class="fas fa-file-excel me-1"></i>Excel
                        </button>
                        <button id="exportPDF" class="btn" disabled>
                            <i class="fas fa-file-pdf me-1"></i>PDF
                        </button>
                        <button id="printReport" class="btn" disabled>
                            <i class="fas fa-print me-1"></i>Print
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="kpis-content">
                <!-- General Summary Section -->
                <div class="kpis-section">
                    <h4 class="section-title">
                        <i class="fas fa-chart-bar me-2"></i>
                        General Summary
                    </h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-label">Total Generated Requests</div>
                            <div class="stat-value primary">${formatNumber(weeklyData.total_generated || 0)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Orders Pending / In Progress</div>
                            <div class="stat-value warning">${formatNumber(weeklyData.total_pending || 0)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Approved Orders</div>
                            <div class="stat-value success">${formatNumber(weeklyData.total_approved || 0)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Rejected Orders</div>
                            <div class="stat-value danger">${formatNumber(weeklyData.total_rejected || 0)}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Approval Rate (of processed orders)</div>
                            <div class="stat-value info">${weeklyData.approval_rate || 0}%</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Cost of Approved Shipments</div>
                            <div class="stat-value primary">€ ${formatNumber(weeklyData.total_cost || 0, 2)}</div>
                        </div>
                    </div>
                </div>

                <!-- Performance Highlights Section -->
                <div class="kpis-section">
                    <h4 class="section-title">
                        <i class="fas fa-star me-2"></i>
                        Performance Highlights (Based on Approved Orders)
                    </h4>
                    <div class="highlights-grid">
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-user-crown me-2"></i>
                                Top Requesting User
                            </div>
                            <div class="highlight-value">${weeklyData.top_requesting_user?.name || 'N/A'}</div>
                            <div class="highlight-detail">
                                ${formatNumber(weeklyData.top_requesting_user?.request_count || 0)} approved requests | Total Cost: € ${formatNumber(weeklyData.top_requesting_user?.total_cost || 0, 2)}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-building me-2"></i>
                                Top Spending Area
                            </div>
                            <div class="highlight-value">${weeklyData.top_spending_area?.area || 'N/A'}</div>
                            <div class="highlight-detail">
                                Total Spent: € ${formatNumber(weeklyData.top_spending_area?.total_spent || 0, 2)}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-clock me-2"></i>
                                Longest Approval Step
                            </div>
                            <div class="highlight-value">${weeklyData.slowest_approver?.name || 'N/A'}</div>
                            <div class="highlight-detail">
                                Avg. time taken: ${weeklyData.slowest_approver?.duration_formatted || 'N/A'}
                            </div>
                        </div>
                        
                        <div class="highlight-item">
                            <div class="highlight-label">
                                <i class="fas fa-stopwatch me-2"></i>
                                Average Approval Time
                            </div>
                            <div class="highlight-value">${weeklyData.average_approval_time || 'N/A'}</div>
                            <div class="highlight-detail">
                                Creation to Finish
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="kpis-footer">
                <small class="text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    This is an automated report generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </small>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Re-assign event listeners to the new buttons
    setTimeout(() => {
        assignExportButtonListeners();
    }, 100);
}

/**
 * Asigna event listeners a los botones de exportación - MEJORADO
 */
function assignExportButtonListeners() {
    const exportExcel = document.getElementById('exportExcel');
    const exportPDF = document.getElementById('exportPDF');
    const printReportBtn = document.getElementById('printReport');
    
    if (exportExcel) {
        exportExcel.removeEventListener('click', exportToExcel);
        exportExcel.addEventListener('click', exportToExcel);
        exportExcel.disabled = false;
        exportExcel.innerHTML = '<i class="fas fa-file-excel me-1"></i>Excel';
        exportExcel.title = 'Export data to Excel with multiple sheets for each dataset';
    }
    
    if (exportPDF) {
        exportPDF.removeEventListener('click', exportToPDF);
        exportPDF.addEventListener('click', exportToPDF);
        exportPDF.disabled = false;
        exportPDF.innerHTML = '<i class="fas fa-file-pdf me-1"></i>PDF';
        exportPDF.title = 'Export all charts to PDF with individual pages for each chart';
    }
    
    if (printReportBtn) {
        printReportBtn.removeEventListener('click', printReport);
        printReportBtn.addEventListener('click', printReport);
        printReportBtn.disabled = false;
        printReportBtn.innerHTML = '<i class="fas fa-print me-1"></i>Print Dashboard';
        printReportBtn.title = 'Print the current dashboard view';
    }
}

/**
 * Inicializa los botones de exportación en la interfaz - NUEVA FUNCIÓN
 */
function initializeExportButtons() {
    // Buscar y configurar botones de exportación en toda la página
    const exportButtons = [
        { id: 'exportExcel', handler: exportToExcel, icon: 'fa-file-excel', text: 'Excel' },
        { id: 'exportPDF', handler: exportToPDF, icon: 'fa-file-pdf', text: 'PDF' },
        { id: 'printReport', handler: printReport, icon: 'fa-print', text: 'Print' }
    ];

    exportButtons.forEach(button => {
        const element = document.getElementById(button.id);
        if (element) {
            element.removeEventListener('click', button.handler);
            element.addEventListener('click', button.handler);
            element.disabled = false;
            
            // Actualizar texto e icono si es necesario
            if (!element.innerHTML.includes(button.icon)) {
                element.innerHTML = `<i class="fas ${button.icon} me-1"></i>${button.text}`;
            }
        }
    });

    console.log('Export buttons initialized successfully');
}

// ========================================================================
// 5. VISUALIZACIONES Y GRÁFICAS - ACTUALIZADAS CON DATOS REALES
// ========================================================================

/**
 * Renderiza el gráfico de tendencias semanales
 */
function renderTrendsChart() {
    const container = document.getElementById('trendsChart');
    if (!container) return;

    // Datos simulados para demostración - en el futuro usar datos reales
    const options = {
        series: [{
            name: 'Requests',
            data: [30, 40, 35, 50, 49, 60, 70]
        }, {
            name: 'Approvals',
            data: [25, 35, 30, 45, 42, 55, 63]
        }],
        chart: {
            height: 400,
            type: 'line',
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                }
            }
        },
        colors: [colorPalette.primary, colorPalette.accent],
        stroke: {
            width: 3,
            curve: 'smooth'
        },
        xaxis: {
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        title: {
            text: 'Daily Performance Trend',
            align: 'left',
            style: {
                fontFamily: 'Merriweather, serif'
            }
        },
        grid: {
            borderColor: '#e7e7e7',
            row: {
                colors: ['#f3f3f3', 'transparent'],
                opacity: 0.5
            }
        },
        markers: {
            size: 5
        }
    };

    if (charts.trends) {
        charts.trends.destroy();
    }
    charts.trends = new ApexCharts(container, options);
    charts.trends.render();
}

/**
 * Renderiza el gráfico de distribución de estados
 */
function renderStatusChart() {
    const container = document.getElementById('statusChart');
    if (!container || !weeklyData) return;

    const options = {
        series: [
            weeklyData.total_approved || 0,
            weeklyData.total_pending || 0,
            weeklyData.total_rejected || 0
        ],
        chart: {
            type: 'donut',
            height: 400
        },
        labels: ['Approved', 'Pending', 'Rejected'],
        colors: [colorPalette.success, colorPalette.warning, colorPalette.danger],
        legend: {
            position: 'bottom',
            fontFamily: 'Merriweather, serif'
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 200
                },
                legend: {
                    position: 'bottom'
                }
            }
        }]
    };

    if (charts.status) {
        charts.status.destroy();
    }
    charts.status = new ApexCharts(container, options);
    charts.status.render();
}

/**
 * Renderiza el gráfico de top performers - ACTUALIZADO CON DATOS REALES
 */
function renderTopPerformersChart() {
    const container = document.getElementById('topPerformersChart');
    if (!container || !weeklyData || !weeklyData.top_performers) return;

    // Extraer datos reales
    const performers = weeklyData.top_performers || [];
    
    if (performers.length === 0) {
        container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle text-muted me-2"></i>No data available for the selected period</div>';
        return;
    }

    const names = performers.map(p => p.name);
    const requests = performers.map(p => parseInt(p.approved_requests));

    const options = {
        series: [{
            name: 'Approved Requests',
            data: requests
        }],
        chart: {
            type: 'bar',
            height: 350
        },
        colors: [colorPalette.primary],
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: true,
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function(val) {
                return val + ' requests';
            }
        },
        xaxis: {
            categories: names,
            title: {
                text: 'Number of Approved Requests',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            }
        },
        yaxis: {
            title: {
                text: 'Users',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            }
        },
        title: {
            text: 'Top Users by Approved Requests',
            align: 'left',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '14px'
            }
        },
        tooltip: {
            y: {
                formatter: function(val, { series, seriesIndex, dataPointIndex, w }) {
                    const performer = performers[dataPointIndex];
                    return `<div>
                        <strong>${val} approved requests</strong><br>
                        Total Cost: €${formatNumber(performer.total_cost, 2)}
                    </div>`;
                }
            }
        }
    };

    if (charts.topPerformers) {
        charts.topPerformers.destroy();
    }
    charts.topPerformers = new ApexCharts(container, options);
    charts.topPerformers.render();
}

/**
 * Renderiza el gráfico de rendimiento por área - ACTUALIZADO CON DATOS REALES
 */
function renderAreaPerformanceChart() {
    const container = document.getElementById('areaPerformanceChart');
    if (!container || !weeklyData || !weeklyData.area_performance) return;

    // Extraer datos reales
    const areas = weeklyData.area_performance || [];
    
    if (areas.length === 0) {
        container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle text-muted me-2"></i>No data available for the selected period</div>';
        return;
    }

    const areaNames = areas.map(a => a.area_name);
    const requests = areas.map(a => parseInt(a.total_requests));
    const costs = areas.map(a => parseFloat(a.total_cost));

    const options = {
        series: [{
            name: 'Total Requests',
            type: 'column',
            data: requests
        }, {
            name: 'Total Cost (€)',
            type: 'line',
            data: costs
        }],
        chart: {
            height: 350,
            type: 'line'
        },
        colors: [colorPalette.accent, colorPalette.warning],
        stroke: {
            width: [0, 4]
        },
        dataLabels: {
            enabled: true,
            enabledOnSeries: [1],
            formatter: function(val, opts) {
                if (opts.seriesIndex === 1) {
                    return '€' + formatNumber(val, 0);
                }
                return val;
            }
        },
        xaxis: {
            categories: areaNames,
            title: {
                text: 'Business Areas',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            }
        },
        yaxis: [{
            title: {
                text: 'Number of Requests',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            }
        }, {
            opposite: true,
            title: {
                text: 'Total Cost (€)',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            },
            labels: {
                formatter: function(val) {
                    return '€' + formatNumber(val, 0);
                }
            }
        }],
        title: {
            text: 'Performance by Business Area (Approved Orders)',
            align: 'left',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '14px'
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right'
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: function(val, { series, seriesIndex, dataPointIndex, w }) {
                    if (seriesIndex === 0) {
                        return val + ' requests';
                    } else {
                        return '€' + formatNumber(val, 2);
                    }
                }
            }
        }
    };

    if (charts.areaPerformance) {
        charts.areaPerformance.destroy();
    }
    charts.areaPerformance = new ApexCharts(container, options);
    charts.areaPerformance.render();
}

/**
 * Renderiza el gráfico de tiempos de aprobación - ACTUALIZADO CON DATOS REALES
 */
function renderApprovalTimesChart() {
    const container = document.getElementById('approvalTimesChart');
    if (!container || !weeklyData || !weeklyData.approval_times_distribution) return;

    // Extraer datos reales
    const timeDistribution = weeklyData.approval_times_distribution || [];
    
    if (timeDistribution.length === 0) {
        container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle text-muted me-2"></i>No approval time data available</div>';
        return;
    }

    const categories = timeDistribution.map(t => t.time_category);
    const counts = timeDistribution.map(t => parseInt(t.count));

    // Calcular porcentajes
    const total = counts.reduce((sum, count) => sum + count, 0);
    const percentages = counts.map(count => total > 0 ? Math.round((count / total) * 100) : 0);

    const options = {
        series: percentages,
        chart: {
            type: 'radialBar',
            height: 300
        },
        plotOptions: {
            radialBar: {
                dataLabels: {
                    name: {
                        fontSize: '14px',
                        fontFamily: 'Merriweather, serif'
                    },
                    value: {
                        fontSize: '12px',
                        fontFamily: 'Merriweather, serif',
                        formatter: function(val, opts) {
                            const count = counts[opts.seriesIndex] || 0;
                            return `${val}%\n(${count} orders)`;
                        }
                    },
                    total: {
                        show: true,
                        label: 'Total Orders',
                        fontSize: '12px',
                        fontFamily: 'Merriweather, serif',
                        formatter: function (w) {
                            return `${total}`;
                        }
                    }
                }
            }
        },
        labels: categories,
        colors: [colorPalette.success, colorPalette.primary, colorPalette.warning, colorPalette.danger],
        title: {
            text: 'Time to Approval Distribution',
            align: 'center',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '14px'
            }
        },
        subtitle: {
            text: 'How long it takes from request creation to approval',
            align: 'center',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '12px',
                color: '#666'
            }
        },
        legend: {
            show: true,
            position: 'bottom',
            fontFamily: 'Merriweather, serif',
            fontSize: '12px',
            formatter: function(seriesName, opts) {
                const count = counts[opts.seriesIndex] || 0;
                const percentage = percentages[opts.seriesIndex] || 0;
                return `${seriesName}: ${count} orders (${percentage}%)`;
            }
        }
    };

    if (charts.approvalTimes) {
        charts.approvalTimes.destroy();
    }
    charts.approvalTimes = new ApexCharts(container, options);
    charts.approvalTimes.render();
}

/**
 * Renderiza el gráfico de análisis de costos - ACTUALIZADO CON DATOS REALES Y TÍTULO
 */
function renderCostAnalysisChart() {
    const container = document.getElementById('costAnalysisChart');
    if (!container || !weeklyData || !weeklyData.daily_costs) return;

    // Extraer datos reales
    const dailyCosts = weeklyData.daily_costs || [];
    
    if (dailyCosts.length === 0) {
        container.innerHTML = '<div class="text-center p-4"><i class="fas fa-info-circle text-muted me-2"></i>No cost data available for the selected period</div>';
        return;
    }

    const dates = dailyCosts.map(d => moment(d.approval_date).format('MMM DD'));
    const costs = dailyCosts.map(d => parseFloat(d.daily_cost));
    const counts = dailyCosts.map(d => parseInt(d.daily_count));

    const options = {
        series: [{
            name: 'Daily Cost (Approved Orders)',
            data: costs
        }],
        chart: {
            type: 'area',
            height: 300,
            sparkline: {
                enabled: false
            },
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: false,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: false,
                    reset: true
                }
            }
        },
        colors: [colorPalette.warning],
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.3,
                stops: [0, 90, 100]
            }
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        xaxis: {
            categories: dates,
            title: {
                text: 'Date',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            }
        },
        yaxis: {
            title: {
                text: 'Cost (€)',
                style: {
                    fontFamily: 'Merriweather, serif'
                }
            },
            labels: {
                formatter: function (value) {
                    return '€' + formatNumber(value, 0);
                }
            }
        },
        title: {
            text: 'Daily Cost Trend (Approved Orders Only)',
            align: 'left',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '14px'
            }
        },
        subtitle: {
            text: 'Shows the total cost of approved freight requests per day',
            align: 'left',
            style: {
                fontFamily: 'Merriweather, serif',
                fontSize: '12px',
                color: '#666'
            }
        },
        dataLabels: {
            enabled: false
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: function(val, { series, seriesIndex, dataPointIndex, w }) {
                    const count = counts[dataPointIndex] || 0;
                    return `<div>
                        <strong>€${formatNumber(val, 2)}</strong><br>
                        From ${count} approved order${count !== 1 ? 's' : ''}
                    </div>`;
                }
            }
        },
        markers: {
            size: 4,
            hover: {
                size: 6
            }
        }
    };

    if (charts.costAnalysis) {
        charts.costAnalysis.destroy();
    }
    charts.costAnalysis = new ApexCharts(container, options);
    charts.costAnalysis.render();
}

// ========================================================================
// 6. INSIGHTS Y RECOMENDACIONES
// ========================================================================

/**
 * Genera insights automáticos basados en los datos
 */
function generateInsights() {
    const container = document.getElementById('insightsContainer');
    if (!container || !weeklyData) return;

    const insights = [];

    // Approval rate insight
    const approvalRate = weeklyData.approval_rate || 0;
    if (approvalRate > 80) {
        insights.push({
            type: 'positive',
            title: 'Excellent Approval Rate',
            description: `Your approval rate of ${approvalRate}% is excellent and above industry standards.`
        });
    } else if (approvalRate < 60) {
        insights.push({
            type: 'warning',
            title: 'Low Approval Rate Alert',
            description: `Consider reviewing request quality - current approval rate of ${approvalRate}% could be improved.`
        });
    }

    // Top user insight
    if (weeklyData.top_requesting_user && weeklyData.top_requesting_user.name !== 'N/A') {
        insights.push({
            type: 'positive',
            title: 'Top Performer Identified',
            description: `${weeklyData.top_requesting_user.name} is leading with ${weeklyData.top_requesting_user.request_count} approved requests.`
        });
    }

    // Cost insight
    const totalCost = weeklyData.total_cost || 0;
    if (totalCost > 10000) {
        insights.push({
            type: 'warning',
            title: 'High Cost Alert',
            description: `Total cost of €${formatNumber(totalCost, 2)} is notably high. Consider cost optimization strategies.`
        });
    }

    // Default message if no insights
    if (insights.length === 0) {
        insights.push({
            type: 'info',
            title: 'Performance Analysis',
            description: 'All metrics are within normal ranges. Continue monitoring for trends.'
        });
    }

    const html = insights.map(insight => `
        <div class="insight-item ${insight.type}">
            <div class="insight-title">${insight.title}</div>
            <div class="insight-description">${insight.description}</div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// ========================================================================
// 7. FUNCIONES DE EXPORTACIÓN - MEJORADAS CON MÚLTIPLES PÁGINAS/HOJAS
// ========================================================================

/**
 * Verifica si un elemento es visible en el DOM
 * @param {HTMLElement} el - El elemento a verificar
 * @returns {boolean} - True si el elemento es visible
 */
function isElementVisible(el) {
    if (!el) return false;
    return el.offsetParent !== null && el.style.display !== 'none';
}

/**
 * Prepara los datos para exportación a Excel con múltiples hojas
 */
function prepareExcelData() {
    const exportData = {};
    
    // Hoja 1: Resumen General
    exportData['General Summary'] = {
        title: 'Weekly Performance Summary',
        headers: ['Metric', 'Value'],
        data: [
            ['Total Generated Requests', weeklyData.total_generated || 0],
            ['Total Pending', weeklyData.total_pending || 0],
            ['Total Approved', weeklyData.total_approved || 0],
            ['Total Rejected', weeklyData.total_rejected || 0],
            ['Approval Rate (%)', weeklyData.approval_rate || 0],
            ['Total Cost (€)', weeklyData.total_cost || 0],
            ['Average Approval Time', weeklyData.average_approval_time || 'N/A'],
            ['Top Requesting User', weeklyData.top_requesting_user?.name || 'N/A'],
            ['Top Spending Area', weeklyData.top_spending_area?.area || 'N/A'],
            ['Slowest Approver', weeklyData.slowest_approver?.name || 'N/A']
        ]
    };
    
    // Hoja 2: Top Performers
    if (weeklyData.top_performers && weeklyData.top_performers.length > 0) {
        exportData['Top Performers'] = {
            title: 'Top Performers by Approved Requests',
            headers: ['User Name', 'Approved Requests', 'Total Cost (€)'],
            data: weeklyData.top_performers.map(performer => [
                performer.name,
                performer.approved_requests,
                parseFloat(performer.total_cost).toFixed(2)
            ])
        };
    }
    
    // Hoja 3: Area Performance
    if (weeklyData.area_performance && weeklyData.area_performance.length > 0) {
        exportData['Area Performance'] = {
            title: 'Performance by Business Area',
            headers: ['Area', 'Total Requests', 'Total Cost (€)'],
            data: weeklyData.area_performance.map(area => [
                area.area_name,
                area.total_requests,
                parseFloat(area.total_cost).toFixed(2)
            ])
        };
    }
    
    // Hoja 4: Approval Times Distribution
    if (weeklyData.approval_times_distribution && weeklyData.approval_times_distribution.length > 0) {
        exportData['Approval Times'] = {
            title: 'Approval Time Distribution',
            headers: ['Time Category', 'Count', 'Percentage (%)', 'Average Hours'],
            data: weeklyData.approval_times_distribution.map(timeData => {
                const total = weeklyData.approval_times_distribution.reduce((sum, item) => sum + parseInt(item.count), 0);
                const percentage = total > 0 ? ((parseInt(timeData.count) / total) * 100).toFixed(1) : 0;
                return [
                    timeData.time_category,
                    timeData.count,
                    percentage,
                    timeData.avg_hours || 'N/A'
                ];
            })
        };
    }
    
    // Hoja 5: Daily Costs
    if (weeklyData.daily_costs && weeklyData.daily_costs.length > 0) {
        exportData['Daily Costs'] = {
            title: 'Daily Cost Analysis (Approved Orders)',
            headers: ['Date', 'Daily Cost (€)', 'Number of Orders'],
            data: weeklyData.daily_costs.map(dailyData => [
                dailyData.approval_date,
                parseFloat(dailyData.daily_cost).toFixed(2),
                dailyData.daily_count
            ])
        };
    }
    
    return exportData;
}

/**
 * Exporta los datos a Excel con múltiples hojas - MEJORADO
 */
function exportToExcel() {
    if (!weeklyData) {
        showErrorMessage('No data available to export');
        return;
    }

    if (typeof XLSX === 'undefined') {
        showErrorMessage('Excel export library not loaded');
        return;
    }

    try {
        // Show loading
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Generating Excel',
                html: 'Preparing file with multiple sheets...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
        }

        const workbook = XLSX.utils.book_new();
        const exportDate = new Date().toISOString().slice(0, 10);
        const exportData = prepareExcelData();

        // Crear hojas para cada conjunto de datos
        for (const [sheetKey, sheetData] of Object.entries(exportData)) {
            const sheetName = sheetKey.replace(/[:\\/?*[\]]/g, '').substring(0, 31);
            
            // Crear hoja con título y datos
            const worksheetData = [
                [sheetData.title], // Título
                [], // Fila vacía
                sheetData.headers, // Headers
                ...sheetData.data // Datos
            ];
            
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            
            // Aplicar formato al título
            if (worksheet['A1']) {
                worksheet['A1'].s = {
                    font: { bold: true, sz: 14 },
                    alignment: { horizontal: 'center' }
                };
            }
            
            // Aplicar formato a los headers
            const headerRow = 3;
            sheetData.headers.forEach((header, colIndex) => {
                const cellRef = XLSX.utils.encode_cell({ r: headerRow - 1, c: colIndex });
                if (worksheet[cellRef]) {
                    worksheet[cellRef].s = {
                        font: { bold: true },
                        fill: { fgColor: { rgb: "034C8C" } },
                        font: { color: { rgb: "FFFFFF" }, bold: true }
                    };
                }
            });
            
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }

        if (workbook.SheetNames.length === 0) {
            if (typeof Swal !== 'undefined') Swal.close();
            showErrorMessage("No chart data available to export. Please ensure data is loaded.");
            return;
        }

        // Save file
        const fileName = `Weekly-Performance-${currentWeek.weekNumber}-${currentWeek.year}_${exportDate}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        // Close loading and show success
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Export Successful',
                text: `Excel file with ${workbook.SheetNames.length} sheets has been downloaded`,
                icon: 'success',
                timer: 3000
            });
        }

    } catch (error) {
        console.error('Export error:', error);
        if (typeof Swal !== 'undefined') Swal.close();
        showErrorMessage('Error exporting to Excel: ' + error.message);
    }
}

/**
 * Verifica si una gráfica está completamente renderizada y lista para exportar
 * @param {string} chartId - ID del contenedor de la gráfica
 * @param {Object} chartObj - Objeto de la gráfica ApexCharts
 * @returns {boolean} - True si la gráfica está lista
 */
function isChartReady(chartId, chartObj) {
    const container = document.getElementById(chartId);
    
    if (!container || !isElementVisible(container)) {
        return false;
    }
    
    if (!chartObj || typeof chartObj.dataURI !== 'function') {
        return false;
    }
    
    // Verificar que el SVG tenga dimensiones válidas
    const svg = container.querySelector('svg');
    if (!svg) {
        return false;
    }
    
    const width = svg.getAttribute('width');
    const height = svg.getAttribute('height');
    
    if (!width || !height || width === 'NaN' || height === 'NaN' || width === '0' || height === '0') {
        return false;
    }
    
    return true;
}

/**
 * Espera a que una gráfica esté completamente renderizada
 * @param {string} chartId - ID del contenedor
 * @param {Object} chartObj - Objeto de la gráfica
 * @param {number} maxWait - Tiempo máximo de espera en ms
 * @returns {Promise<boolean>} - Resolve cuando la gráfica esté lista
 */
function waitForChartReady(chartId, chartObj, maxWait = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkReady = () => {
            if (isChartReady(chartId, chartObj)) {
                resolve(true);
                return;
            }
            
            if (Date.now() - startTime > maxWait) {
                console.warn(`Chart ${chartId} not ready after ${maxWait}ms`);
                resolve(false);
                return;
            }
            
            setTimeout(checkReady, 100);
        };
        
        checkReady();
    });
}

/**
 * Obtiene la imagen de una gráfica de forma segura
 * @param {Object} chartObj - Objeto de la gráfica ApexCharts
 * @returns {Promise<string|null>} - DataURL de la imagen o null si falla
 */
async function getChartImage(chartObj) {
    try {
        // Intentar obtener la imagen con diferentes opciones
        const options = [
            { pixelRatio: 2, scale: 2 },
            { pixelRatio: 1, scale: 1 },
            {}
        ];
        
        for (const option of options) {
            try {
                const dataUrlObj = await chartObj.dataURI(option);
                
                if (dataUrlObj && dataUrlObj.imgURI && dataUrlObj.imgURI.startsWith('data:image/')) {
                    // Verificar que la imagen se puede cargar
                    const isValid = await new Promise((resolve) => {
                        const testImg = new Image();
                        testImg.onload = () => resolve(true);
                        testImg.onerror = () => resolve(false);
                        testImg.src = dataUrlObj.imgURI;
                        
                        // Timeout de 3 segundos
                        setTimeout(() => resolve(false), 3000);
                    });
                    
                    if (isValid) {
                        return dataUrlObj.imgURI;
                    }
                }
            } catch (optionError) {
                console.warn('Failed to get chart image with option:', option, optionError);
                continue;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting chart image:', error);
        return null;
    }
}

/**
 * Exporta todas las gráficas visibles a PDF - MEJORADO con mejor manejo de errores
 */
async function exportToPDF() {
    if (typeof window.jspdf === 'undefined') {
        showErrorMessage('PDF library not available. Please try again or contact support.');
        return;
    }

    if (!weeklyData) {
        showErrorMessage('No data available to export');
        return;
    }

    // Show a nice loading window
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Generating PDF',
            html: 'Preparing charts for export...<br><div class="mt-2"><small>This may take a few seconds</small></div>',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4'
        });

        const chartElements = [
            { id: 'trendsChart', title: 'Weekly Trends Analysis', chartKey: 'trends' },
            { id: 'statusChart', title: 'Status Distribution', chartKey: 'status' },
            { id: 'topPerformersChart', title: 'Top Performers by Approved Requests', chartKey: 'topPerformers' },
            { id: 'areaPerformanceChart', title: 'Area Performance (Approved Orders)', chartKey: 'areaPerformance' },
            { id: 'approvalTimesChart', title: 'Approval Time Distribution', chartKey: 'approvalTimes' },
            { id: 'costAnalysisChart', title: 'Daily Cost Analysis (Approved Orders)', chartKey: 'costAnalysis' }
        ];

        let isFirstPage = true;
        let exportedCharts = 0;
        let skippedCharts = 0;

        for (const chartInfo of chartElements) {
            try {
                // Actualizar progreso
                if (typeof Swal !== 'undefined') {
                    Swal.update({
                        html: `Procesando gráfica: ${chartInfo.title}...<br><div class="mt-2"><small>Gráfica ${exportedCharts + skippedCharts + 1} de ${chartElements.length}</small></div>`
                    });
                }

                const chartContainer = document.getElementById(chartInfo.id);
                
                if (!chartContainer || !isElementVisible(chartContainer)) {
                    console.log(`Skipping chart ${chartInfo.id} - not visible or not found`);
                    skippedCharts++;
                    continue;
                }

                const chart = charts[chartInfo.chartKey];
                
                if (!chart) {
                    console.log(`Skipping chart ${chartInfo.id} - chart object not found in charts.${chartInfo.chartKey}`);
                    skippedCharts++;
                    continue;
                }

                // Esperar a que la gráfica esté lista
                const isReady = await waitForChartReady(chartInfo.id, chart, 3000);
                
                if (!isReady) {
                    console.warn(`Chart ${chartInfo.id} not ready for export`);
                    skippedCharts++;
                    continue;
                }

                // Intentar obtener la imagen
                const imageDataURL = await getChartImage(chart);
                
                if (!imageDataURL) {
                    console.error(`Failed to get image for chart ${chartInfo.id}`);
                    skippedCharts++;
                    continue;
                }

                // Agregar página al PDF
                if (!isFirstPage) {
                    pdf.addPage();
                }

                // Añadir título de la página
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text(chartInfo.title, 40, 30);
                
                // Añadir información del período
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                const weekInfo = `Week ${currentWeek.weekNumber} of ${currentWeek.year} (${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD, YYYY')})`;
                const plantInfo = selectedPlant ? ` - Plant: ${selectedPlant}` : '';
                pdf.text(weekInfo + plantInfo, 40, 50);

                // Calcular dimensiones y posición
                const margin = 40;
                const topMargin = 70;
                const contentWidth = pdf.internal.pageSize.getWidth() - 2 * margin;
                const contentHeight = pdf.internal.pageSize.getHeight() - topMargin - margin;
                
                // Obtener propiedades de la imagen
                const imgProps = pdf.getImageProperties(imageDataURL);
                const aspectRatio = imgProps.width / imgProps.height;
                let imgWidth = contentWidth;
                let imgHeight = imgWidth / aspectRatio;

                if (imgHeight > contentHeight) {
                    imgHeight = contentHeight;
                    imgWidth = imgHeight * aspectRatio;
                }

                // Centrar imagen
                const xPos = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
                const yPos = topMargin + (contentHeight - imgHeight) / 2;

                pdf.addImage(imageDataURL, 'PNG', xPos, yPos, imgWidth, imgHeight, undefined, 'FAST');
                
                exportedCharts++;
                isFirstPage = false;

                console.log(`Successfully exported chart: ${chartInfo.id}`);

            } catch (chartError) {
                console.error(`Error processing chart ${chartInfo.id}:`, chartError);
                skippedCharts++;
                
                // Agregar página de error solo si es un error crítico
                if (!isFirstPage) {
                    pdf.addPage();
                }
                
                pdf.setFontSize(16);
                pdf.setTextColor(200, 0, 0);
                pdf.text(`Chart Export Error: ${chartInfo.title}`, 40, 60);
                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(12);
                pdf.text('This chart could not be exported due to technical issues.', 40, 80);
                pdf.text('Please try refreshing the data and exporting again.', 40, 100);
                
                isFirstPage = false;
            }
        }

        // Verificar resultados
        if (exportedCharts === 0) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Charts Exported',
                    html: `
                        <p>No charts could be exported to PDF.</p>
                        <p><strong>Possible reasons:</strong></p>
                        <ul style="text-align: left; margin: 10px 0;">
                            <li>Charts are still loading</li>
                            <li>No data available for selected period</li>
                            <li>Browser compatibility issues</li>
                        </ul>
                        <p><small>Try refreshing the data and waiting for all charts to load before exporting.</small></p>
                    `,
                });
            }
            return;
        }

        // Guardar PDF
        const fileName = `Weekly-Performance-Charts-W${currentWeek.weekNumber}-${currentWeek.year}.pdf`;
        pdf.save(fileName);

        // Mostrar éxito
        if (typeof Swal !== 'undefined') {
            const message = exportedCharts === chartElements.length 
                ? `PDF with ${exportedCharts} charts has been downloaded successfully!`
                : `PDF with ${exportedCharts} charts downloaded. ${skippedCharts} charts were skipped.`;
                
            Swal.fire({
                title: 'Export Successful',
                text: message,
                icon: exportedCharts === chartElements.length ? 'success' : 'info',
                timer: 4000
            });
        }

    } catch (error) {
        console.error('PDF export error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Export Failed',
                text: 'There was an error generating the PDF. Please try again.',
            });
        } else {
            showErrorMessage('Error exporting to PDF: ' + error.message);
        }
    } finally {
        // Cerrar loading
        if (typeof Swal !== 'undefined') {
            // Solo cerrar si no se mostró otro modal
            if (Swal.isVisible() && Swal.getTitle()?.textContent === 'Generando PDF') {
                Swal.close();
            }
        }
    }
}

/**
 * Imprime el reporte
 */
function printReport() {
    window.print();
}

// ========================================================================
// 8. FUNCIONES DE UTILIDAD
// ========================================================================

/**
 * Formatea números para visualización
 */
function formatNumber(number, decimals = 0) {
    if (isNaN(number)) return '0';
    return number.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/**
 * Actualiza todas las visualizaciones
 */
async function updateAllVisualizations() {
    try {
        await loadWeeklyData();
        updateMetricCards();
        generateWeeklySummary();
        renderTrendsChart();
        renderStatusChart();
        renderTopPerformersChart();
        renderAreaPerformanceChart();
        renderApprovalTimesChart();
        renderCostAnalysisChart();
        generateInsights();
        
        // Asegurar que los botones de exportación estén configurados correctamente
        // después de que las gráficas se hayan renderizado
        setTimeout(() => {
            assignExportButtonListeners();
            initializeExportButtons();
        }, 500);
        
    } catch (error) {
        console.error('Error updating visualizations:', error);
    }
}

// ========================================================================
// 9. INICIALIZACIÓN
// ========================================================================

/**
 * Inicializa la página completa
 */
async function initializeWeeklyPerformance() {
    try {
        console.log('Initializing Weekly Performance Dashboard...');

        // Inicializar componentes
        initializeSelectors();
        
        // Inicializar botones de exportación
        initializeExportButtons();

        // Event listener para el botón de refresh
        const refreshBtn = document.getElementById('refreshData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', updateAllVisualizations);
        }

        // Cargar datos iniciales
        await updateAllVisualizations();

        console.log('Weekly Performance Dashboard initialized successfully');

    } catch (error) {
        console.error('Error initializing Weekly Performance Dashboard:', error);
        showErrorMessage('Failed to initialize dashboard: ' + error.message);
    }
}

// ========================================================================
// 10. PUNTO DE ENTRADA
// ========================================================================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeWeeklyPerformance);