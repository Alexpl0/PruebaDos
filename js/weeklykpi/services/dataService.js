/**
 * Data Service for Weekly Performance Dashboard
 */

import { config } from '../config/weeklyConfig.js';
import { utilityService } from '../utils/utilities.js';

class DataService {
    constructor() {
        this.weeklyData = null;
        this.availablePlants = [];
        this.currentWeek = {
            start: moment().startOf('isoWeek'),
            end: moment().endOf('isoWeek'),
            weekNumber: moment().isoWeek(),
            year: moment().year()
        };
        this.selectedPlant = '';
        this.isLoading = false;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    async initialize() {
        console.log('Initializing DataService...');
        await this.loadAvailablePlants();
        console.log('DataService initialized successfully');
    }

    /**
     * Carga las plantas disponibles desde la tabla User
     */
    async loadAvailablePlants() {
        try {
            console.log('Loading available plants...');
            
            const cacheKey = 'plants_list';
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                this.availablePlants = cached;
                console.log(`Loaded ${cached.length} plants from cache`);
                return this.availablePlants;
            }

            const response = await fetch(config.urls.plants, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && Array.isArray(result.data)) {
                // Filtrar y limpiar datos de plantas
                const plants = result.data
                    .map(plant => typeof plant === 'string' ? plant.trim() : plant?.name?.trim() || plant?.plant?.trim())
                    .filter(plant => plant && plant !== '' && plant !== 'null' && plant !== 'undefined')
                    .filter((plant, index, arr) => arr.indexOf(plant) === index) // Eliminar duplicados
                    .sort();
                
                this.availablePlants = plants;
                this.setCache(cacheKey, plants);
                console.log(`Loaded ${plants.length} plants successfully`);
                return this.availablePlants;
            } else {
                console.warn('Plants endpoint did not return expected data structure:', result);
                return await this.loadPlantsFromPremiumFreight();
            }
        } catch (error) {
            console.error('Error loading plants from User table:', error);
            return await this.loadPlantsFromPremiumFreight();
        }
    }

    /**
     * Función fallback para cargar plantas desde daoPremiumFreight.php
     */
    async loadPlantsFromPremiumFreight() {
        try {
            console.log('Loading plants from fallback endpoint...');
            
            const fallbackUrl = config.urls.weeklyKpis.replace('daoWeeklyKPIs.php', 'daoPremiumFreight.php');
            
            const response = await fetch(fallbackUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && Array.isArray(result.data)) {
                const plants = [...new Set(result.data
                    .map(item => item.plant)
                    .filter(plant => plant && plant.trim() !== '' && plant.trim() !== 'null')
                    .map(plant => plant.trim())
                )].sort();
                
                this.availablePlants = plants;
                console.log(`Loaded ${plants.length} plants from fallback endpoint`);
                return plants;
            } else {
                throw new Error('Invalid data structure from fallback endpoint');
            }
        } catch (error) {
            console.error('Error loading plants from fallback:', error);
            // Proporcionar plantas por defecto como último recurso
            this.availablePlants = ['PLANT_1', 'PLANT_2', 'PLANT_3']; // Valores por defecto
            console.warn('Using default plant list as last resort');
            return this.availablePlants;
        }
    }

    /**
     * Carga los datos semanales desde el endpoint
     */
    async loadWeeklyData() {
        if (this.isLoading) {
            console.log('Weekly data load already in progress...');
            return this.weeklyData;
        }

        this.isLoading = true;

        try {
            console.log('Loading weekly data...');
            
            // Verificar cache primero
            const cacheKey = this.generateCacheKey();
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('Returning cached weekly data');
                this.weeklyData = cached;
                return this.weeklyData;
            }

            const dateRange = this.getCurrentDateRange();
            let url = `${config.urls.weeklyKpis}?start_date=${dateRange.start}&end_date=${dateRange.end}`;
            
            if (this.selectedPlant) {
                url += `&plant=${encodeURIComponent(this.selectedPlant)}`;
            }

            console.log('Fetching data from:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Validar y limpiar datos
                this.weeklyData = this.validateAndCleanData(result.data);
                
                // Guardar en cache
                this.setCache(cacheKey, this.weeklyData);
                
                console.log('Weekly data loaded successfully:', this.weeklyData);
                return this.weeklyData;
            } else {
                throw new Error(result.message || 'Failed to load weekly data');
            }
        } catch (error) {
            console.error('Error loading weekly data:', error);
            
            // En caso de error, intentar devolver datos del cache aunque estén expirados
            const cacheKey = this.generateCacheKey();
            const expiredCache = this.cache.get(cacheKey);
            if (expiredCache) {
                console.warn('Returning expired cache data due to fetch error');
                this.weeklyData = expiredCache.data;
                return this.weeklyData;
            }
            
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Valida y limpia los datos recibidos del servidor
     */
    validateAndCleanData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format received from server');
        }

        // Estructura de datos esperada con valores por defecto
        const cleanData = {
            // Métricas principales
            total_generated: parseInt(data.total_generated) || 0,
            total_pending: parseInt(data.total_pending) || 0,
            total_approved: parseInt(data.total_approved) || 0,
            total_rejected: parseInt(data.total_rejected) || 0,
            approval_rate: parseFloat(data.approval_rate) || 0,
            total_cost: parseFloat(data.total_cost) || 0,
            average_approval_time: data.average_approval_time || 'N/A',
            
            // Información de la semana
            week_number: parseInt(data.week_number) || this.currentWeek.weekNumber,
            year: parseInt(data.year) || this.currentWeek.year,
            start_date: data.start_date || this.currentWeek.start.format('YYYY-MM-DD'),
            end_date: data.end_date || this.currentWeek.end.format('YYYY-MM-DD'),
            selected_plant: data.selected_plant || this.selectedPlant || '',
            
            // Top performers
            top_performers: Array.isArray(data.top_performers) ? 
                data.top_performers.map(p => ({
                    name: p.name || 'N/A',
                    approved_requests: parseInt(p.approved_requests) || 0,
                    total_cost: parseFloat(p.total_cost) || 0
                })) : [],
            
            // Performance por área
            area_performance: Array.isArray(data.area_performance) ? 
                data.area_performance.map(a => ({
                    area_name: a.area_name || 'N/A',
                    total_requests: parseInt(a.total_requests) || 0,
                    total_cost: parseFloat(a.total_cost) || 0
                })) : [],
            
            // Distribución de tiempos de aprobación
            approval_times_distribution: Array.isArray(data.approval_times_distribution) ? 
                data.approval_times_distribution.map(t => ({
                    time_category: t.time_category || 'N/A',
                    count: parseInt(t.count) || 0,
                    avg_hours: t.avg_hours || 'N/A'
                })) : [],
            
            // Costos diarios
            daily_costs: Array.isArray(data.daily_costs) ? 
                data.daily_costs.map(d => ({
                    approval_date: d.approval_date || '',
                    daily_cost: parseFloat(d.daily_cost) || 0,
                    daily_count: parseInt(d.daily_count) || 0
                })) : [],
            
            // Tendencias diarias
            daily_trends: Array.isArray(data.daily_trends) ? 
                data.daily_trends.map(t => ({
                    date: t.date || '',
                    date_label: t.date_label || '',
                    generated: parseInt(t.generated) || 0,
                    approved: parseInt(t.approved) || 0,
                    rejected: parseInt(t.rejected) || 0,
                    pending: parseInt(t.pending) || 0
                })) : [],
                
            // Usuario más activo
            top_requesting_user: data.top_requesting_user ? {
                name: data.top_requesting_user.name || 'N/A',
                total_cost: parseFloat(data.top_requesting_user.total_cost) || 0,
                total_requests: parseInt(data.top_requesting_user.total_requests) || 0
            } : { name: 'N/A', total_cost: 0, total_requests: 0 },
            
            // Área con mayor gasto
            top_spending_area: data.top_spending_area ? {
                area: data.top_spending_area.area || 'N/A',
                total_spent: parseFloat(data.top_spending_area.total_spent) || 0
            } : { area: 'N/A', total_spent: 0 },
            
            // Aprobador más lento
            slowest_approver: data.slowest_approver ? {
                name: data.slowest_approver.name || 'N/A',
                duration_formatted: data.slowest_approver.duration_formatted || 'N/A'
            } : { name: 'N/A', duration_formatted: 'N/A' }
        };

        return cleanData;
    }

    /**
     * Genera clave para cache basada en parámetros actuales
     */
    generateCacheKey() {
        const dateRange = this.getCurrentDateRange();
        return `weekly_data_${dateRange.start}_${dateRange.end}_${this.selectedPlant || 'all'}`;
    }

    /**
     * Obtiene datos del cache si no han expirado
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    /**
     * Guarda datos en cache con timestamp
     */
    setCache(key, data) {
        this.cache.set(key, {
            data: utilityService.deepClone(data),
            timestamp: Date.now()
        });
        
        // Limpiar cache antiguo (mantener máximo 10 entradas)
        if (this.cache.size > 10) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * Limpia el cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Cache cleared');
    }

    /**
     * Obtiene el rango de fechas actual en formato para la API
     */
    getCurrentDateRange() {
        return {
            start: this.currentWeek.start.format('YYYY-MM-DD'),
            end: this.currentWeek.end.format('YYYY-MM-DD')
        };
    }

    /**
     * Navega a la semana anterior
     */
    navigateToPreviousWeek() {
        const oneYearAgo = moment().subtract(1, 'year');
        if (this.currentWeek.start.isAfter(oneYearAgo, 'week')) {
            this.currentWeek.start.subtract(1, 'week');
            this.currentWeek.end.subtract(1, 'week');
            this.currentWeek.weekNumber = this.currentWeek.start.isoWeek();
            this.currentWeek.year = this.currentWeek.start.year();
            
            console.log('Navigated to previous week:', this.getCurrentDateRange());
        } else {
            console.warn('Cannot navigate further back than one year ago');
        }
    }

    /**
     * Navega a la semana siguiente
     */
    navigateToNextWeek() {
        const today = moment();
        const nextWeekStart = moment(this.currentWeek.start).add(1, 'week');
        if (!nextWeekStart.isAfter(today, 'week')) {
            this.currentWeek.start.add(1, 'week');
            this.currentWeek.end.add(1, 'week');
            this.currentWeek.weekNumber = this.currentWeek.start.isoWeek();
            this.currentWeek.year = this.currentWeek.start.year();
            
            console.log('Navigated to next week:', this.getCurrentDateRange());
        } else {
            console.warn('Cannot navigate to future weeks');
        }
    }

    /**
     * Navega a una semana específica
     */
    navigateToWeek(year, weekNumber) {
        if (!year || !weekNumber || weekNumber < 1 || weekNumber > 53) {
            throw new Error('Invalid year or week number');
        }

        const newWeekStart = moment().year(year).isoWeek(weekNumber).startOf('isoWeek');
        const today = moment();
        const oneYearAgo = moment().subtract(1, 'year');

        if (newWeekStart.isAfter(today, 'week')) {
            throw new Error('Cannot navigate to future weeks');
        }

        if (newWeekStart.isBefore(oneYearAgo, 'week')) {
            throw new Error('Cannot navigate further back than one year ago');
        }

        this.currentWeek.start = newWeekStart;
        this.currentWeek.end = newWeekStart.clone().endOf('isoWeek');
        this.currentWeek.weekNumber = weekNumber;
        this.currentWeek.year = year;

        console.log('Navigated to specific week:', this.getCurrentDateRange());
    }

    /**
     * Restablece a la semana actual
     */
    resetToCurrentWeek() {
        this.currentWeek = {
            start: moment().startOf('isoWeek'),
            end: moment().endOf('isoWeek'),
            weekNumber: moment().isoWeek(),
            year: moment().year()
        };
        console.log('Reset to current week:', this.getCurrentDateRange());
    }

    /**
     * Actualiza la planta seleccionada
     */
    setSelectedPlant(plant) {
        const previousPlant = this.selectedPlant;
        this.selectedPlant = plant || '';
        
        if (previousPlant !== this.selectedPlant) {
            console.log('Selected plant changed:', previousPlant, '->', this.selectedPlant);
            // Limpiar cache relacionado cuando cambia la planta
            this.clearCache();
        }
    }

    // Getters
    getWeeklyData() { 
        return this.weeklyData; 
    }
    
    getAvailablePlants() { 
        return this.availablePlants; 
    }
    
    getCurrentWeek() { 
        return this.currentWeek; 
    }
    
    getSelectedPlant() { 
        return this.selectedPlant; 
    }

    /**
     * Obtiene estadísticas del servicio
     */
    getServiceStats() {
        return {
            cacheSize: this.cache.size,
            isLoading: this.isLoading,
            hasData: !!this.weeklyData,
            plantsCount: this.availablePlants.length,
            currentWeek: this.getCurrentDateRange(),
            selectedPlant: this.selectedPlant
        };
    }

    /**
     * Reinicia el servicio
     */
    reset() {
        this.weeklyData = null;
        this.isLoading = false;
        this.clearCache();
        this.resetToCurrentWeek();
        this.selectedPlant = '';
        console.log('DataService reset completed');
    }
}

export const dataService = new DataService();