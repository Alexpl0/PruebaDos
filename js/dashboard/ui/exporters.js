// Funciones para exportar datos del dashboard

import { getFilteredData } from '../data.js';

/**
 * Exporta los datos filtrados a CSV
 */
export function exportToCSV() {
    const filteredData = getFilteredData();
    
    // Preparar encabezados
    const headers = [
        'ID', 'Planta', 'Fecha', 'Área', 'Tipo', 'Descripción', 'Causa',
        'Costo (€)', 'Transporte', 'Origen', 'Ciudad Origen', 'Destino',
        'Ciudad Destino', 'Peso (kg)', 'Status', 'Aprobador', 'Recovery'
    ];
    
    // Preparar filas
    const rows = filteredData.map(item => [
        item.id || '',
        item.planta || '',
        item.date || '',
        item.area || '',
        item.int_ext || '',
        item.description || '',
        item.category_cause || '',
        item.cost_euros || '0',
        item.transport || '',
        item.origin_company_name || '',
        item.origin_city || '',
        item.destiny_company_name || '',
        item.destiny_city || '',
        item.weight || '0',
        item.status_name || '',
        item.approver_name || '',
        item.recovery || ''
    ]);
    
    // Formatear CSV
    let csvContent = headers.join(',') + '\n';
    
    rows.forEach(row => {
        // Escapar comas y comillas en los datos
        const formattedRow = row.map(cell => {
            const stringCell = String(cell);
            return stringCell.includes(',') || stringCell.includes('"') 
                ? `"${stringCell.replace(/"/g, '""')}"` 
                : stringCell;
        });
        
        csvContent += formattedRow.join(',') + '\n';
    });
    
    // Crear enlace de descarga
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `premium_freight_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Imprime el dashboard actual
 */
export function printDashboard() {
    window.print();
}

/**
 * Inicializa los botones de exportación
 */
export function initializeExportButtons() {
    const exportCSVBtn = document.getElementById('exportCSV');
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', exportToCSV);
    }
    
    const printBtn = document.getElementById('printDashboard');
    if (printBtn) {
        printBtn.addEventListener('click', printDashboard);
    }
    
    // Para el PDF necesitarías una biblioteca como jsPDF o html2pdf
    // Aquí solo un placeholder
    const exportPDFBtn = document.getElementById('exportPDF');
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', function() {
            alert('Funcionalidad de exportación a PDF en desarrollo');
        });
    }
}