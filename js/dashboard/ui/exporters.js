/**
 * MÓDULO DE EXPORTACIÓN DE DATOS DEL DASHBOARD
 * 
 * Este módulo contiene funciones para exportar los datos visualizados en el dashboard
 * a diferentes formatos (CSV, PDF) y para imprimir el dashboard completo.
 * 
 * Permite a los usuarios extraer la información filtrada para análisis externos,
 * compartir resultados o archivar informes del estado actual del dashboard.
 */

// Importación de la función que proporciona acceso a los datos filtrados según los criterios
// establecidos en el dashboard. Esta función nos permite trabajar siempre con el conjunto
// de datos actualizado según las selecciones del usuario.
import { getFilteredData } from '../dataDashboard.js';

/**
 * Exporta los datos filtrados actuales a un archivo CSV
 * 
 * Esta función realiza los siguientes pasos:
 * 1. Obtiene los datos filtrados según los criterios actuales del dashboard
 * 2. Prepara la estructura de encabezados para el CSV
 * 3. Formatea cada registro como una fila del CSV
 * 4. Genera el contenido completo del CSV con el formato adecuado
 * 5. Crea un archivo para descarga con el contenido generado
 */
export function exportToCSV() {
    // PASO 1: OBTENCIÓN DE DATOS
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 2: PREPARACIÓN DE ENCABEZADOS
    // Define un array con los nombres de columna que aparecerán en la primera fila del CSV
    // Estos encabezados describen el contenido de cada columna para facilitar la interpretación
    const headers = [
        'ID',                // Identificador único del registro
        'Plant',             // Planta de origen asociada al envío
        'Date',              // Fecha en que se registró el envío
        'Area',              // Área o departamento responsable
        'Type',              // Clasificación interna/externa
        'Description',       // Detalle textual del envío
        'Cause',             // Motivo que originó la necesidad del envío premium
        'Cost (€)',          // Costo en euros
        'Transport',         // Medio de transporte utilizado
        'Origin',            // Empresa/entidad de origen
        'Origin City',       // Ciudad desde donde parte el envío
        'Destination',       // Empresa/entidad de destino
        'Destination City',  // Ciudad donde llega el envío
        'Weight (kg)',       // Peso en kilogramos
        'Status',            // Estado actual del proceso
        'Approver',          // Persona que aprobó el envío
        'Recovery'           // Información sobre archivo de recuperación
    ];
    
    // PASO 3: PREPARACIÓN DE FILAS DE DATOS
    // Transforma cada objeto de datos en un array de valores, manteniendo el orden
    // definido en los encabezados para asegurar la correspondencia entre columnas
    const rows = filteredData.map(item => [
        item.id || '',                    // ID (usa string vacío si no existe)
        item.planta || '',                // Planta
        item.date || '',                  // Fecha
        item.area || '',                  // Área
        item.int_ext || '',               // Tipo (interno/externo)
        item.description || '',           // Descripción
        item.category_cause || '',        // Causa/categoría
        item.cost_euros || '0',           // Costo (0 si no existe)
        item.transport || '',             // Tipo de transporte
        item.origin_company_name || '',   // Compañía de origen
        item.origin_city || '',           // Ciudad de origen
        item.destiny_company_name || '',  // Compañía de destino
        item.destiny_city || '',          // Ciudad de destino
        item.weight || '0',               // Peso (0 si no existe)
        item.status_name || '',           // Nombre del estado
        item.approver_name || '',         // Nombre del aprobador
        item.recovery || ''               // Información de recovery
    ]);
    
    // PASO 4: FORMATEO DEL CONTENIDO CSV
    // Comienza con la fila de encabezados separados por comas, seguido de un salto de línea
    let csvContent = headers.join(',') + '\n';
    
    // PASO 4.1: PROCESAMIENTO DE CADA FILA
    // Itera sobre cada fila de datos para convertirla al formato CSV adecuado
    rows.forEach(row => {
        // PASO 4.2: MANEJO DE CARACTERES ESPECIALES
        // Procesa cada celda para manejar caracteres especiales del formato CSV
        const formattedRow = row.map(cell => {
            // Convierte la celda a string para asegurar el formato correcto
            const stringCell = String(cell);
            
            // Verifica si la celda contiene comas o comillas, que requieren tratamiento especial en CSV
            return stringCell.includes(',') || stringCell.includes('"') 
                // Si contiene caracteres especiales, la encierra entre comillas y duplica las comillas internas
                ? `"${stringCell.replace(/"/g, '""')}"` 
                // Si no tiene caracteres especiales, la deja sin cambios
                : stringCell;
        });
        
        // PASO 4.3: UNIÓN DE CELDAS EN FILA CSV
        // Une las celdas formateadas con comas y añade un salto de línea al final
        csvContent += formattedRow.join(',') + '\n';
    });
    
    // PASO 5: CREACIÓN DEL ARCHIVO PARA DESCARGA
    // PASO 5.1: GENERACIÓN DEL BLOB
    // Crea un objeto Blob con el contenido CSV
    // Un Blob es un objeto que representa datos binarios inmutables
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // PASO 5.2: CREACIÓN DE URL TEMPORAL
    // Crea una URL temporal que apunta al Blob recién creado
    const url = URLPF.createObjectURL(blob);
    
    // PASO 5.3: CREACIÓN DEL ENLACE DE DESCARGA
    // Crea un elemento <a> (enlace) que iniciará la descarga
    const link = document.createElement('a');
    link.setAttribute('href', url);  // Establece la URL del Blob como destino
    
    // PASO 5.4: NOMBRE DEL ARCHIVO
    // Establece el nombre del archivo con formato premium_freight_export_YYYY-MM-DD.csv
    // toISOString() genera una fecha en formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)
    // slice(0, 10) extrae solo la parte YYYY-MM-DD
    link.setAttribute('download', `premium_freight_export_${new Date().toISOString().slice(0, 10)}.csv`);
    
    // PASO 5.5: OCULTACIÓN DEL ENLACE
    // Oculta el enlace para que no aparezca visualmente en la página
    link.style.visibility = 'hidden';
    
    // PASO 5.6: SIMULACIÓN DE CLIC
    // Añade el enlace al DOM, simula un clic para iniciar la descarga y luego lo elimina
    document.body.appendChild(link);   // Añade al documento
    link.click();                      // Simula clic para iniciar descarga
    document.body.removeChild(link);   // Elimina el enlace del documento
}

/**
 * Imprime el dashboard actual
 * 
 * Esta función utiliza la funcionalidad nativa del navegador para imprimir
 * la página actual, permitiendo al usuario generar una versión impresa o PDF
 * del estado actual del dashboard, incluyendo todos los gráficos visibles.
 */
export function printDashboard() {
    // Invoca el método de impresión nativo del navegador
    // Esto abrirá el diálogo de impresión del sistema operativo
    window.print();
    
    // Nota: El estilo de impresión se controla mediante reglas CSS con @media print
    // en las hojas de estilo del dashboard, para ocultar elementos innecesarios,
    // ajustar tamaños, etc.
}

/**
 * Inicializa los botones de exportación en la interfaz
 * 
 * Esta función vincula los eventos de clic en los botones de exportación
 * con las funciones correspondientes. Se ejecuta una sola vez al cargar
 * el dashboard para establecer los controladores de eventos necesarios.
 */
export function initializeExportButtons() {
    // PASO 1: INICIALIZACIÓN DEL BOTÓN DE EXPORTACIÓN CSV
    // Obtiene una referencia al botón de exportación CSV por su ID
    const exportCSVBtn = document.getElementById('exportCSV');
    
    // Verifica que el botón exista en el DOM antes de añadir el evento
    if (exportCSVBtn) {
        // Añade un controlador para el evento click que ejecutará la función exportToCSV
        exportCSVBtn.addEventListener('click', exportToCSV);
    }
    
    // PASO 2: INICIALIZACIÓN DEL BOTÓN DE IMPRESIÓN
    // Obtiene una referencia al botón de impresión por su ID
    const printBtn = document.getElementById('printDashboard');
    
    // Verifica que el botón exista en el DOM antes de añadir el evento
    if (printBtn) {
        // Añade un controlador para el evento click que ejecutará la función printDashboard
        printBtn.addEventListener('click', printDashboard);
    }
    
    // PASO 3: INICIALIZACIÓN DEL BOTÓN DE EXPORTACIÓN PDF
    // Nota: Esta funcionalidad está pendiente de implementación completa
    // y requeriría una biblioteca externa como jsPDF o html2pdf
    
    // Obtiene una referencia al botón de exportación PDF por su ID
    const exportPDFBtn = document.getElementById('exportPDF');
    
    // Verifica que el botón exista en el DOM antes de añadir el evento
    if (exportPDFBtn) {
        // Añade un controlador para el evento click que mostrará un mensaje informativo
        exportPDFBtn.addEventListener('click', function() {
            // Muestra una alerta indicando que la funcionalidad está en desarrollo
            // Esto es un placeholder hasta que se implemente la exportación a PDF
            alert('PDF export functionality in development');
            
            // TO-DO: Implementar exportación a PDF utilizando una biblioteca como jsPDF
            // Esto podría incluir:
            // 1. Capturar el estado visual del dashboard
            // 2. Convertirlo a formato PDF
            // 3. Ofrecer la descarga del archivo generado
        });
    }
}