/**
 * MÓDULO DE VISUALIZACIÓN DE TIPOS DE TRANSPORTE
 * 
 * Este módulo implementa un gráfico de columnas que muestra información comparativa
 * sobre los diferentes tipos de transporte utilizados en los envíos. Permite visualizar
 * simultáneamente la cantidad de envíos por cada tipo de transporte y su costo promedio.
 * 
 * La visualización ayuda a identificar qué medios de transporte son más utilizados
 * y cuáles generan mayores costos, facilitando decisiones sobre optimización logística.
 */

// Importación de la función que proporciona acceso a los datos filtrados según los criterios
// establecidos en el dashboard. Esta función nos permite trabajar siempre con el conjunto
// de datos actualizado según las selecciones del usuario.
import { getFilteredData } from '../dataDashboard.js';

// Importación de objetos de configuración global para los gráficos:
// - charts: objeto que almacena referencias a todos los gráficos del dashboard
// - chartColors: paleta de colores predefinida para mantener consistencia visual
import { charts, chartColors } from '../configDashboard.js';

// Importación de la función de formateo de números que convierte valores numéricos
// a representaciones legibles con separadores de miles y decimales controlados
import { formatNumber } from '../utilsDashboard.js';

/**
 * Función principal que genera o actualiza el gráfico de transportes
 * 
 * Este gráfico muestra un diagrama de columnas con dos series:
 * 1. La cantidad de envíos por cada tipo de transporte (columnas azules)
 * 2. El costo promedio de los envíos por cada tipo de transporte (columnas naranjas)
 * 
 * El proceso completo incluye:
 * 1. Obtención y conteo de tipos de transporte en los datos filtrados
 * 2. Cálculo de costos totales y promedios para cada tipo de transporte
 * 3. Preparación de datos para la visualización
 * 4. Creación o actualización del gráfico de columnas con doble eje Y
 */
export function renderTransportChart() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderTransportChart:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: CONTEO DE TRANSPORTES Y ACUMULACIÓN DE COSTOS
    // Objeto para almacenar la frecuencia de cada tipo de transporte
    // La estructura será: {tipoTransporte: cantidadEnvíos}
    const transportData = {};
    
    // Objeto para almacenar el costo total acumulado para cada tipo de transporte
    // La estructura será: {tipoTransporte: costoTotalAcumulado}
    const costByTransport = {};
    
    // Itera sobre cada elemento de datos para contabilizar transportes y acumular costos
    filteredData.forEach(item => {
        // Extrae el tipo de transporte, usando 'Unspecified' como valor predeterminado
        // si el campo está vacío, es null o undefined
        const transport = item.transport || 'Unspecified';
        
        // Extrae el costo, convirtiéndolo a número (o 0 si no existe)
        const cost = parseFloat(item.cost_euros || 0);
        
        // Si es la primera vez que encontramos este tipo de transporte,
        // inicializa sus contadores y acumuladores
        if (!transportData[transport]) {
            transportData[transport] = 1;         // Inicializa contador en 1
            costByTransport[transport] = cost;    // Inicializa acumulador con el costo actual
        } else {
            // Si ya existía, incrementa su contador y acumula el costo
            transportData[transport]++;           // Incrementa el contador
            costByTransport[transport] += cost;   // Suma el costo al acumulador
        }
    });
    
    // PASO 2: CÁLCULO DE COSTOS PROMEDIO POR TIPO DE TRANSPORTE
    // Objeto para almacenar el costo promedio por tipo de transporte
    // La estructura será: {tipoTransporte: costoPromedio}
    const avgCostByTransport = {};
    
    // Itera sobre cada tipo de transporte para calcular su costo promedio
    for (const transport in transportData) {
        // Divide el costo total acumulado entre el número de envíos
        // para obtener el costo promedio por envío para este tipo de transporte
        avgCostByTransport[transport] = costByTransport[transport] / transportData[transport];
    }
    
    // PASO 3: PREPARACIÓN DE DATOS PARA APEXCHARTS
    // Extrae los nombres de los tipos de transporte para las categorías del eje X
    const categories = Object.keys(transportData);
    
    // Extrae los valores de cantidad de envíos para la primera serie
    const countData = Object.values(transportData);
    
    // Extrae los valores de costo promedio para la segunda serie
    const avgCostData = Object.values(avgCostByTransport).map(cost => 
        parseFloat(cost.toFixed(2)) // Asegura redondeo a 2 decimales
    );
    
    // PASO 4: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.transport) {
        // PASO 4.1: ACTUALIZACIÓN DEL GRÁFICO EXISTENTE
        // Si el gráfico ya existe, solo actualiza las categorías y los datos de las series
        charts.transport.updateOptions({
            xaxis: { categories: categories },      // Actualiza tipos de transporte en el eje X
            series: [
                { name: 'Quantity', data: countData },             // Actualiza datos de cantidad
                { name: 'Average Cost (€)', data: avgCostData }  // Actualiza datos de costo promedio
            ]
        });
    } else {
        // PASO 4.2: CREACIÓN DE UN NUEVO GRÁFICO
        // Si el gráfico no existe, configura todas las opciones y lo crea desde cero
        const options = {
            // Configuración general del gráfico
            chart: {
                type: 'bar',           // Tipo de gráfico: barras/columnas
                height: 350            // Altura en píxeles
            },
            // Configuración específica para las barras
            plotOptions: {
                bar: {
                    horizontal: false,      // Barras verticales (columnas)
                    columnWidth: '55%',     // Ancho de las columnas (55% del espacio disponible)
                    endingShape: 'rounded'  // Extremos redondeados para las columnas
                },
            },
            // Configuración de etiquetas de datos (desactivadas para evitar sobrecarga visual)
            dataLabels: {
                enabled: false               // No muestra etiquetas sobre las barras
            },
            // Configuración de los bordes de las barras
            stroke: {
                show: true,                  // Muestra bordes
                width: 2,                    // Grosor del borde en píxeles
                colors: ['transparent']      // Color transparente (solo para definir la forma)
            },
            // Configuración del eje X (categorías de transporte)
            xaxis: {
                categories: categories        // Tipos de transporte como categorías
            },
            // Configuración de los ejes Y (doble eje)
            yaxis: [
                {
                    // Primer eje Y (izquierda) - Para la cantidad de envíos
                    title: {
                        text: 'Quantity'      // Título descriptivo del eje
                    },
                    labels: {
                        formatter: function(value) {
                            return formatNumber(value, 0); // Sin decimales para cantidades
                        }
                    }
                },
                {
                    // Segundo eje Y (derecha) - Para el costo promedio
                    opposite: true,           // Ubicado en el lado opuesto (derecha)
                    title: {
                        text: 'Average Cost (€)'  // Título descriptivo del eje
                    },
                    labels: {
                        formatter: function(value) {
                            return formatNumber(value, 2); // Con 2 decimales para costos
                        }
                    }
                }
            ],
            // Configuración de tooltips (información emergente al pasar el cursor)
            tooltip: {
                shared: true,                // Muestra datos de ambas series en un solo tooltip
                intersect: false,            // Se activa al pasar cerca, no solo al intersectar exactamente
                y: [
                    {
                        // Formateador para la primera serie (cantidad de envíos)
                        formatter: function (y) {
                            if (typeof y !== "undefined") {
                                // Muestra el valor sin decimales y añade la unidad "shipments"
                                return y.toFixed(0) + " shipments";
                            }
                            return y;
                        }
                    },
                    {
                        // Formateador para la segunda serie (costo promedio)
                        formatter: function (y) {
                            if (typeof y !== "undefined") {
                                // Muestra el valor en formato monetario con el símbolo de euro
                                // Usa la función formatNumber para formato consistente
                                return "€" + formatNumber(y, 2);
                            }
                            return y;
                        }
                    }
                ]
            },
            // Colores para las series (azul para cantidad, naranja para costo)
            colors: [chartColors.primary, '#FF7043'],
            // Series de datos para el gráfico
            series: [
                {
                    name: 'Quantity',            // Nombre descriptivo para la leyenda
                    data: countData              // Datos de cantidad por tipo de transporte
                },
                {
                    name: 'Average Cost (€)',  // Nombre descriptivo para la leyenda
                    data: avgCostData            // Datos de costo promedio por tipo de transporte
                }
            ]
        };
        
        // PASO 4.3: RENDERIZADO DEL GRÁFICO
        // Crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'chartTransport'
        charts.transport = new ApexCharts(document.getElementById('chartTransport'), options);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.transport.render();
    }
    
    // PASO 5: GENERACIÓN DE ESTADÍSTICAS DETALLADAS (OPCIONAL)
    // Aquí se podría añadir código para mostrar estadísticas adicionales,
    // como tablas de datos, análisis de tendencias o comparativas entre
    // diferentes tipos de transporte, utilizando los datos ya procesados.
}