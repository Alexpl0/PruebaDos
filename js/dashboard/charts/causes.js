/**
 * MÓDULO DE ANÁLISIS DE PARETO PARA CAUSAS DE INCIDENCIAS
 * 
 * Este módulo implementa un análisis de Pareto (también conocido como análisis 80/20)
 * que muestra las principales causas de incidencias ordenadas por frecuencia,
 * junto con una línea de porcentaje acumulativo para identificar qué causas son
 * responsables de la mayoría de los problemas.
 * 
 * El análisis de Pareto es una herramienta fundamental para la mejora de procesos,
 * ya que permite identificar el pequeño número de causas (el vital few) que generan
 * la mayor parte de los problemas.
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
 * Función principal que genera o actualiza el gráfico de análisis de Pareto para las causas
 * 
 * Este gráfico muestra un diagrama combinado con:
 * - Barras: Representando la frecuencia de cada causa (ordenadas de mayor a menor)
 * - Línea: Mostrando el porcentaje acumulativo para identificar fácilmente el punto 80/20
 * 
 * El proceso completo incluye:
 * 1. Obtención y conteo de causas en los datos filtrados
 * 2. Ordenación de causas por frecuencia y selección de las más comunes
 * 3. Cálculo de porcentajes acumulativos
 * 4. Creación o actualización del gráfico combinado
 */
export function renderCausesChart() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderCausesChart:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: CONTEO DE CAUSAS
    // Objeto para almacenar la frecuencia de cada causa identificada
    const causesData = {};
    
    // Itera sobre cada elemento de datos para contabilizar las causas
    filteredData.forEach(item => {
        // Extrae la causa del ítem, usando 'Sin especificar' como valor predeterminado
        // si el campo está vacío, es null o undefined
        const cause = item.category_cause || 'Sin especificar';
        
        // Si es la primera vez que encontramos esta causa, inicializa su contador en 1
        if (!causesData[cause]) {
            causesData[cause] = 1;
        } else {
            // Si ya existía en nuestro objeto, incrementa su contador
            causesData[cause]++;
        }
    });
    
    // PASO 2: ORDENACIÓN Y SELECCIÓN DE LAS CAUSAS MÁS FRECUENTES
    // Transforma el objeto de conteo en un array de pares [causa, frecuencia]
    // y aplica varias operaciones para preparar los datos:
    const sortedCauses = Object.entries(causesData)
        .sort((a, b) => b[1] - a[1])     // Ordena de mayor a menor frecuencia
                                          // b[1] - a[1] compara el segundo elemento (frecuencia) de cada par
        .slice(0, 10);                    // Toma solo las 10 causas más frecuentes
                                          // Esto mejora la legibilidad y enfoca en lo más relevante
    
    // PASO 3: CÁLCULO DE TOTALES Y PORCENTAJES ACUMULATIVOS
    // Calcula el total de incidencias sumando las frecuencias de las causas seleccionadas
    const total = sortedCauses.reduce((sum, [_, count]) => sum + count, 0);
    // _ indica que ignoramos el primer elemento (nombre de la causa)
    
    // Variable para mantener la suma acumulativa durante el procesamiento
    let cumulative = 0;
    
    // Arrays para almacenar los datos procesados que se mostrarán en el gráfico
    const categories = [];           // Nombres de las causas (eje X)
    const counts = [];               // Frecuencia de cada causa (primera serie)
    const cumulativePercentage = []; // Porcentaje acumulativo (segunda serie)
    
    // PASO 4: PROCESAMIENTO DE CADA CAUSA PARA EL GRÁFICO
    // Itera sobre las causas ordenadas para preparar los datos del gráfico
    sortedCauses.forEach(([cause, count]) => {
        // Añade el nombre de la causa al array de categorías
        categories.push(cause);
        
        // Añade la frecuencia de esta causa al array de conteos
        counts.push(count);
        
        // Acumula el conteo para calcular el porcentaje acumulativo
        cumulative += count;
        
        // Calcula y añade el porcentaje acumulativo hasta esta causa
        // (cumulative / total) * 100 convierte la fracción a porcentaje
        cumulativePercentage.push((cumulative / total) * 100);
    });
    
    // PASO 5: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.causes) {
        // PASO 5.1: ACTUALIZACIÓN DEL GRÁFICO EXISTENTE
        // Si el gráfico ya existe, solo actualiza las categorías y los datos de las series
        charts.causes.updateOptions({
            xaxis: { categories: categories },       // Actualiza las categorías (causas)
            series: [
                { name: 'Cantidad', data: counts },             // Actualiza la serie de barras (frecuencias)
                { name: 'Acumulativo %', data: cumulativePercentage }  // Actualiza la serie de línea (% acumulativo)
            ]
        });
    } else {
        // PASO 5.2: CREACIÓN DE UN NUEVO GRÁFICO
        // Si el gráfico no existe, configura todas las opciones y lo crea desde cero
        const options = {
            // Configuración general del gráfico
            chart: {
                type: 'line',           // Tipo base: línea (se sobrescribirá para la serie de barras)
                height: 350,            // Altura en píxeles
                stacked: false          // Las series no se apilan (son independientes)
            },
            // Configuración específica para las barras
            plotOptions: {
                bar: {
                    columnWidth: '70%',       // Ancho de las columnas (70% del espacio disponible)
                    endingShape: 'rounded'    // Forma redondeada al final de las barras
                },
            },
            // Configuración de los trazos (líneas y contornos)
            stroke: {
                width: [0, 4],           // Grosor de línea: 0 para barras, 4px para línea de %
                curve: 'smooth'          // Curva suavizada para la línea de porcentaje acumulativo
            },
            // Título principal del gráfico
            title: {
                text: 'Análisis de Pareto: Principales Causas',
                align: 'center'          // Centrado horizontalmente
            },
            // Configuración de etiquetas de datos
            dataLabels: {
                enabled: false,          // Desactivadas por defecto para evitar sobrecarga visual
                enabledOnSeries: [1]     // Activadas solo para la serie 1 (línea de porcentaje)
            },
            // Configuración de los marcadores en la línea
            markers: {
                size: 6,                 // Tamaño en píxeles
                colors: ['#FFA500'],     // Color naranja (color de la línea de porcentaje)
                strokeColors: '#fff',    // Borde blanco para mejor visibilidad
                strokeWidth: 2,          // Grosor del borde en píxeles
                hover: { size: 8 }       // Tamaño aumentado al pasar el cursor
            },
            // Configuración del eje X (horizontal)
            xaxis: {
                categories: categories,  // Nombres de las causas como categorías
                labels: {
                    rotate: -45,         // Rotación de -45 grados para mejor legibilidad
                    rotateAlways: true,  // Siempre aplicar la rotación
                    style: {
                        fontSize: '11px' // Tamaño de fuente más pequeño para etiquetas largas
                    }
                }
            },
            // Configuración de los ejes Y (vertical)
            yaxis: [
                {
                    // Primer eje Y (izquierda) - Para la frecuencia de causas
                    title: {
                        text: 'Cantidad',  // Título descriptivo del eje
                    },
                    min: 0                 // Valor mínimo del eje (siempre desde cero)
                },
                {
                    // Segundo eje Y (derecha) - Para el porcentaje acumulativo
                    opposite: true,        // Ubicado en el lado opuesto (derecha)
                    title: {
                        text: 'Porcentaje Acumulativo'  // Título descriptivo
                    },
                    min: 0,                // Valor mínimo: 0%
                    max: 100,              // Valor máximo: 100%
                    labels: {
                        formatter: function(val) {
                            // Formatea el valor como porcentaje sin decimales
                            return val.toFixed(0) + '%';
                        }
                    }
                }
            ],
            // Configuración de tooltips (información emergente al pasar el cursor)
            tooltip: {
                shared: true,             // Muestra datos de todas las series en un solo tooltip
                intersect: false,         // Se activa al pasar cerca, no solo al intersectar exactamente
                y: [
                    {
                        // Formateador para la primera serie (frecuencia)
                        formatter: function (y) {
                            if (typeof y !== "undefined") {
                                // Muestra el valor sin decimales y añade la unidad "incidencias"
                                return y.toFixed(0) + " incidencias";
                            }
                            return y;
                        }
                    },
                    {
                        // Formateador para la segunda serie (porcentaje acumulativo)
                        formatter: function (y) {
                            if (typeof y !== "undefined") {
                                // Muestra el valor con 1 decimal y símbolo de porcentaje
                                return y.toFixed(1) + "%";
                            }
                            return y;
                        }
                    }
                ]
            },
            // Configuración de la leyenda
            legend: {
                horizontalAlign: 'left',  // Alineación horizontal a la izquierda
                offsetX: 40               // Desplazamiento horizontal para mejor posicionamiento
            },
            // Colores para cada serie, usando la paleta predefinida y naranja para la línea
            colors: [chartColors.primary, '#FFA500'],
            // Definición de las series de datos a visualizar
            series: [
                {
                    name: 'Cantidad',         // Nombre descriptivo para la leyenda
                    type: 'column',           // Tipo de visualización: columnas/barras
                    data: counts              // Datos de frecuencia para cada causa
                },
                {
                    name: 'Acumulativo %',    // Nombre descriptivo para la leyenda
                    type: 'line',             // Tipo de visualización: línea
                    data: cumulativePercentage // Datos de porcentaje acumulativo
                }
            ]
        };
        
        // PASO 5.3: RENDERIZADO DEL GRÁFICO
        // Crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'chartCauses'
        charts.causes = new ApexCharts(document.getElementById('chartCauses'), options);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.causes.render();
    }
}