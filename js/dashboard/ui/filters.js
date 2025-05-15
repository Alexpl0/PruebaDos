/**
 * MÓDULO DE MANEJO DE FILTROS DE LA INTERFAZ DE USUARIO
 * 
 * Este módulo implementa toda la funcionalidad relacionada con los filtros interactivos
 * del dashboard. Proporciona mecanismos para filtrar los datos por fecha, planta y 
 * estado, permitiendo al usuario personalizar la visualización según sus necesidades.
 * 
 * La función principal de este módulo es la inicialización de los controles de filtrado,
 * la captura de los eventos de cambio en dichos controles, y la coordinación con el 
 * resto del sistema para actualizar las visualizaciones cuando cambian los filtros.
 */

// Importación de la configuración del selector de rango de fechas desde el módulo de configuración.
// Esta configuración define los rangos predeterminados, las opciones predefinidas (último mes, 
// último trimestre, etc.), y la configuración de idioma y formato de fecha.
import { dateRangeConfig } from '../configDashboard.js';

// Importación de funciones relacionadas con los datos:
// - getRawData: Proporciona acceso a los datos brutos sin filtrar
// - applyFilters: Aplica los criterios de filtrado a los datos
import { getRawData, applyFilters } from '../dataDashboard.js';

// Importación de la función que actualiza todas las visualizaciones del dashboard.
// Esta función se llamará cada vez que cambien los filtros para reflejar los nuevos datos filtrados.
import { updateAllVisualizations } from '../main.js';

// Variable global que almacenará la referencia al objeto del selector de rango de fechas.
// Se declara fuera de las funciones para que sea accesible desde cualquier parte del módulo.
let daterangepicker;

/**
 * Inicializa el selector de rango de fechas en la interfaz.
 * 
 * Esta función configura el control DateRangePicker de la biblioteca daterangepicker.js,
 * permitiendo al usuario seleccionar un intervalo de fechas de forma visual e intuitiva.
 * También establece el evento para capturar cuando el usuario aplica un nuevo rango.
 */
export function initializeDateRangePicker() {
    // Inicializa el componente DateRangePicker en el elemento con id 'dateRange'
    // utilizando jQuery (símbolo $) ya que esta biblioteca depende de jQuery
    $('#dateRange').daterangepicker({
        // Fecha inicial del rango, tomada de la configuración predeterminada
        startDate: dateRangeConfig.defaultRange.startDate,
        // Fecha final del rango, tomada de la configuración predeterminada
        endDate: dateRangeConfig.defaultRange.endDate,
        // Rangos predefinidos (Hoy, Ayer, Últimos 7 días, etc.) definidos en la configuración
        ranges: dateRangeConfig.ranges,
        // Posición donde se abrirá el calendario desplegable (a la izquierda del control)
        opens: 'left',
        // Muestra los desplegables para seleccionar año y mes directamente
        showDropdowns: true,
        // No aplica el rango automáticamente al seleccionar, requiere clic en "Aplicar"
        autoApply: false,
        // Configuración regional (idioma, formato de fecha, nombres de meses, etc.)
        locale: {
            applyLabel: 'Apply',
            cancelLabel: 'Cancel',
            fromLabel: 'From',
            toLabel: 'To',
            customRangeLabel: 'Custom Range',
            weekLabel: 'W',
            daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
            monthNames: [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ],
            firstDay: 1,
            format: 'DD/MM/YYYY'
        }
    });
    
    // Guarda una referencia al objeto daterangepicker para acceder a sus métodos más adelante
    // Esto nos permitirá obtener programáticamente las fechas seleccionadas
    daterangepicker = $('#dateRange').data('daterangepicker');
    
    // Añade un controlador de eventos que se ejecutará cuando el usuario aplique un rango de fechas
    // 'apply.daterangepicker' es el evento disparado al hacer clic en el botón "Aplicar"
    $('#dateRange').on('apply.daterangepicker', function(ev, picker) {
        // Llama a la función que actualiza todos los filtros y visualizaciones
        triggerFilterUpdate();
    });
}

/**
 * Inicializa los filtros de planta y status en la interfaz con opciones basadas en los datos.
 * 
 * Esta función analiza los datos recibidos para extraer todas las plantas y estados únicos,
 * y luego rellena los menús desplegables correspondientes con esas opciones. También establece
 * los controladores de eventos para detectar cuando el usuario cambia alguna selección.
 * 
 * @param {Array} data - Conjunto completo de datos para extraer las opciones de filtrado
 */
export function initializeFilters(data) {
    // PARTE 1: INICIALIZACIÓN DEL FILTRO DE PLANTAS
    
    // Obtiene referencia al elemento select que implementa el filtro de plantas
    const plantaFilter = document.getElementById('plantaFilter');
    
    // Extrae todas las plantas únicas de los datos, filtrando valores vacíos y ordenando alfabéticamente:
    // 1. map(item => item.planta) - Extrae el campo 'planta' de cada registro
    // 2. new Set(...) - Elimina duplicados creando un conjunto (Set) con valores únicos
    // 3. [...Set] - Convierte el Set de nuevo a un array para poder manipularlo
    // 4. filter(Boolean) - Elimina valores vacíos, nulos o undefined
    // 5. sort() - Ordena alfabéticamente
    const plantas = [...new Set(data.map(item => item.planta))].filter(Boolean).sort();
    
    // Limpia las opciones existentes en el menú desplegable, manteniendo solo la primera opción
    // (que generalmente es "Todas" o un valor por defecto)
    while (plantaFilter.options.length > 1) {
        plantaFilter.remove(1); // Elimina siempre la segunda opción hasta que solo quede la primera
    }
    
    // Actualiza el texto de la primera opción para que esté en inglés
    if (plantaFilter.options.length > 0) {
        plantaFilter.options[0].textContent = "All Plants";
    }
    
    // Itera sobre cada planta única encontrada para crear y añadir las opciones al select
    plantas.forEach(planta => {
        // Crea un nuevo elemento option para el menú desplegable
        const option = document.createElement('option');
        // Establece el valor interno de la opción (usado para el filtrado)
        option.value = planta;
        // Establece el texto visible para el usuario
        option.textContent = planta;
        // Añade la opción al elemento select
        plantaFilter.appendChild(option);
    });
    
    // PARTE 2: INICIALIZACIÓN DEL FILTRO DE ESTADOS (STATUS)
    
    // Obtiene referencia al elemento select que implementa el filtro de estados
    const statusFilter = document.getElementById('statusFilter');
    
    // Extrae todos los estados únicos, siguiendo el mismo proceso que para las plantas
    const statuses = [...new Set(data.map(item => item.status_name))].filter(Boolean).sort();
    
    // Limpia las opciones existentes, manteniendo solo la primera (opción por defecto)
    while (statusFilter.options.length > 1) {
        statusFilter.remove(1);
    }
    
    // Actualiza el texto de la primera opción para que esté en inglés
    if (statusFilter.options.length > 0) {
        statusFilter.options[0].textContent = "All Statuses";
    }
    
    // Itera sobre cada estado único para crear y añadir las opciones al select
    statuses.forEach(status => {
        // Crea un nuevo elemento option
        const option = document.createElement('option');
        // Establece el valor interno
        option.value = status;
        
        // Traduce los estados comunes al inglés si existen en español
        let displayText = status;
        const statusTranslations = {
            'pendiente': 'Pending',
            'aprobado': 'Approved',
            'rechazado': 'Rejected',
            'en proceso': 'In Progress',
            'completado': 'Completed',
            'cancelado': 'Cancelled'
        };
        
        // Busca si hay una traducción disponible para este estado
        const lowerStatus = status.toLowerCase();
        if (statusTranslations[lowerStatus]) {
            displayText = statusTranslations[lowerStatus];
        } else {
            // Si no hay traducción, capitaliza la primera letra
            displayText = status.charAt(0).toUpperCase() + status.slice(1);
        }
        
        // Establece el texto visible
        option.textContent = displayText;
        // Añade la opción al select
        statusFilter.appendChild(option);
    });
    
    // PARTE 3: CONFIGURACIÓN DE EVENTOS PARA LOS FILTROS
    
    // Añade un controlador de eventos para el cambio en el filtro de plantas
    // Este evento se disparará cada vez que el usuario seleccione una opción diferente
    plantaFilter.addEventListener('change', triggerFilterUpdate);
    
    // Añade un controlador de eventos para el cambio en el filtro de estados
    statusFilter.addEventListener('change', triggerFilterUpdate);
}

/**
 * Obtiene los valores actuales de todos los filtros en la interfaz.
 * 
 * Esta función recopila el estado actual de los controles de filtrado en la interfaz
 * y los devuelve como un objeto estructurado que puede ser utilizado por otras funciones
 * para aplicar el filtrado a los datos.
 * 
 * @returns {Object} Objeto con las propiedades: startDate, endDate, planta y status,
 *                   que representan los criterios de filtrado actuales.
 */
export function getFilterValues() {
    // Crea y devuelve un objeto con los valores actuales de todos los filtros
    return {
        // Fecha de inicio del rango, formateada como 'YYYY-MM-DD' para consistencia
        startDate: daterangepicker.startDate.format('YYYY-MM-DD'),
        
        // Fecha de fin del rango, formateada como 'YYYY-MM-DD'
        endDate: daterangepicker.endDate.format('YYYY-MM-DD'),
        
        // Valor seleccionado en el filtro de plantas
        // Si es la primera opción, típicamente será un valor como "" o "Todas"
        planta: document.getElementById('plantaFilter').value,
        
        // Valor seleccionado en el filtro de estados
        // Si es la primera opción, típicamente será un valor como "" o "Todos"
        status: document.getElementById('statusFilter').value
    };
}

/**
 * Desencadena el proceso completo de actualización tras un cambio en los filtros.
 * 
 * Esta función actúa como coordinadora del proceso de actualización cuando cambia algún filtro:
 * 1. Obtiene los valores actuales de todos los filtros
 * 2. Aplica esos filtros a los datos
 * 3. Actualiza todas las visualizaciones con los nuevos datos filtrados
 * 
 * Es llamada automáticamente por los controladores de eventos configurados para cada filtro.
 */
export function triggerFilterUpdate() {
    // Obtiene el estado actual de todos los filtros
    const filterValues = getFilterValues();
    
    // Aplica los filtros a los datos, actualizando el conjunto de datos filtrados
    // que será utilizado por todas las visualizaciones
    applyFilters(filterValues);
    
    // Actualiza todas las visualizaciones para reflejar los datos recién filtrados
    // Esto redibujará todos los gráficos, tablas y demás elementos visuales del dashboard
    updateAllVisualizations();
}