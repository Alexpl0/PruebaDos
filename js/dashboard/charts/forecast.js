/**
 * MÓDULO DE VISUALIZACIÓN Y PRONÓSTICO DE TENDENCIAS
 * 
 * Este módulo implementa un gráfico de pronóstico que muestra la tendencia histórica 
 * de envíos y costos, y proyecta su comportamiento para los próximos meses.
 * Utiliza un método de promedio móvil simple para calcular valores futuros
 * basados en los datos históricos recientes.
 * 
 * La visualización combina datos históricos (líneas sólidas) con datos de pronóstico
 * (líneas punteadas), separados claramente por una línea vertical de anotación.
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
 * Función principal que genera o actualiza el gráfico de pronóstico
 * 
 * Este gráfico muestra:
 * 1. Datos históricos de cantidad de envíos y costos mensuales
 * 2. Pronóstico para los próximos 3 meses usando promedio móvil simple
 * 3. Una clara separación visual entre datos históricos y proyecciones
 * 
 * El proceso completo incluye:
 * - Agrupación de datos por mes
 * - Cálculo de promedios móviles para proyección
 * - Visualización combinada de datos históricos y pronósticos
 */
export function renderForecastChart() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderForecastChart:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: AGRUPACIÓN DE DATOS POR MES
    // Objeto para almacenar datos agregados por mes (suma de envíos y costos)
    // La estructura será: {año-mes: {count: número_de_envíos, cost: costo_total}}
    const monthlyData = {};
    
    // Itera sobre cada registro para agruparlos por mes
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
            
            // Extrae el costo, convirtiéndolo a número (o 0 si no existe)
            const cost = parseFloat(item.cost_euros || 0);
            
            // PASO 1.3: ACUMULACIÓN EN ESTRUCTURA MENSUAL
            // Si es el primer registro de este mes, inicializa su estructura
            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = {
                    count: 1,          // Inicializa el contador de envíos en 1
                    cost: cost          // Inicializa el costo con el valor de este registro
                };
            } else {
                // Si ya existe, incrementa el contador y acumula el costo
                monthlyData[yearMonth].count++;
                monthlyData[yearMonth].cost += cost;
            }
        }
    });
    
    // PASO 2: ORDENACIÓN CRONOLÓGICA DE LOS DATOS
    // Extrae las claves (año-mes) y las ordena cronológicamente
    // Esto garantiza que los datos se visualicen en la secuencia temporal correcta
    const sortedMonths = Object.keys(monthlyData).sort();
    
    // PASO 3: PREPARACIÓN DE DATOS HISTÓRICOS
    // Transforma las claves ordenadas en formato legible para etiquetas del eje X
    // Convierte 'YYYY-MM' a 'MM/YYYY' para mejor legibilidad
    const categories = sortedMonths.map(ym => {
        const [year, month] = ym.split('-');  // Separa el año y mes
        return `${month}/${year}`;            // Retorna en formato MM/YYYY
    });
    
    // Extrae los datos de cantidad de envíos para cada mes, manteniendo el orden
    const countData = sortedMonths.map(ym => monthlyData[ym].count);
    
    // Extrae los datos de costo total para cada mes, manteniendo el orden
    const costData = sortedMonths.map(ym => monthlyData[ym].cost);
    
    // PASO 4: GENERACIÓN DE PRONÓSTICO
    // Solo genera pronóstico si hay suficientes datos históricos (al menos 3 meses)
    if (categories.length >= 3) {
        // PASO 4.1: CÁLCULO DE PROMEDIOS MÓVILES
        // Calcula el promedio de envíos de los últimos 3 meses (promedio móvil simple)
        // reduce() suma todos los valores y luego dividimos por 3 para obtener el promedio
        const lastThreeCountsAvg = countData.slice(-3).reduce((a, b) => a + b, 0) / 3;
        
        // Calcula el promedio de costos de los últimos 3 meses
        const lastThreeCostsAvg = costData.slice(-3).reduce((a, b) => a + b, 0) / 3;
        
        // PASO 4.2: GENERACIÓN DE FECHAS FUTURAS
        // Obtiene la fecha del último mes en los datos históricos
        // El -01 se añade para crear una fecha válida con el primer día del mes
        const lastDate = new Date(`${sortedMonths[sortedMonths.length - 1]}-01`);
        
        // PASO 4.3: GENERACIÓN DE DATOS DE PRONÓSTICO
        // Genera datos para los próximos 3 meses a partir del último mes histórico
        for (let i = 1; i <= 3; i++) {
            // Crea una nueva fecha incrementando i meses desde la última fecha histórica
            const nextDate = new Date(lastDate);
            nextDate.setMonth(lastDate.getMonth() + i);
            
            // Extrae el mes y año en formato adecuado para las etiquetas
            const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
            const nextYear = nextDate.getFullYear();
            
            // Añade la nueva etiqueta al array de categorías
            categories.push(`${nextMonth}/${nextYear}`);
            
            // Añade el valor pronosticado de envíos (promedio de los últimos 3 meses)
            countData.push(lastThreeCountsAvg);
            
            // Añade el valor pronosticado de costos (promedio de los últimos 3 meses)
            costData.push(lastThreeCostsAvg);
        }
    }
    
    // PASO 5: SEPARACIÓN DE DATOS HISTÓRICOS Y PRONÓSTICO
    // Esta separación permite aplicar estilos diferentes a cada segmento en el gráfico
    
    // Separa las categorías (meses) entre históricos y pronóstico
    const historicalCategories = categories.slice(0, sortedMonths.length);
    const forecastCategories = categories.slice(sortedMonths.length);
    
    // Separa los datos de cantidad de envíos entre históricos y pronóstico
    const historicalCount = countData.slice(0, sortedMonths.length);
    const forecastCount = countData.slice(sortedMonths.length);
    
    // Separa los datos de costos entre históricos y pronóstico
    const historicalCost = costData.slice(0, sortedMonths.length);
    const forecastCost = costData.slice(sortedMonths.length);
    
    // PASO 6: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.forecast) {
        // PASO 6.1: ACTUALIZACIÓN DEL GRÁFICO EXISTENTE
        // Si el gráfico ya existe, actualiza sus opciones con los nuevos datos
        charts.forecast.updateOptions({
            // Actualiza las categorías del eje X con todos los meses (históricos + pronóstico)
            xaxis: {
                categories: categories,
                labels: {
                    rotate: -45,          // Rota las etiquetas para mejor lectura
                    rotateAlways: true    // Siempre rota las etiquetas
                }
            },
            // Actualiza la anotación que marca la separación entre datos históricos y pronóstico
            annotations: {
                xaxis: [{
                    x: historicalCategories.length - 0.5,  // Posición (justo después del último dato histórico)
                    strokeDashArray: 0,                    // Línea sólida (no punteada)
                    borderColor: '#775DD0',                // Color púrpura para la línea
                    label: {
                        borderColor: '#775DD0',            // Color del borde de la etiqueta
                        style: {
                            color: '#fff',                 // Color del texto (blanco)
                            background: '#775DD0'          // Color de fondo (púrpura)
                        },
                        text: 'Pronóstico'                 // Texto de la etiqueta
                    }
                }]
            },
            // Actualiza las series de datos (históricos y pronóstico)
            series: [
                {
                    name: 'Envíos (Histórico)',
                    data: historicalCount                  // Datos históricos de envíos
                },
                {
                    name: 'Envíos (Pronóstico)',
                    // Añade valores null para alinear con la posición correcta en el eje X
                    // y luego añade los valores de pronóstico
                    data: Array(historicalCount.length).fill(null).concat(forecastCount)
                },
                {
                    name: 'Costo (Histórico)',
                    data: historicalCost                   // Datos históricos de costos
                },
                {
                    name: 'Costo (Pronóstico)',
                    // Añade valores null para alinear con la posición correcta en el eje X
                    // y luego añade los valores de pronóstico
                    data: Array(historicalCost.length).fill(null).concat(forecastCost)
                }
            ]
        });
    } else {
        // PASO 6.2: CREACIÓN DE UN NUEVO GRÁFICO
        // Si el gráfico no existe, configura todas las opciones y lo crea desde cero
        const options = {
            // Configuración general del gráfico
            chart: {
                height: 400,              // Altura en píxeles
                type: 'line',             // Tipo de gráfico: línea
                zoom: {
                    enabled: true         // Permite hacer zoom en el gráfico
                },
                toolbar: {
                    show: true            // Muestra la barra de herramientas
                }
            },
            // Configuración de los trazos (líneas)
            stroke: {
                width: [3, 3, 2, 2],      // Grosores específicos para cada serie (en píxeles)
                curve: 'smooth',          // Curvas suavizadas entre puntos
                dashArray: [0, 5, 0, 5]   // Patrones de líneas: sólidas para histórico, punteadas para pronóstico
            },
            // Colores para cada serie
            colors: [chartColors.primary, '#775DD0', chartColors.secondary, '#FFA500'],
            // Configuración de los marcadores (puntos en las líneas)
            markers: {
                size: [4, 4, 0, 0],       // Tamaños específicos por serie (0 = sin marcadores)
                hover: {
                    size: 6               // Tamaño aumentado al pasar el cursor
                }
            },
            // Configuración del eje X
            xaxis: {
                categories: categories,    // Etiquetas de meses para el eje X
                labels: {
                    rotate: -45,           // Rota las etiquetas 45 grados
                    rotateAlways: true     // Siempre rota las etiquetas
                }
            },
            // Configuración de los ejes Y
            yaxis: [
                {
                    // Primer eje Y (izquierda) - Para la cantidad de envíos
                    title: {
                        text: 'Cantidad de Envíos'  // Título del eje
                    },
                    min: 0                          // Valor mínimo (siempre desde cero)
                },
                {
                    // Segundo eje Y (derecha) - Para los costos
                    opposite: true,                 // Ubicado en el lado opuesto (derecha)
                    title: {
                        text: 'Costo (€)'           // Título del eje
                    },
                    min: 0                          // Valor mínimo (siempre desde cero)
                }
            ],
            // Configuración de tooltips (información emergente al pasar el cursor)
            tooltip: {
                shared: true,              // Muestra datos de todas las series en un solo tooltip
                intersect: false           // Se activa al pasar cerca, no solo al intersectar exactamente
            },
            // Configuración de la leyenda
            legend: {
                position: 'top'            // Ubicada en la parte superior del gráfico
            },
            // Anotaciones para marcar la separación entre datos históricos y pronóstico
            annotations: {
                xaxis: [{
                    x: historicalCategories.length - 0.5,  // Posición (después del último dato histórico)
                    strokeDashArray: 0,                    // Línea sólida
                    borderColor: '#775DD0',                // Color púrpura
                    label: {
                        borderColor: '#775DD0',            // Color del borde de la etiqueta
                        style: {
                            color: '#fff',                 // Color del texto (blanco)
                            background: '#775DD0'          // Color de fondo (púrpura)
                        },
                        text: 'Pronóstico'                 // Texto de la etiqueta
                    }
                }]
            },
            // Series de datos para el gráfico
            series: [
                {
                    name: 'Envíos (Histórico)',    // Nombre para la leyenda
                    type: 'line',                  // Tipo de visualización
                    data: historicalCount          // Datos históricos de cantidad de envíos
                },
                {
                    name: 'Envíos (Pronóstico)',   // Nombre para la leyenda
                    type: 'line',                  // Tipo de visualización
                    // Array de null para alinear + datos de pronóstico
                    data: Array(historicalCount.length).fill(null).concat(forecastCount)
                },
                {
                    name: 'Costo (Histórico)',     // Nombre para la leyenda
                    type: 'line',                  // Tipo de visualización
                    data: historicalCost           // Datos históricos de costos
                },
                {
                    name: 'Costo (Pronóstico)',    // Nombre para la leyenda
                    type: 'line',                  // Tipo de visualización
                    // Array de null para alinear + datos de pronóstico
                    data: Array(historicalCost.length).fill(null).concat(forecastCost)
                }
            ]
        };
        
        // PASO 6.3: RENDERIZADO DEL GRÁFICO
        // Crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'chartForecast'
        charts.forecast = new ApexCharts(document.getElementById('chartForecast'), options);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.forecast.render();
    }
}