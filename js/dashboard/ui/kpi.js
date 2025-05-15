/**
 * MÓDULO DE INDICADORES CLAVE DE RENDIMIENTO (KPI)
 * 
 * Este módulo se encarga de calcular y actualizar todos los indicadores clave
 * de rendimiento que se muestran en el panel de control. Los KPIs proporcionan
 * un resumen rápido y visual de las métricas más importantes para el negocio,
 * permitiendo evaluar el rendimiento a simple vista.
 * 
 * Los KPIs incluyen métricas como:
 * - Número total de envíos
 * - Costo total y promedio
 * - Tasas de aprobación y recuperación
 * - Proporciones de envíos internos/externos
 * - Tiempos promedio de procesamiento
 */

// Importación de la función que proporciona acceso a los datos filtrados según los criterios
// establecidos en el dashboard. Esta función nos permite trabajar siempre con el conjunto
// de datos actualizado según las selecciones del usuario.
import { getFilteredData } from '../dataDashboard.js';

// Importación de la función de formateo de números que convierte valores numéricos
// a representaciones legibles con separadores de miles y decimales controlados
import { formatNumber } from '../utilsDashboard.js';

/**
 * Actualiza todos los KPIs con los datos filtrados
 * 
 * Esta función principal se encarga de calcular y actualizar todos los indicadores
 * clave de rendimiento en la interfaz de usuario, basándose en el conjunto de datos
 * que ha pasado por los filtros actuales del dashboard.
 * 
 * El proceso incluye:
 * 1. Obtención de datos filtrados actuales
 * 2. Cálculo de KPIs principales (totales, costos, tasas)
 * 3. Actualización de los elementos HTML correspondientes
 * 4. Delegación del cálculo de KPIs secundarios a funciones especializadas
 */
export function updateKPIs() {
    // PASO 1: OBTENCIÓN DE DATOS FILTRADOS
    // Obtiene la colección actual de datos que han pasado todos los filtros aplicados
    const filteredData = getFilteredData();
    
    // PASO 2: CÁLCULO Y ACTUALIZACIÓN DE KPI DE TOTAL DE ENVÍOS
    // Este es el indicador más básico: cuántos registros de envío hay en total
    // Simplemente tomamos la longitud del array de datos filtrados
    document.getElementById('kpiTotalEnvios').textContent = formatNumber(filteredData.length);
    
    // PASO 3: CÁLCULO Y ACTUALIZACIÓN DE KPI DE COSTO TOTAL
    // Para calcular el costo total, sumamos el campo cost_euros de todos los registros
    // El método reduce itera por cada elemento acumulando la suma
    // parseFloat convierte el texto a número (o usa 0 si el campo está vacío)
    const costoTotal = filteredData.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
    // Actualizamos el elemento HTML con el valor formateado (con separadores de miles)
    document.getElementById('kpiCostoTotal').textContent = formatNumber(costoTotal);
    
    // PASO 4: CÁLCULO Y ACTUALIZACIÓN DE KPI DE TASA DE APROBACIÓN
    // Primero contamos cuántos registros tienen estado "aprobado"
    // filter crea un nuevo array solo con los elementos que cumplen la condición
    const aprobados = filteredData.filter(item => 
        item.status_name === 'aprobado' || 
        item.status_name === 'approved' || 
        item.status_name?.toLowerCase() === 'approved'
    ).length;
    // Calculamos el porcentaje: (aprobados/total)*100
    // Si no hay datos (para evitar división por cero), el resultado es 0
    const apprRate = filteredData.length > 0 ? (aprobados / filteredData.length) * 100 : 0;
    // Actualizamos el elemento HTML con el porcentaje formateado a un decimal
    document.getElementById('kpiApprovalRate').textContent = apprRate.toFixed(1) + '%';
    
    // PASO 5: CÁLCULO Y ACTUALIZACIÓN DE KPI DE TASA DE RECOVERY
    // Contamos registros que tienen un valor válido en el campo recovery
    // (diferente de vacío o "NO RECOVERY")
    const conRecovery = filteredData.filter(item => 
        item.recovery && item.recovery !== 'NO RECOVERY'
    ).length;
    // Calculamos el porcentaje: (conRecovery/total)*100
    const recoveryRate = filteredData.length > 0 ? (conRecovery / filteredData.length) * 100 : 0;
    // Actualizamos el elemento HTML con el porcentaje formateado a un decimal
    document.getElementById('kpiRecoveryRate').textContent = recoveryRate.toFixed(1) + '%';
    
    // PASO 6: ACTUALIZACIÓN DE KPIs SECUNDARIOS O DETALLADOS
    // Delegamos el cálculo y actualización de KPIs más complejos
    // a una función especializada, pasando los datos y el costo total ya calculado
    updateDetailedKPIs(filteredData, costoTotal);
}

/**
 * Actualiza los KPIs detallados o secundarios con cálculos más específicos
 * 
 * Esta función complementa a updateKPIs() calculando métricas más específicas
 * o que requieren cálculos más complejos, como promedios, ratios y acumulaciones
 * de campos particulares de los datos.
 * 
 * @param {Array} data - Conjunto de datos filtrados para realizar los cálculos
 * @param {number} costoTotal - Costo total ya calculado previamente (optimización)
 */
function updateDetailedKPIs(data, costoTotal) {
    // PASO 1: CÁLCULO Y ACTUALIZACIÓN DE COSTO PROMEDIO POR ENVÍO
    // Dividimos el costo total entre el número de envíos
    // Si no hay datos (para evitar división por cero), el resultado es 0
    const costoPromedio = data.length > 0 ? costoTotal / data.length : 0;
    // Actualizamos el elemento HTML con el valor formateado con símbolo de euro
    // y dos decimales para mayor precisión en esta métrica financiera
    document.getElementById('kpiAvgCost').textContent = '€' + formatNumber(costoPromedio, 2);
    
    // PASO 2: CÁLCULO Y ACTUALIZACIÓN DE RATIO INTERNO/EXTERNO
    // Contamos cuántos envíos son internos (contienen "INTERNAL" en el campo int_ext)
    const internos = data.filter(item => (item.int_ext || '').includes('INTERNAL')).length;
    // Contamos cuántos envíos son externos (contienen "EXTERNAL" en el campo int_ext)
    const externos = data.filter(item => (item.int_ext || '').includes('EXTERNAL')).length;
    // Actualizamos el elemento HTML con el formato "X:Y" (internos:externos)
    document.getElementById('kpiIntExtRatio').textContent = `${internos}:${externos}`;
    
    // PASO 3: CÁLCULO Y ACTUALIZACIÓN DE TIEMPO PROMEDIO DE APROBACIÓN
    // Delegamos este cálculo a una función especializada debido a su complejidad
    // (requiere cálculos de diferencia entre fechas)
    const tiempoPromedio = calcularTiempoPromedioAprobacion(data);
    // Actualizamos el elemento HTML con el valor formateado a un decimal y la unidad "días"
    document.getElementById('kpiAvgApprovalTime').textContent = tiempoPromedio.toFixed(1) + ' days';
    
    // PASO 4: CÁLCULO Y ACTUALIZACIÓN DE PESO TOTAL DE ENVÍOS
    // Sumamos el campo weight de todos los registros (similar al cálculo de costo total)
    const pesoTotal = data.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
    // Actualizamos el elemento HTML con el valor formateado y la unidad "kg"
    document.getElementById('kpiTotalWeight').textContent = formatNumber(pesoTotal) + ' kg';
}

/**
 * Calcula el tiempo promedio que tarda un envío en ser aprobado
 * 
 * Esta función especializada determina cuántos días transcurren en promedio
 * entre la fecha de creación de un envío y su fecha de aprobación, lo que
 * permite medir la eficiencia del proceso de revisión y aprobación.
 * 
 * @param {Array} data - Conjunto de datos filtrados para realizar el cálculo
 * @returns {number} Tiempo promedio en días (con decimales)
 */
function calcularTiempoPromedioAprobacion(data) {
    // PASO 1: FILTRADO DE REGISTROS VÁLIDOS PARA EL CÁLCULO
    // Consideramos sólo registros que tienen tanto fecha de creación como de aprobación
    // (omitimos registros incompletos o que aún no han sido aprobados)
    const itemsConAprobacion = data.filter(item => item.date && item.approval_date);
    
    // Inicializamos el resultado
    let tiempoPromedio = 0;
    
    // PASO 2: CÁLCULO DEL TIEMPO PROMEDIO
    // Solo procedemos si hay al menos un registro válido
    if (itemsConAprobacion.length > 0) {
        // PASO 2.1: ACUMULACIÓN DE DÍAS TOTALES
        // Iteramos por cada registro válido, calculando y sumando los días entre fechas
        const tiempoTotal = itemsConAprobacion.reduce((sum, item) => {
            // Convertimos los strings de fecha a objetos Date de JavaScript
            const createDate = new Date(item.date);
            const approvalDate = new Date(item.approval_date);
            
            // Calculamos la diferencia en milisegundos entre las dos fechas
            // Math.abs asegura que el resultado sea positivo incluso si las fechas están invertidas
            const diffTime = Math.abs(approvalDate - createDate);
            
            // Convertimos la diferencia de milisegundos a días
            // La división convierte milisegundos a días: 1000 ms * 60 s * 60 min * 24 h
            // Math.ceil redondea hacia arriba para contar días parciales como días completos
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Acumulamos el resultado en el sumador
            return sum + diffDays;
        }, 0); // Valor inicial del acumulador: 0
        
        // PASO 2.2: CÁLCULO DEL PROMEDIO
        // Dividimos el total de días entre el número de registros
        tiempoPromedio = tiempoTotal / itemsConAprobacion.length;
    }
    
    // Devolvemos el resultado calculado (o 0 si no había datos válidos)
    return tiempoPromedio;
}