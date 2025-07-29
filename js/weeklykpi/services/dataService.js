/**
 * Data Service for Weekly Performance Dashboard
 */

import { config } from '../config/weeklyConfig.js';

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
    }

    async initialize() {
        await this.loadAvailablePlants();
    }

    /**
     * Carga las plantas disponibles desde la tabla User
     */
    async loadAvailablePlants() {
        try {
            const response = await fetch(config.urls.plants);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && Array.isArray(result.data)) {
                this.availablePlants = result.data;
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
            const fallbackUrl = config.urls.weeklyKpis.replace('daoWeeklyKPIs.php', 'daoPremiumFreight.php');
            const response = await fetch(fallbackUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && Array.isArray(result.data)) {
                const plants = [...new Set(result.data
                    .map(item => item.plant)
                    .filter(plant => plant && plant.trim() !== '')
                )].sort();
                
                this.availablePlants = plants;
                return plants;
            } else {
                throw new Error('Invalid data structure from fallback endpoint');
            }
        } catch (error) {
            console.error('Error loading plants from fallback:', error);
            this.availablePlants = [];
            return [];
        }
    }

    /**
     * Carga los datos semanales desde el endpoint
     */
    async loadWeeklyData() {
        try {
            const dateRange = this.getCurrentDateRange();
            let url = `${config.urls.weeklyKpis}?start_date=${dateRange.start}&end_date=${dateRange.end}`;
            
            if (this.selectedPlant) {
                url += `&plant=${encodeURIComponent(this.selectedPlant)}`;
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.weeklyData = result.data;
                return this.weeklyData;
            } else {
                throw new Error(result.message || 'Failed to load weekly data');
            }
        } catch (error) {
            console.error('Error loading weekly data:', error);
            throw error;
        }
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
        }
    }

    // Getters
    getWeeklyData() { return this.weeklyData; }
    getAvailablePlants() { return this.availablePlants; }
    getCurrentWeek() { return this.currentWeek; }
    getSelectedPlant() { return this.selectedPlant; }
    
    // Setters
    setSelectedPlant(plant) { this.selectedPlant = plant; }
}

export const dataService = new DataService();