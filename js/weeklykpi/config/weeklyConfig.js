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

// Paleta de colores usando variables del sistema existente
const colorPalette = {
    primary: '#034C8C',
    primaryLight: '#4A90D9', 
    primaryDark: '#002856',
    accent: '#00A3E0',
    success: '#218621',
    warning: '#F59E0B',
    danger: '#E41A23',
    info: '#3B82F6',
    gradients: {
        primary: 'linear-gradient(135deg, #034C8C 0%, #002856 100%)',
        success: 'linear-gradient(135deg, #218621 0%, #16a34a 100%)',
        warning: 'linear-gradient(135deg, #F59E0B 0%, #f59e0b 100%)',
        info: 'linear-gradient(135deg, #3B82F6 0%, #00A3E0 100%)',
        danger: 'linear-gradient(135deg, #E41A23 0%, #dc2626 100%)'
    }
};

export const config = {
    urls: {
        weeklyKpis: WEEKLY_KPIS_URL,
        plants: PLANTS_URL
    },
    colors: colorPalette,
    charts: {
        defaultHeight: 350,
        trendsHeight: 400
    }
};