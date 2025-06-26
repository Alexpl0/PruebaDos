/**
 * myOrder.js
 * Maneja la lógica para la página de vista de orden individual con línea de progreso.
 */
import { loadAndPopulateSVG } from './svgOrders.js';

// --- ELEMENTOS DEL DOM ---
const progressBar = document.getElementById('progress-bar');
const progressTruck = document.getElementById('progress-truck');
const checkpointsContainer = document.getElementById('checkpoints-container');
const progressError = document.getElementById('progress-error');
const svgContainer = document.getElementById('svgContent');
const loadingSpinner = document.getElementById('loadingSpinner');

/**
 * Función principal que se ejecuta al cargar la página.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const orderId = window.APP_CONFIG.orderId;
    if (!orderId) {
        showError('No se especificó una orden.');
        return;
    }

    try {
        // Cargar los detalles de la orden (SVG) y el progreso en paralelo
        await Promise.all([
            loadOrderDetails(orderId),
            loadAndRenderProgress(orderId)
        ]);
    } catch (error) {
        console.error("Error al inicializar la página:", error);
        showError(error.message);
    }
});

/**
 * Carga y renderiza los detalles de la orden (SVG).
 * @param {number} orderId - El ID de la orden.
 */
async function loadOrderDetails(orderId) {
     try {
        const response = await fetch(`${window.APP_CONFIG.baseURL}dao/conections/daoPremiumFreight.php`);
        if (!response.ok) throw new Error('No se pudieron cargar los datos de las órdenes.');
        const result = await response.json();
        if (!result.data) throw new Error('Formato de datos de orden inválido.');

        const orderData = result.data.find(order => order.id == orderId);
        if (!orderData) throw new Error(`Orden #${orderId} no encontrada o sin permisos para verla.`);

        await loadAndPopulateSVG(orderData, 'svgContent');
        loadingSpinner.style.display = 'none'; // Ocultar spinner
        svgContainer.style.opacity = 1;

    } catch (error) {
        loadingSpinner.innerHTML = `<p class="text-danger">${error.message}</p>`;
        throw error;
    }
}


/**
 * Carga los datos de progreso y renderiza la línea.
 * @param {number} orderId - El ID de la orden.
 */
async function loadAndRenderProgress(orderId) {
    try {
        const response = await fetch(`${window.APP_CONFIG.baseURL}dao/users/daoOrderProgress.php?orderId=${orderId}`);
        if (!response.ok) throw new Error('Error al conectar con el servicio de progreso.');
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'No se pudo obtener el progreso de la orden.');
        }

        // Si el usuario no es el creador, la API lo indica pero no es un error.
        if (data.showProgress === false) {
             progressError.textContent = data.message || "La línea de progreso solo está disponible para el creador de la orden.";
             progressError.classList.remove('d-none');
             return;
        }

        renderProgressLine(data);

    } catch (error) {
        showError(error.message);
        throw error;
    }
}

/**
 * Construye la línea de progreso en el DOM a partir de los datos recibidos.
 * @param {object} data - Los datos del endpoint daoOrderProgress.
 */
function renderProgressLine(data) {
    checkpointsContainer.innerHTML = ''; // Limpiar checkpoints existentes

    // 1. Crear los checkpoints
    data.approvers.forEach((approver, index) => {
        const checkpoint = document.createElement('div');
        checkpoint.className = 'checkpoint';
        
        // Ajustar la posición de cada checkpoint
        const position = (index / (data.approvers.length - 1)) * 100;
        checkpoint.style.position = 'absolute';
        checkpoint.style.left = `${position}%`;
        checkpoint.style.transform = 'translateX(-50%)';

        // CORREGIDO: Se elimina el texto (iniciales) de dentro del círculo.
        checkpoint.innerHTML = `
            <div id="circle-${approver.level}" class="checkpoint-circle">
                <!-- Círculo sin texto -->
            </div>
            <div class="checkpoint-info">
                <div class="checkpoint-name">${approver.name}</div>
                <div class="checkpoint-role">${approver.role}</div>
            </div>
        `;
        checkpointsContainer.appendChild(checkpoint);
    });

    // 2. Actualizar el estado visual de los checkpoints y la barra
    updateProgressVisuals(data);
}

/**
 * Actualiza los colores, íconos y posiciones según el estado de la orden.
 * @param {object} data - Los datos del endpoint daoOrderProgress.
 */
function updateProgressVisuals(data) {
    const { is_rejected, is_completed, rejection_reason } = data.orderInfo;
    const progressPercent = data.progress.percentage;

    // Quitar clases de estado anteriores
    progressBar.classList.remove('in-progress', 'completed', 'rejected');
    progressTruck.classList.remove('in-progress', 'completed', 'rejected');

    // 3. Establecer el ancho y color de la barra
    progressBar.style.width = `${progressPercent}%`;

    // 4. Mover el camión y cambiar el ícono si es necesario
    progressTruck.style.left = `${progressPercent}%`;
    const truckIcon = progressTruck.querySelector('i');

    if (is_rejected) {
        progressBar.classList.add('rejected');
        progressTruck.classList.add('rejected');
        truckIcon.className = 'fa-solid fa-car-burst';
        progressTruck.onclick = () => {
            Swal.fire({
                icon: 'error',
                title: 'Orden Rechazada',
                html: `<strong>Razón:</strong><p>${rejection_reason || 'No se especificó una razón.'}</p>`,
            });
        };
    } else if (is_completed) {
        progressBar.classList.add('completed');
        progressTruck.classList.add('completed');
        truckIcon.className = 'fa-solid fa-check-circle';
    } else {
        progressBar.classList.add('in-progress');
        progressTruck.classList.add('in-progress');
        truckIcon.className = 'fa-solid fa-truck';
    }

    // 5. Actualizar los círculos de los checkpoints
    data.approvers.forEach(approver => {
        const circle = document.getElementById(`circle-${approver.level}`);
        if(circle) {
             circle.className = 'checkpoint-circle'; // Reset
             if (approver.isRejectedHere) circle.classList.add('rejected-at');
             else if (approver.isCompleted) circle.classList.add('completed');
             else if (approver.isCurrent) circle.classList.add('current');
             else circle.classList.add('pending');
        }
    });
}


/**
 * Obtiene las iniciales de un nombre completo.
 * @param {string} fullName - El nombre completo del usuario.
 * @returns {string} Las iniciales (ej. "J. Doe").
 */
function getInitials(fullName) {
    if (!fullName || typeof fullName !== 'string') return '?';
    const parts = fullName.split(' ');
    const firstInitial = parts[0].charAt(0).toUpperCase();
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    return `${firstInitial}. ${lastName}`;
}

/**
 * Muestra un mensaje de error en la sección de progreso.
 * @param {string} message - El mensaje de error.
 */
function showError(message) {
    progressError.textContent = message;
    progressError.classList.remove('d-none');
    document.getElementById('progress-container').style.display = 'none';
}
