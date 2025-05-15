/**
 * MÓDULO DE VISUALIZACIÓN DE DISTRIBUCIÓN POR ÁREA
 * 
 * Este módulo genera un gráfico de barras apiladas que muestra la distribución 
 * de envíos por área y tipo (interno, externo u otro), permitiendo visualizar
 * qué áreas tienen mayor cantidad de envíos y cómo se distribuyen estos según su tipo.
 * 
 * El gráfico facilita la comparación entre diferentes áreas de la organización
 * y ayuda a identificar patrones en la distribución de envíos internos y externos.
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
 * Función principal que genera o actualiza el gráfico de distribución por área
 * 
 * Este gráfico visualiza cómo se distribuyen los envíos entre las diferentes áreas
 * de la organización, segmentando los datos por tipo de envío (interno/externo).
 * 
 * El proceso completo incluye:
 * 1. Obtención y procesamiento de datos filtrados
 * 2. Agrupación y conteo de envíos por área y tipo
 * 3. Preparación de datos para la visualización
 * 4. Creación o actualización del gráfico de barras apiladas
 */
export function renderAreaDistributionChart() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderAreaDistributionChart:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: PROCESAMIENTO Y AGRUPACIÓN DE DATOS
    // Objeto para almacenar los conteos de envíos por área y tipo (interno/externo/otro)
    // La estructura será: {nombreÁrea: {INTERNAL: contador, EXTERNAL: contador, other: contador}}
    const areaData = {};
    
    // Iteración sobre cada elemento de datos para contabilizarlo en su área y tipo correspondiente
    filteredData.forEach(item => {
        // PASO 1.1: EXTRACCIÓN DE PROPIEDADES RELEVANTES
        // Obtiene el área del ítem, usando 'Sin especificar' como valor predeterminado si es null/undefined
        const area = item.area || 'Sin especificar';
        // Obtiene el tipo de envío (interno/externo), usando 'Sin especificar' como valor predeterminado
        const intExt = item.int_ext || 'Sin especificar';
        
        // PASO 1.2: INICIALIZACIÓN DE CONTADORES POR ÁREA
        // Si es la primera vez que encontramos esta área, crea su estructura de contadores
        if (!areaData[area]) {
            // Inicializa los contadores para los tres tipos posibles en cero
            areaData[area] = { INTERNAL: 0, EXTERNAL: 0, other: 0 };
        }
        
        // PASO 1.3: INCREMENTO DEL CONTADOR CORRESPONDIENTE
        // Incrementa el contador apropiado según el tipo de envío
        if (intExt.includes('INTERNAL')) {
            // Si el tipo contiene 'INTERNAL', incrementa el contador de internos
            areaData[area].INTERNAL++;
        } else if (intExt.includes('EXTERNAL')) {
            // Si el tipo contiene 'EXTERNAL', incrementa el contador de externos
            areaData[area].EXTERNAL++;
        } else {
            // Si no coincide con ninguno de los anteriores, incrementa el contador de otros
            areaData[area].other++;
        }
    });
    
    // PASO 2: PREPARACIÓN DE DATOS PARA APEXCHARTS
    // Extrae los nombres de todas las áreas encontradas (serán las categorías del eje X)
    const areas = Object.keys(areaData);
    
    // PASO 2.1: EXTRACCIÓN DE DATOS PARA CADA SERIE
    // Crea arrays con los conteos para cada tipo de envío, manteniendo el orden de las áreas
    // Array con la cantidad de envíos internos por cada área
    const internal = areas.map(area => areaData[area].INTERNAL);
    // Array con la cantidad de envíos externos por cada área
    const external = areas.map(area => areaData[area].EXTERNAL);
    // Array con la cantidad de envíos de otro tipo por cada área
    const other = areas.map(area => areaData[area].other);
    
    // PASO 3: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.areaDistribution) {
        // PASO 3.1: ACTUALIZACIÓN DEL GRÁFICO EXISTENTE
        // Si el gráfico ya existe, solo actualiza las categorías y los datos de las series
        charts.areaDistribution.updateOptions({
            xaxis: { categories: areas },          // Actualiza las categorías (áreas) en el eje X
            series: [
                { name: 'Internal', data: internal }, // Actualiza la serie de envíos internos
                { name: 'External', data: external }, // Actualiza la serie de envíos externos
                { name: 'Otros', data: other }        // Actualiza la serie de otros envíos
            ]
        });
    } else {
        // PASO 3.2: CREACIÓN DE UN NUEVO GRÁFICO
        // Si el gráfico no existe, configura todas las opciones y lo crea desde cero
        const options = {
            // Configuración general del gráfico
            chart: {
                type: 'bar',            // Tipo de gráfico: barras verticales
                height: 350,            // Altura del gráfico en píxeles
                stacked: true,          // Activa el modo "apilado" para las barras
                toolbar: { show: true } // Muestra la barra de herramientas para interacción
            },
            // Configuración específica para las barras
            plotOptions: {
                bar: {
                    horizontal: false,      // Barras verticales (no horizontales)
                    columnWidth: '55%',     // Ancho de las columnas (55% del espacio disponible)
                    endingShape: 'rounded'  // Forma redondeada al final de las barras
                },
            },
            // Configuración de etiquetas de datos (desactivadas para evitar sobrecarga visual)
            dataLabels: { enabled: false },
            // Configuración de bordes para las barras
            stroke: { 
                show: true,              // Muestra bordes
                width: 2,                // Grosor del borde en píxeles
                colors: ['transparent']  // Color transparente para los bordes
            },
            // Configuración del eje X (horizontal)
            xaxis: { 
                categories: areas        // Nombres de las áreas como categorías
            },
            // Configuración del eje Y (vertical)
            yaxis: {
                title: { 
                    text: 'Cantidad de envíos'  // Título descriptivo del eje Y
                }
            },
            // Configuración de opacidad del relleno
            fill: { 
                opacity: 1  // Opacidad completa (sin transparencia)
            },
            // Configuración de las etiquetas emergentes (tooltips)
            tooltip: {
                y: {
                    formatter: function (val) {
                        // Formatea el valor mostrado en el tooltip añadiendo la unidad "envíos"
                        return val + " envíos";
                    }
                }
            },
            // Colores para cada serie, usando la paleta predefinida en la configuración global
            colors: [
                chartColors.primary,    // Color para envíos internos
                chartColors.secondary,  // Color para envíos externos
                chartColors.neutral     // Color para otros envíos
            ],
            // Definición de las series de datos a visualizar
            series: [
                { name: 'Internal', data: internal }, // Serie para envíos internos
                { name: 'External', data: external }, // Serie para envíos externos
                { name: 'Otros', data: other }        // Serie para otros envíos
            ]
        };
        
        // PASO 3.3: RENDERIZADO DEL GRÁFICO
        // Crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'chartAreaDistribution'
        charts.areaDistribution = new ApexCharts(document.getElementById('chartAreaDistribution'), options);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.areaDistribution.render();
    }
}