/**
 * Weekly Performance Dashboard Configuration
 */

// URLs de los endpoints
let WEEKLY_KPIS_URL;
let PLANTS_URL;

if (typeof URLPF !== 'undefined') {
    WEEKLY_KPIS_URL = URLPF + 'dao/conections/daoWeeklyKPIs.php';
    PLANTS_URL = URLPF + 'dao/conections/daoPlants.php';
} else {
    console.warn('URL global variable is not defined. Using fallback URL for Weekly KPIs.');
    WEEKLY_KPIS_URL = 'https://grammermx.com/Jesus/PruebaDos/dao/conections/daoWeeklyKPIs.php';
    PLANTS_URL = 'https://grammermx.com/Jesus/PruebaDos/dao/conections/daoPlants.php';
}

// Paleta de colores consistente para todas las gráficas
const colorPalette = {
    primary: '#034C8C',
    primaryLight: '#4A90D9', 
    primaryDark: '#002856',
    accent: '#00A3E0',
    success: '#218621',
    warning: '#F59E0B',
    danger: '#E41A23',
    info: '#3B82F6',
    secondary: '#6C757D',
    light: '#F8F9FA',
    dark: '#212529',
    gradients: {
        primary: 'linear-gradient(135deg, #034C8C 0%, #002856 100%)',
        success: 'linear-gradient(135deg, #218621 0%, #16a34a 100%)',
        warning: 'linear-gradient(135deg, #F59E0B 0%, #f59e0b 100%)',
        info: 'linear-gradient(135deg, #3B82F6 0%, #00A3E0 100%)',
        danger: 'linear-gradient(135deg, #E41A23 0%, #dc2626 100%)'
    },
    // Array de colores para gráficas múltiples
    chartColors: [
        '#034C8C', '#00A3E0', '#218621', '#F59E0B', '#E41A23', 
        '#4A90D9', '#3B82F6', '#16a34a', '#f59e0b', '#dc2626'
    ],
    // Colores específicos por categoría
    status: {
        pending: '#F59E0B',
        approved: '#218621',
        rejected: '#E41A23',
        inProgress: '#00A3E0'
    },
    performance: {
        excellent: '#218621',
        good: '#00A3E0',
        average: '#F59E0B',
        poor: '#E41A23'
    }
};

// Configuración de gráficas
const chartConfig = {
    defaultHeight: 350,
    trendsHeight: 400,
    donutSize: '65%',
    borderRadius: 8,
    strokeWidth: 4,
    markerSize: 7,
    columnWidth: '60%',
    barHeight: '60%',
    fontSize: {
        title: '16px',
        legend: '16px',
        dataLabel: '16px',
        axis: '14px'
    },
    fontWeight: {
        title: 700,
        legend: 700,
        dataLabel: 'bold',
        axis: 600
    }
};

// Configuración de animaciones
const animationConfig = {
    enabled: true,
    easing: 'easeinout',
    speed: 800,
    animateGradually: {
        enabled: true,
        delay: 150
    },
    dynamicAnimation: {
        enabled: true,
        speed: 350
    }
};

// Configuración de responsividad
const responsiveConfig = [
    {
        breakpoint: 768,
        options: {
            chart: { height: 300 },
            legend: { fontSize: '14px' },
            dataLabels: { style: { fontSize: '14px' } }
        }
    },
    {
        breakpoint: 480,
        options: {
            chart: { height: 250 },
            legend: { fontSize: '12px', position: 'bottom' },
            dataLabels: { style: { fontSize: '12px' } }
        }
    }
];

export const config = {
    urls: {
        weeklyKpis: WEEKLY_KPIS_URL,
        plants: PLANTS_URL
    },
    colors: colorPalette,
    charts: chartConfig,
    animations: animationConfig,
    responsive: responsiveConfig
};