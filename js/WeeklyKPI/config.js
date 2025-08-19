/**
 * CONFIG.JS - CONFIGURACIÓN Y VARIABLES GLOBALES
 * Este módulo contiene todas las configuraciones, URLs y constantes
 * utilizadas por el dashboard de rendimiento semanal.
 */

// ========================================================================
// CONFIGURACIÓN DE URLs
// ========================================================================

export const API_ENDPOINTS = {
    WEEKLY_KPIS: (() => {
        if (typeof URLPF !== 'undefined') {
            return URLPF + 'dao/conections/daoWeeklyKPIs.php';
        } else {
            console.warn('URL global variable is not defined. Using fallback URL for Weekly KPIs.');
            return 'https://grammermx.com/Logistica/PremiumFreight/dao/conections/daoWeeklyKPIs.php';
        }
    })(),
    
    PLANTS: (() => {
        if (typeof URLPF !== 'undefined') {
            return URLPF + 'dao/conections/daoPlants.php';
        } else {
            return 'https://grammermx.com/Logistica/PremiumFreight/dao/conections/daoPlants.php';
        }
    })()
};

// ========================================================================
// PALETA DE COLORES
// ========================================================================

export const COLOR_PALETTE = {
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

// ========================================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ========================================================================

export const APP_STATE = {
    weeklyData: {},
    charts: {},
    availablePlants: [],
    currentWeek: {
        start: moment().startOf('isoWeek'),
        end: moment().endOf('isoWeek'),
        weekNumber: moment().isoWeek(),
        year: moment().year()
    },
    selectedPlant: ''
};

// ========================================================================
// CONFIGURACIONES ADICIONALES
// ========================================================================

export const CHART_CONFIG = {
    defaultHeight: 400,
    colors: [COLOR_PALETTE.primary, COLOR_PALETTE.accent, COLOR_PALETTE.success, COLOR_PALETTE.warning, COLOR_PALETTE.danger],
    fontFamily: 'Merriweather, serif',
    toolbar: {
        show: true,
        tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
        }
    }
};

export const EXPORT_CONFIG = {
    excel: {
        dateFormat: 'YYYY-MM-DD',
        filePrefix: 'Weekly-Performance'
    },
    pdf: {
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
        filePrefix: 'Weekly-Performance-Charts'
    }
};

// ========================================================================
// GETTERS Y SETTERS PARA EL ESTADO
// ========================================================================

export function getWeeklyData() {
    return APP_STATE.weeklyData;
}

export function setWeeklyData(data) {
    APP_STATE.weeklyData = data;
}

export function getCharts() {
    return APP_STATE.charts;
}

export function setChart(key, chart) {
    APP_STATE.charts[key] = chart;
}

export function getCurrentWeek() {
    return APP_STATE.currentWeek;
}

export function setCurrentWeek(weekData) {
    Object.assign(APP_STATE.currentWeek, weekData);
}

export function getSelectedPlant() {
    return APP_STATE.selectedPlant;
}

export function setSelectedPlant(plant) {
    APP_STATE.selectedPlant = plant;
}

export function getAvailablePlants() {
    return APP_STATE.availablePlants;
}

export function setAvailablePlants(plants) {
    APP_STATE.availablePlants = plants;
}