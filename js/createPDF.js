/**
 * createPDF.js
 * Este script maneja la generación de documentos PDF para el sistema de Premium Freight
 * Utiliza la biblioteca jsPDF para crear documentos PDF personalizados con los datos de la orden
 */

/**
 * Carga una imagen desde una URL y la convierte a formato Base64
 * @param {string} url - URL de la imagen a cargar
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
        const headerImagePath = URL + 'assets/media/SPECIAL_FREIGHT_AUTHORIZATION.png';
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
 * @returns {Promise<jsPDF>} Una promesa que resuelve con el documento PDF generado
 */
async function generatePDF(orderData) {
    try {
        // Crear una instancia del documento PDF (orientación vertical, unidades en milímetros, tamaño carta)
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
        
        // Resto del código para generar el PDF...
        
        return doc;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}

/**
 * Descarga el PDF generado
 * @param {number} orderId - ID de la orden para nombrar el archivo
 */
async function downloadPDF(orderId) {
    try {
        // Mostrar indicador de carga
        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait while we prepare your document',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        
        // Obtener datos de la orden seleccionada
        const orderData = window.allOrders.find(order => order.id === parseInt(orderId));
        
        if (!orderData) {
            throw new Error('Order data not found');
        }
        
        // Generar el PDF
        const doc = await generatePDF(orderData);
        
        // Descargar el PDF
        doc.save(`PremiumFreight_${orderId}.pdf`);
        
        // Cerrar indicador de carga
        Swal.close();
        
    } catch (error) {
        console.error('Error downloading PDF:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not generate PDF: ' + error.message
        });
    }
}

/**
 * Verificación de disponibilidad de la variable URL
 * En caso de que el script se cargue antes que la variable esté definida
 */
if (typeof URL === 'undefined') {
    console.warn('URL global variable is not defined. Make sure this script runs after the URL is defined in your PHP page.');
    // Fallback a URL hardcodeada solo como último recurso
    window.URL = window.URL || 'https://grammermx.com/Jesus/PruebaDos/';
}

// Exportar las funciones para uso externo
window.generatePDF = generatePDF;
window.downloadPDF = downloadPDF;

