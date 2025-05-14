// Gráfico de comparación de plantas

import { getFilteredData } from '../dataDashboard.js';
import { charts, chartColors } from '../configDashboard.js';

/**
 * Genera o actualiza el gráfico de comparación de plantas
 */
export function renderPlantComparison() {
    console.log("[DEBUG] renderPlantComparison:", getFilteredData().length);
    const filteredData = getFilteredData();
    
    // Agrupar datos por planta
    const plantCounts = {};
    
    filteredData.forEach(item => {
        const planta = item.planta || 'Sin especificar';
        
        if (!plantCounts[planta]) {
            plantCounts[planta] = 1;
        } else {
            plantCounts[planta]++;
        }
    });
    
    // Obtener las 5 plantas con más registros
    const topPlantas = Object.entries(plantCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([planta]) => planta);
    
    // Definir métricas a comparar
    const metrics = [
        { name: "Registros", getValue: (data) => data.length },
        { name: "Costo Promedio (€)", getValue: (data) => {
            const total = data.reduce((sum, item) => sum + parseFloat(item.cost_euros || 0), 0);
            return data.length > 0 ? total / data.length : 0;
        }},
        { name: "% Interno", getValue: (data) => {
            const internos = data.filter(item => (item.int_ext || '').includes('INTERNAL')).length;
            return data.length > 0 ? (internos / data.length) * 100 : 0;
        }},
        { name: "Tiempo Aprobación (días)", getValue: (data) => {
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
        }},
        { name: "Peso Promedio (kg)", getValue: (data) => {
            const total = data.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
            return data.length > 0 ? total / data.length : 0;
        }}
    ];
    
    // Función para normalizar valores (convertir a porcentaje de 0-100)
    const normalizeValue = (value, metricName, allValues) => {
        const max = Math.max(...allValues);
        // Para algunas métricas (como tiempo de aprobación), menos es mejor
        if (metricName === "Tiempo Aprobación (días)" || metricName === "Costo Promedio (€)") {
            return max ? (1 - (value / max)) * 100 : 0;
        }
        return max ? (value / max) * 100 : 0;
    };
    
    // Calcular valores para cada planta y métrica
    const series = topPlantas.map(planta => {
        const plantaData = filteredData.filter(item => item.planta === planta);
        return {
            planta: planta,
            data: plantaData,
            values: []
        };
    });
    
    // Para cada métrica, calcular el valor para cada planta y normalizarlo
    metrics.forEach(metric => {
        // Calcular valores crudos para todas las plantas
        const rawValues = series.map(s => metric.getValue(s.data));
        
        // Normalizar los valores
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
    
    // Preparar datos para ApexCharts
    const apexSeries = series.map(s => ({
        name: s.planta,
        data: s.values.map(v => v.normalizedValue)
    }));
    
    // Opciones para el gráfico radar
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
        series: apexSeries,
        labels: metrics.map(m => m.name),
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
        colors: chartColors.palette.slice(0, 5),
        markers: {
            size: 4,
            colors: ['#fff'],
            strokeColors: chartColors.palette.slice(0, 5),
            strokeWidth: 2
        },
        tooltip: {
            y: {
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
    
    // Crear o actualizar el gráfico
    if (charts.plantComparison) {
        charts.plantComparison.updateOptions(apexOptions);
    } else {
        charts.plantComparison = new ApexCharts(document.getElementById('plantComparisonChart'), apexOptions);
        charts.plantComparison.render();
    }
}