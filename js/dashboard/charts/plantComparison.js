/**
 * MÓDULO DE COMPARACIÓN ENTRE PLANTAS
 * 
 * Este módulo implementa un gráfico de radar (también conocido como "gráfico de araña" o "diagrama polar")
 * que permite comparar el rendimiento de las principales plantas de la compañía
 * según diferentes métricas clave: volumen de envíos, costos, tipos de envío, etc.
 * 
 * La visualización facilita identificar rápidamente fortalezas y debilidades relativas
 * entre plantas, mostrando un perfil completo de cada una en una única representación.
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
 * Función principal que genera o actualiza el gráfico de comparación entre plantas
 * 
 * Este gráfico muestra un radar comparativo de las 5 plantas con mayor número de envíos,
 * evaluándolas según múltiples métricas que se normalizan para facilitar la comparación.
 * 
 * El proceso completo incluye:
 * 1. Obtención y filtrado de datos según criterios actuales del dashboard
 * 2. Identificación de las 5 plantas con mayor volumen de envíos
 * 3. Cálculo de diversas métricas para cada planta (costo, tiempo, % de internos, etc.)
 * 4. Normalización de métricas para poder compararlas en una misma escala (0-100%)
 * 5. Generación del gráfico radar mostrando el perfil completo de cada planta
 */
export function renderPlantComparison() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderPlantComparison:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: IDENTIFICACIÓN DE PLANTAS Y SU FRECUENCIA
    // Objeto para almacenar el conteo de registros por cada planta
    // La estructura será: {nombrePlanta: cantidadRegistros}
    const plantCounts = {};
    
    // Itera sobre cada elemento de datos para contabilizar las plantas
    filteredData.forEach(item => {
        // Extrae el nombre de la planta, usando 'Sin especificar' como valor predeterminado
        // si el campo está vacío, es null o undefined
        const planta = item.planta || 'Unspecified';
        
        // Si es la primera vez que encontramos esta planta, inicializa su contador en 1
        if (!plantCounts[planta]) {
            plantCounts[planta] = 1;
        } else {
            // Si ya existía en nuestro objeto, incrementa su contador
            plantCounts[planta]++;
        }
    });
    
    // PASO 2: SELECCIÓN DE LAS PLANTAS MÁS RELEVANTES
    // Transforma el objeto de conteo en array de pares [planta, cantidad],
    // los ordena de mayor a menor y selecciona las 5 plantas con más registros
    const topPlantas = Object.entries(plantCounts)
        .sort((a, b) => b[1] - a[1])    // Ordena descendente por cantidad (segunda posición del par)
        .slice(0, 5)                     // Limita a las 5 primeras plantas
        .map(([planta]) => planta);      // Extrae solo los nombres de planta (para simplicidad)
    
    // PASO 3: DEFINICIÓN DE MÉTRICAS A EVALUAR
    // Array de objetos que define cada métrica y cómo calcularla
    // Cada objeto contiene: nombre descriptivo y función para calcular su valor
    const metrics = [
        { 
            name: "Records", 
            // Métrica simple: cantidad total de registros para esta planta
            getValue: (data) => data.length 
        },
        { 
            name: "Average Cost (€)", 
            // Métrica calculada: promedio de costos de todos los envíos de la planta
            getValue: (data) => {
                // Suma todos los costos (convirtiendo a número y usando 0 si no hay valor)
                const total = data.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
                // Divide por el número de registros (o retorna 0 si no hay registros)
                return data.length > 0 ? total / data.length : 0;
            }
        },
        { 
            name: "% Internal", 
            // Métrica calculada: porcentaje de envíos internos sobre el total
            getValue: (data) => {
                // Cuenta cuántos registros tienen 'INTERNAL' en el campo int_ext
                const internos = data.filter(item => (item.int_ext || '').includes('INTERNAL')).length;
                // Calcula el porcentaje (o retorna 0 si no hay registros)
                return data.length > 0 ? (internos / data.length) * 100 : 0;
            }
        },
        { 
            name: "Approval Time (days)", 
            // Métrica calculada: tiempo promedio entre creación y aprobación
            getValue: (data) => {
                // Filtra solo los registros que tienen ambas fechas (creación y aprobación)
                const itemsConAprobacion = data.filter(item => item.date && item.approval_date);
                // Si no hay registros con ambas fechas, retorna 0
                if (itemsConAprobacion.length === 0) return 0;
                
                // Calcula la suma total de días entre fechas
                const tiempoTotal = itemsConAprobacion.reduce((sum, item) => {
                    // Convierte strings de fecha a objetos Date de JavaScript
                    const createDate = new Date(item.date);
                    const approvalDate = new Date(item.approval_date);
                    
                    // Calcula la diferencia en milisegundos y la convierte a días
                    const diffTime = Math.abs(approvalDate - createDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    // Acumula en el sumador
                    return sum + diffDays;
                }, 0);
                
                // Retorna el promedio (suma total dividida por cantidad de registros)
                return tiempoTotal / itemsConAprobacion.length;
            }
        },
        { 
            name: "Average Weight (kg)", 
            // Métrica calculada: peso promedio de los envíos de la planta
            getValue: (data) => {
                // Suma todos los pesos (convirtiendo a número y usando 0 si no hay valor)
                const total = data.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
                // Divide por el número de registros (o retorna 0 si no hay registros)
                return data.length > 0 ? total / data.length : 0;
            }
        }
    ];
    
    // PASO 4: FUNCIÓN DE NORMALIZACIÓN DE VALORES
    // Esta función convierte los valores diversos de cada métrica a una escala común (0-100%)
    // permitiendo comparar métricas que de otro modo serían incomparables por sus unidades
    const normalizeValue = (value, metricName, allValues) => {
        // Encuentra el valor máximo para esta métrica entre todas las plantas
        const max = Math.max(...allValues);
        
        // Para algunas métricas donde un valor bajo es mejor (como tiempo o costo),
        // se invierte la escala de normalización para que la visualización sea consistente
        if (metricName === "Approval Time (days)" || metricName === "Average Cost (€)") {
            // La fórmula (1 - valor/max) * 100 invierte la escala:
            // - El valor mínimo se convierte en 100%
            // - El valor máximo se convierte en 0%
            return max ? (1 - (value / max)) * 100 : 0;
        }
        
        // Para métricas donde un valor alto es mejor (como número de registros),
        // normaliza directamente como porcentaje del máximo
        return max ? (value / max) * 100 : 0;
    };
    
    // PASO 5: CÁLCULO DE VALORES DE MÉTRICAS POR PLANTA
    // Crea una estructura que almacenará toda la información de cada planta
    // para facilitar el procesamiento posterior
    const series = topPlantas.map(planta => {
        // Filtra los datos para obtener solo los registros de esta planta
        const plantaData = filteredData.filter(item => item.planta === planta);
        
        // Retorna un objeto con la información de la planta
        return {
            planta: planta,              // Nombre de la planta
            data: plantaData,            // Datos completos de esa planta
            values: []                   // Array que se llenará con los valores de cada métrica
        };
    });
    
    // PASO 6: PROCESAMIENTO DE CADA MÉTRICA
    // Itera sobre cada métrica definida para calcular sus valores en todas las plantas
    metrics.forEach(metric => {
        // Calcula los valores brutos de esta métrica para todas las plantas
        // Esto crea un array con un valor por cada planta (en el mismo orden)
        const rawValues = series.map(s => metric.getValue(s.data));
        
        // Para cada planta, calcular valor normalizado y guardarlo
        series.forEach((s, i) => {
            // Obtiene el valor bruto calculado para esta planta
            const rawValue = rawValues[i];
            
            // Normaliza el valor entre 0-100% para que sea comparable con otras métricas
            const normalizedValue = normalizeValue(rawValue, metric.name, rawValues);
            
            // Añade la información completa de esta métrica al array de valores de la planta
            s.values.push({
                metric: metric.name,                // Nombre de la métrica
                rawValue: rawValue,                 // Valor original calculado (con sus unidades)
                normalizedValue: normalizedValue    // Valor normalizado (0-100%) para el gráfico
            });
        });
    });
    
    // PASO 7: PREPARACIÓN DE DATOS PARA APEXCHARTS
    // Transforma la estructura de datos al formato específico requerido por ApexCharts
    const apexSeries = series.map(s => ({
        name: s.planta,                             // Nombre de la planta para la leyenda
        data: s.values.map(v => v.normalizedValue)  // Array de valores normalizados para esta planta
    }));
    
    // PASO 8: CONFIGURACIÓN DEL GRÁFICO RADAR
    // Define todas las opciones de configuración para el gráfico de ApexCharts
    const apexOptions = {
        // Configuración general del gráfico
        chart: {
            height: 450,                // Altura en píxeles
            type: 'radar',              // Tipo de gráfico: radar (también llamado "araña")
            toolbar: {
                show: true              // Muestra la barra de herramientas para interacción
            },
            dropShadow: {
                enabled: true,          // Añade sombra para mejor visualización
                blur: 1,                // Desenfoque de la sombra
                left: 1,                // Desplazamiento horizontal
                top: 1                  // Desplazamiento vertical
            }
        },
        // Series de datos (cada planta es una serie con sus valores normalizados)
        series: apexSeries,
        // Etiquetas para cada eje del radar (nombres de las métricas)
        labels: metrics.map(m => m.name),
        // Configuración específica para gráficos tipo radar
        plotOptions: {
            radar: {
                size: 140,              // Tamaño del radar
                polygons: {
                    strokeWidth: 1,     // Grosor de las líneas de la cuadrícula
                    strokeColor: '#e9e9e9',  // Color de las líneas
                    // Configuración del relleno del polígono base
                    fill: {
                        colors: ['#f8f8f8', '#fff']  // Colores alternos para mejor visibilidad
                    }
                }
            }
        },
        // Colores para cada planta (toma los primeros 5 de la paleta predefinida)
        colors: chartColors.palette.slice(0, 5),
        // Configuración de los marcadores (puntos en las líneas)
        markers: {
            size: 4,                    // Tamaño en píxeles
            colors: ['#fff'],           // Color de relleno (blanco)
            strokeColors: chartColors.palette.slice(0, 5),  // Borde del color de la serie
            strokeWidth: 2              // Grosor del borde
        },
        // Configuración de tooltip (información emergente al pasar el cursor)
        tooltip: {
            y: {
                // Función personalizada para mostrar los valores originales (no normalizados)
                // en el formato adecuado según la métrica (€, %, días, etc.)
                formatter: function(val, { seriesIndex, dataPointIndex }) {
                    // Obtiene la definición de la métrica actual
                    const metric = metrics[dataPointIndex];
                    // Obtiene el valor original (no normalizado) para esta planta y métrica
                    const rawValue = series[seriesIndex].values[dataPointIndex].rawValue;
                    
                    // Formatea el valor según el tipo de métrica
                    if (metric.name === "Average Cost (€)") {
                        return `€${rawValue.toFixed(2)}`;  // Formato monetario con 2 decimales
                    } else if (metric.name === "% Internal") {
                        return `${rawValue.toFixed(1)}%`;  // Formato porcentaje con 1 decimal
                    } else if (metric.name === "Approval Time (days)") {
                        return `${rawValue.toFixed(1)} days`;  // Formato días con 1 decimal
                    } else if (metric.name === "Average Weight (kg)") {
                        return `${rawValue.toFixed(1)} kg`;  // Formato peso con 1 decimal
                    } else {
                        // Para otras métricas, formato numérico con separadores de miles
                        return rawValue.toLocaleString();
                    }
                }
            }
        },
        // Configuración del eje Y (valores normalizados)
        yaxis: {
            tickAmount: 5,              // Número de líneas de cuadrícula concéntricas
            labels: {
                formatter: function(val) {
                    // Formato entero para los valores normalizados (0-100)
                    return val.toFixed(0);
                }
            }
        }
    };
    
    // PASO 9: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.plantComparison) {
        // Si el gráfico ya existe, actualiza sus opciones con los nuevos datos
        charts.plantComparison.updateOptions(apexOptions);
    } else {
        // Si no existe, crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'plantComparisonChart'
        charts.plantComparison = new ApexCharts(document.getElementById('plantComparisonChart'), apexOptions);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.plantComparison.render();
    }
}