/**
 * MÓDULO DE VISUALIZACIÓN DE ARCHIVOS DE RECUPERACIÓN
 * 
 * Este módulo implementa un gráfico circular (pie chart) que muestra la distribución de los
 * registros según la presencia de archivos de recuperación (recovery files) y evidencias.
 * Permite visualizar rápidamente qué proporción de los envíos tienen documentación completa,
 * parcial o inexistente.
 * 
 * La visualización segmenta los datos en cuatro categorías posibles:
 * - Solo Recovery File (sin evidencia)
 * - Solo Evidence (sin recovery file)
 * - Ambos documentos (recovery file y evidence)
 * - Sin documentos (ni recovery file ni evidence)
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
 * Función principal que genera o actualiza el gráfico de archivos de recuperación
 * 
 * Este gráfico muestra un diagrama circular que distribuye los registros según
 * la presencia o ausencia de documentos de recuperación y evidencias.
 * 
 * El proceso completo incluye:
 * 1. Obtención y filtrado de datos según criterios actuales del dashboard
 * 2. Clasificación y conteo de registros según su documentación
 * 3. Preparación de datos para la visualización
 * 4. Creación o actualización del gráfico circular
 */
export function renderRecoveryFilesChart() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderRecoveryFilesChart:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: CONTEO DE DIFERENTES COMBINACIONES DE ARCHIVOS DE RECUPERACIÓN
    // Para cada categoría posible, contamos cuántos registros cumplen esa condición
    
    // Cuenta cuántos registros tienen un archivo de recuperación (recovery_file)
    // La expresión "item => item.recovery_file" evalúa a true si el campo existe y no es falsy
    const withRecoveryFile = filteredData.filter(item => item.recovery_file).length;
    
    // Cuenta cuántos registros tienen un archivo de evidencia (recovery_evidence)
    const withEvidence = filteredData.filter(item => item.recovery_evidence).length;
    
    // Cuenta cuántos registros tienen AMBOS archivos (recovery_file Y recovery_evidence)
    // Para esto, usamos el operador lógico && que requiere que ambas condiciones sean true
    const withBoth = filteredData.filter(item => item.recovery_file && item.recovery_evidence).length;
    
    // Obtiene el total de registros para calcular también los que no tienen ningún archivo
    const total = filteredData.length;
    
    // PASO 2: ESTRUCTURACIÓN DE DATOS PARA LAS CATEGORÍAS DEL GRÁFICO
    // Creamos un array de objetos con nombre descriptivo y valor numérico para cada categoría
    const data = [
        // PASO 2.1: REGISTROS CON SOLO RECOVERY FILE (SIN EVIDENCIA)
        // Para calcular esto, restamos del total con recovery_file los que tienen ambos
        { name: 'Recovery File Only', value: withRecoveryFile - withBoth },
        
        // PASO 2.2: REGISTROS CON SOLO EVIDENCE (SIN RECOVERY FILE)
        // Similar al anterior, restamos del total con evidence los que tienen ambos
        { name: 'Evidence Only', value: withEvidence - withBoth },
        
        // PASO 2.3: REGISTROS CON AMBOS DOCUMENTOS
        // Este valor ya lo tenemos calculado directamente
        { name: 'Recovery File and Evidence', value: withBoth },
        
        // PASO 2.4: REGISTROS SIN NINGÚN DOCUMENTO
        // Para calcular esto, al total le restamos los que tienen recovery_file o evidence,
        // pero sumamos los que tienen ambos (porque los habríamos restado dos veces)
        { name: 'No Documentation', value: total - withRecoveryFile - withEvidence + withBoth }
    ];
    
    // PASO 3: FILTRADO DE CATEGORÍAS CON VALOR CERO
    // Para mejorar la legibilidad, eliminamos las categorías que no tienen registros
    // Esto evita mostrar segmentos vacíos en el gráfico circular
    const filteredChartData = data.filter(item => item.value > 0);
    
    // PASO 4: PREPARACIÓN DE DATOS PARA APEXCHARTS
    // Extraemos los nombres para las etiquetas y los valores para la serie
    
    // Array con los nombres de las categorías (para etiquetas del gráfico)
    const labels = filteredChartData.map(item => item.name);
    
    // Array con los valores numéricos (para los segmentos del gráfico)
    const series = filteredChartData.map(item => item.value);
    
    // PASO 5: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.recoveryFiles) {
        // PASO 5.1: ACTUALIZACIÓN DEL GRÁFICO EXISTENTE
        // Si el gráfico ya existe, solo actualiza las etiquetas y los datos de la serie
        charts.recoveryFiles.updateOptions({
            labels: labels,     // Actualiza las etiquetas (nombres de categorías)
            series: series      // Actualiza los valores (cantidad de registros por categoría)
        });
    } else {
        // PASO 5.2: CREACIÓN DE UN NUEVO GRÁFICO
        // Si el gráfico no existe, configura todas las opciones y lo crea desde cero
        const options = {
            // Configuración general del gráfico
            chart: {
                type: 'pie',       // Tipo de gráfico: circular (pie)
                height: 300        // Altura en píxeles
            },
            // Etiquetas para las secciones del pie (categorías de documentación)
            labels: labels,
            // Valores para cada sección (cantidad de registros por categoría)
            series: series,
            // Colores específicos para cada categoría:
            // - Verde para registros completos (ambos documentos)
            // - Naranja y azul para registros con documentación parcial
            // - Rojo para registros sin documentación
            colors: ['#4CAF50', '#FFB74D', '#2196F3', '#E53935'],
            // Configuración de la leyenda
            legend: {
                position: 'bottom'    // Ubicación de la leyenda debajo del gráfico
            },
            // Configuración de responsividad para diferentes tamaños de pantalla
            responsive: [{
                breakpoint: 480,      // Punto de quiebre para pantallas pequeñas (480px)
                options: {
                    chart: {
                        width: 200     // Reducir el ancho en pantallas pequeñas
                    },
                    legend: {
                        position: 'bottom'   // Mantener leyenda abajo en pantallas pequeñas
                    }
                }
            }]
        };
        
        // PASO 5.3: RENDERIZADO DEL GRÁFICO
        // Crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'chartRecoveryFiles'
        charts.recoveryFiles = new ApexCharts(document.getElementById('chartRecoveryFiles'), options);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.recoveryFiles.render();
    }
}