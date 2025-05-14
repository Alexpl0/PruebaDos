/**
 * SVG Handler Module
 * Manages all SVG-related functionality for the Premium Freight application,
 * including loading, populating, and text wrapping operations.
 */

// --- SVG mapping and configuration ---
// Define the mapping between SVG element IDs and order object properties
const svgMap = {
    'RequestingPlantValue': 'planta',
    'PlantCodeValue': 'code_planta',
    'DateValue': 'date', 
    'TransportValue': 'transport',
    'InOutBoundValue': 'in_out_bound',
    'CostInEurosValue': 'cost_euros',
    'AreaOfResponsabilityValue': 'area',
    'InExtValue': 'int_ext',
    'CostPaidByValue': 'paid_by',
    'RootCauseValue': 'category_cause',
    'ProjectStatusValue': 'project_status',
    'RecoveryValue': 'recovery',
    'DescriptionAndRootCauseValue': 'description',
    'IssuerValue': 'creator_name',
    'PlantManagerValue': '',
    'SeniorManagerValue': '',
    'ManagerOPSDivisionValue': '',
    'SRVPRegionalValue': '',
    'CompanyNameShipValue': 'origin_company_name',
    'CityShipValue': 'origin_city',
    'StateShipValue': 'origin_state',
    'ZIPShipValue': 'origin_zip',
    'CompanyNameDestValue': 'destiny_company_name',
    'CityDestValue': 'destiny_city',
    'StateDestValue': 'destiny_state',
    'ZIPDestValue': 'destiny_zip',
    'WeightValue': (order) => {
        // Función para convertir texto de unidad a abreviatura
        const getMeasureAbbreviation = (measure) => {
            if (!measure) return '';
            switch (measure.toUpperCase()) {
                case 'KILOS':
                    return 'KG';
                case 'LIBRAS':
                    return 'LB';
                default:
                    return measure; // Mantener el valor original si no coincide
            }
        };
        
        const measureAbbr = getMeasureAbbreviation(order.measures);
        return `${order.weight || '0'} ${measureAbbr}`;
    },
    'ProductValue': 'products',
    'CarrierNameValue': 'carrier',
    'QuotedCostValue': (order) => `$ ${order.quoted_cost || '0'} ${order.moneda || 'MXN'}`,
    'ReferenceNumberValue': 'reference_number',
};

/**
 * Formats a date string to MM/DD/YYYY format
 * @param {string} dateString - The date string to format
 * @returns {string} - The formatted date string
 */
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; 
        
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        console.error("Error al formatear la fecha:", dateString, e);
        return dateString;
    }
}

/**
 * Wraps text in an SVG element to fit within specified width
 * @param {string} elementId - The ID of the SVG text element to wrap
 */
function wrapSVGText(elementId = "DescriptionAndRootCauseValue") {
    const textElement = document.getElementById(elementId);
    if (!textElement) return;
    
    const text = textElement.textContent.trim();
    if (!text) return;
    
    const x = textElement.getAttribute("x");
    const y = textElement.getAttribute("y");
    const fontSize = parseFloat(textElement.style.fontSize || "3.175px");
    
    const lineHeight = fontSize * 1.3;
    textElement.textContent = "";
    
    const maxCharsPerLine = 101;
    const words = text.split(/\s+/);
    let currentLine = "";
    let firstLine = true;
    
    words.forEach(word => {
        if ((currentLine + " " + word).length > maxCharsPerLine && currentLine.length > 0) {
            const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tspan.setAttribute("x", x);
            
            if (firstLine) {
                firstLine = false;
            } else {
                tspan.setAttribute("dy", `${lineHeight}px`);
            }
            
            tspan.textContent = currentLine;
            textElement.appendChild(tspan);
            currentLine = word;
        } else {
            if (currentLine.length > 0) {
                currentLine += " " + word;
            } else {
                currentLine = word;
            }
        }
    });
    
    if (currentLine.length > 0) {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        tspan.setAttribute("x", x);
        
        if (!firstLine) {
            tspan.setAttribute("dy", `${lineHeight}px`);
        }
        
        tspan.textContent = currentLine;
        textElement.appendChild(tspan);
    }
}

/**
 * Loads SVG template, populates it with order data, and displays it in a specified container
 * @param {Object} selectedOrder - The order data to populate the SVG with
 * @param {string} containerId - The ID of the container to display the populated SVG
 * @returns {Promise<boolean>} - Resolves to true if successful, rejects with error if failed
 */
async function loadAndPopulateSVG(selectedOrder, containerId = 'svgPreview') {
    try {
        const response = await fetch('PremiumFreight.svg');
        if (!response.ok) throw new Error(`Error HTTP! estado: ${response.status}`);
        
        const svgText = await response.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgText;

        // Populate SVG fields with order data
        for (const [svgId, orderKey] of Object.entries(svgMap)) {
            const element = tempDiv.querySelector(`#${svgId}`);
            if (element) {
                if (svgId === 'DateValue') {
                    element.textContent = formatDate(selectedOrder.date);
                } else if (typeof orderKey === 'function') {
                    element.textContent = orderKey(selectedOrder);
                } else {
                    element.textContent = selectedOrder[orderKey] || '';
                }
            }
        }
        
        // Display the populated SVG in the specified container
        document.getElementById(containerId).innerHTML = tempDiv.innerHTML;
        
        // Apply text wrapping to the description field
        wrapSVGText();
        
        return true;
    } catch (error) {
        console.error('Error al cargar o procesar el SVG:', error);
        throw error;
    }
}

/**
 * Creates an off-screen container with a populated SVG for PDF generation
 * @param {Object} selectedOrder - The order data to populate the SVG with
 * @returns {HTMLElement} - The prepared container element
 */
async function prepareOffscreenSVG(selectedOrder) {
    const response = await fetch('PremiumFreight.svg');
    if (!response.ok) throw new Error(`Error HTTP! estado: ${response.status}`);
    
    const svgText = await response.text();
    const container = document.createElement('div');
    
    // Configure container for PDF generation
    container.style.width = '816px';
    container.style.height = '1056px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.backgroundColor = 'white';
    container.innerHTML = svgText;

    // Populate the SVG fields with order data
    for (const [svgId, orderKey] of Object.entries(svgMap)) {
        const element = container.querySelector(`#${svgId}`);
        if (element) {
            if (svgId === 'DateValue') {
                element.textContent = formatDate(selectedOrder.date);
            } else if (typeof orderKey === 'function') {
                element.textContent = orderKey(selectedOrder);
            } else {
                element.textContent = selectedOrder[orderKey] || '';
            }
        }
    }

    // Add the container to the DOM
    document.body.appendChild(container);
    
    // Apply special text wrapping for PDF generation
    applyTextWrappingForPDF(container, selectedOrder);
    
    return container;
}

/**
 * Applies text wrapping to the description field in the offscreen container for PDF generation
 * @param {HTMLElement} container - The container with the SVG
 * @param {Object} selectedOrder - The order data
 */
function applyTextWrappingForPDF(container, selectedOrder) {
    const descriptionElement = container.querySelector('#DescriptionAndRootCauseValue');
    if (!descriptionElement) return;
    
    const tempTextElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
    Array.from(descriptionElement.attributes).forEach(attr => {
        tempTextElement.setAttribute(attr.name, attr.value);
    });
    
    tempTextElement.textContent = selectedOrder.description || '';
    descriptionElement.parentNode.replaceChild(tempTextElement, descriptionElement);
    
    const text = tempTextElement.textContent.trim();
    if (!text) return;
    
    const x = tempTextElement.getAttribute("x");
    const y = tempTextElement.getAttribute("y");
    const fontSize = parseFloat(tempTextElement.style.fontSize || "3.175px");
    const lineHeight = fontSize * 1.3;
    
    tempTextElement.textContent = "";
    
    const maxCharsPerLine = 101;
    const words = text.split(/\s+/);
    let currentLine = "";
    let firstLine = true;
    
    words.forEach(word => {
        if ((currentLine + " " + word).length > maxCharsPerLine && currentLine.length > 0) {
            const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tspan.setAttribute("x", x);
            if (firstLine) {
                firstLine = false;
            } else {
                tspan.setAttribute("dy", `${lineHeight}px`);
            }
            tspan.textContent = currentLine;
            tempTextElement.appendChild(tspan);
            currentLine = word;
        } else {
            if (currentLine.length > 0) {
                currentLine += " " + word;
            } else {
                currentLine = word;
            }
        }
    });
    
    if (currentLine.length > 0) {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        tspan.setAttribute("x", x);
        if (!firstLine) {
            tspan.setAttribute("dy", `${lineHeight}px`);
        }
        tspan.textContent = currentLine;
        tempTextElement.appendChild(tspan);
    }
}

/**
 * Genera un PDF a partir del SVG y lo descarga
 * @param {Object} selectedOrder - Los datos de la orden
 * @param {string} [customFileName] - Nombre personalizado para el archivo (opcional)
 * @returns {Promise<string>} - Nombre del archivo generado
 */
async function generatePDF(selectedOrder, customFileName) {
    // Prepare SVG in off-screen container
    const container = await prepareOffscreenSVG(selectedOrder);
    
    try {
        // Small pause to ensure rendering completes
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Convert to canvas
        const canvas = await html2canvas(container, {
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
            backgroundColor: 'white'
        });
        
        // Create PDF - ajustado a tamaño carta (8.5 x 11 pulgadas = 612 x 792 puntos)
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'letter'  // Formato carta
        });
        
        // Calcula el factor de escala para ajustar a la página
        const pageWidth = 612;
        const pageHeight = 792;
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // Calcula la escala para ajustar el ancho de la página con margen de 40pt
        let scale = (pageWidth - 80) / imgWidth;
        
        // Si la altura escalada excede la altura de la página, ajustar por altura
        if (imgHeight * scale > (pageHeight - 80)) {
            scale = (pageHeight - 80) / imgHeight;
        }
        
        // Coordenadas centradas
        const xPos = (pageWidth - imgWidth * scale) / 2;
        const yPos = (pageHeight - imgHeight * scale) / 2;
        
        // Add image to PDF con el tamaño ajustado
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth * scale, imgHeight * scale);
        
        // Save the PDF
        const fileName = customFileName 
            ? `${customFileName}.pdf` 
            : `PF_${selectedOrder.id || 'Order'}.pdf`;
        pdf.save(fileName);
        
        return fileName;
    } catch (error) {
        throw error;
    } finally {
        // Clean up - remove the container
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
    }
}

// Export the module functions
export {
    svgMap,
    formatDate,
    wrapSVGText,
    loadAndPopulateSVG,
    prepareOffscreenSVG,
    generatePDF
};