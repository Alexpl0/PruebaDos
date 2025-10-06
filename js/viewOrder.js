/**
 * viewOrder.js - Premium Freight Order Viewer
 * 
 * ACTUALIZACIÓN v2.2 (2025-10-06):
 * - Corregido para usar window.PF_CONFIG.orderId directamente
 * - Usa approvalLevel para validaciones de permisos
 * - NUEVO: Integración con svgOrders.js para renderizar SVG
 */

import { approveOrder, rejectOrder } from './approval.js';
import { loadAndPopulateSVG, generatePDF } from './svgOrders.js';

let currentOrder = null;
let isLoading = false;

document.addEventListener('DOMContentLoaded', initializeViewOrder);

async function initializeViewOrder() {
    console.log('[viewOrder.js] Initializing page...');
    try {
        await loadOrderData();
        await initializeOrderDisplay();
        setupEventListeners();
        configureActionButtons();
    } catch (error) {
        console.error('[viewOrder.js] Initialization error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: error.message
        });
    }
}

/**
 * CORREGIDO: Ahora usa window.PF_CONFIG.orderId directamente
 */
async function loadOrderData() {
    try {
        // CORREGIDO: Usar PF_CONFIG.orderId en lugar de URLSearchParams
        const orderId = window.PF_CONFIG?.orderId;

        if (!orderId) {
            throw new Error('No order ID provided');
        }

        console.log('[viewOrder.js] Loading data for Order ID:', orderId);

        // Hacer la petición al servidor para obtener los datos de la orden
        const response = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/users/daoOrderProgress.php?orderId=${orderId}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to load order data');
        }

        // La respuesta de daoOrderProgress.php tiene la orden en data.order
        currentOrder = {
            ...data.order,
            // Mapear current_approval_level a approval_status para compatibilidad
            approval_status: data.order.current_approval_level,
            // Mapear order_plant a creator_plant para compatibilidad
            creator_plant: data.order.order_plant,
            // Guardar también el timeline y el historial
            approval_timeline: data.approval_timeline || [],
            approval_history: data.approval_history || []
        };
        
        // NUEVO: Exportar a window para que approval.js pueda acceder
        window.currentOrder = currentOrder;
        
        console.log('[viewOrder.js] Order data loaded successfully:', currentOrder);

    } catch (error) {
        console.error('[viewOrder.js] Error loading order data:', error);
        throw error;
    }
}

async function initializeOrderDisplay() {
    try {
        if (!currentOrder) {
            throw new Error('No order data available');
        }

        // Ocultar spinner de carga
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.classList.add('hidden');
        }

        // CORREGIDO: Usar loadAndPopulateSVG para cargar el SVG con los datos
        console.log('[viewOrder.js] Loading SVG for order:', currentOrder.id);
        
        try {
            await loadAndPopulateSVG(currentOrder, 'svgContent');
            
            // Mostrar contenido de la orden
            const svgContent = document.getElementById('svgContent');
            if (svgContent) {
                svgContent.classList.remove('hidden');
            }
            
            console.log('[viewOrder.js] SVG loaded successfully');
        } catch (svgError) {
            console.error('[viewOrder.js] Error loading SVG:', svgError);
            // Fallback: mostrar información básica si el SVG falla
            renderOrderDetailsBasic(currentOrder);
        }

        // Mostrar/ocultar botón de archivos de recuperación si aplica
        const recoveryBtn = document.getElementById('recoveryFilesBtn');
        if (recoveryBtn && currentOrder.recovery_file) {
            recoveryBtn.classList.remove('hidden');
        }

        console.log('[viewOrder.js] Order display initialized');
        
    } catch (error) {
        console.error('[viewOrder.js] Error initializing display:', error);
        throw error;
    }
}

/**
 * Renderiza los detalles de la orden en formato básico (fallback si SVG falla)
 */
function renderOrderDetailsBasic(order) {
    const svgContent = document.getElementById('svgContent');
    if (!svgContent) return;

    const detailsHtml = `
        <div class="order-details">
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i> SVG template could not be loaded. Showing basic information.
            </div>
            <div class="order-header-info">
                <h3>Order Details</h3>
                <span class="badge ${order.is_rejected ? 'bg-danger' : 'bg-success'}">
                    ${order.is_rejected ? 'Rejected' : getStatusText(order.current_approval_level)}
                </span>
            </div>
            
            <div class="order-info-grid">
                <div class="info-item">
                    <strong>Order ID:</strong> 
                    <span>${order.id}</span>
                </div>
                
                <div class="info-item">
                    <strong>Premium Freight #:</strong> 
                    <span>${order.premium_freight_number || 'N/A'}</span>
                </div>
                
                <div class="info-item">
                    <strong>Status:</strong> 
                    <span>${order.status || 'N/A'}</span>
                </div>
                
                <div class="info-item">
                    <strong>Created by:</strong> 
                    <span>${order.creator_name || 'N/A'}</span>
                </div>
                
                <div class="info-item">
                    <strong>Plant:</strong> 
                    <span>${order.order_plant || 'N/A'}</span>
                </div>
                
                <div class="info-item">
                    <strong>Current Approval Level:</strong> 
                    <span>${order.current_approval_level} / ${order.required_auth_level}</span>
                </div>
                
                ${order.description ? `
                <div class="info-item full-width">
                    <strong>Description:</strong> 
                    <p>${order.description}</p>
                </div>
                ` : ''}
                
                ${order.is_rejected && order.rejection_reason ? `
                <div class="info-item full-width">
                    <strong>Rejection Reason:</strong> 
                    <span class="text-danger">${order.rejection_reason}</span>
                </div>
                ` : ''}
            </div>
            
            ${renderApprovalTimeline(order.approval_timeline)}
        </div>
    `;

    svgContent.innerHTML = detailsHtml;
    svgContent.classList.remove('hidden');
}

/**
 * Renderiza la línea de tiempo de aprobaciones
 */
function renderApprovalTimeline(timeline) {
    if (!timeline || timeline.length === 0) {
        return '';
    }

    const timelineHtml = timeline.map(item => {
        const statusClass = item.status === 'approved' ? 'success' : 
                          item.status === 'current' ? 'warning' : 
                          item.status === 'skipped' ? 'secondary' : 'light';
        
        const approverName = item.approver ? item.approver.name : 'Not assigned';
        const approverRole = item.approver ? item.approver.role : '';
        const approvedDate = item.history ? new Date(item.history.approved_at).toLocaleDateString() : '';
        
        return `
            <div class="timeline-item timeline-${item.status}">
                <div class="timeline-badge bg-${statusClass}">
                    ${item.level}
                </div>
                <div class="timeline-content">
                    <h5>Level ${item.level} - ${approverRole || 'Approval'}</h5>
                    <p><strong>Approver:</strong> ${approverName}</p>
                    ${approvedDate ? `<p><small>Approved: ${approvedDate}</small></p>` : ''}
                    ${item.status === 'current' ? '<span class="badge bg-warning">Pending</span>' : ''}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="approval-timeline-section">
            <h4>Approval Timeline</h4>
            <div class="approval-timeline">
                ${timelineHtml}
            </div>
        </div>
    `;
}

/**
 * Obtiene el texto descriptivo del estado de aprobación
 */
function getStatusText(approvalStatus) {
    const level = Number(approvalStatus);
    
    const statusMap = {
        0: 'Pending: Trafico',
        1: 'Approved by Trafico',
        2: 'Approved by Customs',
        3: 'Approved by Transport Specialist',
        4: 'Approved by Transport Manager',
        5: 'Approved by Plant Manager',
        6: 'Approved by Regional Director',
        7: 'Approved by VP Operations',
        8: 'Fully Approved',
        99: 'Rejected'
    };

    return statusMap[level] || `Approval Level: ${level}`;
}

function setupEventListeners() {
    document.querySelector('.btn-back')?.addEventListener('click', () => {
        window.location.href = 'orders.php';
    });
    
    document.querySelector('.btn-pdf')?.addEventListener('click', handleGeneratePDF);
    document.getElementById('approveBtn')?.addEventListener('click', handleApprovalClick);
    document.getElementById('rejectBtn')?.addEventListener('click', handleRejectionClick);
    
    document.getElementById('recoveryFilesBtn')?.addEventListener('click', () => {
        openRecoveryFilesModal(currentOrder);
    });
    
    document.getElementById('closeRecoveryModalBtn')?.addEventListener('click', closeRecoveryFilesModal);
}

/**
 * Verifica permisos de aprobación
 * ACTUALIZADO: Usa approvalLevel del usuario
 */
function checkApprovalPermissions(user, order) {
    if (!user || !order) {
        console.log('[viewOrder.js] Permission check failed: Missing user or order data');
        return false;
    }
    
    // ACTUALIZADO: Usar approvalLevel (con fallback a authorizationLevel para compatibilidad)
    const userApprovalLevel = Number(user.approvalLevel || user.authorizationLevel || 0);
    const currentApprovalLevel = Number(order.approval_status || 0);
    const requiredLevel = currentApprovalLevel + 1;
    const userPlant = user.plant;
    const orderPlant = order.creator_plant;

    console.log('[viewOrder.js] Permission check:', {
        userApprovalLevel,
        currentApprovalLevel,
        requiredLevel,
        userPlant,
        orderPlant
    });

    // Verificar nivel de aprobación
    if (userApprovalLevel !== requiredLevel) {
        console.log(`[viewOrder.js] Permission denied: User approval level ${userApprovalLevel} !== required level ${requiredLevel}`);
        return false;
    }

    // Verificar planta (solo si el usuario tiene planta asignada)
    if (userPlant !== null && userPlant !== orderPlant) {
        console.log(`[viewOrder.js] Permission denied: Plant mismatch (${userPlant} !== ${orderPlant})`);
        return false;
    }

    console.log('[viewOrder.js] Permission granted');
    return true;
}

function configureActionButtons() {
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const user = window.PF_CONFIG.user;

    if (!currentOrder || !user) {
        console.log('[viewOrder.js] Hiding action buttons: Missing order or user data');
        approveBtn?.classList.add('hidden');
        rejectBtn?.classList.add('hidden');
        return;
    }

    const hasPermission = checkApprovalPermissions(user, currentOrder);
    const isRejected = Number(currentOrder.approval_status) === 99;
    const isFullyApproved = Number(currentOrder.approval_status) >= Number(currentOrder.required_auth_level);

    console.log('[viewOrder.js] Action buttons config:', {
        hasPermission,
        isRejected,
        isFullyApproved
    });

    if (hasPermission && !isRejected && !isFullyApproved) {
        approveBtn?.classList.remove('hidden');
        rejectBtn?.classList.remove('hidden');
        console.log('[viewOrder.js] Action buttons shown');
    } else {
        approveBtn?.classList.add('hidden');
        rejectBtn?.classList.add('hidden');
        console.log('[viewOrder.js] Action buttons hidden');
    }
}

async function handleApprovalClick(event) {
    event.preventDefault();
    
    if (!currentOrder) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No order selected' });
        return;
    }

    if (isLoading) {
        console.log('[viewOrder.js] Approval already in progress');
        return;
    }

    try {
        isLoading = true;
        console.log('[viewOrder.js] Starting approval process for order:', currentOrder.id);
        
        const result = await approveOrder(currentOrder.id, { showConfirmation: true });
        
        if (result.success) {
            console.log('[viewOrder.js] Approval successful, refreshing page data');
            await refreshPageData();
        }
    } catch (error) {
        console.error('[viewOrder.js] Approval error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Approval Failed',
            text: error.message || 'An error occurred during approval'
        });
    } finally {
        isLoading = false;
    }
}

async function handleRejectionClick(event) {
    event.preventDefault();
    
    if (!currentOrder) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No order selected' });
        return;
    }

    if (isLoading) {
        console.log('[viewOrder.js] Rejection already in progress');
        return;
    }

    try {
        isLoading = true;
        console.log('[viewOrder.js] Starting rejection process for order:', currentOrder.id);
        
        const result = await rejectOrder(currentOrder.id, null, { showConfirmation: true });
        
        if (result.success) {
            console.log('[viewOrder.js] Rejection successful, refreshing page data');
            await refreshPageData();
        }
    } catch (error) {
        console.error('[viewOrder.js] Rejection error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Rejection Failed',
            text: error.message || 'An error occurred during rejection'
        });
    } finally {
        isLoading = false;
    }
}

async function handleGeneratePDF(event) {
    event.preventDefault();
    
    if (!currentOrder) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No order selected' });
        return;
    }

    try {
        console.log('[viewOrder.js] Generating PDF for order:', currentOrder.id);
        
        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // CORREGIDO: Usar la función generatePDF importada de svgOrders.js
        const fileName = await generatePDF(currentOrder, `PF_${currentOrder.id}_Order`);

        Swal.fire({ 
            icon: 'success', 
            title: 'PDF Generated!',
            html: `The PDF has been downloaded successfully.<br><small class="text-muted">File: ${fileName}</small>`,
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('[viewOrder.js] PDF generation error:', error);
        Swal.fire({ 
            icon: 'error', 
            title: 'PDF Generation Failed', 
            text: error.message 
        });
    }
}

async function refreshPageData() {
    try {
        console.log('[viewOrder.js] Refreshing page data...');
        await loadOrderData();
        await initializeOrderDisplay();
        configureActionButtons();
        console.log('[viewOrder.js] Page data refreshed successfully');
    } catch (error) {
        console.error('[viewOrder.js] Error refreshing data:', error);
        Swal.fire({
            icon: 'error',
            title: 'Refresh Failed',
            text: 'Could not refresh order data. Please reload the page.'
        });
    }
}

function openRecoveryFilesModal(order) {
    console.log('[viewOrder.js] Opening recovery files modal for order:', order.id);
    
    const modal = document.getElementById('recoveryModal');
    if (!modal) {
        console.error('[viewOrder.js] Recovery modal not found');
        return;
    }

    // Mostrar el modal
    modal.style.display = 'flex';
    
    // Cargar los archivos de recuperación
    loadRecoveryFiles(order.id);
}

function closeRecoveryFilesModal() {
    console.log('[viewOrder.js] Closing recovery files modal');
    
    const modal = document.getElementById('recoveryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function loadRecoveryFiles(orderId) {
    const modalBody = document.getElementById('recoveryModalBody');
    if (!modalBody) return;

    try {
        modalBody.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading files...</div>';

        const response = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/users/daoGetRecoveryFiles.php?order_id=${orderId}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.files && data.files.length > 0) {
            renderRecoveryFiles(data.files);
        } else {
            modalBody.innerHTML = '<p class="text-center text-muted">No recovery files found</p>';
        }

    } catch (error) {
        console.error('[viewOrder.js] Error loading recovery files:', error);
        modalBody.innerHTML = '<p class="text-center text-danger">Error loading files</p>';
    }
}

function renderRecoveryFiles(files) {
    const modalBody = document.getElementById('recoveryModalBody');
    if (!modalBody) return;

    const filesHtml = files.map(file => `
        <div class="recovery-file-item">
            <div class="file-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="file-details">
                <h5>${file.filename}</h5>
                <p>Uploaded: ${new Date(file.upload_date).toLocaleDateString()}</p>
            </div>
            <div class="file-actions">
                <button class="btn btn-primary btn-sm" onclick="window.open('${file.file_path}', '_blank')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');

    modalBody.innerHTML = filesHtml;
}