/**
 * createPDF.js
 * Este script maneja la generación de documentos PDF para el sistema de Premium Freight
 * Utiliza la biblioteca jsPDF para crear documentos PDF personalizados con los datos de la orden
 */

/**
 * Carga una imagen desde una URL y la convierte a formato Base64
 * @param {string} url - URLPF de la imagen a cargar
 * @returns {Promise<string>} Una promesa que resuelve con la imagen en formato Base64
 */
function loadImage(url) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        xhr.onload = function() {
            const reader = new FileReader();
            reader.onload = function(event) {
                const res = event.target.result;
                resolve(res);  
            };
            const file = this.response;
            reader.readAsDataURL(file);
        };
        xhr.send();
    });
}

/**
 * Inicializa la carga de recursos cuando el DOM esté completamente cargado
 */
window.addEventListener('load', async () => {
    try {
        // Usa la variable global URL para construir la ruta completa a la imagen
        const headerImagePath = window.URLPF + 'assets/media/SPECIAL_FREIGHT_AUTHORIZATION.png';
        const image = await loadImage(headerImagePath);
        console.log('Header image loaded successfully');
        // Almacena la imagen en una variable global para usarla en la generación del PDF
        window.headerImage = image;
    } catch (error) {
        console.error('Error loading header image:', error);
    }
});

/**
 * Genera un documento PDF con los datos de la orden seleccionada
 * @param {Object} orderData - Datos de la orden para incluir en el PDF
 * @param {string} filename - Nombre del archivo (opcional)
 * @returns {Promise<jsPDF>} Una promesa que resuelve con el documento PDF generado
 */
async function generatePDF(orderData, filename = null) {
    try {
        console.log('🔄 Starting PDF generation for order:', orderData.id);
        
        // Crear una instancia del documento PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });
        
        // Agregar imagen de encabezado si está disponible
        if (window.headerImage) {
            doc.addImage(window.headerImage, 'PNG', 10, 10, 190, 25);
        }
        
        // Agregar fecha y número de orden
        const currentDate = new Date().toLocaleDateString();
        doc.setFontSize(10);
        doc.text(`Date: ${currentDate}`, 170, 40);
        doc.text(`Order #: ${orderData.id || 'N/A'}`, 170, 45);
        
        // Título principal
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Premium Freight Authorization', 20, 55);
        
        // Información básica de la orden
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        let yPos = 70;
        
        doc.text(`Creator: ${orderData.creator_name || 'N/A'}`, 20, yPos);
        yPos += 6;
        doc.text(`Plant: ${orderData.creator_plant || 'N/A'}`, 20, yPos);
        yPos += 6;
        doc.text(`Carrier: ${orderData.carrier || 'N/A'}`, 20, yPos);
        yPos += 6;
        doc.text(`Cost: €${orderData.cost_euros ? Number(orderData.cost_euros).toFixed(2) : '0.00'}`, 20, yPos);
        yPos += 10;
        
        // Origen y destino
        doc.setFont(undefined, 'bold');
        doc.text('Origin:', 20, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 6;
        doc.text(`${orderData.origin_company_name || 'N/A'}`, 25, yPos);
        yPos += 4;
        doc.text(`${orderData.origin_city || 'N/A'}, ${orderData.origin_state || 'N/A'} ${orderData.origin_zip || ''}`, 25, yPos);
        yPos += 10;
        
        doc.setFont(undefined, 'bold');
        doc.text('Destination:', 20, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 6;
        doc.text(`${orderData.destiny_company_name || 'N/A'}`, 25, yPos);
        yPos += 4;
        doc.text(`${orderData.destiny_city || 'N/A'}, ${orderData.destiny_state || 'N/A'} ${orderData.destiny_zip || ''}`, 25, yPos);
        
        // Si no se proporciona un nombre de archivo, descargar automáticamente
        if (!filename) {
            doc.save(`PremiumFreight_Order_${orderData.id}.pdf`);
        }
        
        console.log('✅ PDF generated successfully');
        return doc;
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        throw error;
    }
}

/**
 * Descarga el PDF generado (función legacy mantenida para compatibilidad)
 * @param {number} orderId - ID de la orden para nombrar el archivo
 */
async function downloadPDF(orderId) {
    try {
        console.log('📥 Starting PDF download for order:', orderId);
        
        // Obtener datos de la orden seleccionada
        const orderData = window.allOrders ? window.allOrders.find(order => order.id === parseInt(orderId)) : null;
        
        if (!orderData) {
            throw new Error('Order data not found');
        }
        
        // Generar y descargar el PDF
        await generatePDF(orderData);
        
        console.log('✅ PDF downloaded successfully');
        
    } catch (error) {
        console.error('❌ Error downloading PDF:', error);
        throw error;
    }
}

// Verificación de disponibilidad de jsPDF
if (typeof window.jspdf === 'undefined') {
    console.warn('⚠️ jsPDF library not loaded. Make sure jspdf.umd.min.js is included.');
}

// Verificación de disponibilidad de la variable URL
if (typeof window.URLPF === 'undefined') {
    console.warn('⚠️ URL global variable is not defined. Make sure this script runs after the URL is defined.');
}

// Exportar las funciones tanto como módulos ES6 como propiedades globales
export { generatePDF, downloadPDF };

// También exportar como propiedades del objeto window para compatibilidad
window.generatePDF = generatePDF;
window.downloadPDF = downloadPDF;

console.log('📄 PDF generation module loaded successfully');

