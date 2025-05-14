// Configuración global para el dashboard

// Objeto para almacenar todas las instancias de gráficos
export const charts = {};

// Objeto para almacenar todas las instancias de mapas
export const maps = {};

// Configuración para el selector de rango de fechas
export const dateRangeConfig = {
    ranges: {
        'Último Mes': [moment().subtract(1, 'month'), moment()],
        'Últimos 3 Meses': [moment().subtract(3, 'month'), moment()],
        'Último Año': [moment().subtract(1, 'year'), moment()],
        'Todo el Tiempo': [moment().subtract(10, 'year'), moment()]
    },
    defaultRange: {
        startDate: moment().subtract(3, 'month'),
        endDate: moment()
    },
    locale: {
        format: 'DD/MM/YYYY',
        applyLabel: 'Aplicar',
        cancelLabel: 'Cancelar',
        fromLabel: 'Desde',
        toLabel: 'Hasta',
        customRangeLabel: 'Rango Personalizado',
        weekLabel: 'S',
        daysOfWeek: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
        monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        firstDay: 1
    }
};

// Colores comunes para gráficos
export const chartColors = {
    primary: '#4472C4',
    secondary: '#ED7D31',
    success: '#4CAF50',
    warning: '#FFB74D',
    danger: '#E53935',
    info: '#2196F3',
    neutral: '#A5A5A5',
    // Paleta para múltiples series
    palette: [
        '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', 
        '#70AD47', '#FF7043', '#9C27B0', '#8BC34A', '#795548'
    ]
};

// URL de la API
export const API_URL = 'https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPremiumFreight.php';