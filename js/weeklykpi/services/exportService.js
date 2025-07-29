/**
 * Export Service for Weekly Performance Dashboard
 */

import { dataService } from './dataService.js';
import { chartService } from './chartService.js';
import { utilityService } from '../utils/utilities.js';
import { uiService } from './uiService.js';
import { config } from '../config/weeklyConfig.js';

class ExportService {
    constructor() {
        this.isInitialized = false;
        this.isExporting = false;
        this.exportFormats = {
            excel: { enabled: false, library: 'XLSX' },
            pdf: { enabled: false, library: 'jsPDF' },
            print: { enabled: true, library: 'native' }
        };
    }

    initialize() {
        console.log('Initializing ExportService...');
        
        try {
            this.checkLibraryAvailability();
            this.initializeExportButtons();
            this.isInitialized = true;
            console.log('ExportService initialized successfully');
        } catch (error) {
            console.error('Error initializing ExportService:', error);
            throw error;
        }
    }

    /**
     * Verifica la disponibilidad de bibliotecas de exportación
     */
    checkLibraryAvailability() {
        // Verificar XLSX
        this.exportFormats.excel.enabled = typeof XLSX !== 'undefined';
        
        // Verificar jsPDF
        this.exportFormats.pdf.enabled = typeof window.jspdf !== 'undefined' && 
                                          typeof window.jspdf.jsPDF !== 'undefined';
        
        console.log('Export library availability:', this.exportFormats);
    }

    /**
     * Inicializa los botones de exportación
     */
    initializeExportButtons() {
        const exportButtons = [
            { 
                id: 'exportExcel', 
                handler: () => this.exportToExcel(), 
                icon: 'fa-file-excel', 
                text: 'Excel',
                enabled: this.exportFormats.excel.enabled
            },
            { 
                id: 'exportPDF', 
                handler: () => this.exportToPDF(), 
                icon: 'fa-file-pdf', 
                text: 'PDF',
                enabled: this.exportFormats.pdf.enabled
            },
            { 
                id: 'printReport', 
                handler: () => this.printReport(), 
                icon: 'fa-print', 
                text: 'Imprimir',
                enabled: this.exportFormats.print.enabled
            }
        ];

        exportButtons.forEach(button => {
            // Usar delegación de eventos para botones generados dinámicamente
            document.addEventListener('click', (e) => {
                if (e.target.id === button.id || e.target.closest(`#${button.id}`)) {
                    e.preventDefault();
                    if (button.enabled && !this.isExporting) {
                        button.handler();
                    } else if (!button.enabled) {
                        this.showLibraryError(button.text);
                    }
                }
            });
        });

        console.log('Export buttons initialized successfully');
    }

    /**
     * Muestra error cuando una biblioteca no está disponible
     */
    showLibraryError(format) {
        uiService.showErrorMessage(
            `La función de exportación a ${format} no está disponible. Verifique que las bibliotecas necesarias estén cargadas.`,
            'Función No Disponible'
        );
    }

    /**
     * Prepara los datos para exportación a Excel con múltiples hojas
     */
    prepareExcelData() {
        const weeklyData = dataService.getWeeklyData();
        if (!weeklyData) {
            throw new Error('No hay datos semanales disponibles para exportar');
        }

        const exportData = {};
        const currentWeek = dataService.getCurrentWeek();
        
        // Hoja 1: Resumen General
        exportData['Resumen General'] = {
            title: `Resumen Semanal - Semana ${currentWeek.weekNumber} de ${currentWeek.year}`,
            headers: ['Métrica', 'Valor', 'Descripción'],
            data: [
                ['Total Generadas', weeklyData.total_generated || 0, 'Solicitudes generadas en la semana'],
                ['Total Pendientes', weeklyData.total_pending || 0, 'Solicitudes pendientes de aprobación'],
                ['Total Aprobadas', weeklyData.total_approved || 0, 'Solicitudes aprobadas'],
                ['Total Rechazadas', weeklyData.total_rejected || 0, 'Solicitudes rechazadas'],
                ['Tasa de Aprobación (%)', (weeklyData.approval_rate || 0).toFixed(1), 'Porcentaje de aprobación'],
                ['Costo Total (€)', (weeklyData.total_cost || 0).toFixed(2), 'Costo total de solicitudes aprobadas'],
                ['Tiempo Promedio Aprobación', weeklyData.average_approval_time || 'N/A', 'Tiempo promedio de aprobación'],
                ['Usuario Más Activo', weeklyData.top_requesting_user?.name || 'N/A', 'Usuario con más solicitudes'],
                ['Área Principal', weeklyData.top_spending_area?.area || 'N/A', 'Área con mayor gasto'],
                ['Aprobador Más Lento', weeklyData.slowest_approver?.name || 'N/A', 'Aprobador con mayor tiempo promedio']
            ]
        };
        
        // Hoja 2: Top Performers
        if (weeklyData.top_performers && weeklyData.top_performers.length > 0) {
            exportData['Top Performers'] = {
                title: 'Top Performers por Solicitudes Aprobadas',
                headers: ['Posición', 'Nombre Usuario', 'Solicitudes Aprobadas', 'Costo Total (€)', 'Promedio por Solicitud (€)'],
                data: weeklyData.top_performers.map((performer, index) => {
                    const totalCost = parseFloat(performer.total_cost) || 0;
                    const requests = parseInt(performer.approved_requests) || 0;
                    const avgPerRequest = requests > 0 ? (totalCost / requests) : 0;
                    
                    return [
                        index + 1,
                        performer.name || 'N/A',
                        requests,
                        totalCost.toFixed(2),
                        avgPerRequest.toFixed(2)
                    ];
                })
            };
        }
        
        // Hoja 3: Rendimiento por Área
        if (weeklyData.area_performance && weeklyData.area_performance.length > 0) {
            exportData['Rendimiento por Área'] = {
                title: 'Rendimiento por Área de Negocio',
                headers: ['Área', 'Total Solicitudes', 'Costo Total (€)', 'Promedio por Solicitud (€)', '% del Total'],
                data: weeklyData.area_performance.map(area => {
                    const totalCost = parseFloat(area.total_cost) || 0;
                    const requests = parseInt(area.total_requests) || 0;
                    const avgPerRequest = requests > 0 ? (totalCost / requests) : 0;
                    const totalOverall = weeklyData.total_cost || 0;
                    const percentage = totalOverall > 0 ? ((totalCost / totalOverall) * 100) : 0;
                    
                    return [
                        area.area_name || 'N/A',
                        requests,
                        totalCost.toFixed(2),
                        avgPerRequest.toFixed(2),
                        percentage.toFixed(1) + '%'
                    ];
                })
            };
        }
        
        // Hoja 4: Distribución de Tiempos de Aprobación
        if (weeklyData.approval_times_distribution && weeklyData.approval_times_distribution.length > 0) {
            const totalRequests = weeklyData.approval_times_distribution.reduce((sum, item) => sum + parseInt(item.count), 0);
            
            exportData['Tiempos de Aprobación'] = {
                title: 'Distribución de Tiempos de Aprobación',
                headers: ['Categoría de Tiempo', 'Cantidad', 'Porcentaje (%)', 'Horas Promedio'],
                data: weeklyData.approval_times_distribution.map(timeData => {
                    const count = parseInt(timeData.count) || 0;
                    const percentage = totalRequests > 0 ? ((count / totalRequests) * 100) : 0;
                    
                    return [
                        timeData.time_category || 'N/A',
                        count,
                        percentage.toFixed(1),
                        timeData.avg_hours || 'N/A'
                    ];
                })
            };
        }
        
        // Hoja 5: Análisis de Costos Diarios
        if (weeklyData.daily_costs && weeklyData.daily_costs.length > 0) {
            exportData['Costos Diarios'] = {
                title: 'Análisis de Costos Diarios (Solo Órdenes Aprobadas)',
                headers: ['Fecha', 'Costo Diario (€)', 'Número de Órdenes', 'Promedio por Orden (€)', 'Día de la Semana'],
                data: weeklyData.daily_costs.map(dailyData => {
                    const cost = parseFloat(dailyData.daily_cost) || 0;
                    const count = parseInt(dailyData.daily_count) || 0;
                    const avgPerOrder = count > 0 ? (cost / count) : 0;
                    const date = new Date(dailyData.approval_date);
                    const dayOfWeek = date.toLocaleDateString('es-MX', { weekday: 'long' });
                    
                    return [
                        dailyData.approval_date || 'N/A',
                        cost.toFixed(2),
                        count,
                        avgPerOrder.toFixed(2),
                        dayOfWeek
                    ];
                })
            };
        }
        
        // Hoja 6: Tendencias Diarias (si está disponible)
        if (weeklyData.daily_trends && weeklyData.daily_trends.length > 0) {
            exportData['Tendencias Diarias'] = {
                title: 'Tendencias Diarias de Solicitudes',
                headers: ['Fecha', 'Generadas', 'Aprobadas', 'Rechazadas', 'Pendientes', 'Tasa Aprobación (%)'],
                data: weeklyData.daily_trends.map(trend => {
                    const generated = parseInt(trend.generated) || 0;
                    const approved = parseInt(trend.approved) || 0;
                    const rejected = parseInt(trend.rejected) || 0;
                    const pending = parseInt(trend.pending) || 0;
                    const total = approved + rejected;
                    const approvalRate = total > 0 ? ((approved / total) * 100) : 0;
                    
                    return [
                        trend.date || trend.date_label || 'N/A',
                        generated,
                        approved,
                        rejected,
                        pending,
                        approvalRate.toFixed(1)
                    ];
                })
            };
        }
        
        return exportData;
    }

    /**
     * Exporta los datos a Excel con múltiples hojas
     */
    async exportToExcel() {
        if (!this.exportFormats.excel.enabled) {
            this.showLibraryError('Excel');
            return;
        }

        if (this.isExporting) {
            console.log('Export already in progress');
            return;
        }

        this.isExporting = true;

        try {
            const weeklyData = dataService.getWeeklyData();
            if (!weeklyData) {
                throw new Error('No hay datos disponibles para exportar');
            }

            // Mostrar indicador de progreso
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Generando Archivo Excel',
                    html: `
                        <div class="text-center">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p>Preparando archivo con múltiples hojas...</p>
                            <small class="text-muted">Esto puede tomar unos momentos</small>
                        </div>
                    `,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    didOpen: () => Swal.showLoading()
                });
            }

            const workbook = XLSX.utils.book_new();
            const exportDate = new Date().toISOString().slice(0, 10);
            const exportData = this.prepareExcelData();
            const currentWeek = dataService.getCurrentWeek();
            const selectedPlant = dataService.getSelectedPlant();

            // Crear hojas del workbook
            let sheetCount = 0;
            for (const [sheetKey, sheetData] of Object.entries(exportData)) {
                try {
                    const sheetName = this.sanitizeSheetName(sheetKey);
                    
                    // Crear datos de la hoja
                    const worksheetData = [
                        [sheetData.title],
                        [`Período: ${currentWeek.start.format('DD/MM/YYYY')} - ${currentWeek.end.format('DD/MM/YYYY')}`],
                        selectedPlant ? [`Planta: ${selectedPlant}`] : ['Todas las plantas'],
                        [`Generado: ${new Date().toLocaleString('es-MX')}`],
                        [], // Fila vacía
                        sheetData.headers,
                        ...sheetData.data
                    ];
                    
                    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
                    
                    // Aplicar estilos básicos
                    this.applyExcelStyles(worksheet, sheetData.headers.length);
                    
                    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
                    sheetCount++;
                    
                } catch (sheetError) {
                    console.error(`Error creating sheet ${sheetKey}:`, sheetError);
                }
            }

            if (sheetCount === 0) {
                throw new Error('No se pudieron crear hojas de datos');
            }

            // Generar nombre de archivo
            const plantSuffix = selectedPlant ? `_${selectedPlant.replace(/[^a-zA-Z0-9]/g, '')}` : '';
            const fileName = `Rendimiento_Semanal_S${currentWeek.weekNumber}_${currentWeek.year}${plantSuffix}_${exportDate}.xlsx`;

            // Guardar archivo
            XLSX.writeFile(workbook, fileName);

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Exportación Exitosa',
                    html: `
                        <p><strong>Archivo generado:</strong> ${fileName}</p>
                        <p>El archivo Excel con <strong>${sheetCount} hojas</strong> ha sido descargado exitosamente.</p>
                    `,
                    timer: 5000,
                    showConfirmButton: true
                });
            }

            console.log(`Excel export completed: ${fileName} with ${sheetCount} sheets`);

        } catch (error) {
            console.error('Excel export error:', error);
            if (typeof Swal !== 'undefined') {
                Swal.close();
            }
            uiService.showErrorMessage('Error al exportar a Excel: ' + error.message);
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Sanitiza nombre de hoja para Excel
     */
    sanitizeSheetName(name) {
        return name
            .replace(/[:\\/?*[\]]/g, '')
            .substring(0, 31);
    }

    /**
     * Aplica estilos básicos a la hoja de Excel
     */
    applyExcelStyles(worksheet, headerCount) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // Estilo para el título (fila 1)
        if (worksheet['A1']) {
            worksheet['A1'].s = {
                font: { bold: true, size: 16, color: { rgb: '034C8C' } },
                alignment: { horizontal: 'center' },
                fill: { fgColor: { rgb: 'E6F3FF' } }
            };
        }

        // Estilo para los headers (fila 6)
        for (let col = 0; col < headerCount; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 5, c: col }); // Fila 6 (índice 5)
            if (worksheet[cellAddress]) {
                worksheet[cellAddress].s = {
                    font: { bold: true, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: '034C8C' } },
                    alignment: { horizontal: 'center' },
                    border: {
                        top: { style: 'thin', color: { rgb: '000000' } },
                        bottom: { style: 'thin', color: { rgb: '000000' } },
                        left: { style: 'thin', color: { rgb: '000000' } },
                        right: { style: 'thin', color: { rgb: '000000' } }
                    }
                };
            }
        }

        // Establecer ancho de columnas automático
        const colWidths = [];
        for (let col = 0; col <= range.e.c; col++) {
            let maxWidth = 10;
            for (let row = 0; row <= range.e.r; row++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];
                if (cell && cell.v) {
                    const width = cell.v.toString().length;
                    maxWidth = Math.max(maxWidth, width);
                }
            }
            colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
        }
        worksheet['!cols'] = colWidths;
    }

    /**
     * Exporta todas las gráficas a PDF
     */
    async exportToPDF() {
        if (!this.exportFormats.pdf.enabled) {
            this.showLibraryError('PDF');
            return;
        }

        if (this.isExporting) {
            console.log('Export already in progress');
            return;
        }

        this.isExporting = true;

        try {
            const weeklyData = dataService.getWeeklyData();
            if (!weeklyData) {
                throw new Error('No hay datos disponibles para exportar');
            }

            // Mostrar indicador de progreso
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Generando PDF',
                    html: `
                        <div class="text-center">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p>Preparando gráficas para exportación...</p>
                            <small class="text-muted">Esto puede tomar unos segundos</small>
                        </div>
                    `,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    didOpen: () => Swal.showLoading()
                });
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'pt',
                format: 'a4'
            });

            const chartElements = [
                { id: 'trendsChart', title: 'Análisis de Tendencias Semanales', chartKey: 'trends' },
                { id: 'statusChart', title: 'Distribución por Estado', chartKey: 'status' },
                { id: 'topPerformersChart', title: 'Top Performers por Solicitudes Aprobadas', chartKey: 'topPerformers' },
                { id: 'areaPerformanceChart', title: 'Rendimiento por Área (Órdenes Aprobadas)', chartKey: 'areaPerformance' },
                { id: 'approvalTimesChart', title: 'Distribución de Tiempos de Aprobación', chartKey: 'approvalTimes' },
                { id: 'costAnalysisChart', title: 'Análisis de Costos Diarios (Órdenes Aprobadas)', chartKey: 'costAnalysis' }
            ];

            let isFirstPage = true;
            let exportedCharts = 0;
            let skippedCharts = 0;
            const currentWeek = dataService.getCurrentWeek();
            const selectedPlant = dataService.getSelectedPlant();

            // Exportar cada gráfica
            for (const chartInfo of chartElements) {
                try {
                    const chartInstance = chartService.getChart(chartInfo.chartKey);
                    
                    if (!chartInstance) {
                        console.warn(`Chart ${chartInfo.id} not found`);
                        skippedCharts++;
                        continue;
                    }

                    // Esperar a que la gráfica esté lista
                    const isReady = await this.waitForChartReady(chartInfo.id, chartInstance, 5000);
                    if (!isReady) {
                        console.warn(`Chart ${chartInfo.id} not ready for export`);
                        skippedCharts++;
                        continue;
                    }

                    // Exportar imagen de la gráfica
                    const imageDataURL = await this.getChartImage(chartInstance);
                    if (!imageDataURL) {
                        console.warn(`Failed to get image for chart ${chartInfo.id}`);
                        skippedCharts++;
                        continue;
                    }

                    // Agregar nueva página si no es la primera
                    if (!isFirstPage) {
                        pdf.addPage();
                    }

                    // Información del encabezado
                    const weekInfo = `Semana ${currentWeek.weekNumber} de ${currentWeek.year} (${currentWeek.start.format('DD/MM')} - ${currentWeek.end.format('DD/MM/YYYY')})`;
                    const plantInfo = selectedPlant ? ` - Planta: ${selectedPlant}` : '';
                    
                    // Título de la gráfica
                    pdf.setFontSize(18);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(chartInfo.title, 40, 40);
                    
                    // Información de la semana
                    pdf.setFontSize(12);
                    pdf.setFont(undefined, 'normal');
                    pdf.text(weekInfo + plantInfo, 40, 65);

                    // Agregar imagen de la gráfica
                    const imgWidth = 750;
                    const imgHeight = 400;
                    pdf.addImage(imageDataURL, 'PNG', 40, 90, imgWidth, imgHeight);

                    // Pie de página
                    pdf.setFontSize(10);
                    pdf.text(`Generado el ${new Date().toLocaleDateString('es-MX')} - Página ${exportedCharts + 1}`, 40, 550);

                    exportedCharts++;
                    isFirstPage = false;

                } catch (chartError) {
                    console.error(`Error exporting chart ${chartInfo.id}:`, chartError);
                    skippedCharts++;
                }
            }

            if (exportedCharts === 0) {
                throw new Error('No se pudieron exportar gráficas');
            }

            // Generar nombre de archivo y guardar
            const plantSuffix = selectedPlant ? `_${selectedPlant.replace(/[^a-zA-Z0-9]/g, '')}` : '';
            const fileName = `Graficas_Semanales_S${currentWeek.weekNumber}_${currentWeek.year}${plantSuffix}.pdf`;
            pdf.save(fileName);

            if (typeof Swal !== 'undefined') {
                const message = exportedCharts === chartElements.length 
                    ? `PDF con ${exportedCharts} gráficas generado exitosamente.`
                    : `PDF con ${exportedCharts} gráficas generado. ${skippedCharts} gráficas fueron omitidas.`;
                    
                Swal.fire({
                    title: 'Exportación Exitosa',
                    html: `<p><strong>Archivo:</strong> ${fileName}</p><p>${message}</p>`,
                    icon: exportedCharts === chartElements.length ? 'success' : 'info',
                    timer: 5000,
                    showConfirmButton: true
                });
            }

            console.log(`PDF export completed: ${fileName} with ${exportedCharts} charts`);

        } catch (error) {
            console.error('PDF export error:', error);
            if (typeof Swal !== 'undefined') {
                Swal.close();
            }
            uiService.showErrorMessage('Error al exportar a PDF: ' + error.message);
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Verifica si una gráfica está lista para exportar
     */
    isChartReady(chartId, chartObj) {
        const container = document.getElementById(chartId);
        
        if (!container || !utilityService.isElementVisible(container)) {
            return false;
        }
        
        if (!chartObj || typeof chartObj.dataURI !== 'function') {
            return false;
        }
        
        const svg = container.querySelector('svg');
        if (!svg) {
            return false;
        }
        
        const width = svg.getAttribute('width');
        const height = svg.getAttribute('height');
        
        return width && height && width !== 'NaN' && height !== 'NaN' && width !== '0' && height !== '0';
    }

    /**
     * Espera a que una gráfica esté lista para exportar
     */
    waitForChartReady(chartId, chartObj, maxWait = 5000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const checkReady = () => {
                if (this.isChartReady(chartId, chartObj)) {
                    resolve(true);
                    return;
                }
                
                if (Date.now() - startTime > maxWait) {
                    console.warn(`Chart ${chartId} not ready after ${maxWait}ms`);
                    resolve(false);
                    return;
                }
                
                setTimeout(checkReady, 200);
            };
            
            checkReady();
        });
    }

    /**
     * Obtiene la imagen de una gráfica
     */
    async getChartImage(chartObj) {
        const exportOptions = [
            { pixelRatio: 2, scale: 2 },
            { pixelRatio: 1, scale: 1 },
            {}
        ];
        
        for (const option of exportOptions) {
            try {
                const dataURL = await chartObj.dataURI(option);
                if (dataURL && dataURL.length > 100 && dataURL.startsWith('data:image')) {
                    return dataURL;
                }
            } catch (optionError) {
                console.warn('Chart image export option failed:', optionError);
            }
        }
        
        console.error('All chart image export options failed');
        return null;
    }

    /**
     * Imprime el reporte actual
     */
    printReport() {
        try {
            // Ocultar elementos no necesarios para impresión
            this.preparePageForPrint();
            
            // Ejecutar impresión
            window.print();
            
            // Restaurar elementos después de un breve delay
            setTimeout(() => {
                this.restorePageAfterPrint();
            }, 500);
            
            console.log('Print dialog opened');
            
        } catch (error) {
            console.error('Print error:', error);
            uiService.showErrorMessage('Error al imprimir: ' + error.message);
        }
    }

    /**
     * Prepara la página para impresión
     */
    preparePageForPrint() {
        // Agregar clase CSS para ocultar elementos no imprimibles
        document.body.classList.add('printing');
        
        // Ocultar elementos específicos
        const elementsToHide = [
            '.export-buttons',
            '.btn-refresh',
            '#loadingOverlay',
            '.week-nav-btn'
        ];
        
        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
                el.setAttribute('data-hidden-for-print', 'true');
            });
        });
    }

    /**
     * Restaura la página después de impresión
     */
    restorePageAfterPrint() {
        // Remover clase CSS
        document.body.classList.remove('printing');
        
        // Mostrar elementos ocultos
        const hiddenElements = document.querySelectorAll('[data-hidden-for-print="true"]');
        hiddenElements.forEach(el => {
            el.style.display = '';
            el.removeAttribute('data-hidden-for-print');
        });
    }

    /**
     * Obtiene el estado del servicio de exportación
     */
    getServiceStatus() {
        return {
            isInitialized: this.isInitialized,
            isExporting: this.isExporting,
            libraryStatus: this.exportFormats,
            hasData: !!dataService.getWeeklyData()
        };
    }

    /**
     * Reinicia el servicio
     */
    reset() {
        this.isExporting = false;
        console.log('ExportService reset completed');
    }
}

export const exportService = new ExportService();