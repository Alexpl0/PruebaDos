// Nube de palabras

import { getFilteredData } from '../dataDashboard.js';

/**
 * Genera o actualiza la nube de palabras
 */
export function renderWordCloud() {
    console.log("[DEBUG] renderWordCloud:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    // Extraer texto de las descripciones y causas
    const textData = filteredData.map(item => 
        (item.description || '') + ' ' + (item.root_cause || '') + ' ' + (item.category_cause || '')
    ).join(' ');
    
    // Procesar el texto para extraer palabras
    const words = textData.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['this', 'that', 'then', 'than', 'with', 'para', 'from'].includes(word));
    
    // Contar frecuencia de palabras
    const wordCounts = {};
    words.forEach(word => {
        if (!wordCounts[word]) {
            wordCounts[word] = 1;
        } else {
            wordCounts[word]++;
        }
    });
    
    // Preparar datos para la nube de palabras
    const wordCloudData = Object.entries(wordCounts)
        .filter(([_, count]) => count > 1)
        .map(([text, size]) => ({ text, size }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 100);
    
    // Verificar que existe el contenedor para la nube de palabras
    const wordCloudContainer = document.getElementById('wordCloudChart');
    if (!wordCloudContainer) return;
    
    // Limpiar el contenedor
    wordCloudContainer.innerHTML = '';
    
    // Dimensiones del contenedor
    const width = wordCloudContainer.offsetWidth;
    const height = wordCloudContainer.offsetHeight;
    
    // Configurar el layout de la nube de palabras
    const layout = d3.layout.cloud()
        .size([width, height])
        .words(wordCloudData)
        .padding(5)
        .rotate(() => Math.random() > 0.5 ? 0 : 90)
        .font("Impact")
        .fontSize(d => Math.min(50, 5 + d.size * 2))
        .on("end", draw);
    
    layout.start();
    
    function draw(words) {
        d3.select("#wordCloudChart").append("svg")
            .attr("width", layout.size()[0])
            .attr("height", layout.size()[1])
            .append("g")
            .attr("transform", `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`)
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", d => `${d.size}px`)
            .style("font-family", "Impact")
            .style("fill", d => d3.interpolateRainbow(Math.random()))
            .attr("text-anchor", "middle")
            .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
            .text(d => d.text);
    }
}