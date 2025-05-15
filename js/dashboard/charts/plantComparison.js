// Gráfico de comparación de plantas

// Importa la función para obtener los datos filtrados y la configuración de los gráficos
import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Genera o actualiza el gráfico de comparación de plantas
 */
export function renderPlantComparison() {
    // Muestra en consola la cantidad de datos filtrados
    console.log("[DEBUG] renderPlantComparison:", getFilteredData().length);
    // Obtiene los datos filtrados según los filtros activos
    const filteredData = getFilteredData();
    
    // Agrupa los datos por planta (clave: nombre de planta, valor: cantidad de registros)
    const plantCounts = {};
    filteredData.forEach(item => {
        const planta = item.planta || 'Sin especificar'; // Si no hay planta, usa 'Sin especificar'
        if (!plantCounts[planta]) {
            plantCounts[planta] = 1;
        } else {
            plantCounts[planta]++;
        }
    });
    
    // Obtiene las 5 plantas con más registros
    const topPlantas = Object.entries(plantCounts)
        .sort((a, b) => b[1] - a[1]) // Ordena de mayor a menor por cantidad
        .slice(0, 5)                  // Toma solo las primeras 5
        .map(([planta]) => planta);   // Extrae solo el nombre de la planta
    
    // Define las métricas a comparar en el radar
    const metrics = [
        { 
            name: "Registros", 
            getValue: (data) => data.length // Número de registros por planta
        },
        { 
            name: "Costo Promedio (€)", 
            getValue: (data) => {
                // Calcula el costo promedio de los registros de la planta
                const total = data.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
                return data.length > 0 ? total / data.length : 0;
            }
        },
        { 
            name: "% Interno", 
            getValue: (data) => {
                // Porcentaje de envíos internos
                const internos = data.filter(item => (item.int_ext || '').includes('INTERNAL')).length;
                return data.length > 0 ? (internos / data.length) * 100 : 0;
            }
        },
        { 
            name: "Tiempo Aprobación (días)", 
            getValue: (data) => {
                // Calcula el tiempo promedio de aprobación en días
                const itemsConAprobacion = data.filter(item => item.date && item.approval_date);
                if (itemsConAprobacion.length === 0) return 0;
                const tiempoTotal = itemsConAprobacion.reduce((sum, item) => {
                    const createDate = new Date(item.date);
                    const approvalDate = new Date(item.approval_date);
                    const diffTime = Math.abs(approvalDate - createDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return sum + diffDays;
                }, 0);
                return tiempoTotal / itemsConAprobacion.length;
            }
        },
        { 
            name: "Peso Promedio (kg)", 
            getValue: (data) => {
                // Calcula el peso promedio de los registros de la planta
                const total = data.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
                return data.length > 0 ? total / data.length : 0;
            }
        }
    ];
    
    // Función para normalizar los valores de cada métrica (0-100%)
    const normalizeValue = (value, metricName, allValues) => {
        const max = Math.max(...allValues);
        // Para algunas métricas donde menos es mejor, se invierte la escala
        if (metricName === "Tiempo Aprobación (días)" || metricName === "Costo Promedio (€)") {
            return max ? (1 - (value / max)) * 100 : 0;
        }
        return max ? (value / max) * 100 : 0;
    };
    
    // Calcula los valores de cada métrica para cada planta seleccionada
    const series = topPlantas.map(planta => {
        const plantaData = filteredData.filter(item => item.planta === planta);
        return {
            planta: planta,
            data: plantaData,
            values: [] // Aquí se guardarán los valores normalizados de cada métrica
        };
    });
    
    // Para cada métrica, calcula y normaliza el valor para cada planta
    metrics.forEach(metric => {
        // Obtiene los valores crudos de la métrica para todas las plantas
        const rawValues = series.map(s => metric.getValue(s.data));
        // Normaliza y guarda el valor en el array de cada planta
        series.forEach((s, i) => {
            const rawValue = rawValues[i];
            const normalizedValue = normalizeValue(rawValue, metric.name, rawValues);
            s.values.push({
                metric: metric.name,
                rawValue: rawValue,
                normalizedValue: normalizedValue
            });
        });
    });
    
    // Prepara los datos para ApexCharts (solo los valores normalizados)
    const apexSeries = series.map(s => ({
        name: s.planta,
        data: s.values.map(v => v.normalizedValue)
    }));
    
    // Opciones de configuración para el gráfico radar
    const apexOptions = {
        chart: {
            height: 450,
            type: 'radar',
            toolbar: {
                show: true
            },
            dropShadow: {
                enabled: true,
                blur: 1,
                left: 1,
                top: 1
            }
        },
        series: apexSeries, // Series de datos normalizados por planta
        labels: metrics.map(m => m.name), // Nombres de las métricas en el radar
        plotOptions: {
            radar: {
                size: 140,
                polygons: {
                    strokeWidth: 1,
                    strokeColor: '#e9e9e9',
                    fill: {
                        colors: ['#f8f8f8', '#fff']
                    }
                }
            }
        },
        colors: chartColors.palette.slice(0, 5), // Colores para cada planta
        markers: {
            size: 4,
            colors: ['#fff'],
            strokeColors: chartColors.palette.slice(0, 5),
            strokeWidth: 2
        },
        tooltip: {
            y: {
                // Personaliza el tooltip para mostrar el valor real de cada métrica
                formatter: function(val, { seriesIndex, dataPointIndex }) {
                    const metric = metrics[dataPointIndex];
                    const rawValue = series[seriesIndex].values[dataPointIndex].rawValue;
                    if (metric.name === "Costo Promedio (€)") {
                        return `€${rawValue.toFixed(2)}`;
                    } else if (metric.name === "% Interno") {
                        return `${rawValue.toFixed(1)}%`;
                    } else if (metric.name === "Tiempo Aprobación (días)") {
                        return `${rawValue.toFixed(1)} días`;
                    } else if (metric.name === "Peso Promedio (kg)") {
                        return `${rawValue.toFixed(1)} kg`;
                    } else {
                        return rawValue.toLocaleString();
                    }
                }
            }
        },
        yaxis: {
            tickAmount: 5,
            labels: {
                formatter: function(val) {
                    return val.toFixed(0);
                }
            }
        }
    };
    
    // Crea o actualiza el gráfico radar en el DOM
    if (charts.plantComparison) {
        charts.plantComparison.updateOptions(apexOptions);
    } else {
        charts.plantComparison = new ApexCharts(document.getElementById('plantComparisonChart'), apexOptions);
        charts.plantComparison.render();
    }
}