/**
 * myOrder.js (Refactorizado)
 * Maneja la lógica para la página de vista de orden individual con línea de progreso.
 * Ahora usa PF_CONFIG para una gestión de datos consistente.
 */
import { loadAndPopulateSVG } from './svgOrders.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Leer configuración desde el objeto global
    const config = window.PF_CONFIG;
    if (!config || !config.orderId) {
        showError('Configuration or Order ID is missing.');
        return;
    }

    try {
        // Cargar detalles de la orden y progreso en paralelo
        await Promise.all([
            loadOrderDetails(config.orderId, config.app.baseURL),
            loadAndRenderProgress(config.orderId, config.app.baseURL)
        ]);
    } catch (error) {
        console.error("Error initializing page:", error);
        // El error ya se muestra en la función específica, no es necesario mostrarlo de nuevo
    }
});

/**
 * Carga y renderiza los detalles de la orden (SVG).
 */
async function loadOrderDetails(orderId, baseURL) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    try {
        const response = await fetch(`${baseURL}dao/conections/daoPremiumFreight.php`);
        if (!response.ok) throw new Error('Could not load order data.');
        
        const result = await response.json();
        if (!result.data) throw new Error('Invalid order data format.');

        const orderData = result.data.find(order => order.id == orderId);
        if (!orderData) throw new Error(`Order #${orderId} not found or permission denied.`);

        await loadAndPopulateSVG(orderData, 'svgContent');
        loadingSpinner.style.display = 'none';
        document.getElementById('svgContent').style.opacity = 1;

    } catch (error) {
        loadingSpinner.innerHTML = `<p class="text-danger">${error.message}</p>`;
        throw error;
    }
}

/**
 * Carga los datos de progreso y renderiza la línea.
 */
async function loadAndRenderProgress(orderId, baseURL) {
    try {
        const response = await fetch(`${baseURL}dao/users/daoOrderProgress.php?orderId=${orderId}`);
        if (!response.ok) {
             const errorData = await response.json().catch(() => null);
             throw new Error(errorData?.message || 'Error connecting to the progress service.');
        }
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Could not get order progress.');
        }
        
        // La restricción ahora se maneja en el backend, pero mantenemos esto por si acaso.
        if (data.showProgress === false) {
            showError(data.message || "Progress line not available for this order.");
            return;
        }

        renderProgressLine(data);

    } catch (error) {
        showError(error.message);
        throw error;
    }
}

/**
 * Construye la línea de progreso en el DOM.
 */
function renderProgressLine(data) {
    const checkpointsContainer = document.getElementById('checkpoints-container');
    checkpointsContainer.innerHTML = ''; 

    data.approvers.forEach((approver, index) => {
        const checkpoint = document.createElement('div');
        checkpoint.className = 'checkpoint';
        
        // Asegura que el primer y último checkpoint estén en los bordes
        const position = data.approvers.length > 1 ? (index / (data.approvers.length - 1)) * 100 : 50;
        checkpoint.style.left = `${position}%`;
        
        const tooltipText = `${approver.name} (${approver.role})`;

        // NUEVO: Verificar si hay una fecha y hora para mostrarla
        const timestamp = approver.actionTimestamp;
        let timeHTML = '';
        if (timestamp) {
            const formattedDate = new Date(timestamp).toLocaleString(navigator.language, {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            timeHTML = `<div class="checkpoint-time">${formattedDate}</div>`;
        }

        checkpoint.innerHTML = `
            <div id="circle-${approver.level}" class="checkpoint-circle" data-tooltip="${tooltipText}"></div>
            <div class="checkpoint-info">
                <div class="checkpoint-name">${approver.name}</div>
                <div class="checkpoint-role">${approver.role}</div>
                ${timeHTML}
            </div>
        `;
        checkpointsContainer.appendChild(checkpoint);
    });

    updateProgressVisuals(data);
}

/**
 * Actualiza los elementos visuales del progreso (barra, camión, círculos).
 */
function updateProgressVisuals(data) {
    const { is_rejected, is_completed, rejection_reason } = data.orderInfo;
    const progressPercent = data.progress.percentage;
    const progressBar = document.getElementById('progress-bar');
    const progressTruck = document.getElementById('progress-truck');
    
    // Reset classes
    progressBar.className = 'progress-bar'; 
    progressTruck.className = 'progress-truck';
    
    progressBar.style.width = `${progressPercent}%`;
    progressTruck.style.left = `${progressPercent}%`;
    const truckIcon = progressTruck.querySelector('i');

    if (is_rejected) {
        progressBar.classList.add('rejected');
        progressTruck.classList.add('rejected');
        truckIcon.className = 'fa-solid fa-car-burst';
        progressTruck.onclick = () => Swal.fire({ 
            icon: 'error', 
            title: 'Order Rejected', 
            html: `<strong>Reason:</strong><p>${rejection_reason || 'No reason specified.'}</p>` 
        });
    } else if (is_completed) {
        progressBar.classList.add('completed');
        progressTruck.classList.add('completed');
        truckIcon.className = 'fa-solid fa-check-circle';
        progressTruck.onclick = null;
    } else {
        progressBar.classList.add('in-progress');
        progressTruck.classList.add('in-progress');
        truckIcon.className = 'fa-solid fa-truck';
        progressTruck.onclick = null;
    }

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
 * Muestra un mensaje de error en la sección de progreso.
 */
function showError(message) {
    const progressError = document.getElementById('progress-error');
    progressError.textContent = message;
    progressError.classList.remove('d-none');
    
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}
