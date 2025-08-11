/**
 * EXPORT.JS - FUNCIONES DE EXPORTACIÓN
 * Este módulo maneja todas las funciones de exportación:
 * Excel con múltiples hojas, PDF con múltiples páginas, e impresión.
 */

import { getWeeklyData, getCurrentWeek, getSelectedPlant, getCharts, EXPORT_CONFIG } from './config.js';
import { formatNumber, showErrorMessage, showSuccessMessage, addEventListenerSafe } from './utils.js';
import { waitForChartReady, getChartImage } from './charts.js';

// ========================================================================
// INICIALIZACIÓN DE BOTONES DE EXPORTACIÓN
// ========================================================================

/**
 * Inicializa todos los botones de exportación
 */
export function initializeExportButtons() {
    const exportButtons = [
        { id: 'exportExcel', handler: exportToExcel, icon: 'fa-file-excel', text: 'Excel' },
        { id: 'exportPDF', handler: exportToPDF, icon: 'fa-file-pdf', text: 'PDF' },
        { id: 'printReport', handler: printReport, icon: 'fa-print', text: 'Print' }
    ];

    exportButtons.forEach(button => {
        const element = document.getElementById(button.id);
        if (element) {
            // Limpiar listeners anteriores
            element.removeEventListener('click', button.handler);
            addEventListenerSafe(element, 'click', button.handler);
            
            // Habilitar botón
            element.disabled = false;
            
            // Actualizar texto e icono si es necesario
            if (!element.innerHTML.includes(button.icon)) {
                element.innerHTML = `<i class="fas ${button.icon} me-1"></i>${button.text}`;
            }
            
            // Agregar tooltip
            element.title = getButtonTooltip(button.id);
        }
    });

    console.log('Export buttons initialized successfully');
}

/**
 * Obtiene el tooltip para cada botón
 */
function getButtonTooltip(buttonId) {
    const tooltips = {
        exportExcel: 'Export data to Excel with multiple sheets for each dataset',
        exportPDF: 'Export all charts to PDF with individual pages for each chart',
        printReport: 'Print the current dashboard view'
    };
    return tooltips[buttonId] || '';
}

/**
 * Asigna event listeners a los botones de exportación (función legacy para compatibilidad)
 */
export function assignExportButtonListeners() {
    initializeExportButtons();
}

// ========================================================================
// EXPORTACIÓN A EXCEL
// ========================================================================

/**
 * Exporta los datos a Excel con múltiples hojas
 */
export async function exportToExcel() {
    const weeklyData = getWeeklyData();
    if (!weeklyData) {
        showErrorMessage('No data available to export');
        return;
    }

    if (typeof XLSX === 'undefined') {
        showErrorMessage('Excel export library not loaded');
        return;
    }

    try {
        // Mostrar loading
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
        const exportData = prepareExcelData(weeklyData);

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
            
            // Aplicar formato básico
            applyExcelFormatting(worksheet, sheetData.headers.length);
            
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }

        if (workbook.SheetNames.length === 0) {
            if (typeof Swal !== 'undefined') Swal.close();
            showErrorMessage("No chart data available to export. Please ensure data is loaded.");
            return;
        }

        // Guardar archivo
        const fileName = generateExcelFileName();
        XLSX.writeFile(workbook, fileName);

        // Mostrar éxito
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Export Successful',
                text: `Excel file with ${workbook.SheetNames.length} sheets has been downloaded`,
                icon: 'success',
                timer: 3000
            });
        } else {
            showSuccessMessage('Export Successful', `Excel file downloaded successfully`);
        }

    } catch (error) {
        console.error('Export error:', error);
        if (typeof Swal !== 'undefined') Swal.close();
        showErrorMessage('Error exporting to Excel: ' + error.message);
    }
}

/**
 * Prepara los datos para exportación a Excel
 */
function prepareExcelData(weeklyData) {
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
 * Aplica formato básico a las hojas de Excel
 */
function applyExcelFormatting(worksheet, headerCount) {
    // Formato para el título
    if (worksheet['A1']) {
        worksheet['A1'].s = {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'center' }
        };
    }
    
    // Formato para los headers
    const headerRow = 3;
    for (let col = 0; col < headerCount; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: headerRow - 1, c: col });
        if (worksheet[cellRef]) {
            worksheet[cellRef].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "034C8C" } }
            };
        }
    }
}

/**
 * Genera el nombre del archivo Excel
 */
function generateExcelFileName() {
    const currentWeek = getCurrentWeek();
    const exportDate = new Date().toISOString().slice(0, 10);
    return `${EXPORT_CONFIG.excel.filePrefix}-${currentWeek.weekNumber}-${currentWeek.year}_${exportDate}.xlsx`;
}

// ========================================================================
// EXPORTACIÓN A PDF
// ========================================================================

/**
 * Exporta todas las gráficas visibles a PDF
 */
export async function exportToPDF() {
    if (typeof window.jspdf === 'undefined') {
        showErrorMessage('PDF library not available. Please try again or contact support.');
        return;
    }

    const weeklyData = getWeeklyData();
    if (!weeklyData) {
        showErrorMessage('No data available to export');
        return;
    }

    // Mostrar loading
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
            orientation: EXPORT_CONFIG.pdf.orientation,
            unit: EXPORT_CONFIG.pdf.unit,
            format: EXPORT_CONFIG.pdf.format
        });

        const chartElements = getChartElementsForExport();
        let exportedCharts = 0;
        let skippedCharts = 0;
        let isFirstPage = true;

        for (const chartInfo of chartElements) {
            try {
                // Actualizar progreso
                updatePDFProgress(chartInfo.title, exportedCharts + skippedCharts + 1, chartElements.length);

                const result = await processChartForPDF(chartInfo, pdf, isFirstPage);
                
                if (result.success) {
                    exportedCharts++;
                    isFirstPage = false;
                } else {
                    skippedCharts++;
                    if (result.addErrorPage) {
                        addErrorPageToPDF(pdf, chartInfo.title, isFirstPage);
                        isFirstPage = false;
                    }
                }

            } catch (chartError) {
                console.error(`Error processing chart ${chartInfo.id}:`, chartError);
                skippedCharts++;
            }
        }

        // Verificar resultados y guardar
        await finalizePDFExport(pdf, exportedCharts, skippedCharts, chartElements.length);

    } catch (error) {
        console.error('PDF export error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Export Failed',
                text: 'There was an error generating the PDF. Please try again.'
            });
        } else {
            showErrorMessage('Error exporting to PDF: ' + error.message);
        }
    }
}

/**
 * Obtiene la lista de elementos de gráficas para exportar
 */
function getChartElementsForExport() {
    return [
        { id: 'trendsChart', title: 'Weekly Trends Analysis', chartKey: 'trends' },
        { id: 'statusChart', title: 'Status Distribution', chartKey: 'status' },
        { id: 'topPerformersChart', title: 'Top Performers by Approved Requests', chartKey: 'topPerformers' },
        { id: 'areaPerformanceChart', title: 'Area Performance (Approved Orders)', chartKey: 'areaPerformance' },
        { id: 'approvalTimesChart', title: 'Approval Time Distribution', chartKey: 'approvalTimes' },
        { id: 'costAnalysisChart', title: 'Daily Cost Analysis (Approved Orders)', chartKey: 'costAnalysis' }
    ];
}

/**
 * Procesa una gráfica individual para PDF
 */
async function processChartForPDF(chartInfo, pdf, isFirstPage) {
    const chartContainer = document.getElementById(chartInfo.id);
    const charts = getCharts();
    
    // Verificaciones básicas
    if (!chartContainer || chartContainer.style.display === 'none') {
        console.log(`Skipping chart ${chartInfo.id} - not visible or not found`);
        return { success: false, addErrorPage: false };
    }

    const chart = charts[chartInfo.chartKey];
    if (!chart) {
        console.log(`Skipping chart ${chartInfo.id} - chart object not found`);
        return { success: false, addErrorPage: false };
    }

    // Esperar a que la gráfica esté lista
    const isReady = await waitForChartReady(chartInfo.id, chart, 3000);
    if (!isReady) {
        console.warn(`Chart ${chartInfo.id} not ready for export`);
        return { success: false, addErrorPage: true };
    }

    // Obtener imagen
    const imageDataURL = await getChartImage(chart);
    if (!imageDataURL) {
        console.error(`Failed to get image for chart ${chartInfo.id}`);
        return { success: false, addErrorPage: true };
    }

    // Agregar al PDF
    addChartPageToPDF(pdf, chartInfo, imageDataURL, isFirstPage);
    return { success: true, addErrorPage: false };
}

/**
 * Agrega una página de gráfica al PDF
 */
function addChartPageToPDF(pdf, chartInfo, imageDataURL, isFirstPage) {
    if (!isFirstPage) {
        pdf.addPage();
    }

    // Agregar título
    addPDFHeader(pdf, chartInfo.title);

    // Calcular dimensiones y posición
    const { xPos, yPos, imgWidth, imgHeight } = calculatePDFImageDimensions(pdf, imageDataURL);

    // Agregar imagen
    pdf.addImage(imageDataURL, 'PNG', xPos, yPos, imgWidth, imgHeight, undefined, 'FAST');
    
    console.log(`Successfully exported chart: ${chartInfo.id}`);
}

/**
 * Agrega header al PDF
 */
function addPDFHeader(pdf, title) {
    const currentWeek = getCurrentWeek();
    const selectedPlant = getSelectedPlant();
    
    // Título principal
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 40, 30);
    
    // Información del período
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const weekInfo = `Week ${currentWeek.weekNumber} of ${currentWeek.year} (${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD, YYYY')})`;
    const plantInfo = selectedPlant ? ` - Plant: ${selectedPlant}` : '';
    pdf.text(weekInfo + plantInfo, 40, 50);
}

/**
 * Calcula las dimensiones de imagen para PDF
 */
function calculatePDFImageDimensions(pdf, imageDataURL) {
    const margin = 40;
    const topMargin = 70;
    const contentWidth = pdf.internal.pageSize.getWidth() - 2 * margin;
    const contentHeight = pdf.internal.pageSize.getHeight() - topMargin - margin;
    
    const imgProps = pdf.getImageProperties(imageDataURL);
    const aspectRatio = imgProps.width / imgProps.height;
    let imgWidth = contentWidth;
    let imgHeight = imgWidth / aspectRatio;

    if (imgHeight > contentHeight) {
        imgHeight = contentHeight;
        imgWidth = imgHeight * aspectRatio;
    }

    const xPos = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
    const yPos = topMargin + (contentHeight - imgHeight) / 2;

    return { xPos, yPos, imgWidth, imgHeight };
}

/**
 * Agrega página de error al PDF
 */
function addErrorPageToPDF(pdf, chartTitle, isFirstPage) {
    if (!isFirstPage) {
        pdf.addPage();
    }
    
    pdf.setFontSize(16);
    pdf.setTextColor(200, 0, 0);
    pdf.text(`Chart Export Error: ${chartTitle}`, 40, 60);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text('This chart could not be exported due to technical issues.', 40, 80);
    pdf.text('Please try refreshing the data and exporting again.', 40, 100);
}

/**
 * Actualiza el progreso de PDF
 */
function updatePDFProgress(chartTitle, current, total) {
    if (typeof Swal !== 'undefined') {
        Swal.update({
            html: `Processing chart: ${chartTitle}...<br><div class="mt-2"><small>Chart ${current} of ${total}</small></div>`
        });
    }
}

/**
 * Finaliza la exportación de PDF
 */
async function finalizePDFExport(pdf, exportedCharts, skippedCharts, totalCharts) {
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
                `
            });
        }
        return;
    }

    // Guardar PDF
    const fileName = generatePDFFileName();
    pdf.save(fileName);

    // Mostrar resultado
    const message = exportedCharts === totalCharts 
        ? `PDF with ${exportedCharts} charts has been downloaded successfully!`
        : `PDF with ${exportedCharts} charts downloaded. ${skippedCharts} charts were skipped.`;
        
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Export Successful',
            text: message,
            icon: exportedCharts === totalCharts ? 'success' : 'info',
            timer: 4000
        });
    } else {
        showSuccessMessage('Export Successful', message);
    }
}

/**
 * Genera el nombre del archivo PDF
 */
function generatePDFFileName() {
    const currentWeek = getCurrentWeek();
    return `${EXPORT_CONFIG.pdf.filePrefix}-W${currentWeek.weekNumber}-${currentWeek.year}.pdf`;
}

// ========================================================================
// FUNCIÓN DE IMPRESIÓN
// ========================================================================

/**
 * Imprime el reporte actual
 */
export function printReport() {
    // Aplicar estilos específicos para impresión si es necesario
    const printStyleId = 'print-styles';
    let printStyles = document.getElementById(printStyleId);
    
    if (!printStyles) {
        printStyles = document.createElement('style');
        printStyles.id = printStyleId;
        printStyles.textContent = `
            @media print {
                .kpis-export-buttons { display: none !important; }
                .week-nav-btn { display: none !important; }
                .btn { display: none !important; }
                .chart-card { break-inside: avoid; margin-bottom: 20px; }
                .metric-card { break-inside: avoid; }
            }
        `;
        document.head.appendChild(printStyles);
    }
    
    // Trigger print
    window.print();
    
    console.log('Print dialog opened');
}