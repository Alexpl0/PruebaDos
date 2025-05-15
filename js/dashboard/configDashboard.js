/**
 * ARCHIVO DE CONFIGURACIÓN GLOBAL DEL DASHBOARD
 * 
 * Este módulo centraliza toda la configuración global utilizada en el dashboard
 * de monitoreo de envíos premium. Define constantes, opciones predeterminadas,
 * y estructuras de datos compartidas que se utilizan en múltiples componentes.
 * 
 * La centralización de estas configuraciones facilita:
 * - Mantener la consistencia visual en toda la aplicación
 * - Modificar parámetros globales desde un único lugar
 * - Compartir referencias a objetos entre diferentes módulos
 */

// Objeto para almacenar todas las instancias de gráficos
// Este objeto actúa como un registro central donde se guardan referencias
// a todos los gráficos generados con ApexCharts. Esto permite:
// - Acceder a cualquier gráfico desde cualquier módulo para actualizarlo
// - Gestionar el ciclo de vida de los gráficos (creación, actualización, destrucción)
// - Evitar duplicación de instancias al regenerar visualizaciones
export const charts = {};

// Objeto para almacenar todas las instancias de mapas
// Similar al objeto charts, pero específico para visualizaciones geográficas.
// Almacena referencias a los mapas creados con bibliotecas como Leaflet o Mapbox.
// Permite gestionar y actualizar mapas desde diferentes partes de la aplicación.
export const maps = {};

// Configuración para el selector de rango de fechas
// Esta configuración controla el comportamiento y apariencia del componente
// DateRangePicker que permite al usuario seleccionar períodos de tiempo.
// Se utiliza la biblioteca Moment.js para manipulación de fechas.
export const dateRangeConfig = {
    // Rangos predefinidos que aparecen como opciones rápidas en el selector
    // Cada opción es un par [fecha_inicio, fecha_fin] calculado dinámicamente
    // relativo a la fecha actual usando Moment.js
    ranges: {
        // Último mes: desde hace 1 mes hasta hoy
        // moment() obtiene la fecha actual
        // subtract(1, 'month') retrocede 1 mes desde esa fecha
        'Último Mes': [moment().subtract(1, 'month'), moment()],
        
        // Últimos 3 meses: desde hace 3 meses hasta hoy
        'Últimos 3 Meses': [moment().subtract(3, 'month'), moment()],
        
        // Último año: desde hace 1 año hasta hoy
        'Último Año': [moment().subtract(1, 'year'), moment()],
        
        // Todo el tiempo: abarca 10 años hacia atrás (suficiente para cubrir todos los datos históricos)
        'Todo el Tiempo': [moment().subtract(10, 'year'), moment()]
    },
    
    // Rango seleccionado por defecto al cargar el dashboard por primera vez
    // Establecido a los últimos 3 meses para mostrar un período relevante
    // pero no demasiado extenso que pueda ralentizar el rendimiento inicial
    defaultRange: {
        startDate: moment().subtract(3, 'month'),  // Fecha de inicio: hace 3 meses
        endDate: moment()                          // Fecha de fin: hoy
    },
    
    // Configuración regional (localización) para adaptarse al idioma español
    // y a las convenciones de formato de fecha utilizadas en España/Latinoamérica
    locale: {
        // Formato de visualización de la fecha: día/mes/año
        format: 'DD/MM/YYYY',
        
        // Etiquetas para los botones y controles del selector
        applyLabel: 'Aplicar',      // Botón para aplicar el rango seleccionado
        cancelLabel: 'Cancelar',    // Botón para cancelar la selección
        fromLabel: 'Desde',         // Etiqueta para la fecha de inicio
        toLabel: 'Hasta',           // Etiqueta para la fecha de fin
        customRangeLabel: 'Rango Personalizado',  // Etiqueta para selección manual
        weekLabel: 'S',             // Abreviatura de "Semana"
        
        // Nombres abreviados de los días de la semana en español
        daysOfWeek: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
        
        // Nombres completos de los meses en español
        monthNames: [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ],
        
        // Primer día de la semana: 1 = lunes (estándar europeo)
        // A diferencia del estándar americano que usa 0 = domingo
        firstDay: 1
    }
};

// Colores comunes para gráficos
// Esta paleta de colores centralizada garantiza la consistencia visual
// en todas las visualizaciones del dashboard y facilita ajustes globales
// de la identidad visual de la aplicación.
export const chartColors = {
    // Colores semánticos principales
    primary: '#4472C4',    // Azul primario - color principal para elementos destacados
    secondary: '#ED7D31',  // Naranja secundario - utilizado para contrastar con el primario
    success: '#4CAF50',    // Verde - para indicar éxito, completitud o valores positivos
    warning: '#FFB74D',    // Ámbar - para destacar advertencias o valores que requieren atención
    danger: '#E53935',     // Rojo - para errores, problemas o valores críticos/negativos
    info: '#2196F3',       // Azul claro - para información secundaria o valores neutrales
    neutral: '#A5A5A5',    // Gris - para elementos de fondo o menos relevantes
    
    // Paleta extendida para múltiples series de datos
    // Se usa cuando se necesitan varios colores distintos en un mismo gráfico
    // (ej: gráficos de barras múltiples, gráficos de torta, etc.)
    palette: [
        '#4472C4',  // Azul primario
        '#ED7D31',  // Naranja
        '#A5A5A5',  // Gris
        '#FFC000',  // Amarillo
        '#5B9BD5',  // Azul claro
        '#70AD47',  // Verde
        '#FF7043',  // Naranja-rojo
        '#9C27B0',  // Púrpura
        '#8BC34A',  // Verde lima
        '#795548'   // Marrón
    ]
};

// URL de la API para obtención de datos
// Esta constante almacena la dirección al endpoint del backend que proporciona
// los datos para el dashboard. Centralizar esta URL facilita cambiarla en caso
// de que el backend se mueva a otro servidor o cambie su estructura.
export const API_URL = 'https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php';

/**
 * Configuración de opciones para la biblioteca DataTables
 * Establece opciones predeterminadas para todas las tablas de datos interactivas
 * en el dashboard, garantizando un comportamiento y estilo consistentes.
 */
export const dataTablesConfig = {
    // Habilitamos el desplazamiento horizontal para manejar tablas con muchas columnas
    scrollX: true,
    
    // Configuración de paginación
    paging: true,           // Habilitar la paginación
    pageLength: 10,         // Número de filas por página
    lengthMenu: [5, 10, 25, 50, 100],  // Opciones de tamaño de página
    
    // Configuración del orden (ordenación)
    order: [[0, 'desc']],   // Ordenar por primera columna descendente por defecto
    
    // Habilitamos la búsqueda global
    searching: true,
    
    // Configuración del idioma (español)
    language: {
        search: "Buscar:",
        lengthMenu: "Mostrar _MENU_ registros por página",
        zeroRecords: "No se encontraron resultados",
        info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
        infoEmpty: "Mostrando 0 a 0 de 0 registros",
        infoFiltered: "(filtrado de _MAX_ registros totales)",
        paginate: {
            first: "Primero",
            last: "Último",
            next: "Siguiente",
            previous: "Anterior"
        }
    },
    
    // Estilo visual adaptado al tema del dashboard
    dom: '<"top"fli>rt<"bottom"p><"clear">',
    
    // Opciones responsivas para adaptarse a diferentes tamaños de pantalla
    responsive: true
};

/**
 * Configuración de umbrales para indicadores visuales en KPIs
 * Define los valores límite para determinar cuándo un indicador debe
 * mostrarse como positivo (verde), neutro (amarillo) o negativo (rojo).
 */
export const kpiThresholds = {
    approvalRate: {
        good: 90,    // Tasas de aprobación ≥90% se consideran buenas
        warning: 70   // Tasas entre 70% y 90% muestran advertencia, <70% es malo
    },
    recoveryRate: {
        good: 80,     // Tasas de recuperación ≥80% se consideran buenas
        warning: 60   // Tasas entre 60% y 80% muestran advertencia, <60% es malo
    },
    approvalTime: {
        good: 2,      // Tiempos de aprobación ≤2 días se consideran buenos
        warning: 5    // Tiempos entre 2 y 5 días muestran advertencia, >5 es malo
    }
};