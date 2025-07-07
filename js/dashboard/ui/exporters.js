/**
 * MÓDULO DE EXPORTACIÓN DE DATOS DEL DASHBOARD
 * Implementa la exportación a formatos avanzados como Excel (con múltiples hojas) y PDF.
 */

import { charts, chartData } from '../configDashboard.js';

/**
 * Verifica si un elemento es visible en el DOM.
 * @param {HTMLElement} el - El elemento a verificar.
 * @returns {boolean} - True si el elemento es visible.
 */
function isElementVisible(el) {
    if (!el) return false;
    // Un elemento se considera visible si tiene un 'offsetParent', lo que significa
    // que no está oculto con display: none.
    return el.offsetParent !== null;
}


/**
 * Exporta los datos de cada gráfica a un archivo Excel con múltiples hojas.
 * Utiliza la biblioteca SheetJS (xlsx).
 */
export function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert('Excel export library (SheetJS) is not loaded.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const exportDate = new Date().toISOString().slice(0, 10);

    for (const key in chartData) {
        if (Object.hasOwnProperty.call(chartData, key)) {
            const chartInfo = chartData[key];
            const sheetName = chartInfo.title.replace(/[:\\/?*[\]]/g, '').substring(0, 31);
            const dataToSheet = [chartInfo.headers, ...chartInfo.data];
            const ws = XLSX.utils.aoa_to_sheet(dataToSheet);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
    }
    
    if (wb.SheetNames.length === 0) {
        alert("No chart data available to export. Please ensure charts are loaded.");
        return;
    }
    
    XLSX.writeFile(wb, `Dashboard_Export_${exportDate}.xlsx`);
}

/**
 * Exporta todas las gráficas visibles del dashboard a un único archivo PDF.
 * Cada gráfica se colocará en una página separada.
 */
export async function exportToPDF() {
    if (typeof jspdf === 'undefined' || typeof Swal === 'undefined') {
        alert('A required library (jsPDF or SweetAlert2) is not loaded.');
        return;
    }

    // Muestra una ventana de carga elegante
    Swal.fire({
        title: 'Generando PDF',
        html: 'Por favor, espera mientras preparamos tu archivo...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4'
        });

        const chartKeys = Object.keys(charts);
        let isFirstPage = true;

        for (const key of chartKeys) {
            const chart = charts[key];
            
            // Omitir elementos que no son gráficas exportables o no están visibles
            if (!chart || typeof chart.dataURI !== 'function' || !isElementVisible(chart.el)) {
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

            } catch (error) {
                console.error(`Failed to export chart "${key}":`, error);
                pdf.setTextColor(255, 0, 0);
                pdf.text(`Could not render chart: ${key}`, 40, 60);
                pdf.setTextColor(0, 0, 0);
                isFirstPage = false;
            }
        }

        // Si no se añadió ninguna gráfica, no se guarda el PDF.
        if (isFirstPage) {
             Swal.fire({
                icon: 'warning',
                title: 'No Charts to Export',
                text: 'No visible charts were found to include in the PDF.',
            });
            return; // Salir de la función
        }

        pdf.save(`Dashboard_Charts_${new Date().toISOString().slice(0, 10)}.pdf`);

    } finally {
        // Cierra la ventana de carga, ya sea que el proceso haya tenido éxito o haya fallado.
        Swal.close();
    }
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
        exportExcelBtn.removeEventListener('click', exportToExcel);
        exportExcelBtn.addEventListener('click', exportToExcel);
    }
    
    const printBtn = document.getElementById('printDashboard');
    if (printBtn) {
        printBtn.removeEventListener('click', printDashboard);
        printBtn.addEventListener('click', printDashboard);
    }
    
    const exportPDFBtn = document.getElementById('exportPDF');
    if (exportPDFBtn) {
        exportPDFBtn.removeEventListener('click', exportToPDF);
        exportPDFBtn.addEventListener('click', exportToPDF);
    }
}
