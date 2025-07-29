/**
 * Export Service for Weekly Performance Dashboard
 */

import { dataService } from './dataService.js';
import { chartService } from './chartService.js';
import { utilityService } from '../utils/utilities.js';
import { uiService } from './uiService.js';

class ExportService {
    constructor() {
        this.isInitialized = false;
    }

    initialize() {
        this.initializeExportButtons();
        this.isInitialized = true;
    }

    /**
     * Inicializa los botones de exportación
     */
    initializeExportButtons() {
        const exportButtons = [
            { id: 'exportExcel', handler: () => this.exportToExcel(), icon: 'fa-file-excel', text: 'Excel' },
            { id: 'exportPDF', handler: () => this.exportToPDF(), icon: 'fa-file-pdf', text: 'PDF' },
            { id: 'printReport', handler: () => this.printReport(), icon: 'fa-print', text: 'Print' }
        ];

        exportButtons.forEach(button => {
            const btn = document.getElementById(button.id);
            if (btn) {
                btn.disabled = false;
                btn.onclick = button.handler;
                
                if (!btn.innerHTML.includes(button.icon)) {
                    btn.innerHTML = `<i class="fas ${button.icon} me-1"></i>${button.text}`;
                }
            }
        });

        console.log('Export buttons initialized successfully');
    }

    /**
     * Prepara los datos para exportación a Excel con múltiples hojas
     */
    prepareExcelData() {
        const weeklyData = dataService.getWeeklyData();
        if (!weeklyData) return {};

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
     * Exporta los datos a Excel con múltiples hojas
     */
    exportToExcel() {
        const weeklyData = dataService.getWeeklyData();
        if (!weeklyData) {
            uiService.showErrorMessage('No data available to export');
            return;
        }

        if (typeof XLSX === 'undefined') {
            uiService.showErrorMessage('Excel export library not loaded');
            return;
        }

        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Generando Excel',
                    html: 'Preparando archivo con múltiples hojas...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });
            }

            const workbook = XLSX.utils.book_new();
            const exportDate = new Date().toISOString().slice(0, 10);
            const exportData = this.prepareExcelData();
            const currentWeek = dataService.getCurrentWeek();

            for (const [sheetKey, sheetData] of Object.entries(exportData)) {
                const sheetName = sheetKey.replace(/[:\\/?*[\]]/g, '').substring(0, 31);
                
                const worksheetData = [
                    [sheetData.title],
                    [],
                    sheetData.headers,
                    ...sheetData.data
                ];
                
                const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
                
                if (worksheet['A1']) {
                    worksheet['A1'].s = {
                        font: { bold: true, size: 14 },
                        alignment: { horizontal: 'center' }
                    };
                }
                
                const headerRow = 3;
                sheetData.headers.forEach((header, colIndex) => {
                    const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c: colIndex });
                    if (worksheet[cellAddress]) {
                        worksheet[cellAddress].s = {
                            font: { bold: true },
                            fill: { fgColor: { rgb: 'E6E6FA' } }
                        };
                    }
                });
                
                XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            }

            if (workbook.SheetNames.length === 0) {
                throw new Error('No data sheets were created');
            }

            const fileName = `Weekly-Performance-${currentWeek.weekNumber}-${currentWeek.year}_${exportDate}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Export Successful',
                    text: `Excel file with ${workbook.SheetNames.length} sheets has been downloaded!`,
                    timer: 3000
                });
            }

        } catch (error) {
            console.error('Export error:', error);
            if (typeof Swal !== 'undefined') {
                Swal.close();
            }
            uiService.showErrorMessage('Error exporting to Excel: ' + error.message);
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
        
        if (!width || !height || width === 'NaN' || height === 'NaN' || width === '0' || height === '0') {
            return false;
        }
        
        return true;
    }

    /**
     * Espera a que una gráfica esté lista
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
                
                setTimeout(checkReady, 100);
            };
            
            checkReady();
        });
    }

    /**
     * Obtiene la imagen de una gráfica
     */
    async getChartImage(chartObj) {
        try {
            const options = [
                { pixelRatio: 2, scale: 2 },
                { pixelRatio: 1, scale: 1 },
                {}
            ];
            
            for (const option of options) {
                try {
                    const dataURL = await chartObj.dataURI(option);
                    if (dataURL && dataURL.length > 100) {
                        return dataURL;
                    }
                } catch (optionError) {
                    console.warn('Chart image option failed:', optionError);
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting chart image:', error);
            return null;
        }
    }

    /**
     * Exporta todas las gráficas a PDF
     */
    async exportToPDF() {
        if (typeof window.jspdf === 'undefined') {
            uiService.showErrorMessage('PDF library not available. Please try again or contact support.');
            return;
        }

        const weeklyData = dataService.getWeeklyData();
        if (!weeklyData) {
            uiService.showErrorMessage('No data available to export');
            return;
        }

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Generando PDF',
                html: 'Preparando gráficas para exportación...<br><div class="mt-2"><small>Esto puede tomar unos segundos</small></div>',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
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
            const currentWeek = dataService.getCurrentWeek();

            for (const chartInfo of chartElements) {
                try {
                    const chartObj = chartService.getChart(chartInfo.chartKey);
                    
                    if (!chartObj) {
                        console.warn(`Chart ${chartInfo.id} not found`);
                        skippedCharts++;
                        continue;
                    }

                    const isReady = await this.waitForChartReady(chartInfo.id, chartObj, 3000);
                    if (!isReady) {
                        console.warn(`Chart ${chartInfo.id} not ready for export`);
                        skippedCharts++;
                        continue;
                    }

                    const imageDataURL = await this.getChartImage(chartObj);
                    if (!imageDataURL) {
                        console.warn(`Failed to get image for chart ${chartInfo.id}`);
                        skippedCharts++;
                        continue;
                    }

                    if (!isFirstPage) {
                        pdf.addPage();
                    }

                    const weekInfo = `Week ${currentWeek.weekNumber} of ${currentWeek.year} (${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD, YYYY')})`;
                    
                    pdf.setFontSize(16);
                    pdf.text(chartInfo.title, 40, 40);
                    
                    pdf.setFontSize(10);
                    pdf.text(weekInfo, 40, 60);

                    const imgWidth = 750;
                    const imgHeight = 400;
                    pdf.addImage(imageDataURL, 'PNG', 40, 80, imgWidth, imgHeight);

                    exportedCharts++;
                    isFirstPage = false;

                } catch (chartError) {
                    console.error(`Error exporting chart ${chartInfo.id}:`, chartError);
                    skippedCharts++;
                }
            }

            if (exportedCharts === 0) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'No Charts Exported',
                        text: 'No charts were available for export. Please ensure charts are loaded properly.',
                    });
                }
                return;
            }

            const fileName = `Weekly-Performance-Charts-W${currentWeek.weekNumber}-${currentWeek.year}.pdf`;
            pdf.save(fileName);

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
                uiService.showErrorMessage('Error exporting to PDF: ' + error.message);
            }
        }
    }

    /**
     * Imprime el reporte
     */
    printReport() {
        window.print();
    }
}

export const exportService = new ExportService();