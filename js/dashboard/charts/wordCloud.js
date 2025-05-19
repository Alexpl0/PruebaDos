/**
 * MÓDULO DE VISUALIZACIÓN DE NUBE DE PALABRAS
 * 
 * Este módulo genera una visualización gráfica que muestra las palabras más frecuentes
 * encontradas en los textos de descripción y causas de los datos filtrados.
 * Las palabras más frecuentes aparecen con un tamaño mayor, creando así una
 * representación visual de los términos más relevantes.
 * 
 * Utiliza la biblioteca D3.js y su extensión de layout de nube de palabras (d3.layout.cloud)
 * para generar una visualización interactiva y estéticamente atractiva.
 */

// Importación de la función que proporciona acceso a los datos filtrados según los criterios
// establecidos en el dashboard. Esta función nos permite trabajar siempre con el conjunto
// de datos actualizado según las selecciones del usuario.
import { getFilteredData } from '../dataDashboard.js';
import { charts } from '../configDashboard.js';

/**
 * Función principal que genera o actualiza la visualización de nube de palabras
 * 
 * El proceso completo incluye:
 * 1. Extracción de texto de los datos filtrados
 * 2. Procesamiento del texto para identificar palabras significativas
 * 3. Cálculo de frecuencias de las palabras
 * 4. Generación de la visualización utilizando D3.js
 */
export function renderWordCloud() {
    console.log("[DEBUG] charts importado:", charts);
    if (typeof charts !== 'object' || charts === null) {
        throw new Error("charts no está inicializado correctamente");
    }
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderWordCloud:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados que se utilizarán para generar la nube
    const filteredData = getFilteredData();
    
    // PASO 1: EXTRACCIÓN DE TEXTO
    // Combina el texto de múltiples campos relevantes (descripción, causa raíz, categoría de causa)
    // para cada elemento de datos filtrado, y luego une todos los textos con espacios
    const textData = filteredData.map(item => 
        // Se usa una cadena vacía como valor predeterminado si algún campo es undefined
        // Esto evita errores por valores nulos o indefinidos
        (item.description || '') + ' ' + (item.root_cause || '') + ' ' + (item.category_cause || '')
    ).join(' ');
    
    // PASO 2: PROCESAMIENTO DEL TEXTO
    // Transforma el texto combinado para extraer palabras significativas mediante:
    const words = textData.toLowerCase()  // Conversión a minúsculas para comparación sin distinción de mayúsculas
        .replace(/[^\w\s]/gi, '')        // Eliminación de todos los caracteres no alfanuméricos y no espacios
                                          // usando una expresión regular: ^ (negación), \w (alfanuméricos), 
                                          // \s (espacios), g (global), i (insensible a mayúsculas/minúsculas)
        .split(/\s+/)                     // División en un array de palabras basado en espacios en blanco (\s+)
                                          // El + asegura que múltiples espacios se traten como uno solo
        .filter(word => 
            word.length > 3 &&            // Filtrado de palabras cortas (probablemente no significativas)
            // Exclusión de palabras comunes (stopwords) que no aportan significado relevante
            !['this', 'that', 'then', 'than', 'with', 'from', 'para', 'what', 'when', 'where', 'which'].includes(word)
        );
    
    // PASO 3: CÁLCULO DE FRECUENCIAS
    // Calcula la frecuencia de cada palabra utilizando un objeto como contador
    const wordCounts = {};
    words.forEach(word => {
        // Si la palabra no está en el objeto de conteo, inicialízala con 1
        if (!wordCounts[word]) {
            wordCounts[word] = 1;
        } else {
            // Si ya existe, incrementa su contador en 1
            wordCounts[word]++;
        }
    });
    
    // PASO 4: PREPARACIÓN DE DATOS PARA LA VISUALIZACIÓN
    const wordCloudData = Object.entries(wordCounts)   // Convierte el objeto de conteo a un array de pares [palabra, frecuencia]
        .filter(([_, count]) => count > 1)            // Filtra para incluir solo palabras que aparecen más de una vez
                                                       // El _ indica que no usamos el primer valor en esta función de filtrado
        .map(([text, size]) => ({ text, size }))      // Transforma cada par a un objeto con propiedades text y size
                                                       // Esto crea la estructura de datos requerida por d3.layout.cloud
        .sort((a, b) => b.size - a.size)              // Ordena de mayor a menor frecuencia
        .slice(0, 100);                               // Limita a las 100 palabras más frecuentes para evitar sobrecarga
    
    // PASO 5: VERIFICACIÓN DEL CONTENEDOR HTML
    const wordCloudContainer = document.getElementById('wordCloudChart');
    if (!wordCloudContainer) return;

    // --- SOLUCIÓN: Asegura que charts siempre sea un objeto ---
    if (typeof charts !== 'object' || charts === null) {
        console.warn('[WordCloud] El objeto charts no está inicializado.');
        return;
    }

    // Si quieres usar charts.cloud para guardar una referencia, inicialízalo si no existe
    if (!charts.cloud) {
        charts.cloud = {}; // O puedes guardar aquí la instancia de la nube si lo necesitas
    }

    // PASO 6: PREPARACIÓN DEL CONTENEDOR
    // Limpia cualquier contenido previo del contenedor para evitar duplicaciones
    wordCloudContainer.innerHTML = '';
    console.log("[DEBUG] wordCloudContainer:", wordCloudContainer);
    
    // PASO 7: OBTENCIÓN DE DIMENSIONES
    // Captura las dimensiones actuales del contenedor para crear una visualización responsiva
    const width = wordCloudContainer.offsetWidth;    // Ancho en píxeles
    const height = wordCloudContainer.offsetHeight;  // Alto en píxeles
    
    // PASO 8: CONFIGURACIÓN DEL LAYOUT D3 PARA LA NUBE DE PALABRAS
    // Crea y configura el generador de layout de nube de palabras
    const layout = d3.layout.cloud()
        .size([width, height])                       // Establece las dimensiones totales de la nube
        .words(wordCloudData)                        // Proporciona los datos de palabras y frecuencias
        .padding(5)                                  // Espacio mínimo entre palabras (en píxeles)
        .rotate(() => Math.random() > 0.5 ? 0 : 90)  // Rotación aleatoria: horizontal o vertical (90 grados)
                                                      // Aproximadamente la mitad de palabras en cada orientación
        .font("Impact")                              // Tipo de letra para todas las palabras
        .fontSize(d => Math.min(50, 5 + d.size * 2)) // Función para calcular el tamaño de letra basado en frecuencia
                                                      // Con un mínimo de 5px y un máximo de 50px
        .on("end", draw);                            // Función callback para ejecutar al terminar el cálculo del layout
    
    // PASO 9: INICIAR EL CÁLCULO DEL LAYOUT
    // Ejecuta el algoritmo que posiciona las palabras evitando superposiciones
    layout.start();
    
    /**
     * PASO 10: FUNCIÓN DE DIBUJADO
     * Esta función callback se ejecuta cuando el layout ha terminado de calcular
     * las posiciones de todas las palabras. Utiliza D3.js para crear los elementos
     * SVG y renderizar cada palabra en su posición calculada.
     * 
     * @param {Array} words - Array de objetos palabra con propiedades calculadas (x, y, rotate, etc.)
     */
    function draw(words) {
        // Limpia primero el contenedor (por si había un SVG previo)
        d3.select("#wordCloudChart").html("");
        
        // Crea el SVG y guarda una referencia al elemento svg principal
        const svgRoot = d3.select("#wordCloudChart").append("svg")
            .attr("width", layout.size()[0])
            .attr("height", layout.size()[1]);
            
        // Crea el grupo y los textos
        const textsGroup = svgRoot.append("g")
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

        // Guarda un objeto con referencias y métodos útiles
        charts.cloud = {
            svg: svgRoot,
            container: document.getElementById('wordCloudChart'),
            layout: layout,
            update: function(newData) {
                // Aquí podrías implementar la lógica para actualizar la nube
                // sin tener que recrearla por completo
                renderWordCloud(); // Por ahora simplemente re-renderizamos
            }
        };
    }
}