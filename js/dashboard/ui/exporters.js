/**
 * MÓDULO DE EXPORTACIÓN DE DATOS DEL DASHBOARD
 * Implementa la exportación a formatos avanzados como Excel (con múltiples hojas) y PDF.
 */

import { charts, chartData } from '../configDashboard.js';

/**
 * Exporta los datos de cada gráfica a un archivo Excel con múltiples hojas.
 * Utiliza la biblioteca SheetJS (xlsx).
 */
export function exportToExcel() {
    // 1. Verificar si la librería XLSX está disponible.
    if (typeof XLSX === 'undefined') {
        alert('Excel export library (SheetJS) is not loaded.');
        return;
    }

    // 2. Crear un nuevo libro de trabajo (workbook)
    const wb = XLSX.utils.book_new();
    const exportDate = new Date().toISOString().slice(0, 10);

    // 3. Iterar sobre los datos de cada gráfica almacenados en chartData
    for (const key in chartData) {
        if (Object.hasOwnProperty.call(chartData, key)) {
            const chartInfo = chartData[key];
            
            // Crea un nombre de hoja válido (Excel limita a 31 caracteres y caracteres especiales)
            const sheetName = chartInfo.title.replace(/[:\\/?*[\]]/g, '').substring(0, 31);
            
            // Prepara los datos para la hoja: encabezados + filas de datos
            const dataToSheet = [chartInfo.headers, ...chartInfo.data];
            
            // 4. Crear una nueva hoja (worksheet) a partir de los datos
            const ws = XLSX.utils.aoa_to_sheet(dataToSheet);
            
            // 5. Añadir la hoja al libro de trabajo
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
    }
    
    // 6. Generar el archivo Excel y disparar la descarga
    if (wb.SheetNames.length === 0) {
        alert("No chart data available to export. Please ensure charts are loaded.");
        return;
    }
    
    XLSX.writeFile(wb, `Dashboard_Export_${exportDate}.xlsx`);
}

/**
 * Exporta todas las gráficas visibles del dashboard a un único archivo PDF.
 * Cada gráfica se colocará en una página separada.
 * Utiliza la biblioteca jsPDF y la capacidad de exportación de ApexCharts.
 */
export async function exportToPDF() {
    // 1. Verificar si la librería jsPDF está disponible.
    if (typeof jspdf === 'undefined') {
        alert('PDF export library (jsPDF) is not loaded.');
        return;
    }

    alert('Generating PDF... This may take a moment.');

    const { jsPDF } = jspdf;
    const pdf = new jsPDF({
        orientation: 'landscape', // Orientación horizontal para mejor ajuste de gráficas
        unit: 'pt',               // Unidades en puntos
        format: 'a4'              // Formato de página A4
    });

    const chartKeys = Object.keys(charts);
    if (chartKeys.length === 0) {
        alert("No charts found to export.");
        return;
    }

    const margin = 40; // Margen de la página
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = pageHeight - 2 * margin;
    let pageAdded = false;

    for (let i = 0; i < chartKeys.length; i++) {
        const key = chartKeys[i];
        const chart = charts[key];
        
        // Omitir el mapa y la nube de palabras de la exportación a PDF, ya que no son ApexCharts.
        if (key === 'originDestiny' || key === 'cloud') {
            continue;
        }
        
        if (pageAdded) {
            pdf.addPage();
        }

        try {
            const title = chart.opts.title.text || chart.opts.chart.id || key;
            pdf.setFontSize(16);
            pdf.text(title, margin, margin - 10);

            const dataUrl = await chart.dataURI();
            const imgProps = pdf.getImageProperties(dataUrl.imgURI);
            const aspectRatio = imgProps.width / imgProps.height;
            let imgWidth = contentWidth;
            let imgHeight = imgWidth / aspectRatio;

            if (imgHeight > contentHeight - 30) { // Dejar espacio para el título
                imgHeight = contentHeight - 30;
                imgWidth = imgHeight * aspectRatio;
            }

            pdf.addImage(dataUrl.imgURI, 'PNG', margin, margin + 10, imgWidth, imgHeight);
            pageAdded = true; // Marcar que se ha añadido una página con contenido

        } catch (error) {
            console.error(`Failed to export chart "${key}":`, error);
            pdf.setTextColor(255, 0, 0);
            pdf.text(`Could not render chart: ${key}`, margin, margin + 20);
            pdf.setTextColor(0, 0, 0);
            pageAdded = true; // Marcar que se ha añadido una página, aunque sea con un error
        }
    }

    pdf.save(`Dashboard_Charts_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Imprime el dashboard actual.
 */
export function printDashboard() {
    window.print();
}

/**
 * Inicializa los botones de exportación en la interfaz.
 */
export function initializeExportButtons() {
    const exportExcelBtn = document.getElementById('exportCSV');
    if (exportExcelBtn) {
        exportExcelBtn.innerHTML = '<i class="fa-solid fa-file-excel"></i> Export to Excel';
        exportExcelBtn.addEventListener('click', exportToExcel);
    }
    
    const printBtn = document.getElementById('printDashboard');
    if (printBtn) {
        printBtn.addEventListener('click', printDashboard);
    }
    
    const exportPDFBtn = document.getElementById('exportPDF');
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', exportToPDF);
    }
}
