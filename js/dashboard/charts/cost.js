/**
 * MÓDULO DE ANÁLISIS Y VISUALIZACIÓN DE COSTOS
 * 
 * Este módulo contiene funciones para generar gráficos relacionados con los costos
 * de los envíos, permitiendo visualizar la distribución por categorías de costos
 * y analizar quién está asumiendo los pagos (análisis por pagador).
 * 
 * Las visualizaciones ayudan a identificar tendencias en gastos y a tomar decisiones
 * informadas sobre la gestión de costos logísticos.
 */

// Importación de la función que proporciona acceso a los datos filtrados según los criterios
// establecidos en el dashboard. Esta función nos permite trabajar siempre con el conjunto
// de datos actualizado según las selecciones del usuario.
import { getFilteredData } from '../dataDashboard.js';

// Importación de objetos de configuración global para los gráficos:
// - charts: objeto que almacena referencias a todos los gráficos del dashboard
// - chartColors: paleta de colores predefinida para mantener consistencia visual
import { charts, chartColors } from '../configDashboard.js';

// Importación de utilidades para dar formato a los datos numéricos
// formatNumber: función que formatea valores numéricos para mejor legibilidad
import { formatNumber } from '../utilsDashboard.js';

/**
 * Función que genera o actualiza el gráfico de categorías de costos
 * 
 * Este gráfico muestra una visualización tipo donut (rosquilla) que distribuye
 * los envíos según su costo en cuatro categorías predefinidas:
 * - Envíos de bajo costo (≤ €1,500)
 * - Envíos de costo medio-bajo (€1,501 - €5,000)
 * - Envíos de costo medio-alto (€5,001 - €10,000)
 * - Envíos de alto costo (> €10,000)
 * 
 * El objetivo es identificar rápidamente la proporción de envíos en cada rango de costos.
 */
export function renderCostCategoriesChart() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    // console.log("[DEBUG] renderCostCategoriesChart:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: INICIALIZACIÓN DE CATEGORÍAS DE COSTOS
    // Objeto con contadores para cada categoría de costo predefinida
    // Las claves son etiquetas descriptivas y los valores inicializados en cero
    const costCategories = {
        "≤ €1,500": 0,               // Envíos de bajo costo (hasta 1,500 euros)
        "€1,501 - €5,000": 0,        // Envíos de costo medio-bajo (entre 1,501 y 5,000 euros)
        "€5,001 - €10,000": 0,       // Envíos de costo medio-alto (entre 5,001 y 10,000 euros)
        "> €10,000": 0               // Envíos de alto costo (más de 10,000 euros)
    };
    
    // PASO 2: PROCESAMIENTO DE DATOS Y CLASIFICACIÓN POR COSTO
    // Itera sobre cada elemento de datos para clasificarlo en su categoría de costo
    filteredData.forEach(item => {
        // Extrae el costo del ítem, convirtiéndolo a número
        // Si el costo no existe (undefined/null), usa 0 como valor predeterminado
        const cost = parseFloat(item.cost_euros || 0);
        
        // PASO 2.1: CLASIFICACIÓN SEGÚN RANGOS DE COSTO
        // Incrementa el contador de la categoría correspondiente según el valor del costo
        if (cost <= 1500) {
            // Si el costo es menor o igual a 1,500€, incrementa la primera categoría
            costCategories["≤ €1,500"]++;
        } else if (cost <= 5000) {
            // Si el costo está entre 1,501€ y 5,000€, incrementa la segunda categoría
            costCategories["€1,501 - €5,000"]++;
        } else if (cost <= 10000) {
            // Si el costo está entre 5,001€ y 10,000€, incrementa la tercera categoría
            costCategories["€5,001 - €10,000"]++;
        } else {
            // Si el costo es mayor a 10,000€, incrementa la cuarta categoría
            costCategories["> €10,000"]++;
        }
    });
    
    // PASO 3: PREPARACIÓN DE DATOS PARA EL GRÁFICO
    // Extrae las etiquetas (nombres de las categorías) y los valores (contadores)
    // para pasarlos al gráfico en el formato requerido por ApexCharts
    const labels = Object.keys(costCategories);    // Array con los nombres de las categorías
    const series = Object.values(costCategories);  // Array con los contadores correspondientes
    
    // PASO 4: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.costCategories) {
        // PASO 4.1: ACTUALIZACIÓN DEL GRÁFICO EXISTENTE
        // Si el gráfico ya existe, solo actualiza las etiquetas y los datos de la serie
        charts.costCategories.updateOptions({
            labels: labels,     // Actualiza las etiquetas de categorías
            series: series      // Actualiza los valores de cada categoría
        });
    } else {
        // PASO 4.2: CREACIÓN DE UN NUEVO GRÁFICO
        // Si el gráfico no existe, configura todas las opciones y lo crea desde cero
        const options = {
            // Configuración general del gráfico
            chart: {
                type: 'donut',     // Tipo de gráfico: donut (anillo/rosquilla)
                height: 350        // Altura en píxeles
            },
            // Etiquetas para las secciones del donut (categorías de costo)
            labels: labels,
            // Valores para cada sección (cantidad de envíos en cada categoría)
            series: series,
            // Colores para cada categoría, del verde (bajo costo) al rojo (alto costo)
            colors: ['#4CAF50', '#FFB74D', '#FF7043', '#E53935'],
            // Configuración específica para gráficos de tipo pie/donut
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',    // Tamaño del agujero central (65% del radio)
                        labels: {
                            show: true,     // Muestra etiquetas dentro del donut
                            total: {
                                show: true,         // Muestra el total en el centro
                                label: 'Total',     // Etiqueta para el total
                                formatter: function (w) {
                                    // Función para calcular y formatear el total
                                    // Suma todos los valores de la serie
                                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                }
                            }
                        }
                    }
                }
            },
            // Configuración de la leyenda
            legend: {
                position: 'bottom'    // Ubicación de la leyenda debajo del gráfico
            },
            // Configuración de responsividad para diferentes tamaños de pantalla
            responsive: [{
                breakpoint: 480,     // Punto de quiebre para pantallas pequeñas (480px)
                options: {
                    chart: {
                        width: 200    // Reducir el ancho en pantallas pequeñas
                    },
                    legend: {
                        position: 'bottom'   // Mantener leyenda abajo en pantallas pequeñas
                    }
                }
            }]
        };
        
        // PASO 4.3: RENDERIZADO DEL GRÁFICO
        // Crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'chartCostCategories'
        charts.costCategories = new ApexCharts(document.getElementById('chartCostCategories'), options);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.costCategories.render();
    }
}

/**
 * Función que genera o actualiza el gráfico de distribución por pagador
 * 
 * Este gráfico muestra una visualización tipo pie (tarta) que distribuye
 * los envíos según la entidad que asume el costo (cliente, proveedor, interno, etc.).
 * 
 * Además de generar el gráfico, esta función también crea una lista detallada
 * con el costo total asumido por cada pagador, proporcionando una visión
 * más completa del impacto financiero.
 */
export function renderPaidByChart() {
    // Registro en consola para seguimiento y depuración del proceso
    // Muestra la cantidad de elementos que han pasado los filtros actuales
    // console.log("[DEBUG] renderPaidByChart:", getFilteredData().length);
    
    // Obtiene la colección actual de datos filtrados según criterios del dashboard
    const filteredData = getFilteredData();
    
    // PASO 1: INICIALIZACIÓN Y CONTEO POR PAGADOR
    // Objeto para almacenar la frecuencia de cada pagador identificado
    const paidByData = {};
    
    // Itera sobre cada elemento de datos para contabilizar los pagadores
    filteredData.forEach(item => {
        // Extrae el pagador del ítem, usando 'Sin especificar' como valor predeterminado
        // si el campo está vacío, es null o undefined
        const paidBy = item.paid_by || 'Unspecified';
        
        // Si es la primera vez que encontramos este pagador, inicializa su contador en 1
        if (!paidByData[paidBy]) {
            paidByData[paidBy] = 1;
        } else {
            // Si ya existía en nuestro objeto, incrementa su contador
            paidByData[paidBy]++;
        }
    });
    
    // PASO 2: PREPARACIÓN DE DATOS PARA EL GRÁFICO
    // Extrae las etiquetas (nombres de los pagadores) y los valores (contadores)
    // para pasarlos al gráfico en el formato requerido por ApexCharts
    
    // Traducción de las claves al inglés
    const translatedPaidByData = {};
    for (const [key, value] of Object.entries(paidByData)) {
        let translatedKey = key;
        if (key === 'Sin especificar') translatedKey = 'Unspecified';
        if (key === 'Cliente') translatedKey = 'Customer';
        if (key === 'Proveedor') translatedKey = 'Supplier';
        if (key === 'Interno') translatedKey = 'Internal';
        
        translatedPaidByData[translatedKey] = value;
    }
    
    const labels = Object.keys(translatedPaidByData);      // Array con los nombres de los pagadores
    const series = Object.values(translatedPaidByData);    // Array con los contadores correspondientes
    
    // PASO 3: ACTUALIZACIÓN O CREACIÓN DEL GRÁFICO
    // Comprueba si el gráfico ya existe (para actualizarlo) o si hay que crearlo desde cero
    if (charts.paidBy) {
        // PASO 3.1: ACTUALIZACIÓN DEL GRÁFICO EXISTENTE
        // Si el gráfico ya existe, actualiza las etiquetas, los datos y los colores
        charts.paidBy.updateOptions({
            labels: labels,                 // Actualiza las etiquetas (pagadores)
            series: series,                 // Actualiza los valores (cantidad de envíos)
            colors: ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5'],  // Actualiza colores
        });
    } else {
        // PASO 3.2: CREACIÓN DE UN NUEVO GRÁFICO
        // Si el gráfico no existe, configura todas las opciones y lo crea desde cero
        const options = {
            // Configuración general del gráfico
            chart: {
                type: 'pie',      // Tipo de gráfico: pie (tarta/circular)
                height: 300       // Altura en píxeles
            },
            // Etiquetas para las secciones del pie (pagadores)
            labels: labels,
            // Valores para cada sección (cantidad de envíos por pagador)
            series: series,
            // Colores para cada sección, usando la paleta predefinida en la configuración global
            colors: chartColors.palette,
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
                        position: 'bottom'    // Mantener leyenda abajo en pantallas pequeñas
                    }
                }
            }]
        };
        
        // PASO 3.3: RENDERIZADO DEL GRÁFICO
        // Crea una nueva instancia de ApexCharts con las opciones configuradas
        // y la asocia al elemento HTML con id 'chartPaidBy'
        charts.paidBy = new ApexCharts(document.getElementById('chartPaidBy'), options);
        // Ejecuta el renderizado para mostrar el gráfico en la página
        charts.paidBy.render();
    }
    
    // PASO 4: GENERACIÓN DE ESTADÍSTICAS DETALLADAS DE COSTO POR PAGADOR
    // Además del gráfico, generamos una lista con el costo total por pagador
    
    // Obtiene referencia al elemento HTML donde se mostrarán las estadísticas
    const paidByStats = document.getElementById('paidByStats');
    
    // Si el elemento existe en el DOM, procedemos a llenarlo con datos
    if (paidByStats) {
        // PASO 4.1: INICIALIZACIÓN DEL HTML
        // Comienza a construir el HTML con una lista de grupo (componente de Bootstrap)
        let statsHTML = '<ul class="list-group">';
        
        // PASO 4.2: CÁLCULO DE COSTOS TOTALES POR PAGADOR
        // Objeto para acumular los costos por cada pagador
        const costByPayer = {};
        
        // Itera sobre cada elemento para acumular los costos
        filteredData.forEach(item => {
            // Extrae el pagador y el costo del ítem, con valores predeterminados
            let paidBy = item.paid_by || 'Unspecified';
            
            // Traducir los valores al inglés
            if (paidBy === 'Sin especificar') paidBy = 'Unspecified';
            if (paidBy === 'Cliente') paidBy = 'Customer';
            if (paidBy === 'Proveedor') paidBy = 'Supplier';
            if (paidBy === 'Interno') paidBy = 'Internal';
            
            const cost = parseFloat(item.cost_euros || 0);
            
            // Si es la primera vez que encontramos este pagador, inicializa su acumulador
            if (!costByPayer[paidBy]) {
                costByPayer[paidBy] = cost;
            } else {
                // Si ya existía, suma el nuevo costo al acumulador
                costByPayer[paidBy] += cost;
            }
        });
        
        // PASO 4.3: GENERACIÓN DE ELEMENTOS HTML PARA CADA PAGADOR
        // Recorre el objeto de costos acumulados para generar un elemento de lista por cada pagador
        for (const [payer, cost] of Object.entries(costByPayer)) {
            // Añade un elemento de lista con el nombre del pagador y su costo total formateado
            // Usa componentes de Bootstrap para el estilo (d-flex, justify-content-between, etc.)
            statsHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${payer}
                    <span class="badge bg-primary rounded-pill">€${formatNumber(cost, 0)}</span>
                </li>`;
        }
        
        // PASO 4.4: FINALIZACIÓN Y RENDERIZADO DEL HTML
        // Cierra la etiqueta de lista y actualiza el contenido del elemento
        statsHTML += '</ul>';
        paidByStats.innerHTML = statsHTML;
    }
}