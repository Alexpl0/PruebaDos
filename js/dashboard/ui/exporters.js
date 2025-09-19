/**
 * MÓDULO DE EXPORTACIÓN DE DATOS DEL DASHBOARD
 * Implementa la exportación a formatos avanzados como Excel (con múltiples hojas) y PDF.
 */

import { getDataTableButtons } from '../../dataTables.js';
import { charts, chartData } from '../configDashboard.js';

/**
 * Verifica si un elemento es visible en el DOM.
 */
function isElementVisible(el) {
    if (!el) return false;
    return el.offsetParent !== null;
}

/**
 * Obtiene datos del dashboard desde DataTables o variables globales
 */
function getDashboardDataForExport() {
    console.log('📊 [getDashboardDataForExport] Searching for dashboard data...');
    
    // Prioridad 1: Desde DataTable existente
    const possibleTableIds = ['#dashboardTable', '#totalHistoryTable', '#weeklyHistoryTable'];
    
    for (const tableId of possibleTableIds) {
        const table = $(tableId);
        if (table.length && $.fn.DataTable.isDataTable(table)) {
            console.log(`✅ Found DataTable: ${tableId}`);
            const tableData = table.DataTable().data().toArray();
            
            if (tableData.length > 0) {
                console.log(`📋 Using data from ${tableId}, rows: ${tableData.length}`);
                return convertDataTableToObjects(tableData);
            }
        }
    }
    
    // Prioridad 2: Variables globales
    const globalVars = [
        'dashboardOrdersData',
        'allOrdersData', 
        'filteredOrdersData',
        'weekOrders'
    ];
    
    for (const varName of globalVars) {
        if (window[varName] && Array.isArray(window[varName]) && window[varName].length > 0) {
            console.log(`✅ Using global variable: ${varName}, items: ${window[varName].length}`);
            return window[varName];
        }
    }
    
    console.warn('⚠️ No dashboard data found for export');
    return [];
}

/**
 * Convierte datos de DataTable (arrays) a objetos
 */
function convertDataTableToObjects(tableData) {
    // Reordenar headers según el nuevo orden solicitado
    const headers = ['id', 'planta', 'code_planta', 'date', 'in_out_bound', 
                    'recovery', 'reference', 'reference_number', 'creator_name', 'area', 
                    'description', 'category_cause', 'cost_euros', 'transport', 'carrier', 
                    'origin_company_name', 'origin_city', 'destiny_company_name', 
                    'destiny_city', 'status'];
    
    return tableData.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '-';
        });
        
        // Extraer valores numéricos para cost_euros
        if (obj.cost_euros && typeof obj.cost_euros === 'string') {
            const match = obj.cost_euros.match(/[\d,]+\.?\d*/);
            obj.cost_euros = match ? parseFloat(match[0].replace(',', '')) : 0;
        }
        
        return obj;
    });
}

/**
 * Exporta los datos de cada gráfica a un archivo Excel con múltiples hojas.
 */
export function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        console.error('❌ XLSX library not loaded');
        alert('Excel export library (SheetJS) is not loaded.');
        return;
    }

    console.log('📊 [exportToExcel] Starting Excel export...');
    
    const wb = XLSX.utils.book_new();
    const exportDate = new Date().toISOString().slice(0, 10);
    let sheetsAdded = 0;

    // Hoja 1: Datos del Dashboard/DataTable
    const dashboardData = getDashboardDataForExport();
    if (dashboardData && dashboardData.length > 0) {
        console.log(`📋 Adding orders sheet with ${dashboardData.length} orders`);
        
        // Reordenar headers según el nuevo orden: ID, Plant Name, Plant Code, Issue Date, Inbound/Outbound, Recovery, Reference, Reference Number, Creator, Area, Description, Category Cause, Cost [€], Transport, Carrier, Origin Company, Origin City, Destination Company, Destination City, Status
        const headers = ['ID', 'Plant Name', 'Plant Code', 'Issue Date', 'Inbound/Outbound', 
                        'Recovery', 'Reference', 'Reference Number', 'Creator', 'Area', 
                        'Description', 'Category Cause', 'Cost [€]', 'Transport', 'Carrier', 
                        'Origin Company', 'Origin City', 'Destination Company', 'Destination City', 'Status'];
        
        // Reordenar los datos según el nuevo orden
        const tableData = dashboardData.map(order => [
            order.id || '-', 
            order.planta || '-', 
            order.code_planta || '-', 
            order.date || '-',
            order.in_out_bound || '-', 
            order.recovery || '-',
            order.reference || '-',
            order.reference_number || '-', 
            order.creator_name || '-',
            order.area || '-', 
            order.description || '-', 
            order.category_cause || '-',
            order.cost_euros ? `€${parseFloat(order.cost_euros).toFixed(2)}` : '-',
            order.transport || '-', 
            order.carrier || '-',
            order.origin_company_name || '-', 
            order.origin_city || '-',
            order.destiny_company_name || '-', 
            order.destiny_city || '-',
            getOrderStatusText(order)
        ]);

        const dataToSheet = [headers, ...tableData];
        const ws = XLSX.utils.aoa_to_sheet(dataToSheet);
        
        // Ajustar ancho de columnas
        const colWidths = headers.map(() => ({ wch: 15 }));
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, 'Orders Data');
        sheetsAdded++;
    }

    // Hoja 2: Datos de gráficas (si existen)
    if (typeof chartData !== 'undefined') {
        for (const key in chartData) {
            if (Object.hasOwnProperty.call(chartData, key)) {
                const chartInfo = chartData[key];
                const sheetName = chartInfo.title.replace(/[:\\/?*[\]]/g, '').substring(0, 31);
                const dataToSheet = [chartInfo.headers, ...chartInfo.data];
                const ws = XLSX.utils.aoa_to_sheet(dataToSheet);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
                sheetsAdded++;
            }
        }
    }
    
    if (sheetsAdded === 0) {
        console.warn('⚠️ No data available for Excel export');
        alert("No data available to export. Please ensure data is loaded.");
        return;
    }
    
    const fileName = `Dashboard_Export_${exportDate}.xlsx`;
    console.log(`✅ Saving Excel file: ${fileName} with ${sheetsAdded} sheets`);
    XLSX.writeFile(wb, fileName);
    
    // Mostrar mensaje de éxito
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Export Successful',
            text: `Excel file exported with ${sheetsAdded} sheet(s)`,
            timer: 3000
        });
    }
}

/**
 * Función auxiliar para obtener el texto del status
 */
function getOrderStatusText(order) {
    const approvalStatus = parseInt(order.approval_status, 10);
    const requiredLevel = parseInt(order.required_auth_level, 10);

    if (isNaN(approvalStatus) || isNaN(requiredLevel)) {
        return 'Unknown';
    }
    if (approvalStatus === 99) {
        return 'Rejected';
    }
    if (approvalStatus >= requiredLevel) {
        return 'Approved';
    }
    return 'In Review';
}

/**
 * Exporta todas las gráficas visibles del dashboard a un único archivo PDF.
 */
export async function exportToPDF() {
    if (typeof jspdf === 'undefined') {
        console.error('❌ jsPDF library not loaded');
        alert('PDF export library (jsPDF) is not loaded.');
        return;
    }

    console.log('📄 [exportToPDF] Starting PDF export...');

    // Mostrar loading
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Generating PDF',
            html: 'Please wait while we prepare your file...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    try {
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4'
        });

        let isFirstPage = true;
        let chartsExported = 0;

        // Exportar gráficas si existen
        if (typeof charts !== 'undefined') {
            const chartKeys = Object.keys(charts);
            console.log(`📊 Found ${chartKeys.length} charts to export`);

            for (const key of chartKeys) {
                const chart = charts[key];
                
                if (!chart || typeof chart.dataURI !== 'function' || !isElementVisible(chart.el)) {
                    console.log(`⏭️ Skipping chart: ${key}`);
                    continue;
                }
                
                if (!isFirstPage) {
                    pdf.addPage();
                }

                try {
                    const title = chart.opts.title.text || chart.opts.chart.id || key;
                    pdf.setFontSize(16);
                    pdf.text(title, 40, 30);

                    const dataUrlObj = await chart.dataURI();
                    
                    const cleanDataURL = await new Promise(resolve => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            resolve(canvas.toDataURL('image/png'));
                        };
                        img.onerror = () => resolve(null);
                        img.src = dataUrlObj.imgURI;
                    });

                    if (!cleanDataURL) {
                        throw new Error("Failed to process chart image.");
                    }

                    const margin = 40;
                    const contentWidth = pdf.internal.pageSize.getWidth() - 2 * margin;
                    const contentHeight = pdf.internal.pageSize.getHeight() - 2 * margin;
                    const imgProps = pdf.getImageProperties(cleanDataURL);
                    const aspectRatio = imgProps.width / imgProps.height;
                    let imgWidth = contentWidth;
                    let imgHeight = imgWidth / aspectRatio;

                    if (imgHeight > contentHeight - 30) {
                        imgHeight = contentHeight - 30;
                        imgWidth = imgHeight * aspectRatio;
                    }

                    pdf.addImage(cleanDataURL, 'PNG', margin, margin + 10, imgWidth, imgHeight);
                    isFirstPage = false;
                    chartsExported++;
                    
                    console.log(`✅ Exported chart: ${key}`);

                } catch (error) {
                    console.error(`❌ Failed to export chart "${key}":`, error);
                    pdf.setTextColor(255, 0, 0);
                    pdf.text(`Could not render chart: ${key}`, 40, 60);
                    pdf.setTextColor(0, 0, 0);
                    isFirstPage = false;
                }
            }
        }

        // Si no hay gráficas, crear una página con información de datos
        if (chartsExported === 0) {
            const dashboardData = getDashboardDataForExport();
            if (dashboardData.length > 0) {
                pdf.setFontSize(20);
                pdf.text('Dashboard Data Summary', 40, 50);
                pdf.setFontSize(12);
                pdf.text(`Total Orders: ${dashboardData.length}`, 40, 80);
                pdf.text(`Export Date: ${new Date().toLocaleDateString()}`, 40, 100);
                pdf.text('Note: Chart visualizations not available for PDF export', 40, 130);
            } else {
                pdf.setFontSize(16);
                pdf.text('No data available for export', 40, 50);
            }
        }

        const fileName = `Dashboard_Charts_${new Date().toISOString().slice(0, 10)}.pdf`;
        console.log(`✅ Saving PDF: ${fileName}`);
        pdf.save(fileName);

        // Mostrar éxito
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'PDF Export Complete',
                text: chartsExported > 0 
                    ? `Successfully exported ${chartsExported} chart(s)` 
                    : 'PDF created with available data',
                timer: 4000
            });
        }

    } catch (error) {
        console.error('❌ PDF export error:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Export Failed',
                text: 'There was an error generating the PDF. Please try again.',
            });
        }
    } finally {
        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
    }
}

/**
 * Imprime el dashboard actual.
 */
export function printDashboard() {
    console.log('🖨️ [printDashboard] Initiating print...');
    window.print();
}

/**
 * Inicializa los botones de exportación en la interfaz.
 */
export function initializeExportButtons() {
    console.log('🔧 [initializeExportButtons] Initializing export buttons...');
    
    const buttons = [
        { id: 'exportCSV', handler: exportToExcel, icon: 'fa-file-excel', text: 'Export to Excel' },
        { id: 'exportPDF', handler: exportToPDF, icon: 'fa-file-pdf', text: 'Export to PDF' },
        { id: 'printDashboard', handler: printDashboard, icon: 'fa-print', text: 'Print' }
    ];
    
    buttons.forEach(button => {
        const element = document.getElementById(button.id);
        if (element) {
            // Remover listeners anteriores
            element.removeEventListener('click', button.handler);
            element.addEventListener('click', button.handler);
            
            // Actualizar texto e icono
            element.innerHTML = `<i class="fa-solid ${button.icon}"></i> ${button.text}`;
            
            console.log(`✅ Button initialized: ${button.id}`);
        } else {
            console.warn(`⚠️ Button not found: ${button.id}`);
        }
    });
    
    console.log('🎉 Export buttons initialization complete');
}
