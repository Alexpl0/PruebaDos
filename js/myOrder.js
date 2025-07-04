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
        await Promise.all([
            loadOrderDetails(config.orderId, config.app.baseURL),
            loadAndRenderProgress(config.orderId, config.app.baseURL)
        ]);
    } catch (error) {
        console.error("Error initializing page:", error);
        showError(error.message);
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
        console.log('Data: ', orderData);
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
        if (!response.ok) throw new Error('Error connecting to the progress service.');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Could not get order progress.');
        
        if (data.showProgress === false) {
            showError(data.message || "Progress line is only available to the order creator.");
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
        const position = (index / (data.approvers.length - 1)) * 100;
        checkpoint.style.left = `${position}%`;
        
        const tooltipText = `${approver.name} (${approver.role})`;
        checkpoint.innerHTML = `
            <div id="circle-${approver.level}" class="checkpoint-circle" data-tooltip="${tooltipText}"></div>
            <div class="checkpoint-info">
                <div class="checkpoint-name">${approver.name}</div>
                <div class="checkpoint-role">${approver.role}</div>
            </div>
        `;
        checkpointsContainer.appendChild(checkpoint);
    });

    updateProgressVisuals(data);
}

/**
 * Actualiza los elementos visuales del progreso.
 */
function updateProgressVisuals(data) {
    const { is_rejected, is_completed, rejection_reason } = data.orderInfo;
    const progressPercent = data.progress.percentage;
    const progressBar = document.getElementById('progress-bar');
    const progressTruck = document.getElementById('progress-truck');
    
    progressBar.className = 'progress-bar'; // Reset
    progressTruck.className = 'progress-truck'; // Reset
    
    progressBar.style.width = `${progressPercent}%`;
    progressTruck.style.left = `${progressPercent}%`;
    const truckIcon = progressTruck.querySelector('i');

    if (is_rejected) {
        progressBar.classList.add('rejected');
        progressTruck.classList.add('rejected');
        truckIcon.className = 'fa-solid fa-car-burst';
        progressTruck.onclick = () => Swal.fire({ icon: 'error', title: 'Order Rejected', html: `<strong>Reason:</strong><p>${rejection_reason || 'No reason specified.'}</p>` });
    } else if (is_completed) {
        progressBar.classList.add('completed');
        progressTruck.classList.add('completed');
        truckIcon.className = 'fa-solid fa-check-circle';
    } else {
        progressBar.classList.add('in-progress');
        progressTruck.classList.add('in-progress');
        truckIcon.className = 'fa-solid fa-truck';
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
 * Muestra un mensaje de error.
 */
function showError(message) {
    const progressError = document.getElementById('progress-error');
    progressError.textContent = message;
    progressError.classList.remove('d-none');
    document.getElementById('progress-container').style.display = 'none';
}
