/**
 * SVG Handler Module
 * Manages all SVG-related functionality for the Premium Freight application,
 * including loading, populating, and text wrapping operations.
 */

// --- SVG mapping and configuration ---
// Define the mapping between SVG element IDs and order object properties
const svgMap = {
    'RequestingPlantValue': 'planta', // CORREGIDO: usar creator_plant de daoPremiumFreight.php
    'PlantCodeValue': 'creator_plant',
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
        const getMeasureAbbreviation = (measure) => {
            if (!measure) return '';
            switch (measure.toUpperCase()) {
                case 'KILOS':
                    return 'KG';
                case 'LIBRAS':
                    return 'LB';
                default:
                    return measure;
            }
        };
        
        const measureAbbr = getMeasureAbbreviation(order.measures);
        return `${order.weight || '0'} ${measureAbbr}`;
    },
    'ProductValue': 'products',
    'CarrierNameValue': 'carrier', // CORREGIDO: viene directamente de daoPremiumFreight.php
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
 * CORREGIDO: Wraps text in an SVG element to fit within specified width
 * @param {string|HTMLElement} containerOrElementId - The container element or ID of the SVG text element to wrap
 * @param {string} [elementId] - Optional specific element ID when container is provided
 */
function wrapSVGText(containerOrElementId = "DescriptionAndRootCauseValue", elementId = null) {
    let textElement;
    
    // CORRECCIÓN: Determinar si se pasó un contenedor o un ID
    if (typeof containerOrElementId === 'string') {
        // Comportamiento original para compatibilidad con view_order.php
        textElement = document.getElementById(containerOrElementId);
    } else if (containerOrElementId instanceof HTMLElement) {
        // Nuevo comportamiento para weekOrders.js - buscar dentro del contenedor
        const targetId = elementId || "DescriptionAndRootCauseValue";
        textElement = containerOrElementId.querySelector(`#${targetId}`);
    } else {
        console.error('[SVG] wrapSVGText: Invalid container or element ID provided');
        return;
    }
    
    if (!textElement) {
        console.warn(`[SVG] Text element not found: ${elementId || containerOrElementId}`);
        return;
    }
    
    const text = textElement.textContent.trim();
    if (!text) return;
    
    const x = textElement.getAttribute("x");
    const y = textElement.getAttribute("y");
    const fontSize = parseFloat(textElement.style.fontSize || "3.175px");
    
    const lineHeight = fontSize * 1.3;
    textElement.textContent = "";
    
    const maxCharsPerLine = 100;
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
 * CORREGIDO: Loads SVG template, populates it with order data, and displays it in a specified container
 * @param {Object} selectedOrder - The order data to populate the SVG with
 * @param {string} containerId - The ID of the container to display the populated SVG
 * @returns {Promise<boolean>} - Resolves to true if successful, rejects with error if failed
 */
async function loadAndPopulateSVG(selectedOrder, containerId = 'svgPreview') {
    try {
        console.log(`[SVG] Loading SVG for order ${selectedOrder.id} in container ${containerId}`);
        
        const response = await fetch('PremiumFreight.svg');
        if (!response.ok) throw new Error(`Error HTTP! estado: ${response.status}`);
        
        const svgText = await response.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgText;

        // CORREGIDO: Debug de los datos que se están mapeando
        console.log(`[SVG] Mapping data for order ${selectedOrder.id}:`, {
            creator_name: selectedOrder.creator_name,
            description: selectedOrder.description?.substring(0, 50) + '...',
            cost_euros: selectedOrder.cost_euros,
            carrier: selectedOrder.carrier,
            origin_company_name: selectedOrder.origin_company_name,
            destiny_company_name: selectedOrder.destiny_company_name
        });

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
            } else {
                console.warn(`[SVG] Element not found in SVG: ${svgId}`);
            }
        }
        
        // CORREGIDO: Obtener el contenedor de destino
        const targetContainer = document.getElementById(containerId);
        if (!targetContainer) {
            throw new Error(`Container ${containerId} not found in DOM`);
        }
        
        // Display the populated SVG in the specified container
        targetContainer.innerHTML = tempDiv.innerHTML;
        
        // CORRECCIÓN CRÍTICA: Apply text wrapping pasando el contenedor específico
        wrapSVGText(targetContainer, 'DescriptionAndRootCauseValue');
        
        console.log(`[SVG] Successfully loaded SVG for order ${selectedOrder.id}`);
        return true;
    } catch (error) {
        console.error(`[SVG] Error loading SVG for order ${selectedOrder.id}:`, error);
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
    
    // CORREGIDO: Apply special text wrapping for PDF generation usando el contenedor
    applyTextWrappingForPDF(container, selectedOrder);
    
    return container;
}

/**
 * CORREGIDO: Applies text wrapping to the description field in the offscreen container for PDF generation
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
    try {
        console.log('[SVG PDF] Iniciando generación de PDF para orden:', selectedOrder.id);
        
        // Prepare SVG in off-screen container
        const container = await prepareOffscreenSVG(selectedOrder);
        
        // Small pause to ensure rendering completes
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Convert to canvas
        const canvas = await html2canvas(container, {
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
            backgroundColor: 'white'
        });
        
        // Clean up the DOM immediately after canvas creation
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        
        // Create PDF - CORREGIDO: Detectar versión correcta de jsPDF
        let pdf;
        if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
            // Versión nueva de jsPDF (3.x+)
            pdf = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'letter'
            });
        } else if (typeof window.jsPDF !== 'undefined') {
            // Versión antigua de jsPDF (2.x)
            pdf = new window.jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'letter'
            });
        } else {
            throw new Error('jsPDF library not available');
        }
        
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
        
        // CORREGIDO: Usar la API nativa del navegador sin conflictos
        const fileName = customFileName 
            ? `${customFileName}.pdf` 
            : `PF_${selectedOrder.id || 'Order'}.pdf`;
        
        // Generar el PDF como blob
        const pdfOutput = pdf.output('blob');
        
        // CORRECCIÓN CRÍTICA: Usar la API nativa sin interferencias
        // Guardar referencia a la API nativa antes de cualquier posible sobrescritura
        const nativeURL = window.webkitURL || window.mozURL || (function() {
            // Fallback: crear una referencia directa a la API nativa
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            const nativeWindow = iframe.contentWindow;
            document.body.removeChild(iframe);
            return nativeWindow.URL;
        })();
        
        // Si nativeURL no está disponible, usar la API directa del navegador
        const urlAPI = nativeURL || (function() {
            // Crear un objeto temporal que no interfiera
            return {
                createObjectURL: function(blob) {
                    // Método alternativo usando FileReader si createObjectURL no está disponible
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                },
                revokeObjectURL: function() {
                    // Placeholder - no es crítico para este caso
                }
            };
        })();
        
        // Crear enlace de descarga
        let url;
        if (typeof urlAPI.createObjectURL === 'function') {
            url = urlAPI.createObjectURL(pdfOutput);
        } else {
            // Método alternativo usando data URL
            const reader = new FileReader();
            url = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(pdfOutput);
            });
        }
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        // Agregar al DOM, hacer clic y limpiar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar URL object después de un tiempo (solo si es object URL)
        if (url.startsWith('blob:') && urlAPI.revokeObjectURL) {
            setTimeout(() => {
                urlAPI.revokeObjectURL(url);
            }, 1000);
        }
        
        console.log('[SVG PDF] PDF generado exitosamente:', fileName);
        return fileName;
        
    } catch (error) {
        console.error('[SVG PDF] Error generando PDF:', error);
        throw new Error('Error generating PDF: ' + error.message);
    }
}

// Exporta las funciones y objetos que quieras usar en otros módulos
export {
    svgMap,
    formatDate,
    wrapSVGText,
    loadAndPopulateSVG,
    prepareOffscreenSVG,
    generatePDF
};