import { loadDashboardData } from './dashboard/dataDashboard.js';

// Este archivo ahora solo importa el punto de entrada del dashboard modularizado
import './dashboard/main.js';

// Función autoejecutable para cargar los datos del dashboard
(async () => {
    try {
        console.log('📊 Loading dashboard data...');
        const orders = await loadDashboardData();
        window.allOrdersData = orders; // Asegúrate de que esta línea se ejecute correctamente
        console.log('✅ Data loaded and assigned to window.allOrdersData:', window.allOrdersData);
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
    }
})();