/* === Archivo: js/charts/wordCloud.js === */
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartData } from '../configDashboard.js';

export function renderWordCloud() {
    const filteredData = getFilteredData();
    const textData = filteredData.map(item =>
        (item.description || '') + ' ' + (item.root_cause || '') + ' ' + (item.category_cause || '')
    ).join(' ');

    const words = textData.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['this', 'that', 'then', 'than', 'with', 'from', 'para', 'what', 'when', 'where', 'which'].includes(word));

    const wordCounts = {};
    words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    const wordCloudData = Object.entries(wordCounts)
        .filter(([_, count]) => count > 1)
        .map(([text, size]) => ({ text, size }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 100);

    // --- Guardar datos para exportación ---
    chartData['wordCloud'] = {
        title: 'Frequent Words',
        headers: ['Word', 'Frequency'],
        data: wordCloudData.map(item => [item.text, item.size])
    };

    const wordCloudContainer = document.getElementById('wordCloudChart');
    if (!wordCloudContainer) return;

    wordCloudContainer.innerHTML = '';
    const width = wordCloudContainer.offsetWidth;
    const height = wordCloudContainer.offsetHeight;

    if (typeof d3.layout === 'undefined' || typeof d3.layout.cloud === 'undefined') {
        console.error("d3.layout.cloud not available. Make sure d3-cloud library is included.");
        return;
    }

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
            .style("fill", () => `hsl(${Math.random() * 360}, 100%, 50%)`)
            .attr("text-anchor", "middle")
            .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
            .text(d => d.text);
        
        // Guardar referencia al elemento SVG por si se necesita
        charts.cloud = svg;
    }
}
