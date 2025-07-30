/**
 * progress-line.js
 * Módulo reutilizable para cargar y renderizar la línea de progreso de una orden.
 * Exporta una única función para ser usada en cualquier página.
 */

/**
 * Carga los datos de progreso desde el backend y dispara el renderizado.
 * @param {number} orderId - El ID de la orden a consultar.
 * @param {string} baseURL - La URL base de la aplicación.
 */
export async function loadAndRenderProgress(orderId, baseURL) {
    const progressSection = document.getElementById('progressSection');
    if (!progressSection) {
        console.error('Progress section container not found.');
        return;
    }

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
        
        if (data.showProgress === false) {
            showError(data.message || "Progress line not available for this order.");
            return;
        }

        // Si todo va bien, mostramos la sección y renderizamos
        progressSection.classList.remove('hidden');
        renderProgressLine(data);

    } catch (error) {
        showError(error.message);
        progressSection.classList.remove('hidden'); // Mostrar la sección para ver el error
        throw error;
    }
}

/**
 * Construye la línea de progreso en el DOM. (Función interna)
 * @param {object} data - Los datos de progreso obtenidos del API.
 */
function renderProgressLine(data) {
    const checkpointsContainer = document.getElementById('checkpoints-container');
    if (!checkpointsContainer) return;
    checkpointsContainer.innerHTML = ''; 

    data.approvers.forEach((approver, index) => {
        const checkpoint = document.createElement('div');
        checkpoint.className = 'checkpoint';
        
        const position = data.approvers.length > 1 ? (index / (data.approvers.length - 1)) * 100 : 50;
        checkpoint.style.left = `${position}%`;
        
        const tooltipText = `${approver.name} (${approver.role})`;
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
 * Actualiza los elementos visuales del progreso. (Función interna)
 * @param {object} data - Los datos de progreso.
 */
function updateProgressVisuals(data) {
    const { is_rejected, is_completed, rejection_reason } = data.orderInfo;
    const progressPercent = data.progress.percentage;
    const progressBar = document.getElementById('progress-bar');
    const progressTruck = document.getElementById('progress-truck');
    
    if (!progressBar || !progressTruck) return;

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
             circle.className = 'checkpoint-circle';
             if (approver.isRejectedHere) circle.classList.add('rejected-at');
             else if (approver.isCompleted) circle.classList.add('completed');
             else if (approver.isCurrent) circle.classList.add('current');
             else circle.classList.add('pending');
        }
    });
}

/**
 * Muestra un mensaje de error en la sección de progreso. (Función interna)
 * @param {string} message - El mensaje de error a mostrar.
 */
function showError(message) {
    const progressError = document.getElementById('progress-error');
    if (!progressError) return;
    progressError.textContent = message;
    progressError.classList.remove('d-none');
    
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}
