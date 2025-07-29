/**
 * Chart Service for Weekly Performance Dashboard
 */

import { TrendsChart } from '../charts/trendsChart.js';
import { StatusChart } from '../charts/statusChart.js';
import { TopPerformersChart } from '../charts/topPerformersChart.js';
import { AreaPerformanceChart } from '../charts/areaPerformanceChart.js';
import { ApprovalTimesChart } from '../charts/approvalTimesChart.js';
import { CostAnalysisChart } from '../charts/costAnalysisChart.js';
import { utilityService } from '../utils/utilities.js';

class ChartService {
    constructor() {
        this.charts = {};
        this.isInitialized = false;
        this.renderQueue = [];
        this.isRendering = false;
        this.renderTimeout = 30000; // 30 segundos timeout
    }

    initialize() {
        console.log('Initializing ChartService...');
        
        try {
            // Verificar que ApexCharts esté disponible
            if (typeof ApexCharts === 'undefined') {
                throw new Error('ApexCharts library is not loaded');
            }

            // Inicializar todas las instancias de gráficas
            this.charts = {
                trends: new TrendsChart('trendsChart'),
                status: new StatusChart('statusChart'),
                topPerformers: new TopPerformersChart('topPerformersChart'),
                areaPerformance: new AreaPerformanceChart('areaPerformanceChart'),
                approvalTimes: new ApprovalTimesChart('approvalTimesChart'),
                costAnalysis: new CostAnalysisChart('costAnalysisChart')
            };

            // Verificar que los contenedores existan
            this.validateContainers();

            this.isInitialized = true;
            console.log('ChartService initialized successfully with', Object.keys(this.charts).length, 'charts');

        } catch (error) {
            console.error('Error initializing ChartService:', error);
            throw error;
        }
    }

    /**
     * Valida que todos los contenedores de gráficas existan
     */
    validateContainers() {
        const missingContainers = [];
        
        Object.entries(this.charts).forEach(([key, chart]) => {
            const container = document.getElementById(chart.containerId);
            if (!container) {
                missingContainers.push(chart.containerId);
            }
        });

        if (missingContainers.length > 0) {
            console.warn('Missing chart containers:', missingContainers);
        }

        return missingContainers.length === 0;
    }

    /**
     * Renderiza todas las gráficas
     */
    async renderAll(weeklyData) {
        if (!this.isInitialized) {
            console.error('ChartService not initialized');
            return;
        }

        if (!weeklyData) {
            console.error('No weekly data provided for chart rendering');
            return;
        }

        if (this.isRendering) {
            console.log('Chart rendering already in progress, queuing request...');
            return new Promise((resolve) => {
                this.renderQueue.push({ weeklyData, resolve });
            });
        }

        this.isRendering = true;
        
        try {
            console.log('Starting to render all charts...');
            const startTime = Date.now();

            // Crear promesas para renderizar todas las gráficas
            const renderPromises = Object.entries(this.charts).map(([key, chart]) => 
                this.renderSingleChart(key, chart, weeklyData)
            );

            // Esperar a que todas las gráficas se rendericen
            const results = await Promise.allSettled(renderPromises);

            // Analizar resultados
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected');

            const renderTime = Date.now() - startTime;
            console.log(`Chart rendering completed: ${successful}/${results.length} successful in ${renderTime}ms`);

            if (failed.length > 0) {
                console.warn('Some charts failed to render:', failed.map(f => f.reason));
            }

            // Procesar cola si hay elementos pendientes
            if (this.renderQueue.length > 0) {
                const queued = this.renderQueue.shift();
                setTimeout(() => {
                    this.renderAll(queued.weeklyData).then(queued.resolve);
                }, 100);
            }

        } catch (error) {
            console.error('Error during chart rendering:', error);
        } finally {
            this.isRendering = false;
        }
    }

    /**
     * Renderiza una gráfica individual con manejo de errores
     */
    async renderSingleChart(chartKey, chartInstance, weeklyData) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Chart ${chartKey} rendering timed out`));
            }, this.renderTimeout);

            try {
                const container = document.getElementById(chartInstance.containerId);
                
                if (!container) {
                    clearTimeout(timeout);
                    reject(new Error(`Container ${chartInstance.containerId} not found`));
                    return;
                }

                if (!utilityService.isElementVisible(container)) {
                    console.warn(`Container ${chartInstance.containerId} is not visible, rendering anyway...`);
                }

                // Renderizar la gráfica
                chartInstance.render(weeklyData);
                
                // Verificar que la gráfica se haya renderizado correctamente
                setTimeout(() => {
                    const svg = container.querySelector('svg');
                    if (svg) {
                        clearTimeout(timeout);
                        console.log(`Chart ${chartKey} rendered successfully`);
                        resolve(chartKey);
                    } else {
                        clearTimeout(timeout);
                        reject(new Error(`Chart ${chartKey} failed to create SVG element`));
                    }
                }, 500);

            } catch (error) {
                clearTimeout(timeout);
                console.error(`Error rendering chart ${chartKey}:`, error);
                reject(error);
            }
        });
    }

    /**
     * Renderiza una gráfica específica
     */
    async renderChart(chartKey, weeklyData) {
        if (!this.isInitialized) {
            console.error('ChartService not initialized');
            return false;
        }

        const chart = this.charts[chartKey];
        if (!chart) {
            console.error(`Chart ${chartKey} not found`);
            return false;
        }

        try {
            await this.renderSingleChart(chartKey, chart, weeklyData);
            return true;
        } catch (error) {
            console.error(`Failed to render chart ${chartKey}:`, error);
            return false;
        }
    }

    /**
     * Obtiene una instancia de gráfica específica
     */
    getChart(chartKey) {
        if (!this.charts[chartKey]) {
            console.warn(`Chart ${chartKey} not found`);
            return null;
        }

        const chartInstance = this.charts[chartKey].getChart();
        if (!chartInstance) {
            console.warn(`Chart instance ${chartKey} not yet rendered`);
            return null;
        }

        return chartInstance;
    }

    /**
     * Obtiene todas las instancias de gráficas
     */
    getAllCharts() {
        const chartInstances = {};
        
        Object.entries(this.charts).forEach(([key, chart]) => {
            const instance = chart.getChart();
            if (instance) {
                chartInstances[key] = instance;
            }
        });

        return chartInstances;
    }

    /**
     * Redimensiona todas las gráficas
     */
    resizeAll() {
        if (!this.isInitialized) return;

        console.log('Resizing all charts...');
        
        Object.entries(this.charts).forEach(([key, chart]) => {
            try {
                const chartInstance = chart.getChart();
                if (chartInstance && typeof chartInstance.resize === 'function') {
                    chartInstance.resize();
                }
            } catch (error) {
                console.error(`Error resizing chart ${key}:`, error);
            }
        });
    }

    /**
     * Actualiza los datos de una gráfica específica
     */
    updateChartData(chartKey, newData, animate = true) {
        if (!this.isInitialized) return false;

        const chart = this.charts[chartKey];
        if (!chart) {
            console.error(`Chart ${chartKey} not found`);
            return false;
        }

        try {
            const chartInstance = chart.getChart();
            if (chartInstance && typeof chartInstance.updateSeries === 'function') {
                chartInstance.updateSeries(newData, animate);
                console.log(`Chart ${chartKey} data updated`);
                return true;
            } else {
                console.warn(`Chart ${chartKey} does not support data updates, re-rendering...`);
                chart.render(newData);
                return true;
            }
        } catch (error) {
            console.error(`Error updating chart ${chartKey}:`, error);
            return false;
        }
    }

    /**
     * Exporta una gráfica como imagen
     */
    async exportChart(chartKey, options = {}) {
        const chartInstance = this.getChart(chartKey);
        if (!chartInstance) {
            throw new Error(`Chart ${chartKey} not available for export`);
        }

        const defaultOptions = {
            pixelRatio: 2,
            scale: 2
        };

        const exportOptions = { ...defaultOptions, ...options };

        try {
            const dataURL = await chartInstance.dataURI(exportOptions);
            console.log(`Chart ${chartKey} exported successfully`);
            return dataURL;
        } catch (error) {
            console.error(`Error exporting chart ${chartKey}:`, error);
            throw error;
        }
    }

    /**
     * Exporta todas las gráficas como imágenes
     */
    async exportAllCharts(options = {}) {
        const charts = this.getAllCharts();
        const exportPromises = Object.entries(charts).map(async ([key, chart]) => {
            try {
                const dataURL = await this.exportChart(key, options);
                return { key, dataURL, success: true };
            } catch (error) {
                console.error(`Failed to export chart ${key}:`, error);
                return { key, error: error.message, success: false };
            }
        });

        const results = await Promise.allSettled(exportPromises);
        
        const exports = results.map(result => 
            result.status === 'fulfilled' ? result.value : result.reason
        );

        const successful = exports.filter(e => e.success);
        const failed = exports.filter(e => !e.success);

        console.log(`Chart export completed: ${successful.length} successful, ${failed.length} failed`);
        
        return {
            successful: successful,
            failed: failed,
            total: exports.length
        };
    }

    /**
     * Destruye una gráfica específica
     */
    destroyChart(chartKey) {
        const chart = this.charts[chartKey];
        if (chart) {
            try {
                chart.destroy();
                console.log(`Chart ${chartKey} destroyed`);
                return true;
            } catch (error) {
                console.error(`Error destroying chart ${chartKey}:`, error);
                return false;
            }
        }
        return false;
    }

    /**
     * Destruye todas las gráficas
     */
    destroyAll() {
        console.log('Destroying all charts...');
        
        let destroyedCount = 0;
        Object.entries(this.charts).forEach(([key, chart]) => {
            try {
                chart.destroy();
                destroyedCount++;
            } catch (error) {
                console.error(`Error destroying chart ${key}:`, error);
            }
        });

        console.log(`${destroyedCount}/${Object.keys(this.charts).length} charts destroyed`);
        
        // Limpiar cola de renderizado
        this.renderQueue = [];
        this.isRendering = false;
    }

    /**
     * Reinicia el servicio de gráficas
     */
    reset() {
        this.destroyAll();
        this.isInitialized = false;
        this.charts = {};
        console.log('ChartService reset completed');
    }

    /**
     * Obtiene el estado del servicio
     */
    getServiceStatus() {
        const chartStatus = {};
        
        Object.entries(this.charts).forEach(([key, chart]) => {
            const container = document.getElementById(chart.containerId);
            const chartInstance = chart.getChart();
            
            chartStatus[key] = {
                containerExists: !!container,
                containerVisible: container ? utilityService.isElementVisible(container) : false,
                chartRendered: !!chartInstance,
                hasData: chartInstance ? !!chartInstance.w?.config?.series : false
            };
        });

        return {
            isInitialized: this.isInitialized,
            isRendering: this.isRendering,
            queueLength: this.renderQueue.length,
            charts: chartStatus,
            totalCharts: Object.keys(this.charts).length
        };
    }

    /**
     * Verifica la salud del servicio
     */
    healthCheck() {
        const status = this.getServiceStatus();
        const issues = [];

        if (!status.isInitialized) {
            issues.push('Service not initialized');
        }

        Object.entries(status.charts).forEach(([key, chartStatus]) => {
            if (!chartStatus.containerExists) {
                issues.push(`Missing container for ${key}`);
            }
            if (!chartStatus.containerVisible) {
                issues.push(`Container for ${key} is not visible`);
            }
        });

        const healthy = issues.length === 0;
        
        console.log(`ChartService health check: ${healthy ? 'HEALTHY' : 'ISSUES FOUND'}`);
        if (!healthy) {
            console.warn('Chart service issues:', issues);
        }

        return {
            healthy,
            issues,
            status
        };
    }
}

// Event listeners para redimensionamiento
if (typeof window !== 'undefined') {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (chartService && chartService.isInitialized) {
                chartService.resizeAll();
            }
        }, 250);
    });

    // Listener para cambios de orientación en móviles
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (chartService && chartService.isInitialized) {
                chartService.resizeAll();
            }
        }, 500);
    });
}

export const chartService = new ChartService();