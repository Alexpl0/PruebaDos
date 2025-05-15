/**
 * MÓDULO DE GRÁFICOS DE APROBACIÓN DE SOLICITUDES
 * 
 * Este módulo se encarga de generar y actualizar visualizaciones relacionadas con
 * los tiempos de aprobación de solicitudes en el sistema. Proporciona información
 * visual sobre cuánto tiempo toman los procesos de aprobación y rechazo.
 * 
 * Utiliza la biblioteca ApexCharts para crear gráficos interactivos y visualmente
 * atractivos que ayudan a interpretar los datos de manera eficiente.
 */

// Importa la función para obtener los datos filtrados según los criterios establecidos en el dashboard
// y la configuración general de los gráficos (colores, referencias globales, etc.)
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Función principal que genera o actualiza el gráfico de tiempo promedio de aprobación
 * 
 * Este gráfico muestra, mediante barras horizontales, el tiempo promedio (en días) que 
 * tarda cada tipo de solicitud en ser aprobada o rechazada.
 * 
 * El proceso completo incluye:
 * 1. Obtención y filtrado de datos
 * 2. Cálculo de tiempos de aprobación para cada registro
 * 3. Cálculo de promedios por estado (aprobado/rechazado)
 * 4. Generación o actualización del gráfico
 */
export function renderApprovalTimeChart() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    console.log("[DEBUG] renderApprovalTimeChart:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: PROCESAMIENTO INICIAL DE DATOS
    // Array para almacenar los datos de tiempo de aprobación de cada registro individual
    // Cada elemento contendrá: id del registro, días transcurridos y estado final
    const approvalTimeData = [];
    
    // Itera sobre cada registro filtrado para calcular su tiempo de aprobación
    filteredData.forEach(item => {
        // PASO 1.1: VALIDACIÓN DE DATOS
        // Verifica que el registro tenga todos los campos necesarios para el cálculo:
        // - Fecha de creación (date)
        // - Fecha de aprobación/rechazo (approval_date)
        // - Estado final válido (aprobado o rechazado)
        if (item.date && item.approval_date && item.status_name && 
            (item.status_name === 'aprobado' || item.status_name === 'rechazado')) {
            
            // PASO 1.2: CONVERSIÓN DE FECHAS
            // Convierte los strings de fecha a objetos Date para poder realizar cálculos
            const createDate = new Date(item.date);           // Fecha cuando se creó la solicitud
            const approvalDate = new Date(item.approval_date); // Fecha cuando se aprobó/rechazó
            
            // PASO 1.3: CÁLCULO DE DIFERENCIA EN DÍAS
            // Calcula la diferencia de tiempo en milisegundos (valor absoluto para evitar negativos)
            const diffTime = Math.abs(approvalDate - createDate);
            // Convierte la diferencia de milisegundos a días redondeando hacia arriba
            // El cálculo divide los milisegundos por: 1000 (a segundos) * 60 (a minutos) * 60 (a horas) * 24 (a días)
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // PASO 1.4: ALMACENAMIENTO DEL RESULTADO INDIVIDUAL
            // Guarda los datos calculados en el array para su posterior procesamiento
            approvalTimeData.push({
                id: item.id,             // Identificador único del registro
                days: diffDays,          // Días transcurridos hasta la aprobación/rechazo
                status: item.status_name // Estado final (aprobado o rechazado)
            });
        }
    });
    
    // PASO 2: CÁLCULO DE PROMEDIOS POR ESTADO
    // Objetos para acumular los valores necesarios para calcular promedios
    const avgByStatus = {};    // Acumulará la suma de días por cada estado
    const countByStatus = {};  // Contará cuántos registros hay de cada estado
    
    // Recorre cada registro procesado para acumular valores por estado
    approvalTimeData.forEach(item => {
        // Si es la primera vez que encontramos este estado, inicializa los acumuladores
        if (!avgByStatus[item.status]) {
            avgByStatus[item.status] = item.days;    // Inicializa la suma con el primer valor
            countByStatus[item.status] = 1;          // Inicializa el contador en 1
        } else {
            // Si ya existía, acumula el nuevo valor y aumenta el contador
            avgByStatus[item.status] += item.days;   // Suma los días al acumulador
            countByStatus[item.status]++;            // Incrementa el contador de registros
        }
    });
    
    // PASO 3: CÁLCULO FINAL DE PROMEDIOS
    // Divide la suma acumulada por el número de registros para obtener el promedio real
    for (const status in avgByStatus) {
        avgByStatus[status] = avgByStatus[status] / countByStatus[status];
    }
    
    // PASO 4: PREPARACIÓN DE DATOS PARA EL GRÁFICO
    // Extrae los nombres de los estados (categorías para el eje Y del gráfico)
    const categories = Object.keys(avgByStatus);     
    // Extrae los valores promedio (datos para las barras del gráfico)
    const seriesData = Object.values(avgByStatus);   
    
    // PASO 5: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.approvalTime) {
        // PASO 5.1: ACTUALIZACIÓN DEL GRÁFICO EXISTENTE
        // Si el gráfico ya existe, solo actualiza las categorías y los datos de la serie
        charts.approvalTime.updateOptions({
            xaxis: { categories: categories },       // Actualiza las categorías (estados)
            series: [{ data: seriesData }]           // Actualiza los datos de la serie (promedios)
        });
    } else {
        // PASO 5.2: CREACIÓN DE UN NUEVO GRÁFICO
        // Si el gráfico no existe, configura todas las opciones y lo crea desde cero
        const options = {
            // Configuración general del gráfico
            chart: {
                type: 'bar',       // Tipo de gráfico: barras
                height: 350        // Altura en píxeles
            },
            // Configuración específica para las barras
            plotOptions: {
                bar: {
                    borderRadius: 4,        // Bordes redondeados de las barras
                    horizontal: true        // Barras horizontales (de izquierda a derecha)
                }
            },
            // Configuración de las etiquetas de datos mostradas en las barras
            dataLabels: {
                enabled: true,              // Muestra etiquetas con los valores
                formatter: function(val) {
                    // Formatea el valor a 1 decimal y añade la unidad 'días'
                    return val.toFixed(1) + ' días';
                }
            },
            // Configuración del eje X (horizontal, ya que las barras son horizontales)
            xaxis: {
                categories: categories,     // Categorías a mostrar (estados)
                title: {
                    text: 'Tiempo promedio (días)'  // Título descriptivo del eje
                }
            },
            // Color de las barras, usando el color primario definido en la configuración global
            colors: [chartColors.primary],
            // Datos de la serie que se mostrará en el gráfico
            series: [{
                name: 'Días promedio',      // Nombre de la serie (aparece en tooltips y leyenda)
                data: seriesData            // Datos numéricos (promedios calculados)
            }]
        };
        
        // PASO 5.3: RENDERIZADO DEL GRÁFICO
        // Crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'chartApprovalTime'
        charts.approvalTime = new ApexCharts(document.getElementById('chartApprovalTime'), options);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.approvalTime.render();
    }
}