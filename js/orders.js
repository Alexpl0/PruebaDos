/**
 * viewOrder.js - Premium Freight Order Viewer
 * 
 * ACTUALIZACIÓN v3.0 (2025-10-07):
 * - NUEVO: Soporte completo para usuarios con múltiples niveles de aprobación
 * - Carga todos los roles del usuario y verifica cuáles pueden aprobar la orden
 * - Permite seleccionar el rol específico al aprobar si hay múltiples opciones
 */

import { approveOrder, rejectOrder } from './approval.js';
import { loadAndPopulateSVG, generatePDF } from './svgOrders.js';

let currentOrder = null;
let isLoading = false;
let userApprovalRoles = []; // Todos los roles de aprobación del usuario
let validRolesForCurrentOrder = []; // Roles que pueden aprobar la orden actual

document.addEventListener('DOMContentLoaded', initializeViewOrder);

async function initializeViewOrder() {
    console.log('[viewOrder.js] Initializing page...');
    try {
        await loadUserApprovalRoles(); // Primero cargar los roles
        await loadOrderData(); // Luego cargar la orden
        await initializeOrderDisplay();
        setupEventListeners();
        configureActionButtons(); // Ahora con lógica multi-rol
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
 * NUEVO: Carga todos los roles de aprobación del usuario
 */
async function loadUserApprovalRoles() {
    const URLPF = window.PF_CONFIG.app.baseURL;
    const fetchUrl = `${URLPF}dao/conections/daoGetUserApprovalRoles.php`;

    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const apiResponse = await response.json();
        
        if (apiResponse.status === 'success' && apiResponse.data) {
            userApprovalRoles = apiResponse.data;
            console.log('[viewOrder.js] User approval roles loaded:', userApprovalRoles);
        }
    } catch (error) {
        console.error('[viewOrder.js] Error loading user approval roles:', error);
        // No es crítico, continuar con el rol por defecto
        userApprovalRoles = [];
    }
}

async function loadOrderData() {
    try {
        const orderId = window.PF_CONFIG?.orderId;

        if (!orderId) {
            throw new Error('No order ID provided');
        }

        console.log('[viewOrder.js] Loading data for Order ID:', orderId);

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

        currentOrder = {
            ...data.order,
            approval_status: data.order.current_approval_level,
            creator_plant: data.order.order_plant,
            approval_timeline: data.approval_timeline || [],
            approval_history: data.approval_history || []
        };
        
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

        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.classList.add('hidden');
        }

        console.log('[viewOrder.js] Loading SVG for order:', currentOrder.id);
        
        try {
            await loadAndPopulateSVG(currentOrder, 'svgContent');
            
            const svgContent = document.getElementById('svgContent');
            if (svgContent) {
                svgContent.classList.remove('hidden');
            }
            
            console.log('[viewOrder.js] SVG loaded successfully');
        } catch (svgError) {
            console.error('[viewOrder.js] Error loading SVG:', svgError);
            renderOrderDetailsBasic(currentOrder);
        }

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

function getStatusText(approvalStatus) {
    const level = Number(approvalStatus);
    
    const statusMap = {
        0: 'Pending: Traffic',
        1: 'Pending: Transportation',
        2: 'Pending: Logistics Manager',
        3: 'Pending: Controlling',
        4: 'Pending: Plant Manager',
        5: 'Pending: Senior Manager Logistics Division',
        6: 'Pending: Manager OPS Division',
        7: 'Pending: SR VP Regional',
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
 * NUEVO: Encuentra todos los roles del usuario que pueden aprobar la orden actual
 * @param {object} order - La orden actual
 * @returns {Array} - Array de roles válidos
 */
function findValidApprovalRoles(order) {
    if (!order || !userApprovalRoles || userApprovalRoles.length === 0) {
        return [];
    }

    const currentApprovalLevel = Number(order.approval_status || 0);
    const requiredNextLevel = currentApprovalLevel + 1;
    const orderPlant = order.creator_plant;

    const validRoles = userApprovalRoles.filter(role => {
        // Verificar nivel de aprobación
        if (role.approval_level !== requiredNextLevel) {
            return false;
        }

        // Verificar planta: debe ser la misma O el rol debe ser regional (plant === null)
        if (role.plant !== null && role.plant !== orderPlant) {
            return false;
        }

        return true;
    });

    console.log('[viewOrder.js] Valid roles for current order:', {
        currentApprovalLevel,
        requiredNextLevel,
        orderPlant,
        validRoles
    });

    return validRoles;
}

/**
 * ACTUALIZADO: Configura los botones de acción con lógica multi-rol
 */
function configureActionButtons() {
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');

    if (!currentOrder) {
        console.log('[viewOrder.js] Hiding action buttons: No order data');
        approveBtn?.classList.add('hidden');
        rejectBtn?.classList.add('hidden');
        return;
    }

    // Encontrar roles válidos
    validRolesForCurrentOrder = findValidApprovalRoles(currentOrder);

    const isRejected = Number(currentOrder.approval_status) === 99;
    const isFullyApproved = Number(currentOrder.approval_status) >= Number(currentOrder.required_auth_level);

    console.log('[viewOrder.js] Action buttons config:', {
        validRoles: validRolesForCurrentOrder.length,
        isRejected,
        isFullyApproved
    });

    // Mostrar botones solo si hay al menos un rol válido y la orden no está terminada
    if (validRolesForCurrentOrder.length > 0 && !isRejected && !isFullyApproved) {
        approveBtn?.classList.remove('hidden');
        rejectBtn?.classList.remove('hidden');
        console.log('[viewOrder.js] Action buttons shown');
        
        // Si hay múltiples roles válidos, agregar indicador visual
        if (validRolesForCurrentOrder.length > 1) {
            approveBtn.innerHTML = '<i class="fas fa-check-circle"></i> Approve (Select Role)';
            rejectBtn.innerHTML = '<i class="fas fa-times-circle"></i> Reject (Select Role)';
        }
    } else {
        approveBtn?.classList.add('hidden');
        rejectBtn?.classList.add('hidden');
        console.log('[viewOrder.js] Action buttons hidden');
    }
}

/**
 * ACTUALIZADO: Maneja el clic en aprobar con selección de rol si es necesario
 */
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
        
        // Si hay múltiples roles válidos, permitir al usuario elegir
        let selectedRole = null;
        if (validRolesForCurrentOrder.length > 1) {
            selectedRole = await selectRoleForApproval();
            if (!selectedRole) {
                // Usuario canceló la selección
                isLoading = false;
                return;
            }
        } else if (validRolesForCurrentOrder.length === 1) {
            selectedRole = validRolesForCurrentOrder[0];
        } else {
            throw new Error('No valid approval roles found');
        }

        console.log('[viewOrder.js] Starting approval with role:', selectedRole);
        
        // Pasar el nivel de aprobación específico a usar
        const result = await approveOrder(
            currentOrder.id, 
            { 
                showConfirmation: true,
                approvalLevelToUse: selectedRole.approval_level,
                plantToUse: selectedRole.plant
            }
        );
        
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

/**
 * NUEVO: Muestra un selector para que el usuario elija con qué rol aprobar
 * @returns {Promise<object|null>} - El rol seleccionado o null si canceló
 */
async function selectRoleForApproval() {
    const options = {};
    validRolesForCurrentOrder.forEach(role => {
        const key = `${role.approval_level}_${role.plant || 'regional'}`;
        options[key] = role.display_name;
    });

    const { value: selectedKey, isConfirmed } = await Swal.fire({
        title: 'Select Approval Role',
        text: 'You have multiple roles that can approve this order. Please select which one to use:',
        input: 'select',
        inputOptions: options,
        inputPlaceholder: 'Select a role',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Continue',
        inputValidator: (value) => {
            if (!value) {
                return 'You must select a role to continue';
            }
        }
    });

    if (!isConfirmed || !selectedKey) {
        return null;
    }

    // Encontrar el rol seleccionado
    const [level, plantKey] = selectedKey.split('_');
    const plant = plantKey === 'regional' ? null : parseInt(plantKey);
    
    return validRolesForCurrentOrder.find(role => 
        role.approval_level === parseInt(level) && role.plant === plant
    );
}

/**
 * ACTUALIZADO: Maneja el clic en rechazar con selección de rol si es necesario
 */
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
        
        // Si hay múltiples roles válidos, permitir al usuario elegir
        let selectedRole = null;
        if (validRolesForCurrentOrder.length > 1) {
            selectedRole = await selectRoleForRejection();
            if (!selectedRole) {
                isLoading = false;
                return;
            }
        } else if (validRolesForCurrentOrder.length === 1) {
            selectedRole = validRolesForCurrentOrder[0];
        } else {
            throw new Error('No valid approval roles found');
        }

        console.log('[viewOrder.js] Starting rejection with role:', selectedRole);
        
        const result = await rejectOrder(
            currentOrder.id, 
            null,
            { 
                showConfirmation: true,
                approvalLevelToUse: selectedRole.approval_level,
                plantToUse: selectedRole.plant
            }
        );
        
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

/**
 * NUEVO: Selector de rol para rechazo
 */
async function selectRoleForRejection() {
    const options = {};
    validRolesForCurrentOrder.forEach(role => {
        const key = `${role.approval_level}_${role.plant || 'regional'}`;
        options[key] = role.display_name;
    });

    const { value: selectedKey, isConfirmed } = await Swal.fire({
        title: 'Select Role for Rejection',
        text: 'You have multiple roles that can reject this order. Please select which one to use:',
        input: 'select',
        inputOptions: options,
        inputPlaceholder: 'Select a role',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Continue',
        inputValidator: (value) => {
            if (!value) {
                return 'You must select a role to continue';
            }
        }
    });

    if (!isConfirmed || !selectedKey) {
        return null;
    }

    const [level, plantKey] = selectedKey.split('_');
    const plant = plantKey === 'regional' ? null : parseInt(plantKey);
    
    return validRolesForCurrentOrder.find(role => 
        role.approval_level === parseInt(level) && role.plant === plant
    );
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

    modal.style.display = 'flex';
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