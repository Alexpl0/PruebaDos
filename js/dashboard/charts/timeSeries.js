/**
 * MÓDULO DE VISUALIZACIÓN DE SERIES TEMPORALES Y CORRELACIONES
 * 
 * Este módulo implementa dos visualizaciones principales:
 * 1. Un gráfico de series temporales que muestra la evolución de envíos y costos a lo largo del tiempo
 * 2. Un gráfico de dispersión (scatter plot) que muestra la correlación entre peso y costo de los envíos
 * 
 * Estas visualizaciones permiten identificar patrones temporales y relaciones entre variables,
 * facilitando el análisis de tendencias y la toma de decisiones basada en datos.
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
 * Función principal que genera o actualiza el gráfico de series temporales
 * 
 * Este gráfico muestra la evolución mensual de:
 * - Envíos internos (columnas azules)
 * - Envíos externos (columnas grises)
 * - Costo total (línea naranja)
 * 
 * La visualización combina un gráfico de columnas apiladas para los envíos
 * y una línea superpuesta para el costo, con dos ejes Y diferentes.
 * 
 * El proceso completo incluye:
 * 1. Obtención y agrupación de datos por mes
 * 2. Cálculo de métricas mensuales (envíos internos/externos y costos)
 * 3. Preparación de datos para la visualización
 * 4. Creación o actualización del gráfico combinado
 */
export function renderTimeSeriesChart() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderTimeSeriesChart:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: AGRUPACIÓN DE DATOS POR MES
    // Objeto para almacenar datos agregados por mes (suma de envíos y costos)
    // La estructura será: {año-mes: {count: número_envíos, cost: costo_total, ...}}
    const monthlyData = {};
    
    // Itera sobre cada elemento de datos para agruparlos por mes
    filteredData.forEach(item => {
        // PASO 1.1: VALIDACIÓN DE FECHA
        // Solo procesa registros que tengan una fecha válida
        if (item.date) {
            // PASO 1.2: EXTRACCIÓN DE COMPONENTES TEMPORALES
            // Convierte el string de fecha a objeto Date
            const date = new Date(item.date);
            
            // Crea una clave con formato 'YYYY-MM' para identificar cada mes
            // padStart(2, '0') asegura que el mes siempre tenga 2 dígitos (ej: '01' en vez de '1')
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            // PASO 1.3: EXTRACCIÓN DE PROPIEDADES RELEVANTES
            // Extrae el costo, convirtiéndolo a número (o 0 si no existe)
            const cost = parseFloat(item.cost_euros || 0);
            
            // Determina si el envío es interno basado en el campo int_ext
            // Busca la subcadena 'INTERNAL' en el valor del campo (insensible a mayúsculas/minúsculas)
            const isInternal = (item.int_ext || '').includes('INTERNAL');
            
            // PASO 1.4: INICIALIZACIÓN O ACTUALIZACIÓN DE ACUMULADORES
            // Si es el primer registro de este mes, inicializa su estructura
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = {
                    count: 1,                         // Contador total de envíos en el mes
                    cost: cost,                       // Acumulador de costo total en el mes
                    internalCount: isInternal ? 1 : 0, // Contador de envíos internos
                    externalCount: isInternal ? 0 : 1  // Contador de envíos externos
                };
            } else {
                // Si ya existe, incrementa el contador y acumula el costo
                monthlyData[yearMonth].count++;      // Incrementa el contador total
                monthlyData[yearMonth].cost += cost; // Suma el costo al acumulador
                
                // Incrementa el contador específico según si el envío es interno o externo
                if (isInternal) {
                    monthlyData[yearMonth].internalCount++; // Incrementa contador de internos
                } else {
                    monthlyData[yearMonth].externalCount++; // Incrementa contador de externos
                }
            }
        }
    });
    
    // PASO 2: ORDENACIÓN CRONOLÓGICA DE LOS DATOS
    // Extrae las claves (año-mes) y las ordena cronológicamente
    // Esto garantiza que los datos se visualicen en la secuencia temporal correcta
    const sortedMonths = Object.keys(monthlyData).sort();
    
    // PASO 3: VALIDACIÓN DE DATOS MÍNIMOS
    // Si no hay datos, limpia el gráfico y finaliza la función
    if (sortedMonths.length === 0) {
        // Registra en consola la ausencia de datos
        console.log("No time series data available to render chart");
        
        // Si el gráfico ya existe, lo actualiza con valores vacíos
        if (charts.timeSeries) {
            charts.timeSeries.updateOptions({
                // Vacía las categorías del eje X (meses)
                xaxis: { categories: [] },
                
                // Mantiene la configuración de los ejes Y pero sin datos
                yaxis: [
                    {
                        // Configuración del primer eje Y (cantidad de envíos)
                        axisTicks: { show: true },
                        axisBorder: { show: true, color: chartColors.primary },
                        labels: { style: { colors: chartColors.primary } },
                        title: { text: "Number of Shipments", style: { color: chartColors.primary } },
                        tooltip: { enabled: true },
                        min: 0  // Valor mínimo 0 para evitar errores
                    },
                    {
                        // Configuración del segundo eje Y (costo total)
                        seriesName: 'Total Cost (€)',
                        opposite: true,
                        axisTicks: { show: true },
                        axisBorder: { show: true, color: chartColors.secondary },
                        labels: { style: { colors: chartColors.secondary } },
                        title: { text: "Total Cost (€)", style: { color: chartColors.secondary } },
                        min: 0  // Valor mínimo 0 para evitar errores
                    }
                ],
                
                // Vacía las series de datos
                series: [
                    { name: 'Internal Shipments', data: [] },
                    { name: 'External Shipments', data: [] },
                    { name: 'Total Cost (€)', data: [] }
                ]
            });
        }
        // Sale de la función ya que no hay datos para mostrar
        return;
    }
    
    // PASO 4: PREPARACIÓN DE DATOS PARA EL GRÁFICO
    // Formatea las etiquetas del eje X (meses) en formato más legible 'MM/YYYY'
    const categories = sortedMonths.map(ym => {
        // Divide la cadena 'YYYY-MM' en sus componentes
        const [year, month] = ym.split('-');
        // Retorna en formato 'MM/YYYY' para mejor legibilidad
        return `${month}/${year}`;
    });
    
    // PASO 4.1: EXTRACCIÓN DE DATOS PARA CADA SERIE
    // Extrae los datos de cantidades totales por mes (para posible uso futuro)
    const countData = sortedMonths.map(ym => monthlyData[ym].count);
    
    // Extrae los datos de costo total por mes
    const costData = sortedMonths.map(ym => monthlyData[ym].cost);
    
    // Extrae los datos de envíos internos por mes
    const internalData = sortedMonths.map(ym => monthlyData[ym].internalCount);
    
    // Extrae los datos de envíos externos por mes
    const externalData = sortedMonths.map(ym => monthlyData[ym].externalCount);
    
    // PASO 5: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.timeSeries) {
        // PASO 5.1: ACTUALIZACIÓN DEL GRÁFICO EXISTENTE
        // Si el gráfico ya existe, solo actualiza las categorías y los datos de la serie
        charts.timeSeries.updateOptions({
            // Actualiza las categorías del eje X con los meses formateados
            xaxis: {
                categories: categories
            },
            // Actualiza las series de datos con los nuevos valores
            series: [
                {
                    name: 'Internal Shipments',
                    // Asegura que no haya valores undefined o null que podrían causar errores
                    data: internalData.map(value => value === undefined ? 0 : value)
                },
                {
                    name: 'External Shipments',
                    data: externalData.map(value => value === undefined ? 0 : value)
                },
                {
                    name: 'Total Cost (€)',
                    data: costData.map(value => value === undefined ? 0 : value)
                }
            ]
        });
    } else {
        // PASO 5.2: CREACIÓN DE UN NUEVO GRÁFICO
        // Si el gráfico no existe, configura todas las opciones y lo crea desde cero
        const options = {
            // Configuración general del gráfico
            chart: {
                height: 400,                // Altura en píxeles
                type: 'line',               // Tipo base (se sobrescribirá para la serie de columnas)
                stacked: false,             // Las series no se apilan (son independientes)
                toolbar: {
                    show: true              // Muestra la barra de herramientas para interacción
                }
            },
            // Configuración de etiquetas de datos (desactivadas para evitar sobrecarga visual)
            dataLabels: {
                enabled: false
            },
            // Configuración de los trazos (líneas)
            stroke: {
                width: [1, 1, 4],           // Grosor de línea para cada serie (en píxeles)
                                           // 1px para las columnas, 4px para la línea de costo
                curve: 'smooth'             // Curva suavizada para la línea
            },
            // Título principal del gráfico
            title: {
                text: 'Shipments and Costs Trend',
                align: 'center'             // Centrado horizontalmente
            },
            // Configuración de la cuadrícula de fondo
            grid: {
                row: {
                    colors: ['#f3f3f3', 'transparent'],  // Alterna colores de fila para mejor lectura
                    opacity: 0.5                         // Semitransparencia
                },
            },
            // Configuración del eje X (horizontal - meses)
            xaxis: {
                categories: categories,      // Etiquetas de meses para el eje X
                labels: {
                    rotate: -45,             // Rota las etiquetas 45 grados para evitar solapamiento
                    rotateAlways: true       // Siempre aplica la rotación
                }
            },
            // Configuración de los ejes Y (verticales)
            yaxis: [
                {
                    // Primer eje Y (izquierda) - Para la cantidad de envíos
                    axisTicks: {
                        show: true,          // Muestra las marcas del eje
                    },
                    axisBorder: {
                        show: true,          // Muestra el borde del eje
                        color: chartColors.primary  // Color del borde (del tema)
                    },
                    labels: {
                        style: {
                            colors: chartColors.primary,  // Color de las etiquetas numéricas
                        }
                    },
                    title: {
                        text: "Number of Shipments",  // Título descriptivo del eje
                        style: {
                            color: chartColors.primary,  // Color del título
                        }
                    },
                    tooltip: {
                        enabled: true         // Habilita tooltips para este eje
                    },
                    min: 0                    // Valor mínimo 0 para evitar errores
                },
                {
                    // Segundo eje Y (derecha) - Para el costo total
                    seriesName: 'Total Cost (€)',  // Nombre de la serie asociada
                    opposite: true,          // Ubicado en el lado opuesto (derecha)
                    axisTicks: {
                        show: true,          // Muestra las marcas del eje
                    },
                    axisBorder: {
                        show: true,          // Muestra el borde del eje
                        color: chartColors.secondary  // Color del borde (del tema)
                    },
                    labels: {
                        style: {
                            colors: chartColors.secondary,  // Color de las etiquetas numéricas
                        }
                    },
                    title: {
                        text: "Total Cost (€)",  // Título descriptivo del eje
                        style: {
                            color: chartColors.secondary,  // Color del título
                        }
                    },
                    min: 0                    // Valor mínimo 0 para evitar errores
                },
            ],
            // Configuración de tooltips (información emergente al pasar el cursor)
            tooltip: {
                shared: true,               // Muestra datos de todas las series en un solo tooltip
                intersect: false,           // Se activa al pasar cerca, no solo al intersectar exactamente
                y: [
                    {
                        // Formateador para la primera serie (envíos internos)
                        formatter: function (y) {
                            if (typeof y !== "undefined") {
                                // Muestra el valor sin decimales y añade la unidad "shipments"
                                return y.toFixed(0) + " shipments";
                            }
                            return y;
                        }
                    },
                    {
                        // Formateador para la segunda serie (envíos externos)
                        formatter: function (y) {
                            if (typeof y !== "undefined") {
                                // Muestra el valor sin decimales y añade la unidad "shipments"
                                return y.toFixed(0) + " shipments";
                            }
                            return y;
                        }
                    },
                    {
                        // Formateador para la tercera serie (costo total)
                        formatter: function (y) {
                            if (typeof y !== "undefined") {
                                // Muestra el valor en formato monetario con el símbolo de euro
                                return "€" + y.toLocaleString(undefined, {maximumFractionDigits: 0});
                            }
                            return y;
                        }
                    }
                ]
            },
            // Colores para cada serie (azul para internos, gris para externos, naranja para costo)
            colors: ['#4472C4', '#A5A5A5', '#ED7D31'],
            // Series de datos para el gráfico
            series: [
                {
                    name: 'Internal Shipments',  // Nombre descriptivo para la leyenda
                    type: 'column',           // Tipo de visualización: columnas/barras
                    data: internalData         // Datos de envíos internos por mes
                },
                {
                    name: 'External Shipments',  // Nombre descriptivo para la leyenda
                    type: 'column',           // Tipo de visualización: columnas/barras
                    data: externalData         // Datos de envíos externos por mes
                },
                {
                    name: 'Total Cost (€)',  // Nombre descriptivo para la leyenda
                    type: 'line',             // Tipo de visualización: línea
                    data: costData             // Datos de costo total por mes
                }
            ]
        };
        
        // PASO 5.3: RENDERIZADO DEL GRÁFICO
        // Crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'chartTimeSeries'
        charts.timeSeries = new ApexCharts(document.getElementById('chartTimeSeries'), options);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.timeSeries.render();
    }
}

/**
 * Función que genera o actualiza el gráfico de correlación entre peso y costo
 * 
 * Este gráfico muestra un diagrama de dispersión (scatter plot) donde:
 * - Cada punto representa un envío individual
 * - El eje X representa el peso del envío en kg
 * - El eje Y representa el costo del envío en euros
 * - Los puntos están coloreados por tipo de transporte
 * 
 * Permite identificar patrones, outliers (valores atípicos), y la relación
 * general entre el peso de los envíos y su costo, diferenciando por tipo de transporte.
 * 
 * El proceso completo incluye:
 * 1. Obtención y filtrado de datos válidos (con peso y costo)
 * 2. Agrupación de datos por tipo de transporte
 * 3. Creación o actualización del gráfico de dispersión
 */
export function renderCorrelationChart() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderCorrelationChart:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: PREPARACIÓN DE DATOS PARA EL GRÁFICO DE DISPERSIÓN
    // Array para almacenar los puntos válidos del scatter plot
    // Cada punto contendrá: x (peso), y (costo), y metadatos adicionales
    const scatterData = [];
    
    // Itera sobre cada elemento para extraer datos válidos de peso y costo
    filteredData.forEach(item => {
        // PASO 1.1: VALIDACIÓN DE DATOS MÍNIMOS
        // Verifica que tanto el peso como el costo estén presentes
        if (item.weight && item.cost_euros) {
            // PASO 1.2: CONVERSIÓN A NÚMEROS
            // Convierte los valores de string a número para cálculos
            const weight = parseFloat(item.weight);
            const cost = parseFloat(item.cost_euros);
            
            // PASO 1.3: VALIDACIÓN DE VALORES NUMÉRICOS
            // Solo considera valores numéricos válidos y positivos
            if (!isNaN(weight) && !isNaN(cost) && weight > 0 && cost > 0) {
                // PASO 1.4: ALMACENAMIENTO DEL PUNTO CON METADATOS
                // Añade el punto al array con información adicional para tooltips
                scatterData.push({
                    x: weight,                          // Valor para el eje X (peso)
                    y: cost,                            // Valor para el eje Y (costo)
                    id: item.id,                        // ID del registro para referencia
                    transport: item.transport || 'Unspecified',  // Tipo de transporte
                    description: item.description || 'No description'  // Descripción del envío
                });
            }
        }
    });
    
    // PASO 2: VALIDACIÓN DE DATOS MÍNIMOS
    // Si no hay datos válidos, limpia el gráfico y finaliza la función
    if (scatterData.length === 0) {
        // Registra en consola la ausencia de datos
        console.log("No correlation data available to render chart");
        
        // Si el gráfico ya existe, lo actualiza con series vacías
        if (charts.correlation) {
            charts.correlation.updateOptions({
                series: []  // Series vacías
            });
        }
        // Sale de la función ya que no hay datos para mostrar
        return;
    }
    
    // PASO 3: AGRUPACIÓN DE DATOS POR TIPO DE TRANSPORTE
    // Extrae los tipos de transporte únicos presentes en los datos
    // Set garantiza valores únicos, y [...Set()] lo convierte de nuevo a array
    const transportTypes = [...new Set(scatterData.map(item => item.transport))];
    
    // PASO 3.1: ORGANIZACIÓN DE DATOS POR TIPO DE TRANSPORTE
    // Mapea cada tipo de transporte a un objeto de serie con sus datos correspondientes
    const seriesData = transportTypes.map(transport => {
        return {
            name: transport,  // Nombre de la serie (tipo de transporte)
            // Filtra los puntos que corresponden a este tipo de transporte
            data: scatterData.filter(item => item.transport === transport).map(item => {
                // Para cada punto, crea un objeto con coordenadas y metadatos
                return {
                    x: item.x,              // Peso para el eje X
                    y: item.y,              // Costo para el eje Y
                    id: item.id,            // ID para referencia
                    description: item.description  // Descripción para tooltip
                };
            })
        };
    });
    
    // PASO 3.2: VALIDACIÓN POSTERIOR A LA AGRUPACIÓN
    // Verifica que después de agrupar exista al menos una serie con datos
    if (seriesData.length === 0 || seriesData.every(series => series.data.length === 0)) {
        // Registra en consola si no hay datos después de agrupar
        console.log("No correlation data available after grouping");
        
        // Si el gráfico ya existe, actualiza con series vacías
        if (charts.correlation) {
            charts.correlation.updateOptions({
                series: []  // Series vacías
            });
        }
        // Sale de la función ya que no hay datos para mostrar
        return;
    }
    
    // PASO 4: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.correlation) {
        // PASO 4.1: ACTUALIZACIÓN DEL GRÁFICO EXISTENTE
        // Si el gráfico ya existe, solo actualiza los datos de las series
        charts.correlation.updateOptions({
            series: seriesData  // Actualiza las series con los nuevos datos agrupados
        });
    } else {
        // PASO 4.2: CREACIÓN DE UN NUEVO GRÁFICO
        // Si el gráfico no existe, configura todas las opciones y lo crea desde cero
        const options = {
            // Configuración general del gráfico
            chart: {
                height: 400,         // Altura en píxeles
                type: 'scatter',     // Tipo de gráfico: dispersión (scatter)
                zoom: {
                    enabled: true,   // Permite hacer zoom en el gráfico
                    type: 'xy'       // Zoom en ambos ejes X e Y
                }
            },
            // Configuración del eje X (peso)
            xaxis: {
                title: {
                    text: 'Weight (kg)'  // Título descriptivo del eje
                },
                tickAmount: 10,      // Cantidad aproximada de marcas en el eje
            },
            // Configuración del eje Y (costo)
            yaxis: {
                title: {
                    text: 'Cost (€)'  // Título descriptivo del eje
                },
                tickAmount: 10       // Cantidad aproximada de marcas en el eje
            },
            // Título principal del gráfico
            title: {
                text: 'Correlation between Weight and Cost',
                align: 'left'        // Alineado a la izquierda
            },
            // Configuración personalizada de tooltips
            tooltip: {
                // Función personalizada para mostrar información detallada
                custom: function({series, seriesIndex, dataPointIndex, w}) {
                    // Extrae los datos del punto específico
                    const data = w.config.series[seriesIndex].data[dataPointIndex];
                    // Retorna HTML personalizado para el tooltip
                    return `<div class="p-2">
                        <b>ID:</b> ${data.id}<br>
                        <b>Transport:</b> ${w.config.series[seriesIndex].name}<br>
                        <b>Weight:</b> ${data.x} kg<br>
                        <b>Cost:</b> €${data.y.toLocaleString(undefined, {maximumFractionDigits: 2})}<br>
                        <small>${data.description}</small>
                    </div>`;
                }
            },
            // Series de datos para el gráfico (agrupadas por tipo de transporte)
            series: seriesData
        };
        
        // PASO 4.3: RENDERIZADO DEL GRÁFICO
        // Crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'chartCorrelation'
        charts.correlation = new ApexCharts(document.getElementById('chartCorrelation'), options);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.correlation.render();
    }
}