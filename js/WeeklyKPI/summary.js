/**
 * SELECTORS.JS - MANEJO DE SELECTORES
 * Este módulo maneja el selector de semanas, navegación temporal
 * y el selector de plantas del dashboard.
 */

import { getCurrentWeek, setCurrentWeek, setSelectedPlant, getAvailablePlants } from './config.js';
import { loadAvailablePlants } from './dataService.js';
import { showErrorMessage, addEventListenerSafe } from './utils.js';

// ========================================================================
// INICIALIZACIÓN DE SELECTORES
// ========================================================================

/**
 * Inicializa el selector de semanas y plantas
 */
export function initializeSelectors() {
    updateWeekDisplay();
    initializePlantSelector();
    setupWeekNavigation();
    setupPlantSelector();
}

/**
 * Configura la navegación de semanas
 */
function setupWeekNavigation() {
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');

    if (prevBtn) {
        addEventListenerSafe(prevBtn, 'click', handlePreviousWeek);
    }

    if (nextBtn) {
        addEventListenerSafe(nextBtn, 'click', handleNextWeek);
    }

    // Añadir soporte para teclado
    addEventListenerSafe(document, 'keydown', handleKeyboardNavigation);
}

/**
 * Configura el selector de plantas
 */
function setupPlantSelector() {
    const plantSelector = document.getElementById('plantSelector');
    if (plantSelector) {
        addEventListenerSafe(plantSelector, 'change', handlePlantChange);
    }
}

// ========================================================================
// MANEJO DE NAVEGACIÓN DE SEMANAS
// ========================================================================

/**
 * Maneja la navegación a la semana anterior
 */
function handlePreviousWeek() {
    const currentWeek = getCurrentWeek();
    const newWeek = {
        start: moment(currentWeek.start).subtract(1, 'week'),
        end: moment(currentWeek.end).subtract(1, 'week')
    };
    
    newWeek.weekNumber = newWeek.start.isoWeek();
    newWeek.year = newWeek.start.year();
    
    // Verificar límite hacia atrás (máximo 1 año)
    const oneYearAgo = moment().subtract(1, 'year');
    if (newWeek.start.isBefore(oneYearAgo, 'week')) {
        showErrorMessage('Cannot navigate more than one year back');
        return;
    }
    
    setCurrentWeek(newWeek);
    updateWeekDisplay();
    
    // Emitir evento para que otros módulos puedan reaccionar
    dispatchWeekChangeEvent();
}

/**
 * Maneja la navegación a la semana siguiente
 */
function handleNextWeek() {
    const currentWeek = getCurrentWeek();
    const nextWeekStart = moment(currentWeek.start).add(1, 'week');
    const today = moment();

    // No permitir navegación a semanas futuras
    if (nextWeekStart.isAfter(today, 'week')) {
        showErrorMessage('Cannot navigate to future weeks');
        return;
    }
    
    const newWeek = {
        start: moment(currentWeek.start).add(1, 'week'),
        end: moment(currentWeek.end).add(1, 'week')
    };
    
    newWeek.weekNumber = newWeek.start.isoWeek();
    newWeek.year = newWeek.start.year();
    
    setCurrentWeek(newWeek);
    updateWeekDisplay();
    
    // Emitir evento para que otros módulos puedan reaccionar
    dispatchWeekChangeEvent();
}

/**
 * Maneja la navegación por teclado
 */
function handleKeyboardNavigation(e) {
    // Solo activar si no estamos en un input o textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                handlePreviousWeek();
                break;
            case 'ArrowRight':
                e.preventDefault();
                handleNextWeek();
                break;
            case 'r':
            case 'R':
                e.preventDefault();
                dispatchRefreshEvent();
                break;
        }
    }
}

/**
 * Actualiza la visualización del selector de semanas
 */
export function updateWeekDisplay() {
    const currentWeek = getCurrentWeek();
    const weekDisplay = document.getElementById('weekDisplay');
    const weekNumber = document.getElementById('weekNumber');
    const weekDates = document.getElementById('weekDates');
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');
    
    // Información de la semana
    const weekInfo = `Week ${currentWeek.weekNumber} of ${currentWeek.year}`;
    const weekDateRange = `${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD')}`;
    
    // Actualizar elementos individuales si existen
    if (weekNumber) {
        weekNumber.textContent = weekInfo;
    }
    
    if (weekDates) {
        weekDates.textContent = weekDateRange;
    }
    
    // Fallback: actualizar contenedor completo si los elementos individuales no existen
    if (!weekNumber && !weekDates && weekDisplay) {
        weekDisplay.innerHTML = `
            <div class="week-info fw-bold">${weekInfo}</div>
            <div class="week-dates">${weekDateRange}</div>
        `;
    }
    
    // Actualizar estado de botones de navegación
    updateNavigationButtons(prevBtn, nextBtn);
}

/**
 * Actualiza el estado de los botones de navegación
 */
function updateNavigationButtons(prevBtn, nextBtn) {
    const currentWeek = getCurrentWeek();
    const today = moment();
    const nextWeekStart = moment(currentWeek.start).add(1, 'week');
    const oneYearAgo = moment().subtract(1, 'year');
    
    // Deshabilitar navegación futura
    if (nextBtn) {
        nextBtn.disabled = nextWeekStart.isAfter(today, 'week');
        nextBtn.title = nextBtn.disabled ? 'Cannot navigate to future weeks' : 'Next week (Ctrl + →)';
    }
    
    // Deshabilitar navegación muy hacia atrás
    if (prevBtn) {
        prevBtn.disabled = currentWeek.start.isBefore(oneYearAgo, 'week');
        prevBtn.title = prevBtn.disabled ? 'Maximum history reached (1 year)' : 'Previous week (Ctrl + ←)';
    }
}

// ========================================================================
// MANEJO DEL SELECTOR DE PLANTAS
// ========================================================================

/**
 * Inicializa el selector de plantas
 */
export async function initializePlantSelector() {
    try {
        console.log('Loading plants for selector...');
        const plantsData = await loadAvailablePlants();
        const plantSelector = document.getElementById('plantSelector');
        
        if (!plantSelector) {
            console.error('Plant selector element not found');
            return;
        }
        
        populatePlantSelector(plantSelector, plantsData);
        
    } catch (error) {
        console.error('Error loading plants:', error);
    }
}

/**
 * Llena el selector de plantas con los datos
 */
function populatePlantSelector(selector, plantsData) {
    // Limpiar opciones existentes excepto "All Plants"
    selector.innerHTML = '<option value="">All Plants</option>';
    
    console.log('Plants loaded for selector:', plantsData);
    
    // Añadir plantas disponibles
    if (plantsData && plantsData.length > 0) {
        plantsData.forEach(plant => {
            const option = document.createElement('option');
            option.value = plant;
            option.textContent = plant;
            selector.appendChild(option);
        });
        console.log('Plant selector populated with', plantsData.length, 'plants');
    } else {
        console.warn('No plants found or plants data is empty');
        
        // Añadir opción de "No plants available"
        const noDataOption = document.createElement('option');
        noDataOption.value = '';
        noDataOption.textContent = 'No plants available';
        noDataOption.disabled = true;
        selector.appendChild(noDataOption);
    }
}

/**
 * Maneja el cambio en el selector de plantas
 */
function handlePlantChange(e) {
    const selectedPlant = e.target.value;
    setSelectedPlant(selectedPlant);
    console.log('Plant selected:', selectedPlant);
    
    // Emitir evento para que otros módulos puedan reaccionar
    dispatchPlantChangeEvent(selectedPlant);
}

// ========================================================================
// OBTENCIÓN DE VALORES ACTUALES
// ========================================================================

/**
 * Obtiene el rango de fechas actual para mostrar en la UI
 */
export function getCurrentDateRangeForDisplay() {
    const currentWeek = getCurrentWeek();
    return {
        weekNumber: currentWeek.weekNumber,
        year: currentWeek.year,
        startDate: currentWeek.start.format('MMM DD'),
        endDate: currentWeek.end.format('MMM DD, YYYY'),
        fullRange: `${currentWeek.start.format('MMM DD')} - ${currentWeek.end.format('MMM DD, YYYY')}`
    };
}

/**
 * Obtiene la información de la planta seleccionada
 */
export function getSelectedPlantInfo() {
    const availablePlants = getAvailablePlants();
    const plantSelector = document.getElementById('plantSelector');
    
    return {
        selected: plantSelector ? plantSelector.value : '',
        available: availablePlants,
        hasSelection: plantSelector ? plantSelector.value !== '' : false
    };
}

// ========================================================================
// EVENTOS PERSONALIZADOS
// ========================================================================

/**
 * Emite evento cuando cambia la semana
 */
function dispatchWeekChangeEvent() {
    const event = new CustomEvent('weekChanged', {
        detail: {
            week: getCurrentWeek(),
            dateRange: getCurrentDateRangeForDisplay()
        }
    });
    document.dispatchEvent(event);
}

/**
 * Emite evento cuando cambia la planta
 */
function dispatchPlantChangeEvent(selectedPlant) {
    const event = new CustomEvent('plantChanged', {
        detail: {
            plant: selectedPlant,
            plantInfo: getSelectedPlantInfo()
        }
    });
    document.dispatchEvent(event);
}

/**
 * Emite evento de refresh
 */
function dispatchRefreshEvent() {
    const event = new CustomEvent('dataRefreshRequested', {
        detail: {
            timestamp: new Date(),
            source: 'keyboard'
        }
    });
    document.dispatchEvent(event);
}

// ========================================================================
// FUNCIONES DE UTILIDAD PARA SELECTORES
// ========================================================================

/**
 * Resetea el selector de plantas a "All Plants"
 */
export function resetPlantSelector() {
    const plantSelector = document.getElementById('plantSelector');
    if (plantSelector) {
        plantSelector.value = '';
        setSelectedPlant('');
        dispatchPlantChangeEvent('');
    }
}

/**
 * Establece la semana actual a hoy
 */
export function goToCurrentWeek() {
    const currentWeek = {
        start: moment().startOf('isoWeek'),
        end: moment().endOf('isoWeek'),
        weekNumber: moment().isoWeek(),
        year: moment().year()
    };
    
    setCurrentWeek(currentWeek);
    updateWeekDisplay();
    dispatchWeekChangeEvent();
}