/**
 * viewOrder.js - Premium Freight Order Viewer
 * 
 * ACTUALIZACIÓN v3.2 (2025-10-08):
 * - CORREGIDO: Ahora usa daoPremiumFreight.php para obtener TODOS los campos de la orden
 * - Mantiene loadAndRenderProgress() para la línea de progreso
 * - Todos los campos del SVG se llenan correctamente
 */

import { approveOrder, rejectOrder } from './approval.js';
import { loadAndPopulateSVG, generatePDF } from './svgOrders.js';
import { loadAndRenderProgress } from './progress-line.js';

let currentOrder = null;
let isLoading = false;
let userApprovalRoles = [];
let validRolesForCurrentOrder = [];

document.addEventListener('DOMContentLoaded', initializeViewOrder);

async function initializeViewOrder() {
    console.log('[viewOrder.js] Initializing page...');
    try {
        await loadUserApprovalRoles();
        await loadOrderData();
        await initializeOrderDisplay();
        
        // Cargar y renderizar la línea de progreso DESPUÉS de cargar la orden
        await loadProgressLine();
        
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
 * Carga la línea de progreso de la orden
 */
async function loadProgressLine() {
    try {
        if (!currentOrder || !currentOrder.id) {
            console.warn('[viewOrder.js] No order ID available for progress line');
            return;
        }

        console.log('[viewOrder.js] Loading progress line for order:', currentOrder.id);
        
        const baseURL = window.PF_CONFIG?.app?.baseURL;
        if (!baseURL) {
            console.error('[viewOrder.js] Base URL not configured');
            return;
        }

        // Llamar a la función del módulo progress-line.js
        await loadAndRenderProgress(currentOrder.id, baseURL);
        
        console.log('[viewOrder.js] Progress line loaded successfully');
    } catch (error) {
        console.error('[viewOrder.js] Error loading progress line:', error);
        // No es crítico, continuar con la carga de la página
    }
}

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
        userApprovalRoles = [];
    }
}

/**
 * CORREGIDO: Usa daoPremiumFreight.php para obtener todos los campos de la orden
 */
async function loadOrderData() {
    try {
        const orderId = window.PF_CONFIG?.orderId;

        if (!orderId) {
            throw new Error('No order ID provided');
        }

        console.log('[viewOrder.js] Loading data for Order ID:', orderId);

        // 🎯 CAMBIO PRINCIPAL: Ahora usa daoPremiumFreight.php
        const response = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/conections/daoPremiumFreight.php`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 'success' || !data.data) {
            throw new Error(data.message || 'Failed to load order data');
        }

        // 🔍 Buscar la orden específica por ID en el array
        const foundOrder = data.data.find(order => order.id === parseInt(orderId));

        if (!foundOrder) {
            throw new Error(`Order with ID ${orderId} not found`);
        }

        // ✅ Ahora tenemos TODOS los campos de daoPremiumFreight.php
        currentOrder = {
            ...foundOrder,
            // Asegurar campos de aprobación (ya vienen en daoPremiumFreight.php)
            current_approval_level: foundOrder.approval_status,
            order_plant: foundOrder.creator_plant
        };
        
        window.currentOrder = currentOrder;
        
        console.log('[viewOrder.js] ✅ Order data loaded successfully with ALL fields:', currentOrder);
        console.log('[viewOrder.js] 📋 Campos verificados:');
        console.log('  - paid_by:', currentOrder.paid_by);
        console.log('  - category_cause:', currentOrder.category_cause);
        console.log('  - project_status:', currentOrder.project_status);
        console.log('  - int_ext:', currentOrder.int_ext);
        console.log('  - origin_company_name:', currentOrder.origin_company_name);
        console.log('  - products:', currentOrder.products);
        console.log('  - carrier:', currentOrder.carrier);

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
                    <span>${order.premium_freight_number || order.reference_number || 'N/A'}</span>
                </div>
                
                <div class="info-item">
                    <strong>Status:</strong> 
                    <span>${order.status_name || 'N/A'}</span>
                </div>
                
                <div class="info-item">
                    <strong>Created by:</strong> 
                    <span>${order.creator_name || 'N/A'}</span>
                </div>
                
                <div class="info-item">
                    <strong>Plant:</strong> 
                    <span>${order.creator_plant || order.planta || 'N/A'}</span>
                </div>
                
                <div class="info-item">
                    <strong>Current Approval Level:</strong> 
                    <span>${order.current_approval_level || order.approval_status} / ${order.required_auth_level}</span>
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
        </div>
    `;

    svgContent.innerHTML = detailsHtml;
    svgContent.classList.remove('hidden');
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
 * Encuentra todos los roles del usuario que pueden aprobar la orden actual
 */
function findValidApprovalRoles(order) {
    if (!order || !userApprovalRoles || userApprovalRoles.length === 0) {
        return [];
    }

    const currentApprovalLevel = Number(order.approval_status || order.current_approval_level || 0);
    const requiredNextLevel = currentApprovalLevel + 1;
    const orderPlant = order.creator_plant || order.order_plant;

    const validRoles = userApprovalRoles.filter(role => {
        if (role.approval_level !== requiredNextLevel) {
            return false;
        }

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
 * Configura los botones de acción con lógica multi-rol
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

    validRolesForCurrentOrder = findValidApprovalRoles(currentOrder);

    const isRejected = Number(currentOrder.approval_status || currentOrder.current_approval_level) === 99;
    const isFullyApproved = Number(currentOrder.approval_status || currentOrder.current_approval_level) >= Number(currentOrder.required_auth_level);

    console.log('[viewOrder.js] Action buttons config:', {
        validRoles: validRolesForCurrentOrder.length,
        isRejected,
        isFullyApproved
    });

    if (validRolesForCurrentOrder.length > 0 && !isRejected && !isFullyApproved) {
        approveBtn?.classList.remove('hidden');
        rejectBtn?.classList.remove('hidden');
        console.log('[viewOrder.js] Action buttons shown');
        
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
 * Maneja el clic en aprobar con selección de rol si es necesario
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
        
        let selectedRole = null;
        if (validRolesForCurrentOrder.length > 1) {
            selectedRole = await selectRoleForApproval();
            if (!selectedRole) {
                isLoading = false;
                return;
            }
        } else if (validRolesForCurrentOrder.length === 1) {
            selectedRole = validRolesForCurrentOrder[0];
        } else {
            throw new Error('No valid approval roles found');
        }

        console.log('[viewOrder.js] Starting approval with role:', selectedRole);
        
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
 * Muestra un selector para que el usuario elija con qué rol aprobar
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

    const [level, plantKey] = selectedKey.split('_');
    const plant = plantKey === 'regional' ? null : parseInt(plantKey);
    
    return validRolesForCurrentOrder.find(role => 
        role.approval_level === parseInt(level) && role.plant === plant
    );
}

/**
 * Maneja el clic en rechazar con selección de rol si es necesario
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
 * Selector de rol para rechazo
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
        
        // Recargar también la línea de progreso
        await loadProgressLine();
        
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