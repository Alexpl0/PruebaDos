/**
 * DATA SERVICE.JS - SERVICIOS DE DATOS Y API
 * Este módulo maneja todas las peticiones HTTP, carga de datos
 * y comunicación con los endpoints del backend.
 */

import { API_ENDPOINTS, getSelectedPlant, getCurrentWeek, setWeeklyData, setAvailablePlants } from './config.js';
import { showLoading, showErrorMessage } from './utils.js';

// ========================================================================
// FUNCIONES DE CARGA DE DATOS PRINCIPALES
// ========================================================================

/**
 * Carga los datos semanales desde el endpoint
 */
export async function loadWeeklyData() {
    try {
        showLoading(true);
        
        const dateRange = getCurrentDateRange();
        let url = `${API_ENDPOINTS.WEEKLY_KPIS}?start_date=${dateRange.start}&end_date=${dateRange.end}`;
        
        // Añadir filtro de planta si está seleccionado
        const selectedPlant = getSelectedPlant();
        if (selectedPlant && selectedPlant.trim() !== '') {
            url += `&plant=${encodeURIComponent(selectedPlant)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success') {
            const weeklyData = result.data;
            setWeeklyData(weeklyData);
            console.log('Weekly data loaded:', weeklyData);
            showLoading(false);
            return weeklyData;
        } else {
            throw new Error(result.message || 'Failed to load weekly data');
        }

    } catch (error) {
        console.error('Error loading weekly data:', error);
        showLoading(false);
        showErrorMessage(`Error loading data: ${error.message}`);
        throw error;
    }
}

/**
 * Carga las plantas disponibles desde la tabla User
 */
export async function loadAvailablePlants() {
    try {
        console.log('Fetching plants from:', API_ENDPOINTS.PLANTS);
        
        const response = await fetch(API_ENDPOINTS.PLANTS, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Plants API response:', result);
        
        if (result.status === 'success' && result.data) {
            // Los datos ya vienen como array de strings de plantas
            const plants = result.data.filter(plant => plant && plant.trim() !== '');
            console.log('Filtered plants:', plants);
            
            setAvailablePlants(plants);
            return plants;
        } else {
            console.error('Plants API returned error or no data:', result);
            return [];
        }
        
    } catch (error) {
        console.error('Error loading plants:', error);
        // Fallback: intentar cargar desde daoPremiumFreight.php
        return await loadPlantsFromPremiumFreight();
    }
}

/**
 * Función fallback para cargar plantas desde daoPremiumFreight.php
 */
async function loadPlantsFromPremiumFreight() {
    try {
        console.log('Trying fallback endpoint for plants...');
        const fallbackUrl = API_ENDPOINTS.PLANTS.replace('daoPlants.php', 'daoPremiumFreight.php');
        
        const response = await fetch(fallbackUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success' && result.data) {
            // Extraer plantas únicas de la columna creator_plant
            const plants = [...new Set(
                result.data
                    .map(item => item.creator_plant)
                    .filter(plant => plant && plant.trim() !== '')
            )].sort();
            
            console.log('Plants loaded from fallback:', plants);
            setAvailablePlants(plants);
            return plants;
        }
        
        return [];
    } catch (error) {
        console.error('Error loading plants from fallback:', error);
        return [];
    }
}

// ========================================================================
// FUNCIONES DE UTILIDAD PARA FECHAS
// ========================================================================

/**
 * Obtiene el rango de fechas actual en formato para la API
 */
export function getCurrentDateRange() {
    const currentWeek = getCurrentWeek();
    return {
        start: currentWeek.start.format('YYYY-MM-DD'),
        end: currentWeek.end.format('YYYY-MM-DD')
    };
}

// ========================================================================
// FUNCIONES DE VALIDACIÓN DE DATOS
// ========================================================================

/**
 * Valida si los datos cargados son válidos
 */
export function validateWeeklyData(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }

    // Verificar que tenga las propiedades mínimas requeridas
    const requiredProperties = [
        'total_generated',
        'total_approved',
        'total_rejected',
        'total_cost',
        'approval_rate'
    ];

    return requiredProperties.every(prop => data.hasOwnProperty(prop));
}

/**
 * Obtiene estadísticas básicas de los datos cargados
 */
export function getDataStats(data) {
    if (!validateWeeklyData(data)) {
        return null;
    }

    return {
        totalRequests: data.total_generated || 0,
        approvedRequests: data.total_approved || 0,
        rejectedRequests: data.total_rejected || 0,
        pendingRequests: data.total_pending || 0,
        totalCost: data.total_cost || 0,
        approvalRate: data.approval_rate || 0,
        hasChartData: {
            topPerformers: Array.isArray(data.top_performers) && data.top_performers.length > 0,
            areaPerformance: Array.isArray(data.area_performance) && data.area_performance.length > 0,
            approvalTimes: Array.isArray(data.approval_times_distribution) && data.approval_times_distribution.length > 0,
            dailyCosts: Array.isArray(data.daily_costs) && data.daily_costs.length > 0
        }
    };
}