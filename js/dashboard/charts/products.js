/**
 * MÓDULO DE VISUALIZACIÓN DE PRODUCTOS
 * 
 * Este módulo implementa un gráfico de barras horizontales que muestra los productos
 * más frecuentes en los registros de envíos. Permite identificar rápidamente
 * qué productos tienen mayor volumen de envíos y visualizar su distribución relativa.
 * 
 * La visualización se enfoca en los 10 productos más frecuentes para mantener
 * la legibilidad y el enfoque en los elementos más relevantes para el análisis.
 */

// Importación de la función que proporciona acceso a los datos filtrados según los criterios
// establecidos en el dashboard. Esta función nos permite trabajar siempre con el conjunto
// de datos actualizado según las selecciones del usuario.
import { getFilteredData } from '../dataDashboard.js';

// Importación de objetos de configuración global para los gráficos:
// - charts: objeto que almacena referencias a todos los gráficos del dashboard
// - chartColors: paleta de colores predefinida para mantener consistencia visual
import { charts, chartColors } from '../configDashboard.js';

/**
 * Función principal que genera o actualiza el gráfico de productos
 * 
 * Este gráfico muestra un diagrama de barras horizontales con los 10 productos
 * más frecuentes ordenados de mayor a menor cantidad de envíos.
 * 
 * El proceso completo incluye:
 * 1. Obtención y conteo de productos en los datos filtrados
 * 2. Ordenación por frecuencia y selección de los 10 productos principales
 * 3. Preparación de datos para la visualización
 * 4. Creación o actualización del gráfico de barras horizontales
 */
export function renderProductsChart() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderProductsChart:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: CONTEO DE PRODUCTOS
    // Objeto para almacenar la frecuencia de cada producto identificado
    // La estructura será: {nombreProducto: cantidadApariciones}
    const productsData = {};
    
    // Itera sobre cada elemento de datos para contabilizar los productos
    filteredData.forEach(item => {
        // Extrae el producto del ítem, usando 'Sin especificar' como valor predeterminado
        // si el campo está vacío, es null o undefined
        const product = item.product || 'Sin especificar';
        
        // Si es la primera vez que encontramos este producto, inicializa su contador en 1
        if (!productsData[product]) {
            productsData[product] = 1;
        } else {
            // Si ya existía en nuestro objeto, incrementa su contador
            productsData[product]++;
        }
    });
    
    // PASO 2: ORDENACIÓN Y SELECCIÓN DE LOS PRODUCTOS MÁS FRECUENTES
    // Transforma el objeto de conteo en un array de pares [producto, frecuencia]
    // y aplica varias operaciones para preparar los datos:
    const topProducts = Object.entries(productsData)
        .sort((a, b) => b[1] - a[1])     // Ordena de mayor a menor frecuencia
                                          // b[1] - a[1] compara el segundo elemento (frecuencia) de cada par
        .slice(0, 10);                    // Toma solo los 10 productos más frecuentes
                                          // Esto mejora la legibilidad y enfoca en lo más relevante
    
    // PASO 3: PREPARACIÓN DE DATOS PARA EL GRÁFICO
    // Extrae los nombres de productos (para las categorías del eje X)
    // El símbolo _ indica que ignoramos el segundo elemento del par (la frecuencia)
    const categories = topProducts.map(([product, _]) => product);
    
    // Extrae los valores de frecuencia (para las barras)
    // El símbolo _ indica que ignoramos el primer elemento del par (el nombre del producto)
    const data = topProducts.map(([_, count]) => count);
    
    // PASO 4: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.products) {
        // PASO 4.1: ACTUALIZACIÓN DEL GRÁFICO EXISTENTE
        // Si el gráfico ya existe, solo actualiza las categorías y los datos de la serie
        charts.products.updateOptions({
            xaxis: { categories: categories },  // Actualiza las categorías (nombres de productos)
            series: [{ data: data }]            // Actualiza los datos (frecuencias)
        });
    } else {
        // PASO 4.2: CREACIÓN DE UN NUEVO GRÁFICO
        // Si el gráfico no existe, configura todas las opciones y lo crea desde cero
        const options = {
            // Configuración general del gráfico
            chart: {
                type: 'bar',             // Tipo de gráfico: barras
                height: 300              // Altura en píxeles
            },
            // Configuración específica para las barras
            plotOptions: {
                bar: {
                    borderRadius: 4,      // Bordes redondeados de las barras
                    horizontal: true,     // Barras horizontales (de izquierda a derecha)
                    distributed: true     // Colores distribuidos (cada barra un color diferente)
                }
            },
            // Configuración de etiquetas de datos (desactivadas para evitar sobrecarga visual)
            dataLabels: {
                enabled: false           // No muestra etiquetas sobre las barras
            },
            // Configuración del eje X (nombres de productos)
            xaxis: {
                categories: categories    // Nombres de productos como categorías
            },
            // Colores para las barras, tomados de la paleta predefinida en la configuración global
            colors: chartColors.palette,
            // Series de datos para el gráfico
            series: [{
                name: 'Incidencias',      // Nombre descriptivo para la leyenda y tooltips
                data: data                // Datos de frecuencia para cada producto
            }]
        };
        
        // PASO 4.3: RENDERIZADO DEL GRÁFICO
        // Crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'chartProducts'
        charts.products = new ApexCharts(document.getElementById('chartProducts'), options);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.products.render();
    }
}