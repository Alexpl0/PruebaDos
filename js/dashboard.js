import { loadDashboardData } from './dashboard/dataDashboard.js';

// Este archivo ahora solo importa el punto de entrada del dashboard modularizado
import './dashboard/main.js';

// ...dentro de tu inicialización principal:
const orders = await loadDashboardData();
window.allOrdersData = orders; // <-- Esto es lo importante