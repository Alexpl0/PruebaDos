// Manejo de datos para el dashboard

import { API_URL } from './config.js';
import { showLoading, showErrorMessage } from './utils.js';

// Variables para almacenar los datos
let premiumFreightData = [];
let filteredData = [];

/**
 * Carga los datos del premium freight desde la API
 * @returns {Promise} Promesa que se resuelve cuando los datos han sido cargados
 */
export async function loadDashboardData() {
    try {
        // Mostrar indicador de carga
        showLoading(true);
        
        // Obtener datos desde la API
        console.log("Fetching data from API...");
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Data received:", result);
        
        if (result.status === 'success' && Array.isArray(result.data)) {
            premiumFreightData = result.data;
            console.log(`Loaded ${premiumFreightData.length} records`);
            
            // Ocultar indicador de carga
            showLoading(false);
            
            return premiumFreightData;
        } else {
            console.error("Invalid data format:", result);
            throw new Error('Formato de datos inválido: ' + JSON.stringify(result));
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        showErrorMessage(`Error al cargar datos: ${error.message}`);
        showLoading(false);
        throw error;
    }
}

/**
 * Aplica filtros a los datos
 * @param {Object} filters - Objeto con los filtros a aplicar
 * @returns {Array} Datos filtrados
 */
export function applyFilters(filters) {
    const { startDate, endDate, planta, status } = filters;
    
    console.log("Applying filters:", { 
        dateRange: `${startDate} to ${endDate}`, 
        planta, status 
    });
    
    // Filtrar datos
    filteredData = premiumFreightData.filter(item => {
        // Filtro de fechas
        const itemDate = item.date ? item.date.substring(0, 10) : null;
        const dateMatch = !itemDate || (itemDate >= startDate && itemDate <= endDate);
        
        // Filtro de planta
        const plantaMatch = !planta || item.planta === planta;
        
        // Filtro de status
        const statusMatch = !status || item.status_name === status;
        
        // Combinar todos los filtros
        return dateMatch && plantaMatch && statusMatch;
    });
    
    console.log("Records after filtering:", filteredData.length);
    
    return filteredData;
}

/**
 * Obtiene los datos filtrados actuales
 * @returns {Array} Datos filtrados
 */
export function getFilteredData() {
    return filteredData;
}

/**
 * Obtiene los datos originales
 * @returns {Array} Datos originales
 */
export function getRawData() {
    return premiumFreightData;
}