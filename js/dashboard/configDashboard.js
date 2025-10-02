/**
 * ARCHIVO DE CONFIGURACIÓN GLOBAL DEL DASHBOARD
 * Este módulo centraliza toda la configuración global utilizada en el dashboard.
 */

// Objeto para almacenar todas las instancias de gráficos de ApexCharts
export const charts = {
    // ...otras gráficas...
    recoveryFiles: null,
    // Ya no necesitas recoveryFilesStacked
    // ...
};

// Objeto para almacenar los datos de origen de cada gráfico para la exportación a Excel
export const chartData = {};

// Objeto para almacenar todas las instancias de mapas de Leaflet
export const maps = {};

// Configuración para el selector de rango de fechas
export const dateRangeConfig = {
    ranges: {
        'Last Month': [moment().subtract(1, 'month'), moment()],
        'Last 3 Months': [moment().subtract(3, 'month'), moment()],
        'Last Year': [moment().subtract(1, 'year'), moment()],
        'All Time': [moment().subtract(10, 'year'), moment()]
    },
    defaultRange: {
        startDate: moment().subtract(3, 'month'),
        endDate: moment()
    },
    locale: {
        format: 'DD/MM/YYYY',
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
        firstDay: 1
    }
};

// Paleta de colores para gráficos
export const chartColors = {
    primary: '#4472C4',
    secondary: '#ED7D31',
    success: '#4CAF50',
    warning: '#FFB74D',
    danger: '#E53935',
    info: '#2196F3',
    neutral: '#A5A5A5',
    palette: [
        '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5',
        '#70AD47', '#FF7043', '#9C27B0', '#8BC34A', '#795548'
    ]
};

// URL de la API
export let API_URL;
if (typeof URLPF !== 'undefined') {
    API_URL = URLPF + 'dao/conections/daoPremiumFreight.php';
} else {
    console.warn('URL global variable is not defined. Using fallback URL.');
    API_URL = 'https://grammermx.com/Logistica/PremiumFreight/dao/conections/daoPremiumFreight.php';
}

// Configuración para DataTables
export const dataTablesConfig = {
    scrollX: true,
    paging: true,
    pageLength: 10,
    lengthMenu: [5, 10, 25, 50, 100],
    order: [[0, 'desc']],
    searching: true,
    language: {
        search: "Search:",
        lengthMenu: "Show _MENU_ entries per page",
        zeroRecords: "No matching records found",
        info: "Showing _START_ to _END_ of _TOTAL_ entries",
        infoEmpty: "Showing 0 to 0 of 0 entries",
        infoFiltered: "(filtered from _MAX_ total entries)",
        paginate: {
            first: "First",
            last: "Last",
            next: "Next",
            previous: "Previous"
        }
    },
    dom: '<"top"fli>rt<"bottom"p><"clear">',
    responsive: true
};
