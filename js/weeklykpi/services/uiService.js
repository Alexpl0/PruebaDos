/**
 * UI Service for Weekly Performance Dashboard
 */

import { dataService } from './dataService.js';
import { utilityService } from '../utils/utilities.js';
import { config } from '../config/weeklyConfig.js';

class UIService {
    constructor() {
        this.isInitialized = false;
        this.animationDelay = 150;
        this.toastPosition = 'top-end';
    }

    initialize() {
        console.log('Initializing UIService...');
        this.isInitialized = true;
        console.log('UIService initialized successfully');
    }

    /**
     * Inicializa los selectores de la interfaz
     */
    initializeSelectors() {
        try {
            this.initializeWeekSelector();
            this.initializePlantSelector();
            this.initializeKeyboardShortcuts();
            console.log('UI selectors initialized successfully');
        } catch (error) {
            console.error('Error initializing selectors:', error);
        }
    }

    /**
     * Inicializa el selector de semanas
     */
    initializeWeekSelector() {
        const prevBtn = document.getElementById('prevWeek');
        const nextBtn = document.getElementById('nextWeek');

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleWeekNavigation('previous');
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleWeekNavigation('next');
            });
        }

        this.updateWeekDisplay();
    }

    /**
     * Maneja la navegación entre semanas
     */
    handleWeekNavigation(direction) {
        try {
            const currentWeek = dataService.getCurrentWeek();
            const today = moment();
            const oneYearAgo = moment().subtract(1, 'year');

            if (direction === 'previous') {
                if (currentWeek.start.isAfter(oneYearAgo, 'week')) {
                    dataService.navigateToPreviousWeek();
                    this.updateWeekDisplay();
                    this.showStatusMessage('info', 'Semana Anterior', 'Navegando a la semana anterior...', 1500);
                } else {
                    this.showStatusMessage('warning', 'Límite Alcanzado', 'No se puede navegar más de un año hacia atrás');
                }
            } else if (direction === 'next') {
                const nextWeekStart = moment(currentWeek.start).add(1, 'week');
                if (!nextWeekStart.isAfter(today, 'week')) {
                    dataService.navigateToNextWeek();
                    this.updateWeekDisplay();
                    this.showStatusMessage('info', 'Semana Siguiente', 'Navegando a la semana siguiente...', 1500);
                } else {
                    this.showStatusMessage('warning', 'Límite Alcanzado', 'No se puede navegar a semanas futuras');
                }
            }
        } catch (error) {
            console.error('Error in week navigation:', error);
            this.showErrorMessage('Error al navegar entre semanas: ' + error.message);
        }
    }

    /**
     * Actualiza la visualización del selector de semanas
     */
    updateWeekDisplay() {
        const currentWeek = dataService.getCurrentWeek();
        const weekNumberElement = document.getElementById('weekNumber');
        const weekDatesElement = document.getElementById('weekDates');

        if (weekNumberElement) {
            weekNumberElement.textContent = `Semana ${currentWeek.weekNumber}, ${currentWeek.year}`;
        }

        if (weekDatesElement) {
            const startDate = currentWeek.start.format('MMM DD');
            const endDate = currentWeek.end.format('MMM DD, YYYY');
            weekDatesElement.textContent = `${startDate} - ${endDate}`;
        }

        // Actualizar estado de los botones de navegación
        this.updateNavigationButtons();
    }

    /**
     * Actualiza el estado de los botones de navegación
     */
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevWeek');
        const nextBtn = document.getElementById('nextWeek');
        const currentWeek = dataService.getCurrentWeek();
        
        if (prevBtn) {
            const oneYearAgo = moment().subtract(1, 'year');
            const canGoBack = currentWeek.start.isAfter(oneYearAgo, 'week');
            prevBtn.disabled = !canGoBack;
            prevBtn.title = canGoBack ? 'Semana anterior (Ctrl + ←)' : 'No se puede retroceder más';
        }

        if (nextBtn) {
            const today = moment();
            const nextWeekStart = moment(currentWeek.start).add(1, 'week');
            const canGoForward = !nextWeekStart.isAfter(today, 'week');
            nextBtn.disabled = !canGoForward;
            nextBtn.title = canGoForward ? 'Semana siguiente (Ctrl + →)' : 'No se puede avanzar a semanas futuras';
        }
    }

    /**
     * Inicializa el selector de plantas
     */
    async initializePlantSelector() {
        const plantSelect = document.getElementById('plantSelect');
        if (!plantSelect) {
            console.warn('Plant selector element not found');
            return;
        }

        try {
            const plants = dataService.getAvailablePlants();
            
            // Limpiar opciones existentes excepto la primera
            while (plantSelect.children.length > 1) {
                plantSelect.removeChild(plantSelect.lastChild);
            }

            // Actualizar texto de la primera opción
            if (plantSelect.children.length > 0) {
                plantSelect.children[0].textContent = 'Todas las Plantas';
                plantSelect.children[0].value = '';
            }
            
            // Agregar plantas disponibles
            plants.forEach((plant, index) => {
                const option = document.createElement('option');
                option.value = plant;
                option.textContent = plant;
                plantSelect.appendChild(option);
                
                // Animación escalonada
                setTimeout(() => {
                    option.style.opacity = '1';
                }, index * 50);
            });

            // Event listener para cambios
            plantSelect.addEventListener('change', (e) => {
                const previousPlant = dataService.getSelectedPlant();
                const newPlant = e.target.value;
                
                dataService.setSelectedPlant(newPlant);
                
                if (previousPlant !== newPlant) {
                    const message = newPlant ? `Filtrado por planta: ${newPlant}` : 'Mostrando todas las plantas';
                    this.showStatusMessage('info', 'Filtro Actualizado', message, 2000);
                }
            });

            console.log(`Plant selector initialized with ${plants.length} plants`);

        } catch (error) {
            console.error('Error initializing plant selector:', error);
            this.showErrorMessage('Error al cargar la lista de plantas');
        }
    }

    /**
     * Inicializa atajos de teclado
     */
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.handleWeekNavigation('previous');
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.handleWeekNavigation('next');
                        break;
                    case 'Home':
                        e.preventDefault();
                        dataService.resetToCurrentWeek();
                        this.updateWeekDisplay();
                        this.showStatusMessage('info', 'Semana Actual', 'Navegando a la semana actual...', 1500);
                        break;
                }
            }
        });
    }

    /**
     * Actualiza las tarjetas de métricas
     */
    updateMetricCards(weeklyData) {
        if (!weeklyData) {
            console.warn('No weekly data provided to update metric cards');
            return;
        }

        // Tarjetas principales con animación
        const metrics = [
            { 
                id: 'totalGenerated', 
                value: utilityService.formatNumber(weeklyData.total_generated || 0),
                animate: true
            },
            { 
                id: 'totalPending', 
                value: utilityService.formatNumber(weeklyData.total_pending || 0),
                animate: true
            },
            { 
                id: 'totalApproved', 
                value: utilityService.formatNumber(weeklyData.total_approved || 0),
                animate: true
            },
            { 
                id: 'totalRejected', 
                value: utilityService.formatNumber(weeklyData.total_rejected || 0),
                animate: true
            },
            { 
                id: 'approvalRate', 
                value: (weeklyData.approval_rate || 0).toFixed(1) + '%',
                animate: true
            },
            { 
                id: 'totalCost', 
                value: utilityService.formatCurrency(weeklyData.total_cost || 0, '€', 2),
                animate: true
            },
            {
                id: 'averageApprovalTime',
                value: weeklyData.average_approval_time || 'N/A',
                animate: false
            }
        ];

        metrics.forEach((metric, index) => {
            const element = document.getElementById(metric.id);
            if (element) {
                if (metric.animate && utilityService.isNumeric(metric.value.replace(/[€,%]/g, ''))) {
                    this.animateCounter(element, metric.value, index * 100);
                } else {
                    element.textContent = metric.value;
                }
            }
        });

        // Actualizar información adicional
        this.updateAdditionalInfo(weeklyData);
    }

    /**
     * Anima contador numérico
     */
    animateCounter(element, finalValue, delay = 0) {
        const numericValue = parseFloat(finalValue.replace(/[€,%]/g, ''));
        const isPercentage = finalValue.includes('%');
        const isCurrency = finalValue.includes('€');
        
        if (!utilityService.isNumeric(numericValue)) {
            element.textContent = finalValue;
            return;
        }

        setTimeout(() => {
            let current = 0;
            const increment = numericValue / 30; // 30 frames
            const duration = 1000; // 1 segundo
            const frameTime = duration / 30;

            const animate = () => {
                current += increment;
                if (current >= numericValue) {
                    current = numericValue;
                }

                let displayValue = utilityService.formatNumber(current, isCurrency ? 2 : 0);
                
                if (isCurrency) {
                    displayValue = '€' + displayValue;
                } else if (isPercentage) {
                    displayValue = displayValue + '%';
                }

                element.textContent = displayValue;

                if (current < numericValue) {
                    setTimeout(animate, frameTime);
                }
            };

            animate();
        }, delay);
    }

    /**
     * Actualiza información adicional
     */
    updateAdditionalInfo(weeklyData) {
        const additionalInfo = [
            { id: 'avgApprovalTime', value: weeklyData.average_approval_time || 'N/A' },
            { id: 'topUser', value: weeklyData.top_requesting_user?.name || 'N/A' },
            { 
                id: 'topUserCost', 
                value: weeklyData.top_requesting_user?.total_cost ? 
                    utilityService.formatCurrency(weeklyData.top_requesting_user.total_cost, '€', 2) : 'N/A' 
            },
            { id: 'topArea', value: weeklyData.top_spending_area?.area || 'N/A' },
            { 
                id: 'topAreaCost', 
                value: weeklyData.top_spending_area?.total_spent ? 
                    utilityService.formatCurrency(weeklyData.top_spending_area.total_spent, '€', 2) : 'N/A' 
            },
            { id: 'slowestApprover', value: weeklyData.slowest_approver?.name || 'N/A' },
            { id: 'slowestTime', value: weeklyData.slowest_approver?.duration_formatted || 'N/A' }
        ];

        additionalInfo.forEach(info => {
            const element = document.getElementById(info.id);
            if (element) {
                element.textContent = info.value;
            }
        });
    }

    /**
     * Genera el resumen semanal con diseño mejorado
     */
    generateWeeklySummary(weeklyData) {
        const container = document.getElementById('weeklySummaryContainer');
        if (!container || !weeklyData) {
            console.warn('Cannot generate weekly summary: missing container or data');
            return;
        }

        const currentWeek = dataService.getCurrentWeek();
        const weekInfo = `Semana ${currentWeek.weekNumber} de ${currentWeek.year}`;
        const weekRange = `${currentWeek.start.format('DD MMM')} - ${currentWeek.end.format('DD MMM, YYYY')}`;
        const plantInfo = weeklyData.selected_plant ? ` - Planta: ${weeklyData.selected_plant}` : '';

        container.innerHTML = `
            <div class="dashboard-summary-card card animate shadow-lg">
                <div class="dashboard-summary-header" style="background: ${config.colors.gradients.primary}; color: #fff; padding: 1.5rem 2rem; display: flex; align-items: center; justify-content: space-between; border-radius: 12px 12px 0 0;">
                    <div>
                        <h3 style="margin:0;font-size:1.5rem;font-weight:700;letter-spacing:0.5px;">
                            <i class="fas fa-chart-line me-3"></i>
                            Resumen de Rendimiento Semanal
                        </h3>
                        <div style="font-size:1.1rem;opacity:0.9;margin-top:0.5rem;">
                            ${weekInfo} <span style="font-weight:400;">(${weekRange})</span>${plantInfo}
                        </div>
                    </div>
                    <div class="export-buttons">
                        <button id="exportExcel" class="btn btn-sm btn-outline-light me-2" title="Exportar a Excel">
                            <i class="fas fa-file-excel me-1"></i>Excel
                        </button>
                        <button id="exportPDF" class="btn btn-sm btn-outline-light me-2" title="Exportar a PDF">
                            <i class="fas fa-file-pdf me-1"></i>PDF
                        </button>
                        <button id="printReport" class="btn btn-sm btn-outline-light" title="Imprimir">
                            <i class="fas fa-print me-1"></i>Imprimir
                        </button>
                    </div>
                </div>
                <div class="dashboard-summary-body" style="padding:2rem;">
                    ${this.generateMetricCardsHTML(weeklyData)}
                    ${this.generateKeyInsightsHTML(weeklyData)}
                </div>
                <div class="dashboard-summary-footer" style="background: #f8fafc; color: #666; font-size:0.95rem; padding: 1rem 2rem; border-radius: 0 0 12px 12px;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="fas fa-info-circle me-2"></i>
                            Reporte generado el ${new Date().toLocaleDateString('es-MX', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                        <div class="text-muted">
                            <small>Dashboard v2.0 | Premium Freight Analytics</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Agregar animaciones escalonadas a las métricas
        this.addStaggeredAnimations();
    }

    /**
     * Genera HTML para las tarjetas de métricas del resumen
     */
    generateMetricCardsHTML(weeklyData) {
        const metrics = [
            {
                icon: 'fa-file-alt',
                value: utilityService.formatNumber(weeklyData.total_generated || 0),
                label: 'Total Generadas',
                color: 'primary',
                col: 'col-6 col-md-3'
            },
            {
                icon: 'fa-hourglass-half',
                value: utilityService.formatNumber(weeklyData.total_pending || 0),
                label: 'Pendientes',
                color: 'warning',
                col: 'col-6 col-md-3'
            },
            {
                icon: 'fa-check-circle',
                value: utilityService.formatNumber(weeklyData.total_approved || 0),
                label: 'Aprobadas',
                color: 'success',
                col: 'col-6 col-md-3'
            },
            {
                icon: 'fa-times-circle',
                value: utilityService.formatNumber(weeklyData.total_rejected || 0),
                label: 'Rechazadas',
                color: 'danger',
                col: 'col-6 col-md-3'
            },
            {
                icon: 'fa-percentage',
                value: (weeklyData.approval_rate || 0).toFixed(1) + '%',
                label: 'Tasa de Aprobación',
                color: 'info',
                col: 'col-6 col-md-4'
            },
            {
                icon: 'fa-euro-sign',
                value: utilityService.formatCurrency(weeklyData.total_cost || 0, '€', 0),
                label: 'Costo Total',
                color: 'primary',
                col: 'col-6 col-md-4'
            },
            {
                icon: 'fa-stopwatch',
                value: weeklyData.average_approval_time || 'N/A',
                label: 'Tiempo Promedio',
                color: 'info',
                col: 'col-12 col-md-4'
            }
        ];

        let html = '<div class="row g-3 mb-4">';
        
        metrics.forEach((metric, index) => {
            html += `
                <div class="${metric.col}">
                    <div class="metric-card ${metric.color} summary-metric" style="animation-delay: ${index * 100}ms">
                        <div class="metric-icon">
                            <i class="fas ${metric.icon}"></i>
                        </div>
                        <div class="metric-content">
                            <h3>${metric.value}</h3>
                            <p>${metric.label}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Genera HTML para insights clave
     */
    generateKeyInsightsHTML(weeklyData) {
        const insights = [
            {
                icon: 'fa-user-crown',
                title: 'Usuario Más Activo',
                value: weeklyData.top_requesting_user?.name || 'N/A',
                subtitle: weeklyData.top_requesting_user?.total_cost ? 
                    `Costo total: ${utilityService.formatCurrency(weeklyData.top_requesting_user.total_cost, '€', 2)}` : '',
                color: 'success'
            },
            {
                icon: 'fa-building',
                title: 'Área Principal',
                value: weeklyData.top_spending_area?.area || 'N/A',
                subtitle: weeklyData.top_spending_area?.total_spent ? 
                    `Gasto total: ${utilityService.formatCurrency(weeklyData.top_spending_area.total_spent, '€', 2)}` : '',
                color: 'info'
            },
            {
                icon: 'fa-clock',
                title: 'Proceso Más Lento',
                value: weeklyData.slowest_approver?.name || 'N/A',
                subtitle: weeklyData.slowest_approver?.duration_formatted || '',
                color: 'warning'
            }
        ];

        let html = '<div class="row g-3 mt-3"><div class="col-12"><h5 class="mb-3"><i class="fas fa-key me-2"></i>Puntos Clave</h5></div>';
        
        insights.forEach((insight, index) => {
            html += `
                <div class="col-md-4">
                    <div class="insight-card ${insight.color}" style="animation-delay: ${(index + 7) * 100}ms">
                        <div class="insight-icon">
                            <i class="fas ${insight.icon}"></i>
                        </div>
                        <div class="insight-content">
                            <h6>${insight.title}</h6>
                            <div class="insight-value">${insight.value}</div>
                            ${insight.subtitle ? `<small class="text-muted">${insight.subtitle}</small>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Agrega animaciones escalonadas
     */
    addStaggeredAnimations() {
        const elements = document.querySelectorAll('.summary-metric, .insight-card');
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                element.style.transition = 'all 0.6s ease-out';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    /**
     * Genera insights automáticos mejorados
     */
    generateInsights(weeklyData) {
        const container = document.getElementById('insightsContainer');
        if (!container || !weeklyData) {
            console.warn('Cannot generate insights: missing container or data');
            return;
        }

        const insights = this.calculateInsights(weeklyData);

        if (insights.length === 0) {
            container.innerHTML = `
                <div class="text-center p-5">
                    <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Sin datos suficientes para generar insights</h5>
                    <p class="text-muted">Los insights se mostrarán cuando haya más datos disponibles.</p>
                </div>
            `;
            return;
        }

        const html = insights.map((insight, index) => `
            <div class="insight-item ${insight.type} animate" style="animation-delay: ${index * 200}ms">
                <div class="insight-header">
                    <i class="fas ${this.getInsightIcon(insight.type)} me-2"></i>
                    <span class="insight-title">${insight.title}</span>
                    ${insight.priority ? `<span class="badge bg-${insight.priority} ms-2">${insight.priority}</span>` : ''}
                </div>
                <div class="insight-description">${insight.description}</div>
                ${insight.recommendation ? `<div class="insight-recommendation"><strong>Recomendación:</strong> ${insight.recommendation}</div>` : ''}
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * Calcula insights basados en los datos
     */
    calculateInsights(weeklyData) {
        const insights = [];
        const approvalRate = weeklyData.approval_rate || 0;
        const totalCost = weeklyData.total_cost || 0;
        const totalGenerated = weeklyData.total_generated || 0;

        // Insight sobre approval rate
        if (approvalRate >= 90) {
            insights.push({
                type: 'success',
                title: 'Excelente Tasa de Aprobación',
                description: `La tasa de aprobación del ${approvalRate.toFixed(1)}% es excepcional y está muy por encima del promedio.`,
                priority: 'high'
            });
        } else if (approvalRate >= 75) {
            insights.push({
                type: 'info',
                title: 'Buena Tasa de Aprobación',
                description: `La tasa de aprobación del ${approvalRate.toFixed(1)}% está dentro del rango saludable.`,
                recommendation: 'Mantener las prácticas actuales de revisión y aprobación.'
            });
        } else if (approvalRate >= 50) {
            insights.push({
                type: 'warning',
                title: 'Tasa de Aprobación Moderada',
                description: `La tasa de aprobación del ${approvalRate.toFixed(1)}% podría mejorarse.`,
                recommendation: 'Revisar criterios de solicitud y procesos de aprobación.',
                priority: 'medium'
            });
        } else {
            insights.push({
                type: 'danger',
                title: 'Tasa de Aprobación Baja',
                description: `La tasa de aprobación del ${approvalRate.toFixed(1)}% requiere atención inmediata.`,
                recommendation: 'Evaluar urgentemente los procesos y criterios de aprobación.',
                priority: 'high'
            });
        }

        // Insight sobre costos
        if (totalCost > 50000) {
            insights.push({
                type: 'warning',
                title: 'Costos Elevados',
                description: `Los costos semanales de ${utilityService.formatCurrency(totalCost, '€', 0)} están significativamente altos.`,
                recommendation: 'Revisar las solicitudes de alto valor y optimizar los procesos de compra.',
                priority: 'high'
            });
        } else if (totalCost > 25000) {
            insights.push({
                type: 'info',
                title: 'Costos Moderados',
                description: `Los costos semanales de ${utilityService.formatCurrency(totalCost, '€', 0)} están en un rango normal.`,
                recommendation: 'Monitorear tendencias para mantener el control de costos.'
            });
        }

        // Insight sobre actividad
        if (totalGenerated > 100) {
            insights.push({
                type: 'info',
                title: 'Alta Actividad',
                description: `Se generaron ${totalGenerated} solicitudes esta semana, indicando alta actividad operacional.`,
                recommendation: 'Asegurar capacidad suficiente de procesamiento para mantener tiempos de respuesta.'
            });
        } else if (totalGenerated < 20) {
            insights.push({
                type: 'warning',
                title: 'Baja Actividad',
                description: `Solo se generaron ${totalGenerated} solicitudes esta semana.`,
                recommendation: 'Verificar si la baja actividad es esperada o requiere investigación.'
            });
        }

        // Insight sobre top performer
        if (weeklyData.top_requesting_user && weeklyData.top_requesting_user.name !== 'N/A') {
            const topUser = weeklyData.top_requesting_user;
            insights.push({
                type: 'info',
                title: 'Usuario Más Activo',
                description: `${topUser.name} generó el mayor número de solicitudes con un costo total de ${utilityService.formatCurrency(topUser.total_cost, '€', 2)}.`,
                recommendation: 'Considerar optimizar los procesos más utilizados por este usuario.'
            });
        }

        // Insight sobre tiempo de aprobación
        const avgTime = weeklyData.average_approval_time;
        if (avgTime && avgTime !== 'N/A') {
            const timeValue = parseFloat(avgTime);
            if (timeValue > 48) {
                insights.push({
                    type: 'warning',
                    title: 'Tiempos de Aprobación Lentos',
                    description: `El tiempo promedio de aprobación de ${avgTime} es elevado.`,
                    recommendation: 'Revisar el flujo de aprobaciones para identificar cuellos de botella.',
                    priority: 'medium'
                });
            } else if (timeValue < 4) {
                insights.push({
                    type: 'success',
                    title: 'Tiempos de Aprobación Excelentes',
                    description: `El tiempo promedio de aprobación de ${avgTime} es muy eficiente.`
                });
            }
        }

        return insights;
    }

    /**
     * Obtiene icono para el tipo de insight
     */
    getInsightIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle',
            danger: 'fa-exclamation-circle'
        };
        return icons[type] || 'fa-lightbulb';
    }

    /**
     * Muestra estado de carga
     */
    showLoading(show = true) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            } else {
                loadingOverlay.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    }

    /**
     * Muestra mensaje de error
     */
    showErrorMessage(message, title = 'Error') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: title,
                text: message,
                timer: 5000,
                showConfirmButton: true,
                confirmButtonColor: config.colors.danger
            });
        } else {
            console.error(`${title}: ${message}`);
            alert(`${title}: ${message}`);
        }
    }

    /**
     * Muestra mensaje de éxito
     */
    showSuccessMessage(message, title = 'Éxito') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: title,
                text: message,
                timer: 3000,
                toast: true,
                position: this.toastPosition,
                showConfirmButton: false
            });
        } else {
            console.log(`${title}: ${message}`);
        }
    }

    /**
     * Muestra mensaje de estado
     */
    showStatusMessage(type, title, message, timer = 3000) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: type,
                title: title,
                text: message,
                timer: timer,
                toast: true,
                position: this.toastPosition,
                showConfirmButton: false
            });
        } else {
            console.log(`${type.toUpperCase()} - ${title}: ${message}`);
        }
    }

    /**
     * Muestra confirmación
     */
    showConfirmation(title, text, confirmText = 'Confirmar', cancelText = 'Cancelar') {
        if (typeof Swal !== 'undefined') {
            return Swal.fire({
                title: title,
                text: text,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: config.colors.primary,
                cancelButtonColor: config.colors.secondary,
                confirmButtonText: confirmText,
                cancelButtonText: cancelText
            });
        } else {
            return Promise.resolve({ isConfirmed: confirm(`${title}\n\n${text}`) });
        }
    }

    /**
     * Obtiene estadísticas del servicio UI
     */
    getServiceStats() {
        return {
            isInitialized: this.isInitialized,
            elementsFound: {
                weekNumber: !!document.getElementById('weekNumber'),
                weekDates: !!document.getElementById('weekDates'),
                plantSelect: !!document.getElementById('plantSelect'),
                refreshData: !!document.getElementById('refreshData'),
                loadingOverlay: !!document.getElementById('loadingOverlay')
            }
        };
    }
}

export const uiService = new UIService();