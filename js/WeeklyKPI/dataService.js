/**
 * DATA SERVICE.JS - SERVICIOS DE DATOS Y API - CORREGIDO
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
        
        console.log('Loading weekly data from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            // Intentar leer el cuerpo de la respuesta para obtener más detalles del error
            let errorMessage = `HTTP error! Status: ${response.status}`;
            try {
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                
                // Intentar parsear como JSON para obtener más detalles
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.message) {
                        errorMessage += ` - ${errorJson.message}`;
                    }
                    if (errorJson.debug) {
                        console.error('Debug info:', errorJson.debug);
                    }
                } catch (parseError) {
                    // Si no es JSON válido, usar el texto tal como está
                    if (errorText.length > 0 && errorText.length < 500) {
                        errorMessage += ` - ${errorText}`;
                    }
                }
            } catch (textError) {
                console.error('Could not read error response body:', textError);
            }
            
            throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error('Non-JSON response received:', responseText);
            throw new Error('Server returned non-JSON response. Check server logs.');
        }

        const result = await response.json();
        console.log('Weekly data API response:', result);
        
        if (result.status === 'success') {
            const weeklyData = result.data || {};
            
            // Validar que los datos tienen la estructura esperada
            if (!validateWeeklyData(weeklyData)) {
                console.warn('Weekly data structure validation failed, using defaults');
                const defaultData = getDefaultWeeklyData();
                setWeeklyData(defaultData);
                showLoading(false);
                return defaultData;
            }
            
            setWeeklyData(weeklyData);
            console.log('Weekly data loaded successfully:', weeklyData);
            showLoading(false);
            return weeklyData;
        } else {
            throw new Error(result.message || 'Failed to load weekly data');
        }

    } catch (error) {
        console.error('Error loading weekly data:', error);
        showLoading(false);
        
        // Proporcionar datos por defecto en caso de error para evitar que el dashboard se rompa
        const defaultData = getDefaultWeeklyData();
        setWeeklyData(defaultData);
        
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
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });

        console.log('Plants response status:', response.status);

        if (!response.ok) {
            console.warn(`Plants endpoint returned ${response.status}, trying fallback`);
            return await loadPlantsFromPremiumFreight();
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('Plants endpoint returned non-JSON, trying fallback');
            return await loadPlantsFromPremiumFreight();
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
            return await loadPlantsFromPremiumFreight();
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
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            console.warn('Fallback endpoint also failed, using default plants');
            return getDefaultPlants();
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
        
        return getDefaultPlants();
    } catch (error) {
        console.error('Error loading plants from fallback:', error);
        return getDefaultPlants();
    }
}

/**
 * Retorna plantas por defecto en caso de que todos los endpoints fallen
 */
function getDefaultPlants() {
    const defaultPlants = ['1640', '3310', '3330', '3510'];
    console.log('Using default plants:', defaultPlants);
    setAvailablePlants(defaultPlants);
    return defaultPlants;
}

/**
 * Retorna datos semanales por defecto en caso de error
 */
function getDefaultWeeklyData() {
    return {
        total_generated: 0,
        total_pending: 0,
        total_approved: 0,
        total_rejected: 0,
        total_cost: 0,
        approval_rate: 0,
        average_approval_time: 'N/A',
        average_approval_time_seconds: null,
        top_requesting_user: {
            name: 'N/A',
            request_count: 0,
            total_cost: 0
        },
        top_spending_area: {
            area: 'N/A',
            total_spent: 0
        },
        slowest_approver: {
            name: 'N/A',
            duration_formatted: 'N/A'
        },
        top_performers: [],
        area_performance: [],
        approval_times_distribution: [],
        daily_costs: []
    };
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
        console.warn('Data validation failed: not an object');
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

    const missingProperties = requiredProperties.filter(prop => !data.hasOwnProperty(prop));
    
    if (missingProperties.length > 0) {
        console.warn('Data validation failed: missing properties:', missingProperties);
        return false;
    }

    // Verificar que los valores numéricos sean válidos
    const numericProperties = ['total_generated', 'total_approved', 'total_rejected', 'total_cost', 'approval_rate'];
    
    for (const prop of numericProperties) {
        if (data[prop] !== null && data[prop] !== undefined && (isNaN(data[prop]) || data[prop] < 0)) {
            console.warn(`Data validation failed: ${prop} is not a valid number:`, data[prop]);
            return false;
        }
    }

    return true;
}

/**
 * Obtiene estadísticas básicas de los datos cargados
 */
export function getDataStats(data) {
    if (!validateWeeklyData(data)) {
        return null;
    }

    return {
        totalActivity: data.total_generated || 0,
        successfulRequests: data.total_approved || 0,
        efficiency: `${data.approval_rate || 0}%`,
        totalInvestment: `€${formatNumber(data.total_cost || 0, 2)}`,
        averageCost: data.total_generated > 0 ? `€${formatNumber((data.total_cost || 0) / data.total_generated, 2)}` : '€0',
        topPerformer: data.top_requesting_user?.name || 'N/A',
        hasChartData: {
            topPerformers: Array.isArray(data.top_performers) && data.top_performers.length > 0,
            areaPerformance: Array.isArray(data.area_performance) && data.area_performance.length > 0,
            approvalTimes: Array.isArray(data.approval_times_distribution) && data.approval_times_distribution.length > 0,
            dailyCosts: Array.isArray(data.daily_costs) && data.daily_costs.length > 0
        }
    };
}

/**
 * Helper para formatear números (reutilizado de utils.js)
 */
function formatNumber(number, decimals = 0) {
    if (isNaN(number)) return '0';
    return number.toLocaleString(undefined, { maximumFractionDigits: decimals });
}