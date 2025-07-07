/**
 * MÓDULO DE VISUALIZACIÓN DE NUBE DE PALABRAS
 * Muestra las palabras más frecuentes de las descripciones y causas.
 */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartData } from '../configDashboard.js';

export function renderWordCloud() {
    const filteredData = getFilteredData();
    
    // Concatena el texto de campos relevantes
    const textData = filteredData.map(item =>
        (item.description || '') + ' ' + (item.root_cause || '') + ' ' + (item.category_cause || '')
    ).join(' ');

    // Limpia y procesa el texto para obtener un array de palabras
    const words = textData.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['this', 'that', 'then', 'than', 'with', 'from', 'para', 'what', 'when', 'where', 'which'].includes(word));

    // Cuenta la frecuencia de cada palabra
    const wordCounts = {};
    words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Prepara los datos para el layout de la nube y para la exportación
    const wordCloudData = Object.entries(wordCounts)
        .filter(([_, count]) => count > 1)
        .map(([text, size]) => ({ text, size }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 100);

    // --- Guardar datos para la exportación a Excel ---
    chartData['wordCloud'] = {
        title: 'Frequent Words',
        headers: ['Word', 'Frequency'],
        data: wordCloudData.map(item => [item.text, item.size])
    };

    const wordCloudContainer = document.getElementById('wordCloudChart');
    if (!wordCloudContainer) return;

    wordCloudContainer.innerHTML = '';
    const width = wordCloudContainer.offsetWidth;
    const height = 350; // Altura fija para consistencia

    if (typeof d3.layout === 'undefined' || typeof d3.layout.cloud === 'undefined') {
        console.error("d3.layout.cloud not available. Make sure d3-cloud library is included.");
        return;
    }

    // Configura el layout de la nube de palabras
    const layout = d3.layout.cloud()
        .size([width, height])
        .words(wordCloudData)
        .padding(5)
        .rotate(() => (Math.random() > 0.7) ? 90 : 0) // Mayoría de palabras en horizontal
        .font("Impact")
        .fontSize(d => Math.min(60, 10 + d.size * 2.5)) // Ajuste de tamaño de fuente
        .on("end", draw);

    layout.start();

    // Dibuja la nube de palabras una vez que el layout ha calculado las posiciones
    function draw(words) {
        d3.select("#wordCloudChart").html("");
        const svg = d3.select("#wordCloudChart").append("svg")
            .attr("width", layout.size()[0])
            .attr("height", layout.size()[1])
            .append("g")
            .attr("transform", `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`);
        
        svg.selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", d => `${d.size}px`)
            .style("font-family", "Impact")
            .style("fill", () => `hsl(${Math.random() * 360}, 80%, 40%)`)
            .attr("text-anchor", "middle")
            .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
            .text(d => d.text);
        
        // Guarda una referencia al elemento SVG, aunque no se use para la exportación a PDF
        charts.cloud = svg;
    }
}
